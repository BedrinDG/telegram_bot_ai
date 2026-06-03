# Система автоматизации сбора и проверки отчётов сотрудников

Дипломный проект: Telegram-бот + веб-панель + ИИ-проверка на базе GPT-4o

## Стек технологий

| Компонент | Технология |
|-----------|------------|
| Telegram-бот | Node.js + Telegraf.js |
| Серверная часть | Node.js + Express.js |
| База данных | PostgreSQL + Prisma ORM |
| Веб-панель | React 18 |
| ИИ-проверка | OpenAI GPT-4o |
| Транскрибация | OpenAI Whisper API |

## Структура проекта

```
telegram_bot_ai/
├── server/
│   ├── src/
│   │   ├── bot/          # Telegram-бот (Telegraf.js)
│   │   ├── api/          # REST API эндпоинты
│   │   ├── services/     # Бизнес-логика (OpenAI, проверка отчётов)
│   │   ├── middleware/   # JWT авторизация
│   │   └── utils/        # Prisma, seed
│   ├── prisma/
│   │   └── schema.prisma # Схема базы данных
│   └── .env.example
└── client/               # React веб-панель
    └── src/
        ├── pages/        # Страницы (менеджер, администратор, сотрудник)
        ├── components/   # Layout, навигация
        ├── hooks/        # useAuth
        └── api/          # Axios клиент
```

## Запуск

### 1. Настройка базы данных

Установите PostgreSQL и создайте базу данных `reports_db`.

### 2. Настройка сервера

```bash
cd server
cp .env .env
# Заполните .env своими значениями
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

### 3. Запуск клиента

```bash
cd client
npm install
npm start
```

## Переменные окружения (server/.env)

```
DATABASE_URL="postgresql://user:password@localhost:5432/reports_db"
TELEGRAM_BOT_TOKEN="токен от @BotFather"
OPENAI_API_KEY="ключ OpenAI"
JWT_SECRET="секретный ключ JWT"
JWT_REFRESH_SECRET="секретный ключ refresh JWT"
PORT=3001
ADMIN_TELEGRAM_CHAT_ID="chat_id администратора"
```

## Роли пользователей

- **employee** — сотрудник: работает только через Telegram-бот
- **manager** — руководитель: просматривает отчёты подчинённых через веб-панель
- **admin** — администратор: управляет пользователями, шаблоном и журналом

## Команды бота

- `/start` — регистрация / авторизация
- `/status` — статус последнего отчёта
- `/help` — справка

## API эндпоинты

```
POST /api/auth/login       — вход (telegramChatId → JWT)
POST /api/auth/refresh     — обновление токена

GET  /api/users            — список пользователей (admin)
POST /api/users            — создать/обновить пользователя (admin)
PATCH /api/users/:id       — изменить пользователя (admin)
DELETE /api/users/:id      — деактивировать (admin)

GET  /api/reports          — список отчётов (manager/admin)
GET  /api/reports/my       — свои отчёты (employee)
GET  /api/reports/:id      — конкретный отчёт

GET  /api/templates/active — активный шаблон
GET  /api/templates        — все шаблоны (admin)
POST /api/templates        — создать новый шаблон (admin)

GET  /api/eventlog         — журнал событий (admin)
```
