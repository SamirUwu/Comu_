import paho.mqtt.client as mqtt
import ssl
import json
import socket
from dotenv import load_dotenv
import os

load_dotenv()

ENDPOINT = os.getenv("ENDPOINT")
PORT = int(os.getenv("PORT", 8883))
CLIENT_ID = os.getenv("CLIENT_ID")
TOPIC = os.getenv("TOPIC")
CERTIFICATE_PATH = os.getenv("CERTIFICATE_PATH")
PRIVATE_KEY_PATH = os.getenv("PRIVATE_KEY_PATH")
ROOT_CA_PATH = os.getenv("ROOT_CA_PATH")

UDP_IP = '0.0.0.0'
UDP_PORT = 6565

client = mqtt.Client(client_id=CLIENT_ID)
client.tls_set(ROOT_CA_PATH, certfile=CERTIFICATE_PATH, keyfile=PRIVATE_KEY_PATH, tls_version=ssl.PROTOCOL_TLSv1_2)

# --- Callbacks útiles para debug ---
def on_publish(client, userdata, mid):
    print(f"[MQTT] Mensaje {mid} publicado correctamente")

def on_disconnect(client, userdata, rc):
    print(f"[MQTT] Desconectado con código {rc}")

client.on_publish = on_publish
client.on_disconnect = on_disconnect

# Conectar y empezar loop en segundo plano
client.connect(ENDPOINT, PORT, 60)
client.loop_start()  # ¡Esto es clave!

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((UDP_IP, UDP_PORT))

def send_loc(lat, lon, alt, timestamp):
    mensaje = json.dumps({
        "Latitude": lat,
        "Longitude": lon,
        "Altitude": alt,
        "TimeStamp": timestamp
    })
    result = client.publish(TOPIC, mensaje)
    result.wait_for_publish()  # Esperar confirmación
    return result.is_published()

print(f"Listening on UDP port {UDP_PORT}...")
while True:
    data, addr = sock.recvfrom(1024)
    message = data.decode('utf-8')
    lat, lon, alt, timestamp = message.split(';')
    lat = lat.replace(',', '.')
    lon = lon.replace(',', '.')
    alt = alt.replace(',', '.')

    if send_loc(lat, lon, alt, timestamp):
        print("Envio correcto:", lat, lon, alt, timestamp)
    else:
        print("Life is pain")
