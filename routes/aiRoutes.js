import { Router } from 'express';
import { generarRespuestaIA } from '../controllers/aiController.js';
import { procesarAudio } from '../controllers/audiosAiController.js';
import { obtenerHorasDisponibles, crearEvento, obtenerEventos, obtenerFechaActual } from '../controllers/aiController.js';

import multer from "multer";

const router = Router();

router.get('/chat', ensureAuthenticated, async (req, res) => {
  res.render('chat', { 
    title: 'Chat con Botpress', 
    idUsuario: req.session.user.google_id, 
    idCalendario: req.session.user.email 
  });
});

// Middleware para verificar la autenticación
function ensureAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
}

// Para consultar la disponibilidad en la agenda y responder mediante IA
router.post('/consultar-agenda', async (req, res) => {
  const mensajeUsuario = req.body.mensaje;
  const idUsuario = req.body.idUsuario;
  const idCalendario = req.body.idCalendario
  console.log("google id es:", idUsuario)
  
  try {
    const respuesta = await generarRespuestaIA(mensajeUsuario, idUsuario, idCalendario);
    res.json(respuesta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Configuración de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'uploads/'); // Directorio donde se guardarán los archivos
  },
  filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

router.post('/procesar-audio', upload.single('audio'), procesarAudio);

// Consulta agenda ocupada hoy
router.get('/obtener-eventos', async (req,res) => {
  const idUsuario = req.session.user.google_id 
  const idCalendario = req.session.user.email 
  const fecha = "2024-10-09"
  console.log("usuario para validar agenda:", idUsuario)
  const disponibilidad = await obtenerEventos(idUsuario, idCalendario, fecha );
  console.log('Agenda ocupada:', disponibilidad);
  res.json(disponibilidad)
})

router.get('/get-fecha', async (req,res) => {
  const resultado = await obtenerFechaActual()
  res.send(resultado)
})

// Para crear eventos en google calendar
router.get('/crear-evento', async (req, res) => {
  const fecha = "2024-10-23"; // Fecha en formato string
  const hora = "10:00"; // Hora en formato HH:mm
  const nombre = "Evento prueba rst ia";
  const duracion = 2; // Duración en horas
  const idUsuario = req.session.user.google_id;
  console.log('id usuario para crear evento:', idUsuario)
  const calendario = req.session.user.email;

  try {
    const evento = await crearEvento(fecha, hora, nombre, duracion, idUsuario, calendario);
    console.log('Evento:', evento);
    res.json(evento);
  } catch (error) {
    console.error('Error en la creación del evento:', error);
    res.status(500).json({ error: 'No se pudo crear el evento' });
  }
});

// Para validar la agenda disponible en una fecha especifica
router.get('/disponibilidad', async (req, res) => {
  console.log("validando disponibilidad")
  const fecha = req.query.fecha
  const duracion = req.query.duracion
  const horasDisponibles = await obtenerHorasDisponibles(fecha, duracion)
  
  res.send(horasDisponibles)
})

export default router;
