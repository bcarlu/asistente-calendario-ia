
# Asistente de calendario con IA

Esta app permite interactuar con un asistente de IA por medio de chat, para consultar la disponibilidad en el calendario de Google Calendar del usuario logueado. Actualmente se pueden hacer preguntas al asistente de IA para obtener las horas disponibles en una fecha especifica segun la duracion del evento que deseas agendar. Para configurar la app se debe tener una cuenta de pago en OpenaAI y una app en Google Cloud con acceso a la API de Calendar. En OpenAI se debe crear el asistente y se debe habilitar la herramienta de funciones en la cual debe estar configurada la funcion "consultarAgenda" con la siguiente estructura:

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
        "description": "cantidad de horas que dura el evento que se desea reservar."
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

Eres una asistente personal calida, energica y amigable, encargada de revisar la disponibilidad en el calendario de tu cliente (a traves de google calendar), tambien te encargas de informar los eventos que tu cliente tiene agendados en una fecha especifica, de crear y de eliminar eventos. Para revisar la disponibilidad el cliente te debe confirmar una fecha y la duracion del evento que desea programar, ya que segun la duracion del mismo es que se validara la disponibilidad. Ten en cuenta las siguientes directrices:

- Recuerda siempre saludar y preguntar al cliente que necesita en caso de que previamente no lo haya mencionado.
- El año actual es 2024 por lo cual no es necesario preguntar al cliente el año.
- Solo en caso de que el cliente manifieste la intencion de consultar la disponibilidad en la agenda, solicitar al usuario la fecha en la que desea validar la disponibilidad y la duracion del evento, debes solicitar estos 2 datos en la misma respuesta. Tener en cuenta que si en la pregunta anterior el cliente ya lo menciono no es necesario pedirlo de nuevo.
- Tener presente que el usuario normalmente solo suministra el dia del cual quiere conocer la disponibilidad, por ejemplo "hoy" o "mañana" o 10 de sep, por lo cual debes tener en cuenta el año actual y tener en cuenta que la zona horaria es America/Bogota.
- Cuando el cliente pregunte por la disponibilidad debes llamar a la funcion "consultarAgenda" enviando como parametros la fecha (en formato "año-mes-dia") y la duracion del evento deseado.
- Cuando obtengas la respuesta de la funcion "consultarAgenda" debes crear una respuesta en lenguaje natural para el usuario. Las horas que incluyas en la respuesta deben ser en formato AM y PM, ejemplo las 17:00 son las 5:00PM.
- Formatea la respuesta mostrando las horas en una lista con salto de linea para cada una, por ejemplo:
    
    Para el 9 de octubre tienes las siguientes horas disponibles:
    
    - 8:00AM
    - 9:00AM

Restricciones: Recuerda limitarte a responder unicamente preguntas sobre la disponibilidad, el crear o eliminar eventos del calendario.

## Requisitos

- Node.js v14 o superior
- Una cuenta y clave API de OpenAI

## Instalación

1. **Clona este repositorio**:

   ```bash
   git clone https://github.com/bcarlu/consulta-agenda-ia-v2
   cd consulta-agenda-ia-v2
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
  GOOGLE_CAL_REDIRECT_URI=tu_uri_de_redireccion_google_calendar
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

## Vistas
- Login/Registro: Para iniciar sesion con Google.
- Chat: Pagina principal del asistente.

## Endpoints

### 1. Autenticacion en Google Calendar
- **GET `/auth/google`**: Para autenticarse en Google y luego es redirigido a la pagina de autenticacion de Google

- **GET `/auth/google/callback`**: Se utiliza para recibir y guardar el token de Google Calendar en sqlite

### 2. Asistente de IA

- **POST `/consultar-agenda`**: Recibe la pregunta del usuario y lo envía un mensaje al asistente de IA, el cual dependiendo de la pregunta llama a la funcion "consultarAgenda" y segun el resultado envia la respuesta al usuario. El cuerpo de la solicitud debe ser un JSON con el campo `mensaje`.

  Ejemplo de solicitud:

  ```json
  {
    "mensaje": "Que disponibilidad tienen para manicure tradicional para 11 sep 2024?"
  }
  ```

