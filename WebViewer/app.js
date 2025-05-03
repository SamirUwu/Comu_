const express = require('express');
const path = require('path');
const { getData } = require('./dynamoDb');
const app = express();
const PORT = 80;

// Servir archivos estáticos de la carpeta "salida"
app.use(express.static(path.join('C:/Users/USUARIO/Documents/Malecon', 'salida')));

// Endpoint para obtener el punto más reciente en JSON
app.get('/api/latestPoint', async (req, res) => {
  try {
    const point = await getData();
    if (point) {
      res.json(point);
    } else {
      res.status(404).json({ error: 'No hay datos disponibles' });
    }
  } catch (err) {
    console.error('Error en /api/latestPoint:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Redirigir raíz al HTML de Potree
app.get('/', (req, res) => {
  res.sendFile(
    path.join('C:/Users/USUARIO/Documents/Malecon', 'salida', 'nube_malecon.html')
  );
});

app.use(express.static(path.join('C:/Users/USUARIO/Documents/Malecon', 'salida'), {
  etag: false,
  setHeaders: (res, path) => {
      res.set('Cache-Control', 'no-store');
  }
}));

app.listen(PORT, () => console.log(`Servidor iniciado en http://localhost:${PORT}`));
