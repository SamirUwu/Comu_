import paho.mqtt.client as mqtt
import ssl
import json
import socket

# Parámetros de conexión
ENDPOINT = "a1tfh59pi9h3in-ats.iot.us-east-2.amazonaws.com"
PORT = 8883
CLIENT_ID = "prueba_python"
TOPIC = "Comu/topic1"

# Archivos convertidos desde el .pfx
CERTIFICATE_PATH = "certificate.pem.crt"
PRIVATE_KEY_PATH = "private.pem"
ROOT_CA_PATH = "AmazonRootCA1.pem" 
# UDP configuration
UDP_IP = '0.0.0.0'  # Listen on all interfaces
UDP_PORT = 6565

# Crear cliente MQTT
client = mqtt.Client(client_id=CLIENT_ID)

# Configurar SSL con los nuevos archivos
client.tls_set(ROOT_CA_PATH, certfile=CERTIFICATE_PATH, keyfile=PRIVATE_KEY_PATH, tls_version=ssl.PROTOCOL_TLSv1_2)

# Conectar al broker
client.connect(ENDPOINT, PORT, 60)
# Create UDP socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((UDP_IP, UDP_PORT))

def send_loc(lat, lon, timestamp):
    mensaje = json.dumps({"Latitude": lat, "Longitude": lon, "TimeStamp": timestamp})
    result = client.publish(TOPIC, mensaje)
    return result.rc == 0

print(f"Listening on UDP port {UDP_PORT}...")

while True:
    data, addr = sock.recvfrom(1024)  # Buffer size is 1024 bytes
    message = data.decode('utf-8')
    lat, lon, timestamp = message.split(';')
    lat = lat.replace(',', '.')
    lon = lon.replace(',', '.')
    if (send_loc(lat, lon, timestamp)):
        print("Envio correcto")
    else: 
        print("Life is pain")   
 
