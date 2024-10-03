import express from 'express';
import { config } from 'dotenv';
import aiRoutes from './routes/aiRoutes.js';
import authRoutes from './routes/authRoutes.js';
// Para pruebas de conexion remota hacia localhost
import ngrok from '@ngrok/ngrok'
// Para manejo de sesiones
import session from 'express-session';

config();

const app = express();
const port = 3000;

app.use(express.json());

// Configuracion motor de vistas
app.set('view engine', 'pug');
app.set('views', './views');

// Configuración de la sesión
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// Definir rutas
app.use('/', aiRoutes);
app.use('/', authRoutes);

app.get("/", (req, res) => {
  res.redirect('/login')
  //res.json({"Mensaje":"Hola IA Calendario"})
})

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

// Conexion a Ngrok. Descomentar para publicar el servidor local y acceder desde internet.
//ngrok.connect({ addr: 3000, authtoken_from_env: true })
//	.then(listener => console.log(`Ingress established at: ${listener.url()}`))
