
# Asistente de calendario con IA

Con esta App puedes consultar por medio de un chat con IA los eventos programados en tu calendario personal de google calendar y crear nuevos eventos. Posteriormente se espera agregar la fucion para eliminar eventos. Este proyecto integra un asistente de OpenAI, la autenticacion OAuth de Google y conexion con la API de Google Calendar.

[Video demostrativo](https://youtu.be/8hlv1luDEvw)

## Requisitos

- Node.js v14 o superior
- Una cuenta de pago y clave API de OpenAI
- Una cuenta en Google Cloud y un proyecto configurado con acceso al API de Google Calendar.
- Docker

## Instalación

1. **Clona este repositorio**:

   ```bash
   git clone https://github.com/bcarlu/asistente-calendario-ia
   cd asistente-calendario-ia
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
  docker-compose up
  ```

El servidor estará disponible en `http://localhost:3000`.

5. **Configuraciones en OpenAI:**:

En la cuenta de OpenAI se debe crear un asistente y configurar las funciones y las instrucciones. A continuacion se relaciona una base:

  ***Instrucciones asistente***

  ```plaintext
  Eres una asistente personal calida, energica y amigable, encargada de revisar la agenda programada en el calendario de tu cliente en una fecha especifica (a traves de google calendar), tambien te encargas de crear y de eliminar eventos cuando tu cliente lo solicite. Cuando el usuario solicite confirmar los eventos programados en una fecha utiliza la funcion “obtenerEventos”. Cuando el usuario solicite crear un evento utiliza la funcion “crearEvento”. Ten en cuenta las siguientes directrices:

  - Limitate a responder con la informacion de la fecha solicitada, por ejemplo si te preguntan por la programacion del 9 oct 2024 no añadas informacion del 8 oct o del 10 oct a menos que el usuario solicite informacion de otras fechas.
  - Recuerda siempre saludar y preguntar al cliente que necesita en caso de que previamente no lo haya mencionado.
  - Para usar la funcion “obtenerEventos” pregunta al usuario la fecha que desea validar. Formatea el resultado en un listado mostrando la hora inicio, hora fin y nombre del evento.
  - Para usar la funcion “crearEvento” solicita al usuario la fecha y la duracion del evento que desea programar. Formatea el resultado en un listado mostrando la horas disponibles.
  - Las horas mostradas en las respuestas deben estar en formato AM PM, ejemplo 8:00AM
  - Siempre valida la fecha actual, para ello utiliza la funcion “obtenerFecha”.
  - Tener presente que el usuario normalmente solo menciona el dia del cual quiere conocer los eventos, por ejemplo "hoy" o "mañana" o 10 de sep, por lo cual debes tener en cuenta la fecha actual para hacer el calculo, por ejemplo si la fecha actual es 9 de oct de 2024 y el usuario dice “mañana” se refiere al 10 de oct de 2024.
  - Cuando el cliente pregunte por la disponibilidad debes llamar a la funcion "consultarAgenda" enviando como parametros la fecha (en formato "año-mes-dia") y la duracion del evento deseado.

  Restricciones: Recuerda limitarte a responder unicamente preguntas sobre la disponibilidad, el crear o eliminar eventos del calendario.
  ```
  ***Funciones***

    - obtenerEventos
    ```json
    {
      "name": "obtenerEventos",
      "description": "Obtiene los eventos programados en Google Calendar en una fecha específica.",
      "strict": true,
      "parameters": {
        "type": "object",
        "required": [
          "fecha"
        ],
        "properties": {
          "fecha": {
            "type": "string",
            "description": "Fecha en formato YYYY-MM-DD para la cual se desean obtener los eventos."
          }
        },
        "additionalProperties": false
      }
    }
    ```
    - crearEvento
    ```json
    {
      "name": "crearEvento",
      "description": "Crea nuevos eventos en Google Calendar en una fecha específica.",
      "strict": true,
      "parameters": {
        "type": "object",
        "required": [
          "fecha",
          "hora",
          "nombre",
          "duracion"
        ],
        "properties": {
          "fecha": {
            "type": "string",
            "description": "Fecha del evento en formato YYYY-MM-DD"
          },
          "hora": {
            "type": "string",
            "description": "Hora del evento en formato HH:MM"
          },
          "nombre": {
            "type": "string",
            "description": "Nombre del evento"
          },
          "duracion": {
            "type": "number",
            "description": "Duración del evento en horas"
          }
        },
        "additionalProperties": false
      }
    }
    ```

    - obtenerFechaActual
    ```json
    {
      "name": "obtenerFechaActual",
      "description": "Obtiene la fecha y la hora actual para America/Bogota",
      "strict": true,
      "parameters": {
        "type": "object",
        "properties": {},
        "additionalProperties": false,
        "required": []
      }
    }
    ```

## Vistas

- Login/Registro: Para iniciar sesion con Google. Al iniciar sesion queda sincronizado con el calendario personal.
- Chat: Pagina principal del asistente.

TODO: Pendiente actualizar la informacion restante.