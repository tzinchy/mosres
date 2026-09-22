# mosres frontend

Vite + React + TypeScript + Tailwind + shadcn/ui.

## Запуск

```bash
npm install
cp .env.example .env      # выставить VITE_API_URL, если API не на localhost:8000
npm run dev               # http://localhost:5173, нужен запущенный backend
npm run build             # прод-сборка в dist/
```

## Android

Тот же `dist`, завёрнутый в Capacitor-шелл.

```bash
npm run apk -- http://192.168.1.10:5433   # адрес API, видимый с телефона
# → frontend/mosres.apk, ставится как debug-APK («неизвестные источники»)
```

Адрес API вшивается в сборку (`VITE_API_URL`); сменился сервер — пересобрать.
Нужен JDK 21 и Android SDK (platform 36, build-tools 36) — пути берутся из
`JAVA_HOME`/`ANDROID_HOME`, по умолчанию `~/Library/Java/...temurin-21.jdk` и
`~/Library/Android/sdk`.

Без APK можно просто поставить PWA: открыть сайт по https на телефоне,
Chrome → «Установить приложение».

## Экраны

- `/` — таблица квартир: избранное, падение цены (vs прошлая версия и vs максимум),
  бейджи скидок, прямая ссылка на москварталы.рф, фильтры.
- `/buildings/:id` — карточка дома, график динамики цены за м², таблица квартир дома.
