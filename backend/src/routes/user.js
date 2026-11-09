import { Router } from 'express';
import { db } from '../db.js';

const r = Router();

r.get('/me', (req, res) => {
  if (!req.user?.uid) return res.status(401).json({ error: 'unauthorized' });
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.uid);
  if (!u) return res.status(404).json({ error: 'not found' });
  const followers = 0; // соцграф — в демо не наполняется
  res.json({
    id: u.id, username: u.username, avatar: u.avatar, about: u.about,
    crystals: u.crystals, streak: u.streak, followers,
    bonusAvailable: u.last_bonus_date !== new Date().toISOString().slice(0, 10),
  });
});

r.put('/me', (req, res) => {
  if (!req.user?.uid) return res.status(401).json({ error: 'unauthorized' });
  const { username, about, avatar } = req.body || {};
  if (username !== undefined) db.prepare('UPDATE users SET username=? WHERE id=?').run(username, req.user.uid);
  if (about !== undefined) db.prepare('UPDATE users SET about=? WHERE id=?').run(about, req.user.uid);
  if (avatar !== undefined) db.prepare('UPDATE users SET avatar=? WHERE id=?').run(avatar, req.user.uid);
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.uid);
  res.json({ ok: true, username: u.username, about: u.about, avatar: u.avatar });
});

// Профиль + список персонажей пользователя (вкладки «Избранные / Мои публичные / Мои приватные»)
r.get('/profile', (req, res) => {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: 'unauthorized' });
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(uid);
  const mine = db.prepare('SELECT * FROM characters WHERE owner_id=? ORDER BY created_at DESC').all(uid);
  const favs = db.prepare(`SELECT c.* FROM favorites f JOIN characters c ON f.character_id=c.id WHERE f.user_id=?`).all(uid);
  res.json({
    username: u.username, avatar: u.avatar, about: u.about, crystals: u.crystals,
    counts: { characters: mine.length, followers: 0, favorites: favs.length },
    mine, favorites: favs,
  });
});

export default r;
