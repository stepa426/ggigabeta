import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';
import { chatWithGiga } from '../gigachat.js';

const r = Router();
const CRYSTALS_PER_MESSAGE = parseInt(process.env.CRYSTALS_PER_MESSAGE || '1', 10);
const FREE_MESSAGES = 5; // гостевых сообщений, чтобы можно было попробовать без входа

function requireChat(req) {
  const uid = req.user?.uid || 'guest';
  return { uid, isGuest: !req.user?.uid };
}

// История чата с персонажем
r.get('/:characterId', (req, res) => {
  const { uid } = requireChat(req);
  const char = db.prepare('SELECT * FROM characters WHERE id=?').get(req.params.characterId);
  if (!char) return res.status(404).json({ error: 'персонаж не найден' });

  let chat = db.prepare('SELECT * FROM chats WHERE user_id=? AND character_id=?').get(uid, char.id);
  if (!chat) {
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO chats (id, user_id, character_id) VALUES (?,?,?)').run(id, uid, char.id);
    chat = { id };
    // приветственное сообщение персонажа
    if (char.greeting) {
      db.prepare('INSERT INTO messages (chat_id, role, content) VALUES (?,?,?)').run(id, 'assistant', char.greeting);
    }
  }
  const msgs = db.prepare('SELECT * FROM messages WHERE chat_id=? ORDER BY id ASC').all(chat.id);
  res.json({ chatId: chat.id, character: { ...char, can_draw: !!char.can_draw }, messages: msgs });
});

// Отправка сообщения -> ответ GigaChat (ключ и системный промпт только на сервере)
r.post('/:characterId', async (req, res) => {
  try {
    const { uid, isGuest } = requireChat(req);
    const text = (req.body?.message || '').trim();
    if (!text) return res.status(400).json({ error: 'пустое сообщение' });

    const char = db.prepare('SELECT * FROM characters WHERE id=?').get(req.params.characterId);
    if (!char) return res.status(404).json({ error: 'персонаж не найден' });

    if (isGuest) {
      const guestCount = db.prepare("SELECT COUNT(*) n FROM messages m JOIN chats c ON m.chat_id=c.id WHERE c.user_id='guest' AND m.role='user'").get().n;
      if (guestCount >= FREE_MESSAGES) {
        return res.status(402).json({ error: 'free_limit', message: `Демо-режим: ${FREE_MESSAGES} сообщений. Войдите, чтобы продолжить и получать 50 кристаллов ежедневно!` });
      }
    } else {
      const u = db.prepare('SELECT * FROM users WHERE id=?').get(uid);
      if (!u || u.crystals < CRYSTALS_PER_MESSAGE) {
        return res.status(402).json({ error: 'no_crystals', message: 'Не хватает кристаллов. Получи 50 бесплатно в разделе «Ежедневный бонус»!' });
      }
      db.prepare('UPDATE users SET crystals = crystals - ? WHERE id=?').run(CRYSTALS_PER_MESSAGE, uid);
    }

    let chat = db.prepare('SELECT * FROM chats WHERE user_id=? AND character_id=?').get(uid, char.id);
    if (!chat) {
      const id = crypto.randomUUID();
      db.prepare('INSERT INTO chats (id, user_id, character_id) VALUES (?,?,?)').run(id, uid, char.id);
      chat = { id };
      if (char.greeting) {
        db.prepare('INSERT INTO messages (chat_id, role, content) VALUES (?,?,?)').run(id, 'assistant', char.greeting);
      }
    }

    db.prepare('INSERT INTO messages (chat_id, role, content) VALUES (?,?,?)').run(chat.id, 'user', text);

    const history = db.prepare('SELECT role, content FROM messages WHERE chat_id=? ORDER BY id ASC').all(chat.id)
      .slice(-20) // контекст: последние 20 сообщений
      .map((m) => ({ role: m.role, content: m.content }));

    const reply = await chatWithGiga({
      history,
      characterName: char.name,
      characterPersona: char.persona,
      about: char.about,
    });

    db.prepare('INSERT INTO messages (chat_id, role, content) VALUES (?,?,?)').run(chat.id, 'assistant', reply);

    const u = uid !== 'guest' ? db.prepare('SELECT crystals FROM users WHERE id=?').get(uid) : null;
    res.json({
      chatId: chat.id,
      reply,
      crystals: u ? u.crystals : null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'gigachat_error', message: e.message });
  }
});

// Перегенерация последнего ответа
r.post('/:characterId/regenerate', async (req, res) => {
  try {
    const { uid } = requireChat(req);
    const char = db.prepare('SELECT * FROM characters WHERE id=?').get(req.params.characterId);
    if (!char) return res.status(404).json({ error: 'персонаж не найден' });
    const chat = db.prepare('SELECT * FROM chats WHERE user_id=? AND character_id=?').get(uid, char.id);
    if (!chat) return res.status(404).json({ error: 'чат не найден' });

    const lastUser = db.prepare("SELECT * FROM messages WHERE chat_id=? AND role='user' ORDER BY id DESC LIMIT 1").get(chat.id);
    if (!lastUser) return res.status(400).json({ error: 'нет сообщения для перегенерации' });

    const history = db.prepare('SELECT role, content FROM messages WHERE chat_id=? AND id<=? ORDER BY id ASC').all(chat.id, lastUser.id)
      .slice(-20).map((m) => ({ role: m.role, content: m.content }));

    const reply = await chatWithGiga({
      history,
      characterName: char.name,
      characterPersona: char.persona,
      about: char.about,
    });
    db.prepare('INSERT INTO messages (chat_id, role, content) VALUES (?,?,?)').run(chat.id, 'assistant', reply);
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Оценка сообщения (👍/👎)
r.post('/message/:id/rate', (req, res) => {
  const { rating } = req.body || {};
  // в демо-версии просто подтверждаем; в проде — пишем в аналитику
  res.json({ ok: true, rating: rating === 'up' ? 'up' : 'down' });
});

export default r;
