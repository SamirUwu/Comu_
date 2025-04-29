// Importar dotenv y AWS SDK
require('dotenv').config();
const AWS = require('aws-sdk');

// Configurar AWS SDK usando variables de entorno
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamoDb = new AWS.DynamoDB.DocumentClient();

const getData = (callback) => {
  const params = {
    TableName: 'Positions'  
  };

  dynamoDb.scan(params, (err, data) => {
    if (err) {
      console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
      callback(err, null);
    } else {
      callback(null, data.Items);
    }
  });
};

module.exports = { getData };
