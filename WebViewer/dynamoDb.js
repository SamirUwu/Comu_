// dynamodb.js
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

/**
 * getData: consulta DynamoDB, calcula coordenadas relativas
 * y retorna un objeto { x, y, z }.
 */
const getData = async () => {
  const params = { TableName: 'Positions' };

  try {
    const data = await dynamoDbClient.send(new ScanCommand(params));

    if (data.Items && data.Items.length > 0) {
      const items = data.Items;
      const sorted = items.sort((a, b) => {
        const t1 = a?.timestamp?.S ? a.timestamp.S.replace(/^"|"$/g, '') : '';
        const t2 = b?.timestamp?.S ? b.timestamp.S.replace(/^"|"$/g, '') : '';
        const parseTimestamp = ts => ts ? new Date(ts.replace(' - ', 'T') + 'Z') : null;
        const date1 = parseTimestamp(t1);
        const date2 = parseTimestamp(t2);
        if (isNaN(date1) || isNaN(date2)) {
          console.warn('Timestamp inválido detectado:', t1, t2);
          return 0;
        }
        return date2 - date1;
      });

      const latest = sorted[0];
      const mapData = latest['Latitude, Longitude, TimeStamp']?.M;

      if (!mapData || !mapData.Latitude?.S || !mapData.Longitude?.S || !mapData.TimeStamp?.S) {
        console.log('Faltan datos de latitud, longitud o timestamp.');
        return null;
      }

      const lat = parseFloat(mapData.Latitude.S);
      const lon = parseFloat(mapData.Longitude.S);
      const alt = parseFloat(mapData.Altitude?.S || '0');
      const time = mapData.TimeStamp.S;

      console.log('Último dato:');
      console.log(`Latitud: ${lat}`);
      console.log(`Longitud: ${lon}`);
      console.log(`Altitud: ${alt}`);
      console.log(`Timestamp: ${time}`);

      // Proyección
      const wgs84 = 'EPSG:4326';
      const utm = 'EPSG:32618';
      const offset = [521755.49180625769, 1214558.2817465025, 23.819908644322823];
 
      const [xUTM, yUTM] = proj4(wgs84, utm, [lon, lat]);
      console.log(`Pain = ${yUTM}, ${xUTM}` );
      const relativeX = xUTM - offset[0];
      const relativeY = yUTM - offset[1];
      const relativeZ = alt - offset[2];

      console.log(`Coordenadas relativas en Potree: X = ${relativeX}, Y = ${relativeY}, Z = ${relativeZ}`);

      return { x: relativeX, y: relativeY, z: relativeZ };
    } else {
      console.log('No se encontraron datos en la tabla.');
      return null;
    }
  } catch (err) {
    console.error('Error al obtener datos:', err);
    return null;
  }
};

module.exports = { getData };

// Si se ejecuta directamente, obtener y loguear el punto
if (require.main === module) {
  (async () => {
    await getData();
  })();
}