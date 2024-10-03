import { Router } from 'express';
import { google } from 'googleapis';
import sqlite3 from 'sqlite3';
// Para manipular rutas de los directorios
import path from 'path';
import { fileURLToPath } from 'url';

// Definir filename y dirname para utilizar con path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CAL_REDIRECT_URI
);

const router = Router();

// Conectar a la base de datos
const dbPath = path.join(__dirname, '../', 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
    return;
  }
  console.log('Database connected');

  // Crear la tabla si no existe
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE,
    display_name TEXT,
    email TEXT UNIQUE,
    access_token TEXT UNIQUE
  )`, (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Tabla users creada con exito');
  });
});

/** PRUEBAS */
router.get('/abc', (req, res) => {
  db.all('SELECT * FROM users', (err, rows) => {
    if (err) {
      console.error('Error al obtener los usuarios:', err);
      return res.status(500).send('Error de servidor');
    }

    if (rows.length > 0) {
      // Usuarios encontrados
      res.json({ "resultado": rows });
    } else {
      // No hay usuarios en la base de datos
      res.send("No hay usuarios en la BD");
      console.log("No hay usuarios en la BD");
    }
  });
});
/** FIN PRUEBAS */

// Ruta para iniciar sesion y establecer la variable user en caso de ya haber iniciado sesion
router.get('/login', (req, res) => {
  res.render('login', { title: 'Login / Registro', user: req.session.user ? req.session.user : null });
});

// Ruta para cerrar sesión
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

// Ruta para conectar calendario de Google Calendar
router.get('/auth/google', (req, res) => {
  console.log("Llamando a /auth/google")
  // Generate the Google authentication URL
  const url = OAuth2Client.generateAuthUrl({
    access_type: 'offline', // Request offline access to receive a refresh token
    prompt: 'select_account',
    scope:[
      'https://www.googleapis.com/auth/calendar', // Scope for read-only access to the calendar
      'https://www.googleapis.com/auth/userinfo.email', // Scope for access to the user's email
      'https://www.googleapis.com/auth/userinfo.profile'
    ]
  });
  // Redirect the user to Google's OAuth 2.0 server
  res.redirect(url);
});

// Para recibir y guardar el token de Google Calendar en base de datos 
router.get('/auth/google/callback', async (req, res) => {
  console.log("Llegamos a /auth/google/callback")
  const code = req.query.code;
  const usuario = req.session.user

  try {
    const { tokens } = await OAuth2Client.getToken(code);
    OAuth2Client.setCredentials(tokens);

    // Obtener el perfil del usuario
    const oauth2 = google.oauth2({ version: 'v2', auth: OAuth2Client });
    const { data } = await oauth2.userinfo.get();

    // Datos del usuario
    const google_id = data.id;
    const display_name = data.name;
    const email = data.email;

    // Guardar los datos en la sesión (opcional)
    req.session.user = { google_id, display_name, email };
    console.log("El usuario tiene:", req.session.user)

    // Preparar la consulta SQL (INSERT o UPDATE según sea necesario)
    const sql = `
      INSERT OR REPLACE INTO users (google_id, display_name, email, access_token)
      VALUES (?, ?, ?, ?)
    `;

    // Ejecutar la consulta, asumiendo que tienes los valores de google_id, display_name y email
    db.run(sql, [google_id, display_name, email, JSON.stringify(tokens)], (err) => {
      if (err) {
        console.error('Error al guardar el token:', err);
      } else {
        console.log('Token guardado en la base de datos');
      }
    });

    //db.close(); // Cerrar la conexión a la base de datos

    console.log('Autenticado correctamente');
    res.redirect('/chat');
  } catch (error) {
    console.error('Error al obtener el token:', error);
    res.status(500).send('Error de autenticación');
  }
});

export default router;