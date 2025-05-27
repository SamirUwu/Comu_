import paho.mqtt.client as mqtt
import ssl
import json
from dotenv import load_dotenv
import os
import time

load_dotenv()

ENDPOINT = os.getenv("ENDPOINT")
PORT = int(os.getenv("PORT", 8883))
CLIENT_ID = os.getenv("CLIENT_ID")
TOPIC = os.getenv("TOPIC")

CERTIFICATE_PATH = os.getenv("CERTIFICATE_PATH")
PRIVATE_KEY_PATH = os.getenv("PRIVATE_KEY_PATH")
ROOT_CA_PATH = os.getenv("ROOT_CA_PATH")

def on_connect(client, userdata, flags, rc):
    print(f"Conectado con el código de resultado: {rc}")
    if rc == 0:
        mensaje = json.dumps({
            "Longitude": "-74.787693",
            "Latitude": "11.013782",
            "TimeStamp": "2025-05-02 - 21:54:01",
            "Velocity": "20",
            "Altitude": "30.71",
            "StepCount": "100",
        })
        result = client.publish(TOPIC, mensaje)
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            print("Mensaje enviado correctamente")
        else:
            print(f"Error al enviar mensaje, código: {result.rc}")
    else:
        print("Error de conexión. No se puede publicar el mensaje.")

def on_publish(client, userdata, mid):
    print(f"Mensaje publicado con MID: {mid}")
    client.disconnect()  # Cierra la conexión después de publicar

client = mqtt.Client(client_id=CLIENT_ID)
client.tls_set(ROOT_CA_PATH, certfile=CERTIFICATE_PATH, keyfile=PRIVATE_KEY_PATH, tls_version=ssl.PROTOCOL_TLSv1_2)

client.on_connect = on_connect
client.on_publish = on_publish

client.connect(ENDPOINT, PORT, 60)
client.loop_forever()
