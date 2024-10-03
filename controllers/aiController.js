import OpenAI from "openai";
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import sqlite3 from 'sqlite3';
// Para manipular rutas de los directorios
import path from 'path';
import { fileURLToPath } from 'url';

// Definir filename y dirname para utilizar con path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Para Open AI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ID asistente de OpenAI
const idAsistente = process.env.ID_ASSISTANT;

// Archivo para guardar el token de Google Calendar
const TOKEN_PATH = 'token.json';

// Funcion principal para generar respuestas IA basado en la pregunta de un usuario
export const generarRespuestaIA = async (mensajeUsuario, idUsuario, idCalendario) => {
  console.log("Mensaje del usuario:", mensajeUsuario);

  try {
    // Crear un nuevo hilo (thread)
    const thread = await openai.beta.threads.create();

    // Enviar el mensaje del usuario al asistente
    const message = await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: mensajeUsuario,
    });

    // Iniciar una ejecución (run)
    let run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: idAsistente,
    });

    // Manejar la acción requerida
    const handleRequiresAction = async (run) => {
      if (
        run.required_action &&
        run.required_action.submit_tool_outputs &&
        run.required_action.submit_tool_outputs.tool_calls
      ) {
        const toolOutputs = await Promise.all(
          run.required_action.submit_tool_outputs.tool_calls.map(async (tool) => {
            if (tool.function.name === "consultarAgenda") {
              const args = JSON.parse(tool.function.arguments); // Asegúrate de que los argumentos estén en formato JSON
              const fecha = args.fecha;              
              const duracion = args.duracion;

              console.log("La fecha del cliente es:", fecha)

              //const resultado = await consultarAgenda();
              const resultado = await obtenerHorasDisponibles(fecha, duracion, idUsuario, idCalendario);                
              console.log("Resultado consulta dentro de run:", resultado);
              return {
                tool_call_id: tool.id,
                output: JSON.stringify(resultado),
              };              
            }
          })
        );

        if (toolOutputs.length > 0) {
          run = await openai.beta.threads.runs.submitToolOutputsAndPoll(thread.id, run.id, { tool_outputs: toolOutputs });
          console.log("Tool outputs submitted successfully.");
        } else {
          console.log("No tool outputs to submit.");
        }

        return handleRunStatus(run);
      }
    };

    const handleRunStatus = async (run) => {
      if (run.status === "completed") {
        const messages = await openai.beta.threads.messages.list(thread.id);
        console.log(messages.data);
        return { respuesta: messages.data };
      } else if (run.status === "requires_action") {
        console.log("Ejecutando acciones requeridas:", run.status);
        return await handleRequiresAction(run);
      } else {
        console.error("Run no se completo:", run);
      }
    };

    return await handleRunStatus(run);
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Ocurrió un error al procesar la consulta");
  }
};

// Funcion para obtener la disponibilidad segun la fecha y duracion del evento.
export async function obtenerHorasDisponibles(fecha, duracionEvento, idUsuario, Calendario) {
  const auth = await autenticar(idUsuario)
  const calendar = google.calendar({ version: 'v3', auth });
  const idCalendario = Calendario || process.env.ID_CALENDARIO;
  const duracion = parseInt(duracionEvento)
  // Definir los horarios permitidos
  const horarioInicio = 8; // 8 AM
  const horarioFin = 17; // 5 PM

  // Convertir la fecha a un objeto Date
  const fechaObj = new Date(fecha);

  // Crear el rango de tiempo para la consulta
  const timeMin = new Date(fechaObj.getFullYear(), fechaObj.getMonth(), fechaObj.getDate(), horarioInicio, 0, 0).toISOString();
  //const timeMax = new Date(fechaObj.getFullYear(), fechaObj.getMonth(), fechaObj.getDate(), horarioFin, 0, 0).toISOString();
  const timeMax = new Date(fechaObj.getFullYear(), fechaObj.getMonth(), fechaObj.getDate() + 1, horarioFin, 0, 0).toISOString();
  console.log("timemin:", timeMin)
  console.log("timemax:", timeMax)
  try {
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin,
          timeMax: timeMax,
          timeZone: 'America/Bogota',
          items: [{ id: idCalendario }]
        }
      });

      // Agenda ocupada
      const busyTimes = response.data.calendars[idCalendario].busy;
      console.log("Agenda ocupada:", busyTimes)

      // Filtrar los horarios disponibles considerando la duración del evento
      const horasDisponibles = [];
      let horaActual = horarioInicio;
      //console.log("Hora actual", horaActual)
      //console.log("Horario fin", horarioFin)
      while (horaActual <= horarioFin ) {    
          let disponible = true;
          busyTimes.forEach(busy => {
              // Se restan 5 horas al resultado porque viene en UTC
              const busyStart = new Date(busy.start).getHours() - 5;
              const busyEnd = new Date(busy.end).getHours() - 5;  

              // Comparación más precisa considerando la duración del evento
            if (horaActual >= busyStart && horaActual < busyEnd ||
              horaActual < busyStart && horaActual + duracion > busyStart || horaActual + duracion > busyStart && horaActual + duracion <= busyEnd) {
                disponible = false;            
            }
          });

          if (disponible) {
              horasDisponibles.push(horaActual);
              
          }
          horaActual ++;
      }

      console.log("horas disponibles:", horasDisponibles)
      return horasDisponibles;
  } catch (error) {
      console.error('Error al consultar la disponibilidad:', error);
      return null;
  }
}

export async function autenticar(idUsuario) {
  try {
    const oAuth2Client = new OAuth2Client(
      process.env.GOOGLE_CAL_CLIENT_ID,
      process.env.GOOGLE_CAL_CLIENT_SECRET,
      process.env.GOOGLE_CAL_REDIRECT_URI
    );
    
    const usuario = idUsuario
    const token = await obtenerTokenBd(usuario)
    console.log("token obtenido es:", token)
    oAuth2Client.setCredentials(JSON.parse(token));
    //console.log("Autenticando", JSON.parse(token))
    
    return oAuth2Client;
  } catch (error) {
    console.log("Hubo un error", error)
  }
}

export async function obtenerTokenBd(idUsuario) {
  return new Promise((resolve, reject) => {
    const userId = idUsuario;

    // Conectar a la base de datos
    const dbPath = path.join(__dirname, '../', 'users.db');
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(new Error('Error al conectar a la base de datos'));
      } else {
        console.log('Conectado a la db');
        db.get('SELECT access_token FROM users WHERE google_id = ?', [userId], (err, row) => {
          db.close(); // Cerrar la conexión después de cada consulta
          if (err) {
            reject(new Error('Error al obtener el token'));
          } else if (!row) {
            reject(new Error('Usuario no encontrado'));
          } else {
            resolve(row.access_token); // Resolver con solo el token
          }
        });
      }
    });
  });
}

// Funcion para crear eventos. Se usa para pruebas, y se espera implementar con la IA para crearlos por solicitud del usuario.
export async function crearEvento() {
  const auth = await autenticar();
  const idCalendario = process.env.ID_CALENDARIO;
  const calendar = google.calendar({ version: 'v3', auth });
  const event = {
    summary: 'Evento de prueba',
    start: {
      dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      timeZone: 'America/Bogota' // Ajusta la zona horaria según tu ubicación
    },
    end: {
      dateTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      timeZone: 'America/Bogota'
    }
  };

  try {
    const response = await calendar.events.insert({
      calendarId: idCalendario,
      requestBody: event
    });
    console.log('Evento creado:', response.data);

  } catch (error) {
    console.error('Error al crear el evento:', error);
  }
}

// Funcion para consultar la agenda y obtener la disponibilidad. Se usa para pruebas
// Pendiente complementar el idUsuario en la ruta /agenda
export async function consultarAgenda(idUsuario) {
  const auth = await autenticar(idUsuario);
  const disponibilidad = await consultarDisponibilidad(auth);
  console.log('Agenda ocupada:', disponibilidad);
  return disponibilidad
}

// Funcion para consultar la agenda y obtener la disponibilidad. Se usa para pruebas
// Pendiente agregar el idCalendario del usuario logueado
export async function consultarDisponibilidad(auth) {
  const calendar = google.calendar({ version: 'v3', auth });
  const idCalendario = process.env.ID_CALENDARIO;

  // Fecha de inicio y fin
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + 3); // Suma 3 días a la fecha de inicio
  console.log("Inicio:",startDate.toISOString())
  console.log("Fin:",endDate.toISOString())

  try {
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        timeZone: 'America/Bogota',
        items: [{ id: idCalendario }]
      }
    });

    // Procesar la respuesta
    const busyTimes = response.data.calendars[idCalendario].busy;
    return busyTimes;

  } catch (error) {
    console.error('Error al consultar la disponibilidad:', error);
  }
}