const express = require('express');
const path = require('path');

// Importar la función getData de tu archivo DynamoDB.js
const { getData } = require('./dynamoDB');  // Asegúrate de que la ruta sea correcta

const app = express();
const PORT = 80;

// Servir archivos estáticos desde la carpeta "salida"
app.use(express.static(path.join('C:/Users/USUARIO/Documents/Malecon', 'salida')));

// Redirigir la raíz al visor Potree (opcional)
app.get('/', (req, res) => {
  res.sendFile(path.join('C:/Users/USUARIO/Documents/Malecon', 'salida', 'nube_malecon.html'));
});

// Ruta para obtener datos de DynamoDB
app.get('/data', (req, res) => {
  getData((err, data) => {
    if (err) {
      res.status(500).send('Error al obtener los datos de DynamoDB');
    } else {
      res.json(data);  // Enviar los datos al cliente en formato JSON
    }
  });
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
