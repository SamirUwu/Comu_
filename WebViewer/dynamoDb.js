require('dotenv').config();
const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const proj4 = require('proj4');

const dynamoDbClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Variables globales para acumulación
let lastLat = null;
let lastLon = null;
let lastTimestamp = null;
let totalDistance = 0;
let totalSteps = 0; // Mantenemos para posibles usos futuros

// Fórmula de Haversine (en metros)
function haversine(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 6371e3;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1), Δλ = toRad(lon2 - lon1);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * getData: consulta DynamoDB, calcula coordenadas relativas
 * y retorna un objeto { x, y, z, velocity, distance, steps, lat, lon }.
 */
const getData = async () => {
  const params = { TableName: 'Positions' };

  try {
    const data = await dynamoDbClient.send(new ScanCommand(params));
    console.log('Raw DynamoDB data:', JSON.stringify(data.Items, null, 2));

    if (data.Items && data.Items.length > 0) {
      const items = data.Items.map(item => {
        console.log('Procesando ítem:', JSON.stringify(item, null, 2));

        const mapData = item['Latitude, Longitude, TimeStamp']?.M;
        if (!mapData) {
          console.warn('Mapa Latitude, Longitude, TimeStamp no encontrado en ítem:', item);
          return null;
        }

        const timestampRaw = mapData.TimeStamp?.S;
        if (!timestampRaw) {
          console.warn('TimeStamp no encontrado en mapData:', mapData);
          return null;
        }

        const timestamp = new Date(timestampRaw.replace(' - ', 'T') + 'Z');
        if (isNaN(timestamp)) {
          console.warn('No se pudo parsear TimeStamp:', timestampRaw);
          return null;
        }

        if (!mapData.Latitude?.S || !mapData.Longitude?.S) {
          console.warn('Latitude o Longitude no encontrados en mapData:', mapData);
          return null;
        }

        return {
          lat: parseFloat(mapData.Latitude.S),
          lon: parseFloat(mapData.Longitude.S),
          alt: parseFloat(mapData.Altitude?.S || '0'),
          velocity: parseFloat(mapData.Velocity?.S || '0'),
          steps: parseFloat(mapData.StepCount?.S || '0'),
          timestamp
        };
      }).filter(Boolean);

      if (items.length === 0) {
        console.log('No se encontraron ítems válidos después de parsear.');
        return {
          x: 0,
          y: 0,
          z: 0,
          velocity: 0,
          steps: 0, // Retornar 0 si no hay ítems válidos
          distance: totalDistance,
          lat: 0,
          lon: 0
        };
      }

      // Ordenar por timestamp de más antiguo a más reciente
      const sorted = items.sort((a, b) => a.timestamp - b.timestamp);
      console.log('Sorted items:', sorted);

      // Filtrar puntos nuevos desde el último timestamp
      const newPoints = lastTimestamp ? sorted.filter(p => p.timestamp > lastTimestamp) : sorted;
      console.log('New points:', newPoints);

      if (newPoints.length === 0) {
        console.log('No hay nuevos puntos, retornando el último punto conocido.');
        const latest = sorted[sorted.length - 1];
        const wgs84 = 'EPSG:4326';
        const utm = 'EPSG:32618';
        const offset = [521755.49180625769, 1214558.2817465025, 23.819908644322823];

        const [xUTM, yUTM] = proj4(wgs84, utm, [latest.lon, latest.lat]);
        const relativeX = xUTM / 1000;
        const relativeY = yUTM / 1000;
        const relativeZ = latest.alt / 1000;

        console.log('Último dato (sin nuevos puntos):');
        console.log(`Latitud: ${latest.lat}`);
        console.log(`Longitud: ${latest.lon}`);
        console.log(`Altitud: ${latest.alt}`);
        console.log(`Timestamp: ${latest.timestamp.toISOString()}`);
        console.log(`Velocity: ${latest.velocity}`);
        console.log(`Steps: ${latest.steps}`);
        console.log(`Coordenadas relativas en Potree: X = ${relativeX}, Y = ${relativeY}, Z = ${relativeZ}`);

        return {
          x: relativeX,
          y: relativeY,
          z: relativeZ,
          velocity: latest.velocity,
          distance: totalDistance,
          steps: latest.steps, // Usar el StepCount del último punto
          lat: latest.lat,
          lon: latest.lon
        };
      }

      for (const point of newPoints) {
        if (lastLat !== null && lastLon !== null) {
          const dist = haversine(lastLat, lastLon, point.lat, point.lon);
          totalDistance += dist;
          // No acumulamos totalSteps aquí; usaremos latest.steps
          console.log(`Distancia desde el último punto: ${dist.toFixed(2)} m`);
          console.log(`Distancia total acumulada: ${totalDistance.toFixed(2)} m`);
          console.log(`StepCount actual: ${point.steps}`);
        }

        lastLat = point.lat;
        lastLon = point.lon;
        lastTimestamp = point.timestamp;
      }

      const latest = newPoints[newPoints.length - 1];

      // Proyección
      const wgs84 = 'EPSG:4326';
      const utm = 'EPSG:32618';
      const offset = [521755.49180625769, 1214558.2817465025, 23.819908644322823];

      const [xUTM, yUTM] = proj4(wgs84, utm, [latest.lon, latest.lat]);
      const relativeX = xUTM / 1;
      const relativeY = yUTM / 1;
      const relativeZ = latest.alt / 1;

      console.log('Último dato:');
      console.log(`Latitud: ${latest.lat}`);
      console.log(`Longitud: ${latest.lon}`);
      console.log(`Altitud: ${latest.alt}`);
      console.log(`Timestamp: ${latest.timestamp.toISOString()}`);
      console.log(`Velocity: ${latest.velocity}`);
      console.log(`Steps: ${latest.steps}`);
      console.log(`Coordenadas relativas en Potree: X = ${relativeX}, Y = ${relativeY}, Z = ${relativeZ}`);

      return {
        x: relativeX,
        y: relativeY,
        z: relativeZ,
        velocity: latest.velocity,
        distance: totalDistance,
        steps: latest.steps, // Usar el StepCount del último punto
        lat: latest.lat,
        lon: latest.lon
      };
    } else {
      console.log('No se encontraron datos en la tabla.');
      return {
        x: 0,
        y: 0,
        z: 0,
        velocity: 0,
        steps: 0,
        distance: totalDistance,
        lat: 0,
        lon: 0
      };
    }
  } catch (err) {
    console.error('Error al obtener datos:', err);
    return {
      x: 0,
      y: 0,
      z: 0,
      velocity: 0,
      steps: 0,
      distance: totalDistance,
      lat: 0,
      lon: 0
    };
  }
};

module.exports = { getData };

// Si se ejecuta directamente, obtener y loguear el punto
if (require.main === module) {
  (async () => {
    const result = await getData();
    console.log('Resultado de getData:', result);
  })();
}
