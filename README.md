# Price Tag Scanner

[![CI](https://github.com/henceketh/price-tag-scanner-ru/actions/workflows/ci.yml/badge.svg)](https://github.com/henceketh/price-tag-scanner-ru/actions/workflows/ci.yml)

Система распознавания ценников с использованием компьютерного зрения и локальных LLM моделей.

## Возможности

- **OCR распознавание** — извлечение текста с ценников
- **Автоопределение валюты** — поддержка RUB, USD, EUR, KZT, UAH, BYN
- **Детекция акций** — автоматическое выделение скидок и промо-цен
- **История сканирований** — сохранение всех сканов с превью изображений
- **Отслеживание цен** — история изменения цен для товаров по штрих-коду
- **Графики цен** — визуализация динамики цен через Recharts
- **Поиск и фильтры** — фильтрация по тексту, дате, цене, штрих-коду, акциям
- **Аутентификация** — опциональная регистрация/вход для привязки данных к аккаунту

<img width="1388" height="1187" alt="Screenshot 2026-02-03 013413" src="https://github.com/user-attachments/assets/0d996b65-3055-4cbf-868f-ee87f41d1547" />
<img width="595" height="1304" alt="Screenshot 2026-02-03 013418" src="https://github.com/user-attachments/assets/eac4dcb9-fccb-4b40-8104-7c0e692931aa" />

## Технологии

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Ollama (LLaVA 34B)
- JWT аутентификация
- Sharp (обработка изображений)
- Swagger/OpenAPI (документация API)

### Frontend
- React 19 + TypeScript
- Vite
- Recharts
- CSS (без фреймворков)

### DevOps
- Docker & Docker Compose
- GitHub Actions (CI/CD)
- Nginx (production frontend)

## Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/henceketh/price-tag-scanner-ru.git
cd price-tag-scanner-ru
```

2. Установите зависимости:
```bash
npm run install:all
```

3. Создайте `.env` файл в корне проекта:
```env
PORT=3001
OLLAMA_HOST=http://localhost:11434
MONGODB_URI=mongodb://localhost:27017/priceTagRecognizer
JWT_SECRET=your-secret-key
```

4. Убедитесь, что Ollama запущена с нужной моделью:
```bash
ollama pull llava:34b
ollama serve
```

## Запуск

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm run start
```

Backend будет доступен на `http://localhost:3001`, frontend на `http://localhost:5173`.

### Docker

Запустите весь стек (MongoDB, Backend, Frontend) с помощью Docker Compose:

```bash
docker-compose up -d
```

Приложение будет доступно на `http://localhost`, API на `http://localhost:3001`.

Для остановки:
```bash
docker-compose down
```

Для просмотра логов:
```bash
docker-compose logs -f
```

**Примечание:** Ollama должна быть запущена на хосте, так как контейнеры обращаются к ней через `host.docker.internal:11434`.

## CI/CD

Проект использует GitHub Actions для автоматизации:

- **Continuous Integration**: автоматическая проверка кода при каждом push/PR
  - Проверка синтаксиса backend
  - Линтинг frontend
  - Сборка frontend
  - Тестирование на Node.js 18.x и 20.x

- **Docker**: готовые Dockerfile для backend и frontend
- **Docker Compose**: оркестрация всего стека для development/production

## API Документация

Полная интерактивная документация API доступна через Swagger UI:

**http://localhost:3001/api-docs**

Swagger UI позволяет:
- Просматривать все доступные эндпоинты
- Тестировать API запросы прямо в браузере
- Изучать схемы запросов и ответов
- Авторизоваться с помощью JWT токена

<img width="2544" height="1302" alt="Screenshot 2026-02-04 163259" src="https://github.com/user-attachments/assets/8b7f1a50-2afc-400f-a01c-2e6ffc1e2c63" />
<img width="1418" height="1166" alt="Screenshot 2026-02-04 163303" src="https://github.com/user-attachments/assets/aa475ec3-20c9-44cf-8e9e-a69491be8f86" />

