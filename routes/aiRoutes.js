import { Router } from 'express';
import { generarRespuestaIA } from '../controllers/aiController.js';
import { obtenerHorasDisponibles, crearEvento, consultarAgenda } from '../controllers/aiController.js';

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

// Consulta agenda ocupada hoy
router.get('/agenda', async (req,res) => {
  const disponibilidad = await consultarAgenda();
  console.log('Agenda ocupada:', disponibilidad);
  res.json(disponibilidad)
})

// Para crear eventos en google calendar
router.get('/crear-evento', async (req,res) => {
  const evento = await crearEvento();
  console.log('Evento:', evento);
  res.json(evento)
})

// Para validar la agenda disponible en una fecha especifica
router.get('/disponibilidad', async (req, res) => {
  console.log("validando disponibilidad")
  const fecha = req.query.fecha
  const duracion = req.query.duracion
  const horasDisponibles = await obtenerHorasDisponibles(fecha, duracion)
  
  res.send(horasDisponibles)
})

export default router;
