const express = require('express');
const path = require('path');
const app = express();
const PORT = 80;

// Servir archivos estáticos desde la carpeta "salida"
app.use(express.static(path.join('C:/Users/USUARIO/Documents/Malecon', 'salida')));

// Redirigir la raíz al visor Potree (opcional)
app.get('/', (req, res) => {
  res.sendFile(path.join('C:/Users/USUARIO/Documents/Malecon', 'salida', 'nube_malecon.html'));
});


app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
