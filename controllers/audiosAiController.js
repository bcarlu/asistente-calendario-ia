import fs from "fs";
import OpenAI from "openai";
import { generarRespuestaIA } from './aiController.js';

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

// Ruta y nombre donde se almacenara el audio generado como respuesta
//const speechFile = path.resolve("./charla.mp3");

// Funcion para generar audio desde texto
export async function crearAudioDesdeTexto(texto) {
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "alloy",
    input: texto,
  });
  const audioBuffer = Buffer.from(await mp3.arrayBuffer());
  //await fs.promises.writeFile(speechFile, audioBuffer); // Para almacenar el audio
  return audioBuffer;
}

// Función para convertir el audio en texto
export async function transcribirAudio(idCalendario, audio) {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream("uploads/" + idCalendario + "/" + audio),
      model: "whisper-1",
    });
    return transcription.text
  } catch (error) {
    console.error("Error en transcribirAudio:", error);
    throw new Error("Ocurrió un error al procesar el audio");
  }
}

export async function procesarAudio(req, res) {
  
  if (!req.file) {
    return res.status(400).send('No se recibió ningún archivo de audio.');
  }

  const audioFile = req.file.filename;
  const idUsuario = req.body.idUsuario;
  const idCalendario = req.body.idCalendario;

  // Aquí se convierte el audio del mensaje del usuario en texto
  const mensajeUsuarioTexto = await transcribirAudio(idCalendario, audioFile);
  const infoParaAsistente = "NOTA: Este texto proviene de un audio"
  const textoParaAsistente = mensajeUsuarioTexto.concat(" ", infoParaAsistente)
  
  console.log("Texto del audio generado:", textoParaAsistente);

  // Enviar mensaje del usuario en texto al asistente
  const data = await generarRespuestaIA(textoParaAsistente, idUsuario, idCalendario);
  
  if (data && data.respuesta && data.respuesta[0] && data.respuesta[0].content[0].text.value) {
    console.log("La respuesta del asistente es:", data.respuesta[0].content[0].text.value)
    const respuestaAsistente = data.respuesta[0].content[0].text.value;
    // y luego enviando ese texto a tu sistema de procesamiento de lenguaje natural
    const respuestaEnAudio = await crearAudioDesdeTexto(respuestaAsistente)
    // Enviar el audio al cliente como archivo de audio
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': 'inline; filename="respuesta.mp3"',
    });
    res.send(respuestaEnAudio);
  } else {
    console.log('Error en la creación del audio');
    res.status(500).json({ error: 'No se pudo procesar el audio' });
  }
}

export function eliminarDirAudiosUsuario (usuario) {
  const dirUsuario = path.join(__dirname, '../', 'uploads/', usuario);

  try {
    fs.rm(dirUsuario, { recursive: true, force: true }, function (err) {
      if (err) {
        console.error('Error al eliminar el directorio del usuario:', err);
      } else{
        console.log('Directorio del usuario %s borrado con exito!', usuario);
      }      
    });
  } catch (error) {
    console.error('CATCH: Error al eliminar el directorio:', error);
    throw new Error("Error al eliminar el directorio del usuario");
  }

}