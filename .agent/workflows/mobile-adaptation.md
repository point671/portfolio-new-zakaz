---
description: Адаптация мобильной версии в едином стиле
---

# Адаптация мобильной версии - Единый стиль

## ⚠️ КРИТИЧЕСКИ ВАЖНО

- Все изменения **ТОЛЬКО** внутри `@media (max-width: 768px)`
- Десктоп версию **НЕ ТРОГАТЬ!**
- `font-family`, цвета, анимации **НЕ МЕНЯТЬ!**

## 1. Отступы секций

```scss
padding: 50px 0;
padding-bottom: 30px; /* для секций перед другими секциями */
```

## 2. Типографика (только размеры!)

| Элемент               | Размер |
| --------------------- | ------ |
| Заголовки секций (h2) | 28px   |
| Подзаголовки (h3)     | 22px   |
| Заголовки карточек    | 18px   |
| Основной текст        | 16px   |
| Мелкий текст/подписи  | 14px   |

## 3. Сетка и отступы

```scss
grid-template-columns: 1fr;
gap: 15px;
margin-bottom: 30px;
```

## 4. Карточки

```scss
border-radius: 20px;
padding: 20px;
min-height: auto;
box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
```

## 5. Кнопки

```scss
height: 50px;
padding: 0 30px;
font-size: 18px;
border-radius: 25px;
width: 100%;
margin-top: 20px;
margin-bottom: 30px;
```

## 6. Инпуты и селекты

```scss
height: 50px;
font-size: 16px;
border-radius: 25px;
width: 100%;
```

## 7. Таблицы → Карточки

- Заголовки таблиц: `display: none;`
- Каждая строка = отдельная карточка
- Вертикальная компоновка: `flex-direction: column`
- `gap: 12px` между строками
- `padding: 15px` внутри строк

## 8. Переопределение десктоп margin

⚠️ Если на десктопе `margin > 50px`, уменьшить до **30px**:

- `margin-bottom: 30px` (вместо 60-138px)
- `margin-top: 30px` (вместо 53-74px)

## Применить к секциям

- `.projects`
- `.repair-types`
- `.calculator`
- `.prices`
- `.benefits`
- `.who-answer`
- `.main-reviews`
- `footer`

## Структура кода

Добавить **ОДИН** блок `@media (max-width: 768px) { }` в конец каждого SCSS файла.
**НЕ разбрасывать** media queries по всему файлу!

## Тестирование

// turbo

```bash
# Проверить на localhost
open http://localhost:8080/home.html
```
