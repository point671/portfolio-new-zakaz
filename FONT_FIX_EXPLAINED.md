# Разбор проблемы: Шрифты не загружаются в режиме разработки Webpack

## Описание проблемы

При запуске проекта через `npm run dev` шрифт `Haval` не отображался корректно на странице, хотя в production-сборке (через `npm run build` + Go Live) всё работало нормально.

---

## Симптомы

1. **Ошибка при сборке:**

```
Can't find stylesheet to import.
   ╷
10 │ @import "fonts/fonts";
   │         ^^^^^^^^^^^^^
```

2. **Разный размер файла шрифта:**
   - Go Live (dist): `content-length: 19748` ✅ (оригинальный размер)
   - Dev Mode: `content-length: 35743` ❌ (увеличенный размер)

---

## Причины проблемы

### 1. Отсутствующий файл `fonts.scss`

В `style.scss` на строке 10 был импорт:

```scss
@import "fonts/fonts";
```

Но файла `src/scss/fonts/fonts.scss` не существовало!

**Решение:** Создать файл с `@font-face`:

```scss
@font-face {
  font-family: "Haval";
  font-display: swap;
  src: url("../../fonts/Haval-Light.woff2") format("woff2");
  font-weight: 300;
  font-style: normal;
}
```

### 2. Webpack не копировал папку `fonts`

В файле `config/webpack.dev.js` плагин `CopyPlugin` копировал только:

- `src/img` → `dist/img`
- `src/files` → `dist/files`

**Но папка `src/fonts` не копировалась!**

Поэтому Webpack не находил файлы шрифтов и пытался обработать их иначе (например, конвертировать в base64), что приводило к увеличению размера файла и проблемам с отображением.

---

## Исправление

В файле `config/webpack.dev.js` добавили копирование папки `fonts`:

```javascript
new CopyPlugin({
    patterns: [
        {
            from: `${srcFolder}/img`, to: `img`,
            noErrorOnMissing: true,
            force: true
        },
        // ✅ ДОБАВЛЕНО:
        {
            from: `${srcFolder}/fonts`, to: `fonts`,
            noErrorOnMissing: true,
            force: true
        },
        {
            from: `${srcFolder}/files`, to: `files`,
            noErrorOnMissing: true,
            force: true
        },
        // ...
    ],
}),
```

---

## Структура файлов

```
src/
├── fonts/
│   └── Haval-Light.woff2      ← Файл шрифта
├── scss/
│   ├── fonts/
│   │   └── fonts.scss         ← @font-face определения
│   └── style.scss             ← @import "fonts/fonts";
```

---

## Как работает подключение шрифтов

1. **Файл шрифта** (`Haval-Light.woff2`) лежит в `src/fonts/`
2. **SCSS-файл** (`fonts.scss`) объявляет `@font-face` с путём к шрифту
3. **Webpack CopyPlugin** копирует папку `fonts` в `dist/fonts`
4. **CSS-loader** обрабатывает пути в `url()` и находит шрифт
5. **Браузер** загружает шрифт и применяет его

---

## Полезные советы

1. **Проверяйте Network → Font в DevTools** — там видно, какие шрифты загружаются и их размер
2. **Смотрите Computed → font-family** — там видно, какой шрифт реально применён к элементу
3. **Относительные пути важны** — путь `../../fonts/` работает относительно расположения SCSS-файла
4. **Webpack конфиг нужно изучать** — понимание CopyPlugin, css-loader и других плагинов поможет решать подобные проблемы

---

## Итог

| Что было сломано             | Как исправили               |
| ---------------------------- | --------------------------- |
| Нет файла `fonts.scss`       | Создали файл с `@font-face` |
| Webpack не копировал `fonts` | Добавили в `CopyPlugin`     |
