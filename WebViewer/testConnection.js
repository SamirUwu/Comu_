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

const testConnection = async () => {
  const params = {
    TableName: 'Positions'
  };

  try {
    const data = await dynamoDbClient.send(new ScanCommand(params));
    console.log("Conexión exitosa. Datos obtenidos:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error al intentar conectar con DynamoDB:", err);
  }
};

testConnection();
