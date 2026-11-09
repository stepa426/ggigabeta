import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';

const r = Router();

r.get('/', (req, res) => {
  const { q, category, mine } = req.query;
  let rows;
  if (mine === '1' && req.user?.uid) {
    rows = db.prepare('SELECT * FROM characters WHERE owner_id=? ORDER BY created_at DESC').all(req.user.uid);
  } else if (q) {
    rows = db.prepare("SELECT * FROM characters WHERE is_public=1 AND (name LIKE ? OR kind LIKE ? OR category LIKE ?) ORDER BY likes DESC").all(`%${q}%`, `%${q}%`, `%${q}%`);
  } else if (category && category !== 'Все') {
    rows = db.prepare('SELECT * FROM characters WHERE is_public=1 AND category=? ORDER BY likes DESC').all(category);
  } else {
    rows = db.prepare('SELECT * FROM characters WHERE is_public=1 ORDER BY likes DESC').all();
  }
  const favs = req.user?.uid
    ? new Set(db.prepare('SELECT character_id FROM favorites WHERE user_id=?').all(req.user.uid).map((x) => x.character_id))
    : new Set();
  res.json(rows.map((c) => ({ ...c, can_draw: !!c.can_draw, is_favorite: favs.has(c.id) })));
});

r.get('/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM characters WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'not found' });
  res.json({ ...c, can_draw: !!c.can_draw });
});

// Создание/обновление персонажа
function validate(body) {
  if (!body.name || !body.name.trim()) return 'Введите имя персонажа';
  if (!body.persona || body.persona.trim().length < 5) return 'Опишите «Характер и поведение» (минимум 5 символов)';
  return null;
}

r.post('/', (req, res) => {
  if (!req.user?.uid) return res.status(401).json({ error: 'unauthorized' });
  const err = validate(req.body || {});
  if (err) return res.status(400).json({ error: err });
  const b = req.body;
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO characters (id, owner_id, name, kind, gender, about, greeting, persona, can_draw, avatar, category, is_public)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, req.user.uid, b.name.trim(), b.kind || '', b.gender || 'Не указан', b.about || '', b.greeting || '',
      b.persona.trim(), b.can_draw ? 1 : 0, b.avatar || null, b.category || 'Разное', b.is_public ? 1 : 0);
  const c = db.prepare('SELECT * FROM characters WHERE id=?').get(id);
  res.json({ ...c, can_draw: !!c.can_draw });
});

r.put('/:id', (req, res) => {
  if (!req.user?.uid) return res.status(401).json({ error: 'unauthorized' });
  const c = db.prepare('SELECT * FROM characters WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'not found' });
  if (c.owner_id !== req.user.uid) return res.status(403).json({ error: 'не ваш персонаж' });
  const err = validate(req.body || {});
  if (err) return res.status(400).json({ error: err });
  const b = req.body;
  db.prepare(`UPDATE characters SET name=?, kind=?, gender=?, about=?, greeting=?, persona=?, can_draw=?, avatar=?, category=?, is_public=? WHERE id=?`)
    .run(b.name.trim(), b.kind || '', b.gender || 'Не указан', b.about || '', b.greeting || '', b.persona.trim(),
      b.can_draw ? 1 : 0, b.avatar || null, b.category || 'Разное', b.is_public ? 1 : 0, req.params.id);
  const fresh = db.prepare('SELECT * FROM characters WHERE id=?').get(req.params.id);
  res.json({ ...fresh, can_draw: !!fresh.can_draw });
});

r.delete('/:id', (req, res) => {
  if (!req.user?.uid) return res.status(401).json({ error: 'unauthorized' });
  const c = db.prepare('SELECT * FROM characters WHERE id=?').get(req.params.id);
  if (!c || c.owner_id !== req.user.uid) return res.status(403).json({ error: 'не ваш персонаж' });
  db.prepare('DELETE FROM characters WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

r.post('/:id/favorite', (req, res) => {
  if (!req.user?.uid) return res.status(401).json({ error: 'unauthorized' });
  const id = req.params.id;
  const fav = db.prepare('SELECT 1 FROM favorites WHERE user_id=? AND character_id=?').get(req.user.uid, id);
  if (fav) {
    db.prepare('DELETE FROM favorites WHERE user_id=? AND character_id=?').run(req.user.uid, id);
    return res.json({ is_favorite: false });
  }
  db.prepare('INSERT INTO favorites (user_id, character_id) VALUES (?,?)').run(req.user.uid, id);
  res.json({ is_favorite: true });
});

export default r;
