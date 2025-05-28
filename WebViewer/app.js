require('dotenv').config();
const express = require('express');
const path = require('path');
const { getData } = require('./dynamoDb');
const fetch = require('node-fetch');
const app = express();
const PORT = 80;

// Servir archivos estáticos de la carpeta "salida"
app.use(express.static('C:/Users/USUARIO/Documents/Malecon/salida'));

// Endpoint para obtener el punto más reciente con datos meteorológicos
app.get('/api/latestPoint', async (req, res) => {
  try {
    const point = await getData();
    console.log('Point from getData:', point);

    // Validar coordenadas antes de la solicitud
    if (!point || isNaN(point.lat) || isNaN(point.lon) || point.lat === 0 || point.lon === 0) {
      console.warn('Invalid coordinates, usando valores por defecto para el clima.');
      res.json({
        ...point,
        weather: {
          temperature: 'N/A',
          windSpeed: 'N/A',
          humidity: 'N/A',
          icon: ''
        }
      });
      return;
    }

    // Obtener datos meteorológicos desde OpenWeatherMap
    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    if (!apiKey) {
      throw new Error('OPENWEATHERMAP_API_KEY not defined in .env');
    }
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${point.lat}&lon=${point.lon}&units=metric&appid=${apiKey}`;
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
      temperature: weatherData.main?.temp || 'N/A',
      windSpeed: weatherData.wind?.speed || 'N/A',
      humidity: weatherData.main?.humidity || 'N/A',
      icon: weatherData.weather?.[0]?.icon || ''
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
  res.sendFile('C:/Users/USUARIO/Documents/Malecon/salida/nube_malecon.html');
});

app.use(express.static(path.join(__dirname, 'salida'), {
  etag: false,
  setHeaders: (res, path) => {
    res.set('Cache-Control', 'no-store');
  }
}));

app.listen(PORT, () => console.log(`Servidor iniciado en http://localhost:${PORT}`));