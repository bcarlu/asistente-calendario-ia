
# Proyecto API de Asistente de IA para consultar agenda disponible

Este proyecto es una API que permite interactuar con un asistente de IA que consulta la disponibilidad en la agenda de Google Calendar. La API permite hacer preguntas al asistente de IA para obtener las horas disponibles en una fecha especifica y para un servicio determinado (segun la duracion del servicio). Para ello debes tener una cuenta de pago en OpenaAI y debes crear el asistente el cual debe tener configurada la herramienta de funciones en la cual debe estar configurada la funcion "consultarAgenda" con la siguiente estructura:

```json
{
  "name": "consultarAgenda",
  "description": "Se encarga de consultar la disponibilidad en la agenda, del calendario de google calendar",
  "strict": true,
  "parameters": {
    "type": "object",
    "properties": {
      "fecha": {
        "type": "string",
        "description": "fecha en la cual el usuario desea validar las horas disponibles para reservar una cita."
      },
      "duracion": {
        "type": "number",
        "description": "cantidad de horas que dura el servicio que se desea reservar."
      }
    },
    "required": [
      "fecha",
      "duracion"
    ],
    "additionalProperties": false
  }
}
```
Y adicionalmente agregar las instrucciones en el asistente, que pueden ser:

Eres una asesora de atencion al cliente (mujer) en un salon de belleza encargada de atender las consultas de las clientas y en especial de confirmar la disponibilidad en la agenda (a traves de google calendar) para un servicio en especifico, con el fin de que el cliente pueda saber en cual hora tiene espacio para reservar una cita. Para ello debes:

- Solicitar al usuario la fecha en la que desea validar la disponibilidad y el nombre del servicio, debes solicitar estos 2 datos en la misma respuesta. Indicar al cliente que la fecha la debe suministrar completa con dia mes y año, ejemplo: 9 oct 87 que se refiere al 9 de octubre de 1987.
- Enviar el listado de servicios para que el cliente sepa cual servicio pedir
- Tener presente que el usuario normalmente solo suministra el dia del cual quiere conocer la disponibilidad, por ejemplo "hoy" o "mañana" o 10 de sep, por lo cual debes tener en cuenta el año actual que es 2024 y tener en cuenta que la zona horaria es America/Bogota. Adicionalmente para asegurar que la fecha solicitada sea la correcta
- Cuando el cliente pregunte por la disponibilidad debes llamar a la funcion "consultarAgenda" enviando como parametros la fecha (en formato "año-mes-dia") y la duracion del servicio solicitado, la duracion de los servicio se sumistra mas adelante en estas instrucciones.
- Cuando obtengas la respuesta de la funcion "consultarAgenda" debes crear una respuesta en lenguaje natural para el usuario. Las horas que incluyas en la respuesta deben ser en formato AM y PM, ejemplo las 17:00 son las 5:00PM.

## Requisitos

- Node.js v14 o superior
- Una cuenta y clave API de OpenAI

## Instalación

1. **Clona este repositorio**:

   ```bash
   git clone https://github.com/bcarlu/consulta-agenda-ia-v1
   cd consulta-agenda-ia-v1
   ```

2. **Instala las dependencias**:

   ```bash
   npm install
   ```

3. **Configura las variables de entorno**:

  Crea un archivo `.env` en la raíz del proyecto con las variables de entorno, ejemplo:

  ```plaintext
  OPENAI_API_KEY=tu_clave_api_openai
  ID_ASSISTANT=tu_id_asistente_openai

  GOOGLE_CAL_CLIENT_ID=tu_id_google_calendar
  GOOGLE_CAL_CLIENT_SECRET=tu_client_secret_google_calendar
  GOOGLE_CAL_REDIRECT_URI=http://localhost:3000/auth
  ID_CALENDARIO=id_calendario
   ```

4. **Levantar los servicios usando Docker Compose:**:

   ```bash
   docker-compose up -d
   ```
5. **Si no deseas utilizas docker debes lanzar el servidor y tener configurado mysql localmente**:

   ```bash
   nodemon index.js
   ```

El servidor estará disponible en `http://localhost:3000`.

## Endpoints

### 1. Autenticacion en Google Calendar
- **GET `/conectar-calendario`**: Se debe acceder desde el navegador web (no desde el cliente api como postman o rapidapi) para ser redirigido a la pagina de autenticacion de Google

- **GET `/auth`**: Se utiliza para recibir y guardar el token de Google Calendar en un archivo local (token.json)

### 2. Asistente de IA

- **POST `/consultar-agenda`**: Recibe la pregunta del usuario y lo envía un mensaje al asistente de IA, el cual dependiendo de la pregunta llama a la funcion "consultarAgenda" y segun el resultado envia la respuesta al usuario. El cuerpo de la solicitud debe ser un JSON con el campo `mensaje`.

  Ejemplo de solicitud:

  ```json
  {
    "mensaje": "Que disponibilidad tienen para manicure tradicional para 11 sep 2024?"
  }
  ```

