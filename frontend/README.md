# mosres frontend

Vite + React + TypeScript + Tailwind + shadcn/ui.

## Запуск

```bash
npm install
cp .env.example .env      # выставить VITE_API_URL, если API не на localhost:8000
npm run dev               # http://localhost:5173, нужен запущенный backend
npm run build             # прод-сборка в dist/
```

## Экраны

- `/` — таблица квартир: избранное, падение цены (vs прошлая версия и vs максимум),
  бейджи скидок, прямая ссылка на москварталы.рф, фильтры.
- `/buildings/:id` — карточка дома, график динамики цены за м², таблица квартир дома.
