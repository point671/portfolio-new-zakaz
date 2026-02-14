# Фильтрация и «Загрузить ещё» в WordPress — Пошаговое руководство

Это руководство описывает, как реализовать AJAX-фильтрацию по категориям и подгрузку проектов кнопкой «Загрузить ещё» на странице портфолио в WordPress.

---

## Оглавление

1. [Подготовка: Custom Post Type и Таксономия](#шаг-1-custom-post-type-и-таксономия)
2. [Шаблон страницы портфолио](#шаг-2-шаблон-страницы-портфолио)
3. [PHP-обработчик AJAX](#шаг-3-php-обработчик-ajax)
4. [JavaScript (AJAX-логика)](#шаг-4-javascript-ajax-логика)
5. [CSS для состояний загрузки](#шаг-5-css-для-состояний-загрузки)
6. [Итоговая структура файлов](#итоговая-структура-файлов)

---

## Шаг 1. Custom Post Type и Таксономия

В файле `functions.php` вашей темы (или в плагине) зарегистрируйте тип записи `portfolio` и таксономию `portfolio_category`.

```php
// functions.php

// === 1. Регистрация Custom Post Type "Портфолио" ===
function register_portfolio_post_type() {
    register_post_type('portfolio', [
        'labels' => [
            'name'               => 'Портфолио',
            'singular_name'      => 'Проект',
            'add_new'            => 'Добавить проект',
            'add_new_item'       => 'Добавить новый проект',
            'edit_item'          => 'Редактировать проект',
            'all_items'          => 'Все проекты',
            'search_items'       => 'Поиск проектов',
            'not_found'          => 'Проектов не найдено',
        ],
        'public'       => true,
        'has_archive'  => true,
        'menu_icon'    => 'dashicons-portfolio',
        'supports'     => ['title', 'editor', 'thumbnail', 'excerpt'],
        'rewrite'      => ['slug' => 'portfolio'],
        'show_in_rest' => true, // Для Gutenberg
    ]);
}
add_action('init', 'register_portfolio_post_type');


// === 2. Регистрация таксономии "Категория портфолио" ===
function register_portfolio_taxonomy() {
    register_taxonomy('portfolio_category', 'portfolio', [
        'labels' => [
            'name'          => 'Категории портфолио',
            'singular_name' => 'Категория',
            'search_items'  => 'Поиск категорий',
            'all_items'     => 'Все категории',
            'edit_item'     => 'Редактировать категорию',
            'add_new_item'  => 'Добавить категорию',
        ],
        'hierarchical'  => true,   // Как обычные рубрики (древовидная)
        'public'        => true,
        'rewrite'       => ['slug' => 'portfolio-category'],
        'show_in_rest'  => true,
    ]);
}
add_action('init', 'register_portfolio_taxonomy');
```

### После этого:

1. Перейдите в **Админка → Портфолио → Категории**
2. Создайте категории:
   - `Строительство домов` (slug: `stroitelstvo-domov`)
   - `Отделка домов` (slug: `otdelka-domov`)
   - `Отделка квартир` (slug: `otdelka-kvartir`)
3. Создайте несколько проектов и назначьте им категории

---

## Шаг 2. Шаблон страницы портфолио

Создайте файл шаблона `page-portfolio.php` (или используйте `template-portfolio.php` с Template Name).

```php
<?php
/**
 * Template Name: Портфолио
 */
get_header();

// Получаем все категории портфолио
$categories = get_terms([
    'taxonomy'   => 'portfolio_category',
    'hide_empty' => true,
]);

// Сколько проектов показывать за раз
$posts_per_page = 4;
?>

<section class="portfolio-list portfolio-list_default">
    <div class="portfolio-list__container">

        <!-- ============ ФИЛЬТРЫ ============ -->
        <div class="portfolio-filter" id="portfolio-filter">
            <button
                class="portfolio-filter__btn active"
                data-filter="all"
            >
                Все проекты
            </button>

            <?php foreach ($categories as $cat) : ?>
                <button
                    class="portfolio-filter__btn"
                    data-filter="<?php echo esc_attr($cat->slug); ?>"
                >
                    <?php echo esc_html($cat->name); ?>
                </button>
            <?php endforeach; ?>

            <!-- Сортировка (опционально) -->
            <div class="portfolio-filter__sort">
                <select id="portfolio-sort">
                    <option value="date-desc">Сначала новые</option>
                    <option value="date-asc">Сначала старые</option>
                    <option value="title-asc">По названию А-Я</option>
                    <option value="title-desc">По названию Я-А</option>
                </select>
            </div>
        </div>

        <!-- ============ СЕТКА КАРТОЧЕК ============ -->
        <div class="portfolio-list__grid" id="portfolio-grid">
            <?php
            // Первоначальный запрос — первые 4 проекта
            $query = new WP_Query([
                'post_type'      => 'portfolio',
                'posts_per_page' => $posts_per_page,
                'paged'          => 1,
                'orderby'        => 'date',
                'order'          => 'DESC',
            ]);

            if ($query->have_posts()) :
                while ($query->have_posts()) : $query->the_post();
                    // Подключаем шаблон карточки
                    get_template_part('template-parts/portfolio', 'card');
                endwhile;
            else :
                echo '<p class="portfolio-list__empty">Проектов пока нет</p>';
            endif;

            wp_reset_postdata();
            ?>
        </div>

        <!-- ============ КНОПКА "ЗАГРУЗИТЬ ЕЩЁ" ============ -->
        <div class="portfolio-list__more" id="portfolio-more-wrap">
            <?php if ($query->max_num_pages > 1) : ?>
                <button
                    class="portfolio-list__button"
                    id="portfolio-load-more"
                    data-page="1"
                    data-max-pages="<?php echo esc_attr($query->max_num_pages); ?>"
                >
                    Загрузить ещё
                </button>
            <?php endif; ?>
        </div>

    </div>
</section>

<?php get_footer(); ?>
```

---

## Шаг 2.1. Шаблон карточки (`template-parts/portfolio-card.php`)

Вынесите HTML одной карточки в отдельный файл:

```php
<?php
/**
 * Шаблон одной карточки портфолио
 * template-parts/portfolio-card.php
 */

// Получаем кастомные поля (ACF или стандартные meta)
$duration = get_field('project_duration'); // Например: "4 мес"
// Или: $duration = get_post_meta(get_the_ID(), 'project_duration', true);

$categories = get_the_terms(get_the_ID(), 'portfolio_category');
$cat_slugs  = [];
if ($categories && !is_wp_error($categories)) {
    foreach ($categories as $cat) {
        $cat_slugs[] = $cat->slug;
    }
}
?>

<a href="<?php the_permalink(); ?>" class="portfolio-card" data-categories="<?php echo esc_attr(implode(',', $cat_slugs)); ?>">
    <!-- Image Section -->
    <div class="portfolio-card__image">
        <?php if (has_post_thumbnail()) : ?>
            <img src="<?php echo esc_url(get_the_post_thumbnail_url(get_the_ID(), 'medium_large')); ?>"
                 alt="<?php the_title_attribute(); ?>">
        <?php endif; ?>

        <!-- Badge (top-left) -->
        <?php if ($duration) : ?>
            <div class="portfolio-card__badge">
                <div class="portfolio-card__badge-icon">
                    <img src="<?php echo get_template_directory_uri(); ?>/img/portfolio/projects/Symbol.svg" alt="">
                </div>
                <div class="portfolio-card__badge-text">
                    <span><?php echo esc_html($duration); ?></span>
                </div>
            </div>
        <?php endif; ?>

        <!-- Title (bottom-right) -->
        <h3 class="portfolio-card__title">
            <?php
            // Если заголовок содержит перенос (напр. "Дом\nв Никольском")
            $title_parts = explode("\n", get_the_title());
            foreach ($title_parts as $part) {
                echo '<span>' . esc_html(trim($part)) . '</span>';
            }
            ?>
        </h3>
    </div>

    <!-- Footer Section -->
    <div class="portfolio-card__footer">
        <span class="portfolio-card__link-text">Смотреть проект</span>
        <div class="portfolio-card__link-icon">
            <img src="<?php echo get_template_directory_uri(); ?>/img/portfolio/projects/arrow.svg" alt="">
        </div>
    </div>
</a>
```

---

## Шаг 3. PHP-обработчик AJAX

Добавьте в `functions.php` два обработчика — для фильтрации и для подгрузки:

```php
// === 3. Подключение скриптов и передача данных для AJAX ===
function portfolio_enqueue_scripts() {
    // Только на странице портфолио
    if (is_page_template('page-portfolio.php') || is_page('portfolio')) {
        wp_enqueue_script(
            'portfolio-ajax',
            get_template_directory_uri() . '/js/portfolio-ajax.js',
            ['jquery'], // зависимость (можно без jQuery — см. вариант на vanilla JS ниже)
            '1.0',
            true // в footer
        );

        // Передаём данные в JS
        wp_localize_script('portfolio-ajax', 'portfolioAjax', [
            'ajaxurl'       => admin_url('admin-ajax.php'),
            'nonce'         => wp_create_nonce('portfolio_nonce'),
            'posts_per_page' => 4,
        ]);
    }
}
add_action('wp_enqueue_scripts', 'portfolio_enqueue_scripts');


// === 4. AJAX-обработчик (один на оба действия) ===
function portfolio_ajax_handler() {
    // Проверка безопасности
    check_ajax_referer('portfolio_nonce', 'nonce');

    // Входные параметры
    $paged    = isset($_POST['page'])     ? absint($_POST['page'])              : 1;
    $category = isset($_POST['category']) ? sanitize_text_field($_POST['category']) : 'all';
    $orderby  = isset($_POST['orderby'])  ? sanitize_text_field($_POST['orderby'])  : 'date';
    $order    = isset($_POST['order'])    ? sanitize_text_field($_POST['order'])    : 'DESC';
    $per_page = isset($_POST['per_page']) ? absint($_POST['per_page'])          : 4;

    // Формируем аргументы запроса
    $args = [
        'post_type'      => 'portfolio',
        'posts_per_page' => $per_page,
        'paged'          => $paged,
        'orderby'        => $orderby,
        'order'          => $order,
        'post_status'    => 'publish',
    ];

    // Если выбрана конкретная категория
    if ($category !== 'all') {
        $args['tax_query'] = [
            [
                'taxonomy' => 'portfolio_category',
                'field'    => 'slug',
                'terms'    => $category,
            ],
        ];
    }

    $query = new WP_Query($args);

    // Буферизируем вывод HTML
    ob_start();

    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            get_template_part('template-parts/portfolio', 'card');
        }
    } else {
        echo '<p class="portfolio-list__empty">Нет проектов в этой категории</p>';
    }

    $html = ob_get_clean();
    wp_reset_postdata();

    // Отправляем JSON-ответ
    wp_send_json_success([
        'html'       => $html,
        'max_pages'  => $query->max_num_pages,
        'found'      => $query->found_posts,
        'page'       => $paged,
    ]);
}
// Для авторизованных и неавторизованных пользователей
add_action('wp_ajax_portfolio_filter',        'portfolio_ajax_handler');
add_action('wp_ajax_nopriv_portfolio_filter', 'portfolio_ajax_handler');
```

### Что здесь происходит:

| Параметр   | Описание                                |
| ---------- | --------------------------------------- |
| `page`     | Номер текущей страницы (для пагинации)  |
| `category` | Slug категории или `"all"` для всех     |
| `orderby`  | Поле сортировки (`date`, `title`)       |
| `order`    | Направление сортировки (`ASC` / `DESC`) |
| `per_page` | Кол-во записей за одну подгрузку        |

---

## Шаг 4. JavaScript (AJAX-логика)

Создайте файл `js/portfolio-ajax.js`:

```javascript
/**
 * Portfolio AJAX Filter & Load More
 * Файл: js/portfolio-ajax.js
 */
(function () {
  "use strict";

  // === DOM-элементы ===
  const grid = document.getElementById("portfolio-grid");
  const filterWrap = document.getElementById("portfolio-filter");
  const loadMoreWrap = document.getElementById("portfolio-more-wrap");
  const sortSelect = document.getElementById("portfolio-sort");

  if (!grid || !filterWrap) return;

  // === Состояние ===
  let state = {
    page: 1,
    maxPages: parseInt(
      document.getElementById("portfolio-load-more")?.dataset.maxPages || 1,
    ),
    category: "all",
    orderby: "date",
    order: "DESC",
    loading: false,
  };

  // =========================================================
  //  1. ФИЛЬТРАЦИЯ ПО КАТЕГОРИЯМ
  // =========================================================
  filterWrap.addEventListener("click", function (e) {
    const btn = e.target.closest(".portfolio-filter__btn");
    if (!btn || state.loading) return;

    // Обновить active-класс
    filterWrap
      .querySelectorAll(".portfolio-filter__btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // Обновить состояние — сброс на страницу 1
    state.category = btn.dataset.filter;
    state.page = 1;

    // Загрузить с заменой
    fetchPortfolio(false);
  });

  // =========================================================
  //  2. СОРТИРОВКА
  // =========================================================
  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      const val = this.value.split("-");
      state.orderby = val[0]; // 'date' или 'title'
      state.order = val[1].toUpperCase(); // 'ASC' или 'DESC'
      state.page = 1;

      fetchPortfolio(false);
    });
  }

  // =========================================================
  //  3. КНОПКА «ЗАГРУЗИТЬ ЕЩЁ»
  // =========================================================
  loadMoreWrap.addEventListener("click", function (e) {
    const btn = e.target.closest("#portfolio-load-more");
    if (!btn || state.loading) return;

    state.page++;
    fetchPortfolio(true); // append = true (дозагрузка)
  });

  // =========================================================
  //  4. ГЛАВНАЯ ФУНКЦИЯ — AJAX-ЗАПРОС
  // =========================================================
  function fetchPortfolio(append) {
    state.loading = true;

    // Показать индикатор загрузки
    if (append) {
      showLoadingOnButton();
    } else {
      showLoadingOnGrid();
    }

    // Формируем данные для отправки
    const formData = new FormData();
    formData.append("action", "portfolio_filter");
    formData.append("nonce", portfolioAjax.nonce);
    formData.append("page", state.page);
    formData.append("category", state.category);
    formData.append("orderby", state.orderby);
    formData.append("order", state.order);
    formData.append("per_page", portfolioAjax.posts_per_page);

    fetch(portfolioAjax.ajaxurl, {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((response) => {
        if (!response.success) {
          console.error("Ошибка AJAX:", response);
          return;
        }

        const data = response.data;

        // --- Вставляем HTML ---
        if (append) {
          // Дозагрузка — добавляем в конец
          grid.insertAdjacentHTML("beforeend", data.html);
        } else {
          // Фильтрация — заменяем содержимое
          grid.innerHTML = data.html;
        }

        // --- Анимация появления новых карточек ---
        animateNewCards();

        // --- Обновляем кнопку "Загрузить ещё" ---
        state.maxPages = data.max_pages;
        updateLoadMoreButton();
      })
      .catch((err) => {
        console.error("Fetch error:", err);
      })
      .finally(() => {
        state.loading = false;
        hideLoading();
      });
  }

  // =========================================================
  //  5. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // =========================================================

  // Показать скелетон/лоадер на сетке (при фильтрации)
  function showLoadingOnGrid() {
    grid.classList.add("is-loading");
    grid.style.opacity = "0.5";
    grid.style.pointerEvents = "none";
  }

  // Показать лоадер на кнопке (при дозагрузке)
  function showLoadingOnButton() {
    const btn = document.getElementById("portfolio-load-more");
    if (btn) {
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent;
      btn.textContent = "Загрузка...";
      btn.classList.add("is-loading");
    }
  }

  // Убрать все лоадеры
  function hideLoading() {
    grid.classList.remove("is-loading");
    grid.style.opacity = "";
    grid.style.pointerEvents = "";

    const btn = document.getElementById("portfolio-load-more");
    if (btn) {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || "Загрузить ещё";
      btn.classList.remove("is-loading");
    }
  }

  // Показать/скрыть кнопку "Загрузить ещё"
  function updateLoadMoreButton() {
    const btn = document.getElementById("portfolio-load-more");

    if (state.page >= state.maxPages) {
      // Все записи загружены — прячем кнопку
      if (btn) btn.style.display = "none";
    } else {
      // Есть ещё записи — показываем кнопку
      if (btn) {
        btn.style.display = "";
      } else {
        // Если кнопки нет в DOM — создаём её
        loadMoreWrap.innerHTML = `
                    <button class="portfolio-list__button" id="portfolio-load-more"
                            data-page="${state.page}"
                            data-max-pages="${state.maxPages}">
                        Загрузить ещё
                    </button>
                `;
      }
    }
  }

  // Плавная анимация появления карточек
  function animateNewCards() {
    const cards = grid.querySelectorAll(".portfolio-card");
    cards.forEach((card, i) => {
      if (!card.classList.contains("is-visible")) {
        card.style.opacity = "0";
        card.style.transform = "translateY(20px)";

        setTimeout(() => {
          card.style.transition = "opacity 0.4s ease, transform 0.4s ease";
          card.style.opacity = "1";
          card.style.transform = "translateY(0)";
          card.classList.add("is-visible");
        }, i * 100); // Стаггер-эффект — каждая следующая карточка появляется с задержкой
      }
    });
  }
})();
```

---

## Шаг 5. CSS для состояний загрузки

Добавьте в ваш SCSS/CSS:

```scss
// === Состояние загрузки сетки ===
.portfolio-list__grid.is-loading {
  position: relative;
  min-height: 200px;

  &::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 40px;
    height: 40px;
    margin: -20px 0 0 -20px;
    border: 3px solid rgba(255, 255, 255, 0.2);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// === Кнопка "Загрузить ещё" в состоянии загрузки ===
.portfolio-list__button.is-loading {
  opacity: 0.6;
  pointer-events: none;
  position: relative;
}

// === Анимация карточки ===
.portfolio-card {
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.4s ease,
    transform 0.4s ease;

  &.is-visible {
    opacity: 1;
    transform: translateY(0);
  }
}

// === Пустое состояние ===
.portfolio-list__empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
}

// === Фильтры — активное состояние ===
.portfolio-filter__btn {
  &.active {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.4);
    color: #fff;
  }
}
```

---

## Итоговая структура файлов

```
your-theme/
├── functions.php                    ← CPT, таксономия, AJAX-обработчик, wp_localize_script
├── page-portfolio.php               ← Шаблон страницы портфолио
├── template-parts/
│   └── portfolio-card.php           ← HTML одной карточки
├── js/
│   └── portfolio-ajax.js            ← JS: фильтрация + загрузить ещё
└── scss/
    └── _portfolio-list.scss         ← Стили (загрузка, анимации, фильтры)
```

---

## Пошаговый чек-лист для внедрения

### Подготовка (WordPress-админка)

- [ ] Зарегистрировать CPT `portfolio` (functions.php)
- [ ] Зарегистрировать таксономию `portfolio_category` (functions.php)
- [ ] Создать категории: «Строительство домов», «Отделка домов», «Отделка квартир»
- [ ] Добавить проекты (записи) и назначить им категории + изображения

### Шаблоны

- [ ] Создать `page-portfolio.php` с фильтрами, сеткой и кнопкой «Загрузить ещё»
- [ ] Создать `template-parts/portfolio-card.php` с HTML одной карточки
- [ ] Создать страницу «Портфолио» в админке и назначить ей шаблон

### PHP-логика

- [ ] Добавить `wp_enqueue_scripts` для подключения JS-файла
- [ ] Добавить `wp_localize_script` для передачи `ajaxurl` и `nonce`
- [ ] Создать AJAX-обработчик `portfolio_ajax_handler`
- [ ] Зарегистрировать через `wp_ajax_` и `wp_ajax_nopriv_`

### JavaScript

- [ ] Создать `js/portfolio-ajax.js`
- [ ] Реализовать клик по фильтрам (сброс страницы + замена контента)
- [ ] Реализовать «Загрузить ещё» (инкремент страницы + дозагрузка)
- [ ] Добавить анимации появления карточек
- [ ] Добавить состояния загрузки (лоадер / disabled кнопка)

### CSS

- [ ] Стили для `.is-loading` состояния сетки (спиннер)
- [ ] Стили для `.is-loading` состояния кнопки
- [ ] Стили для `.active` фильтра
- [ ] Анимация `.is-visible` для карточек

### Тестирование

- [ ] Проверить фильтрацию по каждой категории
- [ ] Проверить «Загрузить ещё» — подгрузка следующей порции
- [ ] Проверить, что кнопка скрывается, когда все записи загружены
- [ ] Проверить фильтр + загрузить ещё (комбинированно)
- [ ] Проверить работу на мобильных устройствах
- [ ] Проверить, что сортировка работает корректно

---

## Дополнительно: Кастомные поля (ACF)

Если вы используете плагин **Advanced Custom Fields (ACF)**, добавьте к типу записи `portfolio` поля:

| Поле               | Тип    | Описание                          |
| ------------------ | ------ | --------------------------------- |
| `project_duration` | Text   | Срок выполнения (напр. «4 мес»)   |
| `project_year`     | Number | Год сдачи (для архивных проектов) |
| `project_location` | Text   | Локация (напр. «в Никольском»)    |

Получение в шаблоне:

```php
$duration = get_field('project_duration');
$year     = get_field('project_year');
$location = get_field('project_location');
```

---

## Важные замечания

> [!IMPORTANT]
> **Безопасность**: Всегда используйте `wp_create_nonce()` и `check_ajax_referer()` для защиты AJAX-запросов.

> [!TIP]
> **Производительность**: Если проектов очень много (100+), рассмотрите добавление `'no_found_rows' => true` в `WP_Query`, если вам не нужна информация о пагинации для конкретного запроса. Но в данном случае нам нужен `max_num_pages`, поэтому оставляем как есть.

> [!NOTE]
> **SEO**: AJAX-подгрузка невидима для поисковиков. Убедитесь, что у вас есть стандартная WP пагинация как fallback (для SEO), или используйте `<noscript>` с обычными ссылками.
