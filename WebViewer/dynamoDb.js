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
    // Usamos el ScanCommand en lugar de la versión de DocumentClient de v2
    const data = await dynamoDbClient.send(new ScanCommand(params));
    callback(null, data.Items);
  } catch (err) {
    console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
    callback(err, null);
  }
};

module.exports = { getData };
