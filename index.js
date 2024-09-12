import express from 'express';
import { config } from 'dotenv';
import aiRoutes from './routes/aiRoutes.js';
import ngrok from '@ngrok/ngrok'

config();

const app = express();
const port = 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({"Mensaje":"Hola mundo IA"})
})

app.use('/', aiRoutes);

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

// Conexion a Ngrok. Descomentar para publicar el servidor local y acceder desde internet.
//ngrok.connect({ addr: 3000, authtoken_from_env: true })
//	.then(listener => console.log(`Ingress established at: ${listener.url()}`))