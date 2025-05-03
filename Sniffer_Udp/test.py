import paho.mqtt.client as mqtt
import ssl
import json
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

# Callback cuando el cliente se conecta al broker
def on_connect(client, userdata, flags, rc):
    print(f"Conectado con el código de resultado: {rc}")
    if rc == 0:
        # Solo se publica el mensaje si la conexión fue exitosa
        mensaje = json.dumps({
            "Longitude": "-74.792736",
            "Latitude": "11.019447",
            "TimeStamp": "2025-06-01 - 21:51:01",
            "Altitude": "30.71"
        })
        result = client.publish(TOPIC, mensaje)
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            print("Mensaje enviado correctamente")
        else:
            print(f"Error al enviar mensaje, código: {result.rc}")
    else:
        print("Error de conexión. No se puede publicar el mensaje.")

# Callback cuando el mensaje se publica
def on_publish(client, userdata, mid):
    print(f"Mensaje publicado con MID: {mid}")

# Crear cliente MQTT
client = mqtt.Client(client_id=CLIENT_ID)

# Configurar SSL
client.tls_set(ROOT_CA_PATH, certfile=CERTIFICATE_PATH, keyfile=PRIVATE_KEY_PATH, tls_version=ssl.PROTOCOL_TLSv1_2)

# Configurar callbacks
client.on_connect = on_connect
client.on_publish = on_publish

# Conectar al broker
client.connect(ENDPOINT, PORT, 60)

# Iniciar el loop en un hilo separado
client.loop_start()

# Enviar mensajes continuamente o de manera interactiva
# Puedes agregar lógica para enviar nuevos mensajes en base a una condición o al input del usuario

# Por ejemplo:
while True:
    input("Presiona Enter para enviar un nuevo mensaje...")
    mensaje = json.dumps({
        "Longitude": "-74.790258",
        "Latitude": "11.016615",
        "TimeStamp": "2025-06-01 - 20:45:01",
        "Altitude": "2.71"
    })
    result = client.publish(TOPIC, mensaje)
    if result.rc == mqtt.MQTT_ERR_SUCCESS:
        print("Mensaje enviado correctamente")
    else:
        print(f"Error al enviar mensaje, código: {result.rc}")
