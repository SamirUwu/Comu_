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

const getData = async () => {
  const params = {
    TableName: 'Positions',
  };

  try {
    const data = await dynamoDbClient.send(new ScanCommand(params));

    if (data.Items && data.Items.length > 0) {
      const items = data.Items;

      // Imprimir los timestamps y verificar si están bien
      items.forEach((item, index) => {
        const timestamp = item?.timestamp?.S || "Sin Timestamp";
        console.log(`Ítem ${index + 1}: Timestamp - ${timestamp}`);
      });

      // Filtrar el último dato basado en el timestamp directamente
      const sorted = items.sort((a, b) => {
        // Limpiar las comillas literales del timestamp
        const t1 = a?.timestamp?.S ? a.timestamp.S.replace(/^"|"$/g, '') : '';
        const t2 = b?.timestamp?.S ? b.timestamp.S.replace(/^"|"$/g, '') : '';

        // Verificar que los timestamps están correctos antes de la comparación
        console.log(`Comparando: t1 = ${t1}, t2 = ${t2}`);

        // Convertir el formato "YYYY-MM-DD - HH:mm:ss" a ISO 8601
        const parseTimestamp = (ts) => {
          if (!ts) return null;
          // Reemplazar " - " por "T" y agregar "Z" para formato ISO
          const isoFormat = ts.replace(' - ', 'T') + 'Z';
          return new Date(isoFormat);
        };

        const date1 = parseTimestamp(t1);
        const date2 = parseTimestamp(t2);

        // Asegurarse de que las fechas se están comparando bien
        console.log(`Fecha1: ${date1}, Fecha2: ${date2}`);

        // Validar que las fechas sean válidas
        if (isNaN(date1) || isNaN(date2)) {
          console.warn("Timestamp inválido detectado:", t1, t2);
          return 0; // No cambiar el orden si hay un error
        }
        
        return date2 - date1; // Ordenar por fecha (más reciente primero)
      });

      const latest = sorted[0];

      // Acceder al mapa anidado correctamente
      const mapData = latest["Latitude, Longitude, TimeStamp"]?.M;

      if (!mapData || !mapData.Latitude?.S || !mapData.Longitude?.S || !mapData.TimeStamp?.S) {
        console.log("Faltan datos de latitud, longitud o timestamp.");
        return;
      }

      const lat = parseFloat(mapData.Latitude.S);
      const lon = parseFloat(mapData.Longitude.S);
      const alt = parseFloat(mapData.Altitude?.S || "0");
      const time = mapData.TimeStamp.S;

      console.log("Último dato:");
      console.log(`Latitud: ${lat}`);
      console.log(`Longitud: ${lon}`);
      console.log(`Altitud: ${alt}`);
      console.log(`Timestamp: ${time}`);

      // Proyección
      const wgs84 = 'EPSG:4326';
      const utm = 'EPSG:32618';
      const offset = [521755.49180625769, 1214558.2817465025, 23.819908644322823];

      const [x, y] = proj4(wgs84, utm, [lon, lat]);

      const relativeX = x - offset[0];
      const relativeY = y - offset[1];
      const relativeZ = alt - offset[2];

      console.log(`Coordenadas relativas en Potree: X = ${relativeX}, Y = ${relativeY}, Z = ${relativeZ}`);
    } else {
      console.log("No se encontraron datos en la tabla.");
    }
  } catch (err) {
    console.error("Error al obtener datos:", err);
  }
};

getData();