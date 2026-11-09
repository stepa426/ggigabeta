import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Router } from 'express';
import { db } from '../db.js';

const r = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const DAILY_BONUS = parseInt(process.env.CRYSTALS_DAILY_BONUS || '50', 10);
const ALLOW_DEV_LOGIN = process.env.ALLOW_DEV_LOGIN !== '0';

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function sign(user) {
  return jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: '30d' });
}

function upsertUser(provider, providerId, username, avatar) {
  let u = db.prepare('SELECT * FROM users WHERE provider_id=?').get(providerId);
  if (!u) {
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO users (id, provider, provider_id, username, avatar, crystals) VALUES (?,?,?,?,?,0)')
      .run(id, provider, providerId, username, avatar || null);
    u = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  } else if (username && u.username !== username) {
    db.prepare('UPDATE users SET username=? WHERE id=?').run(username, u.id);
  }
  return u;
}

function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    avatar: u.avatar,
    about: u.about,
    crystals: u.crystals,
    streak: u.streak,
    bonusAvailable: u.last_bonus_date !== todayUTC(),
  };
}

// ---- Google OAuth (client-side token flow) ----
// Клиент присылает google id_token (credential из Google Identity Services).
// Проверяем подпись через tokeninfo-эндпоинт (достаточно для веба).
r.post('/google', async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential) return res.status(400).json({ error: 'credential required' });

    // Проверка id_token через Google
    const vRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!vRes.ok) return res.status(401).json({ error: 'invalid google token' });
    const info = await vRes.json();
    if (info.aud !== (process.env.GOOGLE_CLIENT_ID || info.aud)) {
      // аудио-проверка аудитории: если CLIENT_ID задан — сверяем
      if (process.env.GOOGLE_CLIENT_ID) return res.status(401).json({ error: 'audience mismatch' });
    }

    const u = upsertUser('google', info.sub, info.name || `user_${info.sub.slice(0, 6)}`, info.picture || null);
    res.json({ token: sign(u), user: publicUser(u) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Phone OTP ----
// dev-режим: код возвращается в ответе (ALLOW_DEV_LOGIN=1).
// В проде подключите SMS-провайдера (Twilio / SMS.ru) через SMS_PROVIDER_KEY и уберите возврат кода.
r.post('/phone/request', (req, res) => {
  const { phone } = req.body || {};
  if (!/^\+?\d{7,15}$/.test(phone || '')) return res.status(400).json({ error: 'неверный номер телефона' });
  const code = String(Math.floor(1000 + Math.random() * 9000));
  const expires = Date.now() + 5 * 60 * 1000;
  db.prepare('INSERT OR REPLACE INTO otp_codes (phone, code, expires_at) VALUES (?,?,?)').run(phone, code, expires);

  const providerKey = process.env.SMS_PROVIDER_KEY;
  if (providerKey) {
    // TODO: подключите провайдера — пример для HTTP-API провайдера:
    // await fetch(`https://sms.ru/sms/send?api_id=${providerKey}&to=${phone}&msg=${encodeURIComponent('Код GIGA: ' + code)}`)
    if (ALLOW_DEV_LOGIN) return res.json({ ok: true, devCode: code });
    return res.json({ ok: true });
  }
  if (ALLOW_DEV_LOGIN) return res.json({ ok: true, devCode: code });
  res.status(500).json({ error: 'SMS provider not configured' });
});

r.post('/phone/verify', (req, res) => {
  const { phone, code } = req.body || {};
  const row = db.prepare('SELECT * FROM otp_codes WHERE phone=?').get(phone || '');
  if (!row || row.code !== code || Date.now() > row.expires_at) {
    return res.status(401).json({ error: 'Неверный или истёкший код' });
  }
  db.prepare('DELETE FROM otp_codes WHERE phone=?').run(phone);
  const u = upsertUser('phone', phone, `user_${phone.slice(-4)}`, null);
  res.json({ token: sign(u), user: publicUser(u) });
});

// ---- Ежедневный бонус 50 кристаллов (сервер-контроль по дате UTC) ----
r.post('/daily-bonus', (req, res) => {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: 'unauthorized' });
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(uid);
  if (!u) return res.status(404).json({ error: 'user not found' });

  const today = todayUTC();
  if (u.last_bonus_date === today) {
    return res.json({ granted: false, crystals: u.crystals, message: 'Бонус уже получен сегодня. Возвращайся завтра!' });
  }
  // streak: вчерашний день -> +1, иначе 1
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = u.last_bonus_date === y ? u.streak + 1 : 1;
  db.prepare('UPDATE users SET crystals = crystals + ?, last_bonus_date=?, streak=? WHERE id=?')
    .run(DAILY_BONUS, today, streak, uid);
  const fresh = db.prepare('SELECT * FROM users WHERE id=?').get(uid);
  res.json({ granted: true, amount: DAILY_BONUS, crystals: fresh.crystals, streak });
});

export function authMiddleware(req, _res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch { /* невалидный — считаем гостем */ }
  }
  next();
}

export default r;
