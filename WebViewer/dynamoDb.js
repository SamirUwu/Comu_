// Importar dotenv y AWS SDK (v3)
require('dotenv').config();
const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');

// Configurar el cliente de DynamoDB usando variables de entorno
const dynamoDbClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const getData = async (callback) => {
  const params = {
    TableName: 'Positions',  // Nombre de tu tabla
  };

  try {
    const data = await dynamoDbClient.send(new ScanCommand(params));

    // Imprimir todo el objeto de respuesta en la terminal
    console.log("Datos obtenidos de DynamoDB:", JSON.stringify(data, null, 2));

    // Verifica si hay elementos en "data.Items"
    if (data.Items && data.Items.length > 0) {
      callback(null, data.Items);
    } else {
      callback("No se encontraron elementos", null);
    }

  } catch (err) {
    console.error("Error al obtener los datos de DynamoDB:", err);
    callback(err, null);
  }
};



module.exports = { getData };
