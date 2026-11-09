# GIGA Web — веб-версия приложения GIGA (ИИ-персонажи на GigaChat)

Полноценный работающий сайт, повторяющий интерфейс и поведение приложения
[com.sdkit.gigaapp.app](https://play.google.com/store/apps/details?id=com.sdkit.gigaapp.app):
тёмная тема, логотип GIGA, персонажи, чат с настоящим ИИ (GigaChat-2), создание и
редактирование персонажей, профиль, избранное, поиск/категории и **50 кристаллов
каждый день** после входа.

## Архитектура

```
giga/
├── frontend/            # Vite + React (тёмный мобильный UI как в приложении)
│   ├── index.html
│   ├── public/logo.svg
│   └── src/
│       ├── main.jsx             # маршруты: /splash /login /home /chat/:id /create /edit/:id /profile /profile/about /settings
│       ├── context/AuthContext.jsx
│       ├── styles.css
│       └── pages/
│           ├── Splash.jsx       # логотип GIGA + звёзды (как сплэш в приложении)
│           ├── Login.jsx        # вход через Google (GIS) и по номеру телефона (OTP)
│           ├── Home.jsx         # поиск, категории-чипсы, карточки персонажей, ❤, FAB, ежедневный бонус
│           ├── Chat.jsx         # чат: пузыри, «печатает…», 👍/👎, 🔄, подвал «Помни, персонажи выдумывают»
│           ├── CreateCharacter.jsx  # вкладки «Главное / Манера речи», аватар, Имя, Тип, Пол,
│           │                        # тумблер «Умеет рисовать (Beta)», Характер и поведение
│           ├── EditCharacter.jsx
│           ├── Profile.jsx      # @username, Обо мне, счётчики, Изменить/Поделиться, вкладки списков
│           ├── AboutMe.jsx      # экран «Обо мне» с счётчиком 280
│           └── Settings.jsx     # Поддержка, Соцсети, Оценить, Пригласить друга, Версия, Лицензия
└── backend/             # Node/Express + SQLite
    └── src/
        ├── index.js             # API + раздача собранного фронтенда
        ├── db.js                # users, characters, favorites, chats, messages, otp
        ├── gigachat.js          # OAuth GigaChat + chat/completions + СКРЫТЫЙ системный промпт
        ├── seed.js              # демо-персонажи (Психолог, Астролог, Добряк, Фродо, Барби, Шрек, GIGA…)
        └── routes/
            ├── auth.js          # Google, phone OTP, /daily-bonus (50 кристаллов, серверный контроль по дате UTC)
            ├── characters.js    # CRUD, избранное, поиск/категории
            ├── chat.js          # история, отправка сообщения, перегенерация, списание кристаллов
            └── user.js          # профиль, «Обо мне»
```

## Безопасность (важно)

- **Ключ GigaChat и скрытый промпт живут ТОЛЬКО на сервере** (`backend/src/gigachat.js`,
  читается из `backend/.env`). В HTML/JS клиента они не попадают — фронтенд общается
  только со своим бэкендом (`/api/chat/:id`).
- Клиенту отдаётся лишь `GOOGLE_CLIENT_ID` (это публичное значение).
- Дневной бонус контролируется сервером по `user_id + дата UTC` — накрутка невозможна.

## Запуск (локально)

```bash
# 1. Бэкенд
cd backend
cp .env.example .env        # заполни GIGACHAT_AUTH_KEY и JWT_SECRET
npm install
node src/seed.js            # демо-персонажи
node src/index.js           # http://localhost:3000

# 2. Фронтенд (dev-режим, отдельный терминал)
cd frontend
npm install
npm run dev                 # http://localhost:5173 (проксирует /api на :3000)

# Прод-сборка (бэкенд начнёт отдавать фронт сам)
cd frontend && npm run build
```

Без заполненного `GIGACHAT_AUTH_KEY` чат работает в демо-режиме (мок-ответы),
чтобы можно было проверить весь интерфейс.

## Переменные окружения (backend/.env)

| Переменная | Назначение |
|---|---|
| `GIGACHAT_AUTH_KEY` | Ключ авторизации GigaChat (Basic, из личного кабинета developers.sber.ru). Только сервер. |
| `GIGACHAT_SCOPE` | `GIGACHAT_API_PERS` (по умолчанию) |
| `GIGACHAT_MODEL` | `GigaChat-2` |
| `GIGACHAT_CA_PATH` | Путь к сертификату Минцифры РФ (`russiantrustedca.pem`, скачать: https://gu-st.ru/content/lending/russian_trusted_root_ca_pem.crt ). GigaChat работает с российским УЦ. |
| `GIGACHAT_INSECURE` | `1` — отключить проверку TLS (только тест) |
| `JWT_SECRET` | Секрет подписи сессий |
| `GOOGLE_CLIENT_ID` | OAuth Client ID Google (публичный) |
| `SMS_PROVIDER_KEY` | Ключ SMS-провайдера (Twilio/SMS.ru). Без него и с `ALLOW_DEV_LOGIN=1` код возвращается в ответе API (dev). |
| `CRYSTALS_DAILY_BONUS` | `50` |
| `CRYSTALS_PER_MESSAGE` | `1` — списание за сообщение персонажу |

## Как работает GigaChat API

1. `POST https://ngw.devices.sberbank.ru:9443/api/v2/oauth`
   заголовки: `RqUID: <uuid4>`, `Authorization: Basic <GIGACHAT_AUTH_KEY>`,
   тело: `scope=GIGACHAT_API_PERS` → `access_token`.
2. `POST https://gigachat.devices.sberbank.ru/api/v1/chat/completions`
   `Authorization: Bearer <token>`, модель `GigaChat-2`, история + скрытый системный
   промпт персонажа.
3. TLS: сертификат российского УЦ Минцифры (`GIGACHAT_CA_PATH`), см. документацию
   https://developers.sber.ru/docs/ru/gigachat/api/reference/rest/gigachat-api

## Публикация сайта

1. **VPS (рекомендуется):** `scp` папки `backend` и `frontend` → на сервере
   `cd frontend && npm i && npm run build` → `cd ../backend && npm i && pm2 start src/index.js`.
   Nginx проксирует `:80/:443 → :3000`. Ключ — только в `.env` на сервере.
2. **Render/Railway/Fly.io:** один сервис из `backend` (Node), build-команда
   `cd ../frontend && npm i && npm run build`, start `node src/index.js`,
   env-переменные заполняются в панели.
3. **Домен и HTTPS:** обязательно HTTPS — вход через Google требует secure origin.

## Что нужно докупить/подключить для полного продакшена

- SMS-провайдер (реальная отправка кодов) — переменная `SMS_PROVIDER_KEY`.
- Google OAuth Client ID в Google Cloud Console (origin вашего домена).
- Хранилище картинок (сейчас аватары — data-URL в SQLite; для продакшена — S3).
- Модерация контента и rate-limit на `/api/chat` при публичном запуске.
