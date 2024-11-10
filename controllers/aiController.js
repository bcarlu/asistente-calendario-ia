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

// Almacén para los hilos de cada usuario (en memoria, solo para pruebas)
const userThreads = {}; 

// Función para eliminar el hilo del usuario cuando cierre sesión
export const eliminarThreadDeUsuario = (idUsuario) => {
  console.log("Hilos actuales:", userThreads);
  if (userThreads[idUsuario]) {
    delete userThreads[idUsuario];
    console.log(`Hilo del usuario con id ${idUsuario} eliminado.`);
    console.log("Quedan estos hilos:", userThreads);
  } else {
    console.log(`No se encontró un hilo para el usuario con id ${idUsuario}.`);
  }
};

// Funcion principal para generar respuestas IA basado en la pregunta de un usuario
export const generarRespuestaIA = async (mensajeUsuario, idUsuario, idCalendario) => {
  console.log("Mensaje del usuario:", mensajeUsuario);
  console.log("Hilos actuales:", userThreads);

  try {
    // Verificar si el usuario ya tiene un hilo existente
    let threadId = userThreads[idUsuario];

    // Si no hay un hilo para este usuario, crear uno nuevo
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      // Almacenar el thread.id para este usuario
      userThreads[idUsuario] = threadId;
    }

    // Crear un nuevo hilo (thread)
    //const thread = await openai.beta.threads.create();

    // Enviar el mensaje del usuario al asistente
    const message = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: mensajeUsuario,
    });

    // Iniciar una ejecución (run)
    let run = await openai.beta.threads.runs.createAndPoll(threadId, {
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
            // Obtener fecha actual
            if (tool.function.name === "obtenerFechaActual") {
              const resultado = await obtenerFechaActual();                
              console.log("Fecha actual:", resultado);
              return {
                tool_call_id: tool.id,
                output: resultado,
              };              
            }

            // Obtener eventos del calendario
            if (tool.function.name === "obtenerEventos") {
              const args = JSON.parse(tool.function.arguments); // Asegúrate de que los argumentos estén en formato JSON
              const fecha = args.fecha;
              console.log("La fecha para obtener eventos es:", fecha)
              const resultado = await obtenerEventos(idUsuario, idCalendario, fecha);                
              console.log("Resultado de obtenerEventos:", resultado);
              return {
                tool_call_id: tool.id,
                output: JSON.stringify(resultado),
              };              
            }

            // Crear evento en el calendario
            if (tool.function.name === "crearEvento") {
              const args = JSON.parse(tool.function.arguments); // Asegúrate de que los argumentos estén en formato JSON
              const fecha = args.fecha;
              const hora = args.hora;
              const nombre = args.nombre;
              const duracion = args.duracion;
              console.log("La fecha del cliente es:", fecha)
              console.log("La hora del cliente es:", hora)
              console.log("El nombre del evento es:", nombre)
              console.log("La duracion es:", duracion)
              const resultado = await crearEvento(fecha, hora, nombre, duracion, idUsuario, idCalendario);                
              console.log("Resultado de crearEvento:", resultado);
              return {
                tool_call_id: tool.id,
                output: JSON.stringify(resultado),
              };              
            }

            // Eliminar evento del calendario
            if (tool.function.name === "eliminarEvento") {
              const args = JSON.parse(tool.function.arguments); // Asegúrate de que los argumentos estén en formato JSON
              const idEvento = args.idEvento;
              console.log("id evento a eliminar es:", idEvento)
              const resultado = await eliminarEvento(idUsuario, idEvento, idCalendario);                
              console.log("Evento eliminado:", resultado);
              return {
                tool_call_id: tool.id,
                output: JSON.stringify(resultado),
              };              
            }
          })
        );

        if (toolOutputs.length > 0) {
          run = await openai.beta.threads.runs.submitToolOutputsAndPoll(threadId, run.id, { tool_outputs: toolOutputs });
          console.log("Tool outputs submitted successfully.");
        } else {
          console.log("No tool outputs to submit.");
        }

        return handleRunStatus(run);
      }
    };

    const handleRunStatus = async (run) => {
      if (run.status === "completed") {
        const messages = await openai.beta.threads.messages.list(threadId);
        console.log(messages.data);
        return { respuesta: messages.data };
      } else if (run.status === "requires_action") {
        const accionRequerida = run.required_action.submit_tool_outputs.tool_calls.map(async (tool) => {return tool.function})
        console.log("Ejecutando acciones requeridas:", accionRequerida);
        return await handleRequiresAction(run);
      } else {
        console.error("Run no se completo:", run);
      }
    };

    return await handleRunStatus(run);
  } catch (error) {
    //TODO: Agregar metodo para cancelar el run actual https://platform.openai.com/docs/api-reference/runs/cancelRun
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
    //console.log("token obtenido es:", token)
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

// Funcion para crear eventos
export async function crearEvento(fecha, hora, nombre, duracion, idUsuario, calendario) {
  const auth = await autenticar(idUsuario);
  const idCalendario = calendario || process.env.ID_CALENDARIO;
  const calendar = google.calendar({ version: 'v3', auth });
  
  const fechaInicio = new Date(fecha.concat(" ", hora))
  const fechaFin = new Date(fechaInicio); // Copiar la fecha de inicio
  fechaFin.setHours(fechaInicio.getHours() + duracion); // Sumar la duración
  console.log("Fecha de inicio:", fechaInicio);
  console.log("Fecha de fin:", fechaFin);

  // Crear el evento
  const event = {
    summary: nombre,
    start: {
      dateTime: fechaInicio.toISOString(), // Formato ISO para Google Calendar
      timeZone: 'America/Bogota' // Ajusta la zona horaria según tu ubicación
    },
    end: {
      dateTime: fechaFin.toISOString(), // Formato ISO para Google Calendar
      timeZone: 'America/Bogota'
    }
  };

  try {
    const response = await calendar.events.insert({
      calendarId: idCalendario,
      requestBody: event
    });
    console.log('Evento creado:', response.data);
    return response.data;

  } catch (error) {
    console.error('Error al crear el evento:', error);
    throw new Error('No se pudo crear el evento');
  }
}

// Funcion para obtener los eventos programados en el calendario
export async function obtenerEventos(idUsuario, idCalendario, fecha) {
  const auth = await autenticar(idUsuario);
  const disponibilidad = await getEventos(auth, idCalendario, fecha);
  console.log('Eventos programados:', disponibilidad);
  return disponibilidad
}

export async function obtenerFechaActual(){
  //Fecha y hora para Colombia. Pendiente configurar dinamicamente para el pais desde el cual se consulta
  const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })
  return fecha
}

// Funcion para consultar la agenda y obtener la disponibilidad. Se usa para pruebas
// Pendiente agregar el idCalendario del usuario logueado
export async function getEventos(auth, calendario, fecha) {
  const calendar = google.calendar({ version: 'v3', auth });
  const idCalendario = calendario;
  const horaInicio = "00:00"
  const fechaInicio = new Date(fecha.concat(" ", horaInicio))
  const fechaFin = new Date(fechaInicio); // Copiar la fecha de inicio
  fechaFin.setHours("23","59"); // Sumar la duración
  console.log("Fecha inicio obtener eventos:", fechaInicio);
  console.log("Fecha de fin obtener eventos:", fechaFin);

  try {
    const response = await calendar.events.list({
      calendarId: idCalendario,
      timeMin: fechaInicio.toISOString(),
      timeMax: fechaFin.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items;
    
    if (events.length) {
      return events.map(event => (
        {
        nombre: event.summary,
        inicio: event.start.dateTime || event.start.date,
        fin: event.end.dateTime || event.end.date,
        id: event.id
      }));
    } else {
      console.log('No se encontraron eventos para la fecha especificada.');
      return [];
    }

  } catch (error) {
    console.error('Error al consultar los eventos:', error);
    throw error;
  }
}

// Función para eliminar eventos
export async function eliminarEvento(idUsuario, idEvento, calendario) {
  const auth = await autenticar(idUsuario);
  const idCalendario = calendario || process.env.ID_CALENDARIO;
  const calendar = google.calendar({ version: 'v3', auth });

  try {
    const response = await calendar.events.delete({
      calendarId: idCalendario,
      eventId: idEvento
    });

    console.log('Evento eliminado:', idEvento);
    return { success: true, message: 'Evento eliminado con éxito' };

  } catch (error) {
    console.error('Error al eliminar el evento:', error);
    throw new Error('No se pudo eliminar el evento');
  }
}