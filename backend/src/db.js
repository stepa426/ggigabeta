import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, 'giga.db'));
db.pragma('journal_mode = WAL');

export function initDb() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,                -- google | phone
    provider_id TEXT UNIQUE NOT NULL,      -- google sub | phone number
    username TEXT NOT NULL,
    avatar TEXT,
    about TEXT DEFAULT '',
    crystals INTEGER NOT NULL DEFAULT 0,
    last_bonus_date TEXT,                  -- YYYY-MM-DD (UTC) последнего дневного бонуса
    streak INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    owner_id TEXT,
    name TEXT NOT NULL,
    kind TEXT DEFAULT '',                  -- "Тип персонажа" (дружелюбный орк и т.п.)
    gender TEXT DEFAULT 'Не указан',
    about TEXT DEFAULT '',                 -- "Обо мне"
    greeting TEXT DEFAULT '',
    persona TEXT NOT NULL,                 -- характер и поведение (виден владельцу)
    can_draw INTEGER NOT NULL DEFAULT 0,   -- тумблер "Умеет рисовать (Beta)"
    avatar TEXT,
    category TEXT DEFAULT 'Разное',
    is_public INTEGER NOT NULL DEFAULT 0,
    likes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS favorites (
    user_id TEXT NOT NULL,
    character_id TEXT NOT NULL,
    PRIMARY KEY (user_id, character_id)
  );

  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    character_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, character_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    role TEXT NOT NULL,                    -- user | assistant
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS otp_codes (
    phone TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  `);
}
