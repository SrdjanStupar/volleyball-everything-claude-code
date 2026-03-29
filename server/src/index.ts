import { Server } from 'colyseus';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { VolleyballRoom } from './rooms/VolleyballRoom';

const port = Number(process.env.PORT ?? 2567);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const httpServer = createServer(app);

const gameServer = new Server({ server: httpServer });

gameServer.define('volleyball', VolleyballRoom).filterBy(['code']);

gameServer.listen(port).then(() => {
  console.log(`Volleyball server running on ws://localhost:${port}`);
});
