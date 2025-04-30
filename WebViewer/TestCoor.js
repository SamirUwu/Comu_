// Importar la librería proj4
import proj4 from 'proj4';

// Definir los sistemas de coordenadas (por ejemplo, WGS84 y UTM)
const wgs84 = 'EPSG:4326'; // Sistema de coordenadas geográficas (Lat/Lon)
const utm = 'EPSG:32618'; // Sistema de coordenadas UTM (puedes cambiarlo si es necesario)

// Coordenadas de Google Maps (Latitud, Longitud)
const lat = 11.015478;
const lon = -74.789293;

// Desplazamiento proporcionado por Potree (ejemplo en el archivo JSON)
const offset = [521755.49180625769, 1214558.2817465025, 23.819908644322823];

// Convertir Lat/Lon a UTM usando proj4
const [x, y] = proj4(wgs84, utm, [lon, lat]);

// Ajustar las coordenadas UTM a las coordenadas relativas de Potree usando el offset
const relativeX = x - offset[0];
const relativeY = y - offset[1];
const relativeZ = 0; // Si necesitas la altitud, la puedes calcular o ajustar aquí

// Mostrar las coordenadas relativas
console.log(`Coordenadas relativas en Potree: X = ${relativeX}, Y = ${relativeY}, Z = ${relativeZ}`);
