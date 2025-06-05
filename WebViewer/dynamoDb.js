require('dotenv').config(); // Carga las variables de entorno desde .env
const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const proj4 = require('proj4'); // Librería para transformar coordenadas geográficas

// Inicializa cliente DynamoDB con región y credenciales de entorno
const dynamoDbClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Variables globales para acumular distancia recorrida, pasos y última posición procesada
let lastLat = null;
let lastLon = null;
let lastTimestamp = null;
let totalDistance = 0;
let totalSteps = 0; // (No usado aún, pero listo para integrar)

// === Función de distancia Haversine ===
// Calcula la distancia en metros entre dos puntos GPS (lat/lon)
function haversine(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1), Δλ = toRad(lon2 - lon1);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Función principal:
 * - Escanea la tabla DynamoDB 'Positions'
 * - Convierte coordenadas GPS a coordenadas relativas UTM para visualización
 * - Calcula distancia acumulada desde el último punto procesado
 */
const getData = async () => {
  const params = { TableName: 'Positions' };
  try {
    const data = await dynamoDbClient.send(new ScanCommand(params));
    console.log('Raw DynamoDB data:', JSON.stringify(data.Items, null, 2));
    if (data.Items && data.Items.length > 0) {
      // === Mapeo y validación de datos ===
      const items = data.Items.map(item => {
        const mapData = item['Latitude, Longitude, TimeStamp']?.M;
        if (!mapData) return null;
        const timestampRaw = mapData.timestamp?.S;
        if (!timestampRaw) return null;

        const timestamp = new Date(timestampRaw.replace(' - ', 'T') + 'Z');
        if (isNaN(timestamp)) return null;

        if (!mapData.Latitude?.S || !mapData.Longitude?.S) return null;

        return {
          lat: parseFloat(mapData.Latitude.S),
          lon: parseFloat(mapData.Longitude.S),
          alt: parseFloat(mapData.Altitude?.S || '0'),
          velocity: parseFloat(mapData.Velocity?.S || '0'),
          steps: parseFloat(mapData.StepCount?.S || '0'),
          phone: mapData.phone?.S || item.phone?.S || '',
          timestamp
        };
      }).filter(Boolean); // Filtra nulls por datos incompletos

      // Si no hay datos válidos, retorna coordenadas base
      if (items.length === 0) {
        return {
          x: 0, y: 0, z: 0,
          velocity: 0, steps: 0,
          distance: totalDistance,
          lat: 0, lon: 0, phone: ''
        };
      }
      
      const sorted = items.sort((a, b) => a.timestamp - b.timestamp);
      
      // Filtra puntos nuevos desde el último timestamp procesado
      const newPoints = lastTimestamp ? sorted.filter(p => p.timestamp > lastTimestamp) : sorted;
      
      const latest = newPoints[newPoints.length - 1];
      const [xUTM, yUTM] = proj4('EPSG:4326', 'EPSG:32618', [latest.lon, latest.lat]);
      const relativeZ = (latest.alt + 38); // Ajuste visual
      if (latest.phone != "3014339305") {
        return {
          x: xUTM,
          y: yUTM,
          z: relativeZ,
          phone: latest.phone
        };
      }

      // Si no hay nuevos puntos, usa el último para mostrar posición actual
      if (newPoints.length === 0) {
        console.log('Último dato:');
        console.log(`Latitud: ${latest.lat}`);
        console.log(`Longitud: ${latest.lon}`);
        console.log(`Altitud: ${latest.alt}`);
        console.log(`Timestamp: ${latest.timestamp.toISOString()}`);
        console.log(`Velocity: ${latest.velocity}`);
        console.log(`Steps: ${latest.steps}`);
        console.log(`Phone: ${latest.phone}`);
        console.log(`Coordenadas relativas en Potree: X = ${xUTM}, Y = ${yUTM}, Z = ${relativeZ}`);

        return {
          x: xUTM,
          y: yUTM,
          z: relativeZ,
          velocity: latest.velocity,
          distance: totalDistance,
          steps: latest.steps,
          lat: latest.lat,
          lon: latest.lon,
          phone: latest.phone
        };
      }

      // === Acumula distancia desde la última posición ===
      for (const point of newPoints) {
        if (lastLat !== null && lastLon !== null) {
          const dist = haversine(lastLat, lastLon, point.lat, point.lon);
          totalDistance += dist;
        }

        lastLat = point.lat;
        lastLon = point.lon;
        lastTimestamp = point.timestamp;
      }

      console.log('Último dato:');
      console.log(`Latitud: ${latest.lat}`);
      console.log(`Longitud: ${latest.lon}`);
      console.log(`Altitud: ${latest.alt}`);
      console.log(`Timestamp: ${latest.timestamp.toISOString()}`);
      console.log(`Velocity: ${latest.velocity}`);
      console.log(`Steps: ${latest.steps}`);
      console.log(`Phone: ${latest.phone}`);
      console.log(`Coordenadas relativas en Potree: X = ${xUTM}, Y = ${yUTM}, Z = ${relativeZ}`);

      return {
        x: xUTM,
        y: yUTM,
        z: relativeZ,
        velocity: latest.velocity,
        distance: totalDistance,
        steps: latest.steps,
        lat: latest.lat,
        lon: latest.lon,
        phone: latest.phone
      };
    } else {
      // No hay items en la tabla
      return {
        x: 0, y: 0, z: 0,
        velocity: 0, steps: 0,
        distance: totalDistance,
        lat: 0, lon: 0, phone: ''
      };
    }
  } catch (err) {
    // Error de conexión, credenciales o formato
    console.error('Error al obtener datos:', err);
    return {
      x: 0, y: 0, z: 0,
      velocity: 0, steps: 0,
      distance: totalDistance,
      lat: 0, lon: 0, phone: ''
    };
  }
};

module.exports = { getData };

// Permite ejecutar el archivo directamente con `node app.js`
if (require.main === module) {
  (async () => {
    const result = await getData();
    console.log('Resultado de getData:', result);
  })();
}
