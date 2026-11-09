import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, initDb } from './db.js';
import { authMiddleware } from './routes/auth.js';
import authRoutes from './routes/auth.js';
import characterRoutes from './routes/characters.js';
import chatRoutes from './routes/chat.js';
import userRoutes from './routes/user.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

initDb();

// JWT-разбор для всех API-маршрутов (req.user или гость)
app.use('/api', authMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/user', userRoutes);

// health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// serve built frontend (production)
const dist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(dist));
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(dist, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`GIGA backend running on :${PORT}`));
