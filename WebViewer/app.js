const express = require('express');
const path = require('path');
const { getData } = require('./dynamoDb');
const fetch = require('node-fetch'); // Asegúrate de que node-fetch@2 está instalado
const app = express();
const PORT = 80;

// Servir archivos estáticos de la carpeta "salida"
app.use(express.static(path.join('C:/Users/USUARIO/Documents/Malecon', 'salida')));

// Endpoint para obtener el punto más reciente con datos meteorológicos
app.get('/api/latestPoint', async (req, res) => {
  try {
    const point = await getData();
    console.log('Point from getData:', point);

    // Validar coordenadas antes de la solicitud a Open-Meteo
    if (!point || isNaN(point.lat) || isNaN(point.lon) || point.lat === 0 || point.lon === 0) {
      console.warn('Coordenadas inválidas, usando valores por defecto para el clima.');
      res.json({
        ...point,
        weather: {
          temperature: 'N/A',
          windSpeed: 'N/A',
          humidity: 'N/A'
        }
      });
      return;
    }

    // Obtener datos meteorológicos desde Open-Meteo
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lon}&current=temperature_2m,wind_speed_10m,relative_humidity_2m`;
    console.log('Fetching weather from:', weatherUrl);
    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) {
      console.error('Error fetching weather:', weatherResponse.status, weatherResponse.statusText);
      throw new Error(`Failed to fetch weather data: ${weatherResponse.statusText}`);
    }
    const weatherData = await weatherResponse.json();
    console.log('Weather data:', weatherData);

    // Extraer datos meteorológicos relevantes
    const weather = {
      temperature: weatherData.current?.temperature_2m || 'N/A',
      windSpeed: weatherData.current?.wind_speed_10m || 'N/A',
      humidity: weatherData.current?.relative_humidity_2m || 'N/A'
    };

    // Combinar datos del punto con datos meteorológicos
    const response = {
      ...point,
      weather
    };

    res.json(response);
  } catch (err) {
    console.error('Error en /api/latestPoint:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
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
