# Бэкенд (тестовое)

NestJS, Postgres, Redis. Статьи с кэшем на чтение, регистрация/логин, JWT access, refresh в httpOnly cookie (ротация на сервере).

## Запуск

Нужны Node 20+ (или около того), `npm i`.

```bash
copy .env.example .env
docker compose up -d
npm run start:dev:migrate
```

Порт по умолчанию `3000`, Swagger: `http://localhost:3000/docs`.

Отдельно миграции без watch: `npm run typeorm:migration:run`. Прод: `npm run start:prod:migrate` (сборка + миграции по `dist` + старт).

## Что тут за API

**Статьи:** `GET /articles` и `GET /articles/:id` без авторизации (список с пагинацией и фильтрами — смотри сваггер). Создание/правка/удаление — с Bearer access, автор может трогать только свои.

**Авторизация:** `POST /auth/register`, `POST /auth/login` — в ответе `accessToken` и `tokenType`, плюс браузеру прилетает `Set-Cookie` с refresh (httpOnly, имя по умолчанию `refresh_token`). Обновить access: `POST /auth/refresh` или `POST /refresh`, тело пустое, важна та же cookie. Выход: `POST /auth/logout` с Bearer и с той же cookie — сервер сбросит refresh.

На фронте для любых запросов, где cookie должна уйти/обновиться, включай `credentials: 'include'` (fetch) или `withCredentials` в axios. Если фронт на другом origin — в `.env` пропиши `CORS_ORIGIN` (точный URL, можно несколько через запятую).

Секреты и сроки — в `.env`, пример в `.env.example`.

## Тесты

Юнит: `npm test`. E2E: `npm run test:e2e` (нужны поднятые Postgres и Redis).

---