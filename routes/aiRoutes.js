import { Router } from 'express';
import { generarRespuestaIA } from '../controllers/aiController.js';
import { obtenerHorasDisponibles, crearEvento, consultarAgenda } from '../controllers/aiController.js';
import { google } from 'googleapis';
import fs from 'fs';

const router = Router();

const OAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CAL_CLIENT_ID,
  process.env.GOOGLE_CAL_CLIENT_SECRET,
  process.env.GOOGLE_CAL_REDIRECT_URI
);

// Ruta para conectar calendario de Google Calendar
router.get('/conectar-calendario', (req, res) => {
  // Generate the Google authentication URL
  const url = OAuth2Client.generateAuthUrl({
    access_type: 'offline', // Request offline access to receive a refresh token
    scope:[
      'https://www.googleapis.com/auth/calendar', // Scope for read-only access to the calendar
      'https://www.googleapis.com/auth/userinfo.email' // Scope for access to the user's email
    ]
  });
  // Redirect the user to Google's OAuth 2.0 server
  res.redirect(url);
});

// Ruta para recibir y guardar el token de Google Calendar
router.get('/auth', async (req, res) => {
  const code = req.query.code;

  try {
    const { tokens } = await OAuth2Client.getToken(code);
    OAuth2Client.setCredentials(tokens);   

    // Guardamos el refreshToken en un archivo (ajusta la ruta según tus necesidades)
    fs.writeFileSync('token.json', JSON.stringify(tokens));
    console.log('Token de actualización guardado correctamente');

    res.send('Autenticado correctamente');
  } catch (error) {
    console.error('Error al obtener el token:', error);
    res.status(500).send('Error de autenticación');
  }
});

// Para consultar la disponibilidad en la agenda y responder mediante IA
router.post('/consultar-agenda', async (req, res) => {
  const mensajeUsuario = req.body.mensaje;
  
  try {
    const respuesta = await generarRespuestaIA(mensajeUsuario);
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
