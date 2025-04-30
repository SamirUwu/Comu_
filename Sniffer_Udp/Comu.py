import paho.mqtt.client as mqtt
import ssl
import json
import socket
import os
from dotenv import load_dotenv
import os

load_dotenv()  # Carga las variables del .env

ENDPOINT = os.getenv("ENDPOINT")
PORT = int(os.getenv("PORT", 8883))  # Valor por defecto si no está en el .env
CLIENT_ID = os.getenv("CLIENT_ID")
TOPIC = os.getenv("TOPIC")

CERTIFICATE_PATH = os.getenv("CERTIFICATE_PATH")
PRIVATE_KEY_PATH = os.getenv("PRIVATE_KEY_PATH")
ROOT_CA_PATH = os.getenv("ROOT_CA_PATH")

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

def send_loc(lat, lon, alt, timestamp):
    mensaje = json.dumps({"Latitude": lat, "Longitude": lon, "Altitude": alt, "TimeStamp": timestamp})
    result = client.publish(TOPIC, mensaje)
    return result.rc == 0

print(f"Listening on UDP port {UDP_PORT}...")

while True:
    data, addr = sock.recvfrom(1024)  # Buffer size is 1024 bytes
    message = data.decode('utf-8')
    lat, lon, alt, timestamp = message.split(';')
    lat = lat.replace(',', '.')
    lon = lon.replace(',', '.')
    alt = alt.replace(',', '.')
    if (send_loc(lat, lon, alt, timestamp)):
        print("Envio correcto")
    else: 
        print("Life is pain")   
 
