# Аудит фронтенда — TOPIK II Master Pro

**Дата:** 2026-11-22
**Commit:** `cc7f8333272c715de22d1a883b924bb576f2cbd0` (short `cc7f833`), рабочее дерево грязное (16 изменённых/удалённых файлов, +205/−193 по `git diff --stat`)
**Аудитор:** frontend-auditor (task-4)
**Режим:** статический анализ кода; приложение не запускалось в браузере (см. «Ограничения аудита»). Эталонные прогоны Lead: `audit/logs/tsc.txt`, `audit/logs/vite-build.txt`, `audit/logs/coverage.txt` (читались).

## Охват и прочитанные файлы

Полностью прочитаны:

- `index.html` (481 стр.)
- `src/app.ts` (1646 стр.), `src/core/renderer.ts` (607), `src/core/window_bindings.ts` (139), `src/core/stats.ts` (1476, полностью), `src/core/speech.ts` (296), `src/core/ui_sync.ts` (43), `src/utils/utils.ts` (743)
- `src/ui/**` (все 42 файла): `BaseComponent.ts`, `component_loader.ts`, `keyboard.ts`, `quiz.ts`, `quiz_strategies.ts`, `quiz_modes_config.ts`, `ui.ts`, `ui_admin.ts`, `ui_animations.ts`, `ui_bulk.ts`, `ui_card.ts`, `ui_collections.ts`, `ui_custom_words.ts`, `ui_data.ts`, `ui_edit_word.ts`, `ui_failed_requests.ts`, `ui_feedback.ts`, `ui_filters.ts`, `ui_grammar.ts`, `ui_hanja.ts`, `ui_interactions.ts`, `ui_leaderboard.ts`, `ui_listening.ts`, `ui_mistakes.ts`, `ui_modal.ts`, `ui_onboarding.ts`, `ui_quotes.ts`, `ui_reading.ts`, `ui_retry.ts`, `ui_review.ts`, `ui_settings.ts`, `ui_share.ts`, `ui_shop.ts`, `ui_trash.ts`, `ui_writing.ts`, `index.ts`
- `src/html/**` — все 23 файла модалок и все 5 партиалов (auth.html 694, writing.html 281, word_actions.html 118, collections.html 119, feedback.html 102, common.html 65, quiz.html 74, stats.html 73, study.html 44, trash.html 45, остальные 14–37 стр.; partials: bottom_nav 126, filter_panel 134, header 58, overlays 71, toolbar 170)
- `src/css/**` — `style.css` (12), `base.css` (105), `themes.css` (88), `animations.css` (249), `skeletons.css` (21), `pages.css` (516), `layout.css` (1261), `admin.css`, `listening.css`, `reading.css`, `feedback.css`, `writing.css`, `shop.css` — полностью; `components.css` (2958) и `quiz.css` (856) — выборочно/полными блоками (модалки, карточки, кнопки, quiz-options, `visually-hidden`) + сплошной grep по всем селекторам.
- Выборочно (для кросс-скоупа): `src/types.d.ts`, `src/types/index.ts`, `vite.config.ts`, `package.json`, `src/sw.ts` (фрагмент), `src/css` инвентаризация.

**Методика:** чтение с проверкой номеров строк; grep по всем `data-action`/`id`/`class`/`innerHTML`; скрипт поиска мёртвых CSS-классов (521 класс, 36 кандидатов); скрипт поиска дублей селекторов (31 совпадение, из них 2 — артефакты `@keyframes from/to`); расчёт контраста WCAG по токенам тем; сверка с реальным build-логом (размеры чанков).

---

## Вердикт

Фронтенд — это богатый функционалом, но крайне «перегруженный» PWA-слой: полноценный виртуальный скролл, 20+ квиз-режимов и продуманная работа с офлайном сочетаются с грубыми UX-регрессиями уровня «ключевая кнопка не работает». Два дефекта блокирующие: панель фильтров физически не открывается из-за двойного обработчика на кнопке тулбара, а система модалок при стеке окон (итоги квиза/объяснение ошибки поверх quiz-modal) закрывает и фокусирует **нижнее** окно — Esc во время квиза обрывает тренировку. Значительная часть фич «мертва» из-за рассинхронизации HTML и JS: модалка корзины не заполняется, «Работа над ошибками» не применяет фильтр, чтение и форма обратной связи недоступны из UI, контейнера бонусов `#quiz-powerups` вообще нет в разметке, а одна из функций обещает `window.handleBulkAddToList`, которого не существует. Доступность системно не дотягивает до WCAG 2.1 AA: `role="dialog"` есть лишь у 9 модалок из 34, `aria-modal` — у 6, карточки получают фокус без визуального индикатора, чекбоксы настроек без имён, а в тёмной теме белый текст на светло-лиловых акцентах даёт контраст 1.9–2.7:1. Производительность страдает от статически импортированного Chart.js (107 КБ) при старте, полного ре-рендера словаря на каждый ответ квиза, записи черновика эссе в `localStorage` на каждое нажатие клавиши и 107 КБ CSS с 36 неиспользуемыми классами и продублированными блоками. При этом базовая гигиена XSS хорошая: `escapeHtml` используется в подавляющем большинстве шаблонов, а окно подтверждения собирается через `textContent`; оставшиеся риски — точечные и в основном data-dependent.

---

## Сводная таблица находок

Легенда: **P0** — сломан UX/недоступность ключевого сценария; **P1** — серьёзный баг/недоступность функции/утечка; **P2** — качество, производительность, a11y; **P3** — нитрик.

| ID | Sev | Область | Файл:строка | Суть | Влияние | Исправление |
|---|---|---|---|---|---|---|
| F-01 | P0 | Фильтры/тулбар | `src/html/partials/toolbar.html:97-103`; `src/ui/ui_filters.ts:182-193` | На кнопке фильтра одновременно `data-action="toggle-filter-panel"` и `onclick="window.toggleFilterPanel()"`; функция — чистый toggle → двойной вызов за один клик | Панель фильтров не открывается, а вместе с ней недоступны сортировка, темы/категории и коллекции: целый блок функций выпадает из UI | Убрать inline `onclick`, оставить только `data-action` (или наоборот); закрепить тест-кейс |
| F-02 | P0 | Модалки/клавиатура | `src/app.ts:907-918`; `src/ui/ui_modal.ts:46-50` | Esc и фокус-трап берут `document.querySelector(".modal.active")` — первое окно в порядке DOM, а не верхнее в стеке | При стеке (quiz-modal + объяснение ошибки/итоги) Esc закрывает внутренний quiz-modal → `quitQuiz(true)`, сессия обрывается; Tab уводит фокус в невидимое нижнее окно | Вести стек открытых модалок, закрывать/трапить topmost; `aria-hidden`/`inert` для фона |
| F-03 | P1 | Обратная связь | `src/ui/ui_feedback.ts:232-241` | Внутрь template-literal `innerHTML` вклеен JS-код (автооткрытие по `#feedback`) — он рендерится как текст в превью каждого вложения | Видимый мусор в UI; автопереход по `#feedback` не работает; кол-во строк кода в шаблоне ломает разметку превью | Удалить строки 235–239 из шаблона, логику hash-перехода вынести в `initPWA`/аналог |
| F-04 | P1 | Обратная связь | `src/app.ts:1321-1352`; `src/html/partials/bottom_nav.html:106` | Единственный триггер `data-action="open-feedback"` живёт в партиале, который полностью перезаписывается `nav.innerHTML`; `window.openFeedbackModal` (ui_feedback:361) нигде не вызывается | Форма «Сообщить о проблеме» недоступна ни из одного места UI | Вернуть кнопку в перезаписываемый nav или не перезаписывать nav |
| F-05 | P1 | Корзина | `src/ui/ui_trash.ts:132-134`; `src/html/modals/auth.html:496-499` | `openTrashModal()` не вызывается нигде; профиль открывает `data-modal-target="trash-modal"` напрямую через `openModal`, без `loadTrashItems()`/`ensureStructure()` | Модалка корзины всегда пуста, восстановление и очистка недоступны; кнопки `#restore-all-btn`/`#empty-trash-btn` не показываются | В глобальном обработчике `data-modal-target="trash-modal"` вызывать `openTrashModal()` |
| F-06 | P1 | Квиз/бонусы | `src/ui/quiz.ts:1207-1210`; `src/html/modals/quiz.html:56-71` | `renderPowerups()` ищет `#quiz-powerups`, а `updateComboUI` — `#quiz-combo`; ни того, ни другого нет в разметке | Бонусы (заморозка времени, пропуск, 50/50, лечение), выдаваемые/продаваемые в магазине, невозможно применить в квизе; комбо-индикатор мёртв | Добавить контейнеры в `quiz.html` (`quiz-header`/`quiz-footer`) |
| F-07 | P1 | Bulk/списки | `src/ui/ui_bulk.ts:396`; `src/types.d.ts:72` | `await window.handleBulkAddToList(newList.id)` — функция нигде не назначена на `window` (есть только экспорт модуля и тип в d.ts) | «Создать новый список…» в bulk-режиме: список создаётся, слова не добавляются, `TypeError` внутри `onValidate` → unhandled rejection | Импортировать `handleBulkAddToList` напрямую |
| F-08 | P1 | Квиз (аудио) | `src/ui/quiz_strategies.ts:478-482` | После `qEl.appendChild(wrapper)` выполняется `qEl.innerHTML += ...` — это пересобирает DOM и уничтожает кнопку с `onclick=play` | В режиме «Аудио» кнопка 🔊 не воспроизводит звук повторно (обработчик потерян), остаётся только автоплей | Создавать подпись отдельным `appendChild`, не смешивать с `innerHTML +=` |
| F-09 | P1 | A11y/контраст | `src/css/quiz.css:455-476`; `src/css/components.css:39-43`; `src/css/base.css:38`; `src/ui/ui_settings.ts:136-146,200-226` | Тёмная тема: `--primary: #a78bfa`, `--success: #34d399`, но `--text-inverse` остаётся `#ffffff` → контраст 2.72:1 у `.btn-quiz`, 1.92:1 у `.quiz-option.correct`, 2.69:1 у `.incorrect`; в светлой теме success — 3.77:1 | Систематическое нарушение WCAG 1.4.3: подписи кнопок и «правильный/неправильный» ответ плохо читаются, особенно в тёмной теме | В dark-палитрах добавить `--text-inverse:#1e1b4b` или затемнять акцентные фоны; пересчитать все пары |
| F-10 | P1 | A11y/фокус | `src/core/renderer.ts:62-71`; `src/css/components.css:119-129` | `.card` — это `div` с `tabIndex=0` и костомным Enter/Space, но `role` не задан и нет ни одного `:focus`/`:focus-visible` стиля | Клавиатурный пользователь не видит, на какой карточке фокус (WCAG 2.4.7); скринридер не знает, что это элемент действия | Добавить `role="group"`/`aria-expanded`, `outline` на `:focus-visible` |
| F-11 | P1 | A11y/модалки | `src/html/modals/stats.html:2-10`; `collections.html:2`; `shop.html:2`; `trash.html:2`; `writing.html:2`; `study.html:2` и др. | `role="dialog"` есть у 9 из 34 модалок, `aria-modal` — у 6 (login, profile, quiz, confirm, quotes-копия в auth.html + динамический review-modal) | Скринридер не объявляет диалог и его заголовок, фон остаётся доступным для навигации; связка с фокус-трапом неполная | Добавить `role="dialog" aria-modal="true" aria-labelledby` всем `.modal` (или выставлять программно в `openModal`) |
| F-12 | P1 | A11y/формы | `src/html/modals/auth.html:271-283, 284-297, 372-380, 417-425, 462-470` | `<label class="switch">` содержит только `input` и декоративный `span.slider`; текст («Ночной режим», «Автообновление»…) лежит в соседнем `.setting-label` без `for`/`aria-label` | Чекбоксы настроек не имеют доступного имени (WCAG 1.3.1/4.1.2) — скринридер читает «флажок» без контекста | Обернуть текст в тот же label, добавить `for`/`aria-label` |
| F-13 | P1 | A11y/клавиатура | `src/html/modals/auth.html:535-557, 631-648, 489-496, 496-504` | Кликабельные `div.setting-item` с `data-action` (экспорт/сброс/удаление аккаунта, цитаты, корзина, достижения, повтор обучения) без `tabindex`/`role` | Действия профиля недоступны с клавиатуры (WCAG 2.1.1), особенно критично для «Выйти»/«Удалить аккаунт» | Заменить на `<button type="button">` |
| F-14 | P1 | Навигация | `src/html/partials/bottom_nav.html:84,106`; `src/app.ts:1321-1352`; `src/core/stats.ts:253` | Перезапись `nav.innerHTML` выкидывает `#srs-badge` и кнопку «Отчёты»; `updateSRSBadge` ищет badge и `.nav-btn[onclick="openReviewMode()"]` — ни того, ни другого нет | Счётчик повторений не отображается (мёртвый код), 6-я вкладка пропала; расхождение партиала и рантайма | Не перезаписывать nav; либо перенести srs-badge/feedback в новую разметку |
| F-15 | P1 | XSS/UI | `src/app.ts:1037-1052` | Приветствие собирается через `innerHTML` из полей цитаты БД (`literal_translation`, `explanation`, `quote_kr`) без `escapeHtml` | Потенциальный stored XSS, если в таблицу `quotes` попадёт HTML (админ/AI/импорт) | `escapeHtml(...)` для всех интерполируемых полей |
| F-16 | P1 | Чтение | `src/ui/ui_reading.ts:160-162`; `src/html/modals/reading.html:2` | `openReadingModal()` нигде не вызывается; нет `data-modal-target="reading-modal"`; модалка инжектится, но открыть её нечем | Раздел «Чтение» (статьи/перевод) недоступен пользователю | Добавить точку входа (nav/тулбар) или удалить мёртвый модуль |
| F-17 | P2 | A11y/touch | `src/css/components.css:2108-2128`; `src/css/layout.css:333-354` | Интерактивные элементы 22×22 (`.btn-icon-tiny-cancel`), 28×28 (`.search-clear-btn`) | Ниже минимума WCAG 2.5.8 AA (24×24), на мобильных промахи | Поднять до 24–44 px |
| F-18 | P2 | A11y/motion | `src/css/layout.css:710`; `components.css:1200,1427`; `pages.css:184`; `skeletons.css:16` и др. | 24 объявления `animation: ... infinite`, при этом ни одного `@media (prefers-reduced-motion)` во всех 15 CSS-файлах | Пользователи с вестибулярными расстройствами не могут отключить постоянные пульсации/шиммеры/прыгающие эмодзи | Добавить глобальный `@media (prefers-reduced-motion: reduce) { animation-duration: .01ms !important; ... }` |
| F-19 | P2 | Layering | `src/css/layout.css:714-755`; `src/css/components.css:871-894` | `#filter-panel` z-index 2000 = `.modal` 2000, но панель в DOM позже модалок `stats/collections/quiz/...`; `openModal` не закрывает панель | Открытие коллекции/темы из панели фильтров рисует модалку **под** панелью, overlay ниже панели | Отдельный слой (`z-index: 1900`) + `body` scroll-lock уже используется; закрывать панель при открытии модалки |
| F-20 | P2 | Производительность | `src/core/stats.ts:8, 640-661`; `vite.config.ts:99-102`; `audit/logs/vite-build.txt` | Chart.js импортирован статически → `vendor-charts` 107.06 КБ (37.99 gzip) грузится на старте; при этом код «ленивой загрузки с CDN» мёртв, т.к. binding `Chart` уже определён | +107 КБ к первой загрузке ради экрана статистики; CDN-фолбэк никогда не срабатывает | `const { Chart } = await import("chart.js")` внутри `renderDetailedStats`, удалить блок CDN |
| F-21 | P2 | Рендеринг | `src/ui/quiz.ts:1055`; `src/ui/ui_card.ts:83-114, 244-339` | Каждый ответ квиза дергает `saveAndRender()` → полный пересбор virtual-scroll DOM (`innerHTML=""`, новые контейнеры, новые слушатели) | Микро-фризы на каждом ответе, лишние перерасчёты во время таймера спринта/выживания | Обновлять точечно (бейдж, прогресс, XP), рендер словаря не нужен |
| F-22 | P2 | Производительность | `src/ui/ui_card.ts:189-242, 337-338, 399-400, 440-470` | В rAF-обработчике скролла создаются `new Image()` и `new Audio()` (по 4 и 2 шт.) на каждый кадр скролла | Churn объектов/сетевых запросов при инерционном скролле, конкуренция за соединение | Кэшировать префетч по id, ограничить частотой/IntersectionObserver |
| F-23 | P2 | Производительность | `src/ui/ui_writing.ts:275-303, 516-531` | В `input`-обработчике ответа эссе `saveDraft()` вызывается синхронно — `JSON.stringify` + `localStorage.setItem` на каждый символ | Заметный jank при наборе текста (30-минутное задание 54, 600–700 знаков) | Debounce 300–500 мс (уже есть `debouncedSave` — использовать только его) |
| F-24 | P2 | Данные/storage | `src/ui/ui_writing.ts:566-576, 867-875` | История эссе (20 записей) хранит base64-фото ответа в `localStorage` | Риск QuotaExceeded (ошибка проглатывается в console) и потеря истории | Хранить фото в IndexedDB/не хранить; ограничить размер |
| F-25 | P2 | Рендеринг | `src/ui/ui_collections.ts:280-291, 293-406`; `src/ui/ui_shop.ts:19-22` | Скрытые модалки перерисовываются: collections ловит `state_changed` и делает `innerHTML=` всего списка; shop рендерится на `stats_updated/settings_updated` | Постоянная DOM-работа даже при закрытых модалках, сброс внутреннего состояния скролла/поиска | Рендерить только когда `element.classList.contains("active")`, либо флаг «dirty» |
| F-26 | P2 | Производительность | `src/ui/ui_filters.ts:125-147` | В цикле по чипам — `countSpan.classList.remove("pop"); void countSpan.offsetWidth;` (принудительный reflow) | Layout thrash на каждом `state-changed` — заметно на слабых телефонах | Батчить: сначала все записи, затем один reflow/`requestAnimationFrame` |
| F-27 | P2 | «Работа над ошибками» | `src/ui/ui_mistakes.ts:175-185`; `src/html/partials/filter_panel.html:63-69` | `document.querySelector(".mistake-chip")` — такого класса в разметке нет (есть `.filter-chip.status-btn.mistake`; CSS `.filter-chip.mistake-chip.active` тоже осиротел) | Кнопка открывает квиз без фильтра «Ошибки» — пользователь тренирует не те слова | Выбирать `[data-value="mistakes"]` |
| F-28 | P2 | Мёртвая фича | `src/html/modals/study.html:1-44` | `#study-goal-modal`, `#study-goal-slider`, `#save-study-goal-btn` не открываются и не инициализируются ни одним модулем | 44 строки разметки + функционал «Учебная цель» недоступны | Подключить открытие/логику либо удалить |
| F-29 | P2 | HTML/дубли | `src/html/modals/auth.html:668-694`; `src/html/modals/quotes.html:2` | Два элемента с `id="quotes-modal"` (auth.html инжектится раньше) → копия из quotes.html недостижима; `getElementById` всегда вернёт auth-вариант | 16 строк разметки мёртвы; при смене порядка инъекции поведение изменится (разные контейнеры списка) | Удалить quotes.html или auth-копию, оставить один `quotes-modal` |
| F-30 | P2 | HTML/дрейф | `src/html/partials/bottom_nav.html:1-126`; `src/app.ts:1321-1352` | Партиал из 6 кнопок полностью перезаписывается 5-кнопочной разметкой в `app.ts`; `srs-badge` и «Отчёты» теряются | Партиал (126 строк) — мёртвый код, поддерживать его бессмысленно; расхождение UI | Убрать перезапись, оставить один источник правды |
| F-31 | P2 | HTML/дрейф | `src/ui/ui_trash.ts:51-64`; `src/html/modals/trash.html:17-42` | `ensureStructure()` перезаписывает содержимое trash-модалки, выбрасывая `#trash-select-all-container`, `#restore-all-btn`, `#empty-trash-btn` | Массовое восстановление/выбор всех в корзине отсутствуют, партиал частично мёртв | Синхронизировать: либо рендер в партиале, либо JS-структура как единственный источник |
| F-32 | P2 | Мёртвый CSS/дубли | `src/css/pages.css:20-58` vs `src/css/components.css:2338-2370`; `layout.css:1071` vs `layout.css:1258`; `skeletons.css:18` vs `components.css:2540` | Продублированы `.quote-content/.quote-kr/.quote-ru/.quote-actions` (2 полных блока, ~38 строк), `.sort-icon` (font-size 18px vs 24px), `.skeleton-pulse`; `.stats-strip` объявлен дважды | Конфликтующие значения (побеждает последний импорт), ~50 строк лишнего CSS | Удалить дубли, оставить по одному определению |
| F-33 | P2 | Мёртвый CSS | 36 неиспользуемых классов (см. сводку б); `src/html/partials/filter_panel.html:2` | У классов `.association-*`, `.pronunciation-*`, `.multiselect-btn`, `.filter-search-input`, `.multiselect-content`, `.status-open/fixed/...` и др. нет ни одного потребителя; `.hidden` вообще не определён в CSS, но используется как класс на панели фильтров | ~250–350 строк мёртвого CSS в 107 КБ бандла, путаница состояний | Вычистить неиспользуемые селекторы, определить `.hidden`/`[hidden]` |
| F-34 | P2 | Мёртвый JS/сборка | `src/ui/index.ts` (0 байт); `src/core/ui_sync.ts:1-43`; `src/ui/ui_trash.ts:132`; `src/ui/ui_reading.ts:160`; `src/ui/ui_shop.ts:263-266`; `src/app.ts:149` | Мёртвые файлы и экспорты; `setSyncState` импортируется в app.ts, но не используется — из-за этого `npm run build` (`tsc && vite build`) падает (`audit/logs/build.txt`: TS6133) | Сборка штатной командой не проходит; мёртвый код мешает навигации | Удалить импорт/файлы; починить `npm run build` |
| F-35 | P2 | API-поверхность | `src/core/window_bindings.ts:47-138` | `Object.assign(window, {...})` ~50 функций, из HTML реально используются 6 (`window.toggleViewMode/toggleFilterPanel/toggleFocusMode/startDailyChallenge/resetSearchHandler` + `window.installApp`) | Мёртвая публичная поверхность + глобальная мутация namespace + риск конфликтов | Оставить только реально используемые inline-вызовы или убрать inline-обработчики совсем |
| F-36 | P2 | HTML/безопасность | `src/html/partials/toolbar.html:25,33,56,100,142,163`; `src/html/modals/auth.html:29,555,574,594`; `src/ui/ui_leaderboard.ts:281`; `src/ui/ui_reading.ts:66`; `src/app.ts:157`; `src/ui/ui.ts:95` | Инлайн `onclick/onerror/onsubmit` + динамические `onclick="location.reload()"` | Невозможно включить строгий CSP (`script-src` без `unsafe-inline`); XSS-поверхность при любой инъекции в разметку | Вынести обработчики в делегирование/`addEventListener`, отказаться от `onerror`-строк |
| F-37 | P2 | HTML | `src/html/modals/auth.html:195-201`; `src/html/modals/writing.html:135-146` | `<img src="">` (avatar, writing-question-img) | Браузер делает запрос на URL текущей страницы, лишний трафик/битые состояния | Не рендерить `<img>` до появления src либо `src` не задавать |
| F-38 | P2 | i18n/a11y | `src/core/renderer.ts:207-214`; `src/app.ts:1037-1042`; `src/ui/quiz_strategies.ts:73`; `src/html/partials/header.html:5`; `src/html/modals/auth.html:198`; `src/ui/ui_reading.ts:66`; `src/html/modals/common.html:64` | Корейские фрагменты без `lang="ko"` (слово/цитата/вопрос квиза); `alt` на английском и неинформативные: `alt="Logo"`, `"Avatar"`, `"Cover"`, `"Fullscreen view"`; даты `toLocaleDateString()` без локали | Скринридер читает корейский русским голосом (WCAG 3.1.2); alt не описывает изображение (1.1.1) | `lang="ko"` на корейские узлы, русские осмысленные `alt`, единая локаль `ru-RU` |
| F-39 | P2 | HTML-семантика | `index.html:438-467`; `src/html/**` | В приложении нет ни одного `<h1>` (заголовки начинаются с `h3`, в collections — `h2`/`h3` вперемешку, в index — `h2` в error-overlay) | Нарушена иерархия заголовков для скринридеров/SEO; непонятна главная тема страницы | Один `<h1>` на страницу/модалку, ниже — `h2`/`h3` |
| F-40 | P2 | A11y/поиск | `src/ui/ui_interactions.ts:157-198` | Дропдаун истории поиска — `div/span`, выбор только `onmousedown`, нет `role="listbox"`, `tabindex`, обработки стрелок/Esc | История поиска недоступна с клавиатуры и не объявляется (WCAG 2.1.1/4.1.2) | Combobox-паттерн: `role`, roving tabindex, Arrow/Enter/Esc |
| F-41 | P2 | A11y/квиз | `src/ui/quiz_strategies.ts:582-611` | Чипы «Конструктора» — `div` с `onclick`, без `tabindex`/`role`/клавиатуры | Режим «Конструктор» непроходим без мыши (WCAG 2.1.1) | `<button>` или role+keydown |
| F-42 | P2 | Навигация/история | `src/ui/ui_modal.ts:12-30, 80-145`; `src/ui/ui_bulk.ts:12-28` | `openModal` делает `pushState` на каждое окно, `closeModal` — `history.back()`; обработчик `popstate` закрывает **все** `.modal.active` | При неудачном совпадении истории могут закрыться чужие модалки; конфликт двух подсистем истории (модалки и режим выбора) | Единый менеджер истории/стека модалок |
| F-43 | P2 | A11y/динамика | `src/html/modals/auth.html:156`; `src/ui/quiz.ts:809-813`; `src/ui/ui_writing.ts:830-840`; `index.html:446-448` | Ошибки авторизации (`#auth-error`), статус вопроса/таймер квиза, «Проверка…» эссе, офлайн-индикатор — без `aria-live`/`role="alert"`/`role="status"` | Скринридер не сообщает об ошибке входа, статусе обработки и потере сети (WCAG 4.1.3) | `role="alert"`/`aria-live="polite"` на соответствующие контейнеры |
| F-44 | P2 | UX/модалки | `src/ui/ui_modal.ts:80-111` | `openModal` не блокирует скролл `body` (в отличие от `toggleFilterPanel`) | Фон прокручивается за модалкой (особенно заметно на desktop/длинных списках) | Добавить `overflow:hidden` на `body` с рефкаунтом открытых окон |
| F-45 | P2 | Вёрстка/скролл | `src/ui/ui_card.ts:14-18, 35-40`; `src/css/components.css:122` | Высота карточки жёстко 480px (`ITEM_HEIGHT_GRID=480`, `--card-height`), при этом содержимое карточек переменное (примеры, теги, статистика) | Виртуальный скролл может «наезжать»/оставлять пустоты; контент обрезается `overflow:hidden` на `.card-front/back` | Измерять реальную высоту (ResizeObserver) или `content-visibility:auto` + masonry |
| F-46 | P2 | Мёртвый HTML/изображения | `src/html/modals/common.html:62-65`; `src/ui/ui_card.ts:746-779` | `#fullscreen-image-overlay` в разметке не используется — создаётся второй оверлей в JS; у него нет Esc/фокуса/role | Мёртвая разметка; полноэкранное изображение недоступно с клавиатуры и не закрывается Esc | Оставить один оверлей, добавить `role="dialog"`, Esc, focus |
| F-47 | P2 | XSS (data-dependent) | `src/core/stats.ts:575`; `src/ui/ui_admin.ts:67`; `src/ui/ui_card.ts:613-620` | Без `escapeHtml` в `innerHTML`: тема в «Мастерстве тем», `err.message` в админке, `list.title/list.icon` в мёртвой копии `openAddToListModal` | Потенциальный XSS, если данные придут из БД/edge-функции с HTML (в остальном коде escape используется) | Escape везде, где данные не литералы |
| F-48 | P3 | HTML | `index.html:29-30, 430-435` | `<audio>` в `<head>` — невалидный HTML5 (flow-content в metadata), браузеры переносят; прелоадер живёт только на JS — при падении модуля спиннер навсегда | Формально невалидная разметка; при ошибке загрузки скриптов пользователь видит вечный спиннер (нет `<noscript>`) | Перенести audio в body; `noscript`-заглушка для прелоадера |
| F-49 | P3 | Код-смели | `src/ui/ui_settings.ts:899-905, 793-802`; `src/core/stats.ts:277-298`; `src/app.ts:1054-1069` | `decodeURIComponent` без try/catch; коррекция скролла focus-mode считает `oldHeight` от нового состояния; `calculateOverallAccuracy` — недостижимый код после `return`, кеш `cachedAccuracy` никогда не присваивается; таймеры `typeText` не отменяются | Мелкие баги/мусор при рефакторинге | Поправить по месту |
| F-50 | P3 | Supply chain | `index.html:12-28`; `src/ui/ui_feedback.ts:160-176`; `src/core/stats.ts:649` | Внешние ресурсы без SRI/локальной копии: шрифт Pretendard (jsDelivr), иконка flaticon, html2canvas с `html2canvas.hertzen.com`, Chart.js с jsDelivr (мёртвая ветка) | Зависимость от чужих CDN на старте/в рантайме, риск компрометации/недоступности, офлайн-деградация | Self-host ассетов, `integrity`, либо бандлить (html2canvas) |

**Счётчики:** P0 — 2, P1 — 14, P2 — 31, P3 — 3. **Итого 50 находок.**

---

## Подробные разборы

### F-01 (P0). Кнопка фильтров вызывает toggle дважды — панель не открывается

`src/html/partials/toolbar.html:97-103`:

```html
<button
  class="tool-btn"
  data-action="toggle-filter-panel"
  onclick="window.toggleFilterPanel()"
  title="Фильтры"
  aria-label="Открыть панель фильтров"
>
```

`src/ui/ui_filters.ts:182-193`:

```ts
export function toggleFilterPanel() {
  const panel = document.getElementById("filter-panel");
  console.info("toggling via global function()");
  const overlay = document.getElementById("filter-panel-overlay");
  if (panel) panel.classList.toggle("show");
  if (overlay) overlay.classList.toggle("show");
  ...
}
```

**Механизм.** Инлайновый `onclick` срабатывает на целевой фазе, затем событие всплывает до `document.body`, где `setupGlobalListeners` (`src/app.ts:399-413`) находит `[data-action]` и вызывает `toggleFilterPanel()` ещё раз. Итог: `show` добавляется и тут же снимается, `body.style.overflow` тоже переключается дважды. Панель не открывается никогда. Внутри панели — сортировка (`sort-topic/level/weak/shuffle`), темы/категории и коллекции, т.е. это не косметика, а выпавший блок функций. Дополнительно ломается onboarding-cleanup (`.click()` в `ui_onboarding.ts:224-227` пытается закрыть панель, а двойной toggle оставляет её открытой).

**Фикс.** Убрать `onclick` (оставить делегирование) **или** убрать `data-action`; аналогично проверить остальные кнопки тулбара (там inline-обработчики без `data-action` — это ок, но дублировать оба способа нельзя).

### F-02 (P0). Esc и focus-trap работают с нижней модалкой стека

`src/app.ts:907-918`:

```ts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const activeModal = document.querySelector(".modal.active");
      if (activeModal) {
        if (activeModal.id === "confirm-modal") {
          closeConfirm();
        } else {
          closeModal(activeModal.id);
        }
      }
    }
  });
```

`src/ui/ui_modal.ts:46-53`:

```ts
function handleFocusTrap(e: KeyboardEvent) {
  if (e.key !== "Tab") return;

  const activeModal = document.querySelector(".modal.active");
  if (!activeModal) return;
```

**Механизм.** `document.querySelector` возвращает первое совпадение в порядке документа. Модалки из `component_loader` идут первыми (`quiz-modal` — 2-й в списке, `stats-modal` — 1-й), а динамические окна (`quiz-summary-modal` `src/ui/quiz.ts:1482-1491`, `mistake-explanation-modal` `quiz.ts:893-908`, `daily-status-modal` `quiz.ts:729-739`, `review-modal` `src/ui/ui_review.ts:31-39`) добавляются в конец `body`. Поэтому при открытом объяснении ошибки Esc закрывает **quiz-modal**: `closeModal` видит `#quiz-game` в `display:flex` и вызывает `quitQuiz(true)` (`ui_modal.ts:118-128`) — тренировка прерывается, а верхнее окно остаётся висеть (его `isQuizPaused` остаётся `true`, следующий ответ «зависает» без авто-перехода). Одновременно focus-trap держит Tab в невидимом фоновом окне — добраться до кнопки «Продолжить» с клавиатуры нельзя.

**Фикс.** Хранить стек открытых модалок (push/pop в `openModal/closeModal`), Esc закрывать `stack[stack.length-1]`, focus-trap строить по верхнему окну, фону — `inert`/`aria-hidden`.

### F-03 (P1). В `ui_feedback.ts` JS-код вклеен внутрь `innerHTML`-шаблона

`src/ui/ui_feedback.ts:232-241`:

```ts
      item.innerHTML = `
        ${preview}

// Automatically open feedback modal if URL hash contains #feedback
if (window.location.hash === "#feedback") {
    uiFeedback.show();
    window.history.replaceState(null, "", window.location.pathname);
}
        <button class="remove-btn">✕</button>
      `;
```

**Механизм.** Блок автооткрытия по `#feedback` (исторически лежал в верхнеуровневом коде модуля) попал в строковый литерал. В итоге: (1) в каждом превью вложения рендерится текст JS-кода; (2) функция «открыть форму по ссылке `#feedback`» не выполняется; (3) HTML получает мусорные узлы-текст. Фича и так недоступна из UI (F-04), но этот баг виден любому, кто откроет форму (если триггер вернут).

**Фикс.** Удалить строки 235–239 из шаблона; hash-переход реализовать в `initPWA()` рядом с обработкой `#admin`/`#feedback`.

### F-04 (P1) + F-14 (P1). Перезапись `<nav>` убивает SRS-бейдж и кнопку «Отчёты»

`src/app.ts:1311-1321`:

```ts
  const nav = document.getElementById("bottom-nav");
  if (nav) {
    // Перемещаем в body, чтобы избежать проблем с наложением (stacking context)
    if (nav.parentElement !== document.body) {
      document.body.appendChild(nav);
    }

    nav.style.setProperty("display", "flex", "important");

    // Принудительно обновляем содержимое панели согласно вашему списку
    nav.innerHTML = `
        <button class="nav-btn active" data-action="nav-home">
```

В перезаписанной версии 5 кнопок: `nav-home`, `open-collections-filter`, `quiz-modal`, `open-review`, `stats-modal`. В партиале (`src/html/partials/bottom_nav.html:84,106`) было 6: плюс `#srs-badge` и `data-action="open-feedback"` («Отчёты»). Следствия: `updateSRSBadge` (`src/core/stats.ts:253-264`) ищет `#srs-badge` → no-op; `updateSRSBadge` также ищет `.nav-btn[onclick="openReviewMode()"]` — устаревший селектор; единственный триггер формы обратной связи исчез (`open-feedback` обрабатывается в `src/ui/ui_interactions.ts:232-234`, но элемента нет), `window.openFeedbackModal` не вызывается. Плюс дрейф: партиал 126 строк поддерживать бессмысленно.

**Фикс.** Убрать `nav.innerHTML` из `app.ts`, оставить партиал; в нём — 6 кнопок; `updateSRSBadge` переписать на `[data-action="open-review"] .badge`.

### F-05 (P1). Корзина открывается пустой: `openTrashModal()` не вызывается

`src/ui/ui_trash.ts:132-134`:

```ts
export async function openTrashModal() {
  trashView.show();
}
```

grep по `src` даёт единственное вхождение — само объявление. Профиль же открывает окно декларативно: `src/html/modals/auth.html:496-499`:

```html
<div class="setting-item" data-modal-target="trash-modal" style="cursor: pointer">
  <div class="setting-left">
    <span class="setting-icon">🗑️</span><span class="setting-label">Корзина</span>
```

Глобальный обработчик (`src/app.ts:362-380`) делает лишь `openModal("trash-modal")`. В результате не вызывается ни `ensureStructure()` (пересоздание шапки/кнопок), ни `loadTrashItems()` — в контейнере `#trash-list` пусто, кнопки «Восстановить все»/«Очистить» скрыты. Восстановление слов (`restore-word`) и окончательное удаление из UI недостижимы.

**Фикс.** В ветке `data-modal-target` специальный кейс `trash-modal` → `import("./ui/ui_trash.ts").then(m => m.openTrashModal())`.

### F-06 (P1). Контейнер бонусов `#quiz-powerups` отсутствует в разметке

`src/ui/quiz.ts:1207-1210`:

```ts
function renderPowerups() {
  const container = document.getElementById("quiz-powerups");
  if (!container) return;
  container.innerHTML = "";
```

`src/html/modals/quiz.html:56-71` — внутри `#quiz-game` есть только `quiz-header`, `quiz-body`, `quiz-footer`; ни `#quiz-powerups`, ни `#quiz-combo`. Эти ID встречаются в TS только в `quiz.ts`, т.е. бонусы и комбо-индикатор физически некуда рисовать. При этом магазин и награды выдают `timeFreeze`, `skipQuestion`, `fiftyFifty`, `survivalHealth` (`src/core/shop_data.ts`, `ui_shop.ts:293-298`), а `renderPowerups` — единственное место их применения. Пользователь платит монеты за неработающую механику.

**Фикс.** Добавить `<div id="quiz-powerups" class="quiz-powerups"></div>` (например, в `quiz-footer`) и `<div id="quiz-combo">` в `quiz-header`.

### F-07 (P1). `window.handleBulkAddToList` не существует

`src/ui/ui_bulk.ts:363-401` (фрагмент 390-398):

```ts
      // 2. Обновляем локальное состояние
      collectionsState.userLists.unshift(newList);
      collectionsState.listItems[newList.id] = new Set();

      // 3. Добавляем слова в новый список
      await window.handleBulkAddToList(newList.id);

      return true;
```

`src/core/window_bindings.ts` присваивает на `window` ~50 функций, но `handleBulkAddToList` среди них нет (grep по `src` находит только экспорт `ui_bulk.ts:344`, вызов на 396 и декларацию типа `src/types.d.ts:72`). Итог: в bulk-режиме «Создать новый список…» → список создан, затем `TypeError: window.handleBulkAddToList is not a function`; промис `onValidate` реджектится в `openConfirm` (`ui_modal.ts:185-195`) → unhandled rejection, слова не добавлены, пользователь видит только что созданный пустой список. TypeScript не поймал из-за ручной декларации `Window`.

**Фикс.** `import { handleBulkAddToList } from "./ui_bulk.ts"` внутри файла (циклической зависимости нет), убрать декларацию из `types.d.ts`.

### F-08 (P1). В режиме «Аудио» кнопка воспроизведения теряет обработчик

`src/ui/quiz_strategies.ts:462-494` (фрагменты):

```ts
      btn.onclick = play;

      wrapper.appendChild(btn);
      qEl.innerHTML = "";
      qEl.appendChild(wrapper);
      qEl.innerHTML += `<div class="quiz-question-sub" style="margin-top:15px;">Выберите перевод</div>`;
      setTimeout(play, 300);
```

**Механизм.** `qEl.innerHTML +=` = «сериализовать текущий DOM + добавить строку, затем распарсить заново». Кнопка `btn` с `onclick` уничтожается; в DOM появляется её HTML-клон без обработчика. Автоплей через `setTimeout` ссылается на отвязанный элемент и потому «работает» (звук есть), но повторный клик по видимой кнопке 🔊 не делает ничего. Отдельно: у кнопки нет доступного имени (только эмодзи) — a11y-минор.

**Фикс.** `qEl.appendChild(wrapper); qEl.insertAdjacentHTML("beforeend", ...)` (это не пересоздаёт уже вставленные узлы).

### F-09 (P1). Контраст в тёмной теме: белый текст на светлых акцентах

`src/css/base.css:38`: `--text-inverse: #ffffff;` — и ни `themes.css`, ни JS-палитры (`src/ui/ui_settings.ts:119-226`) не переопределяют `--text-inverse` в тёмной теме. `src/css/components.css:39-43`:

```css
.btn-quiz {
  background: var(--primary);
  color: var(--text-inverse);
```

`src/css/quiz.css:455-476`:

```css
.quiz-option.correct {
  background: var(--success) !important;
  border-color: var(--success) !important;
  color: white !important;
```

Расчёт по токенам: `#ffffff` на `--primary #a78bfa` (dark purple) = **2.72:1**; на `--success #34d399` (dark) = **1.92:1**; на `--danger #fb7185` = **2.69:1**. В светлой теме success = **3.77:1** — тоже ниже AA для текста 14–16px. Для тёмной темы `.level-btn.active` (`layout.css:934-938`) и `.status-btn` тоже белые на `--primary`. Это систематическая ошибка токенов, а не единичный случай.

**Фикс.** В `THEME_PALETTES_DARK` использовать тёмный `text-inverse` (`#1e1b4b`/`#211c4d`) для light-accent фонов; либо затемнить акцентные фоны; пересчитать пары: `.btn-quiz`, `.quiz-option.correct/incorrect`, `.level-btn.active`, `.status-btn.active`, `.lb-level` (`--gold #f59e0b` на белом = 2.15:1).

### F-10 + F-11 + F-12 + F-13 (P1). Доступность: фокус, диалоги, имена, клавиатура

1. **Карточки** — `src/core/renderer.ts:62-71`:

```ts
export function createCardElement(item: Word, index: number): HTMLElement {
  const el = document.createElement("div");
  el.className = "card";
  el.tabIndex = 0;
  el.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      el.click();
    }
  };
```

`.card` (`components.css:119-129`) не имеет `:focus`-стиля, `role` не задан, а внутри — настоящие `<button>` (озвучка/избранное/добавить), т.е. вложенные интерактивные элементы. Клавиатурный пользователь не видит фокус и не понимает семантику.

2. **Модалки без `role="dialog"`** — 25 из 34 (`stats.html:2`, `collections.html:2`, `shop.html:2`, `trash.html:2`, `writing.html:2`, `study.html:2`, `feedback.html:2`, `leaderboard.html:2`, `reading.html:2`, `common.html:39`, большинство динамических — без атрибутов; `aria-modal` отсутствует даже у `mistakes-modal`, `roles-modal`, `daily-status-modal`, `quiz-summary-modal`, `mistake-explanation-modal`). При этом focus-trap уже реализован — надо лишь довести семантику.

3. **Чекбоксы настроек** — `src/html/modals/auth.html:275-282`:

```html
              <label class="switch">
                <input
                  type="checkbox"
                  id="dark-mode-toggle-switch"
                  data-action="toggle-dark-mode"
                />
                <span class="slider"></span>
              </label>
```

Текст «Ночной режим» находится в `.setting-label` уровнем выше (`auth.html:271-274`) и с `input` не связан — доступного имени у чекбокса нет. То же для 5 других переключателей.

4. **Кликабельные `div`** — `src/html/modals/auth.html:541-546`:

```html
<div class="setting-item" data-action="export-data" style="cursor: pointer">
  <div class="setting-left">
    <span class="setting-icon">💾</span
    ><span class="setting-label">Экспорт данных</span>
  </div>
</div>
```

Таких строк 10+ (импорт, сброс прогресса, выход, удаление аккаунта, достижения, цитаты, корзина, повтор онбординга, ошибки заявок). Ни `tabindex`, ни `role`, ни `keydown` — с клавиатуры недоступны.

**Фикс (пакетом):** программно выставлять dialog-атрибуты в `openModal`; добавить глобальный `:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px }` и `.card:focus-visible`; превратить настройки в `<button>`/`<label for>`.

### F-15 (P1). Неэкранированный `innerHTML` в экране приветствия

`src/app.ts:1037-1052`:

```ts
            let html = `<div class="welcome-quote-card">`;
            html += `<button class="quote-fav-btn ${activeClass}" data-action="save-quote">${heart}</button>`;
            html += `<div class="welcome-kr" id="welcome-quote-kr"></div>`;
            html += `<div class="welcome-ru" id="welcome-quote-ru"></div>`;

            if (quote.literal_translation) {
              html += `<div class="welcome-literal" style="opacity:0; animation:fadeIn 0.8s ease 1.5s forwards">(Дословно: ${quote.literal_translation})</div>`;
            }

            if (quote.explanation) {
              html += `<div class="welcome-explanation" style="opacity:0; animation:fadeIn 0.8s ease 2s forwards">💡 ${quote.explanation}</div>`;
            }
```

Данные приходят из `fetchRandomQuote()` (БД) и вставляются без `escapeHtml` — в отличие от остального кода (`renderer.ts:305,332,441` и т.д.). При появлении HTML в полях цитат (импорт/админка/AI) — stored XSS с выполнением в контексте приложения.

**Фикс.** `escapeHtml(quote.literal_translation)`, `escapeHtml(quote.explanation)`; для `quote_kr/quote_ru` используются `typeText(...textContent)` — там безопасно.

### F-20 (P2). Chart.js загружается на старте, а «ленивая загрузка с CDN» мертва

`src/core/stats.ts:8`:

```ts
import { Chart, TooltipItem, ScriptableContext } from "chart.js";
```

`src/core/stats.ts:640-661`:

```ts
  // Ленивая загрузка Chart.js только при открытии статистики
  if (typeof Chart === "undefined") {
    await new Promise<void>((resolve, reject) => {
      if (document.getElementById("chartjs-cdn")) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.id = "chartjs-cdn";
      s.src = "https://cdn.jsdelivr.net/npm/chart.js";
```

Поскольку `Chart` — статический **value**-импорт, `typeof Chart` никогда не `"undefined"`, CDN-ветка мертва. `vite.config.ts:99-102` выделяет `chart.js` в `vendor-charts`, а `audit/logs/vite-build.txt` показывает реальную цену: **107.06 kB / 37.99 kB gzip**, отдельный чанк, подключаемый как зависимость входного `index-*.js` (431.91 kB / 116.68 kB gzip). Плюс `vendor-supabase` 173.38 kB (45.90 gzip) и `vendor-confetti` 10.67 kB (4.28 gzip, тоже статический импорт из `app.ts:136`) — итого стартовая JS-нагрузка ≈ 205 КБ gzip (≈723 КБ raw), CSS 107.58 kB (19.89 gzip) до первого рендера.

**Фикс.** Удалить CDN-блок, заменить статический импорт на `const { Chart } = await import("chart.js")` внутри `renderDetailedStats()`; confetti — тоже dynamic import.

### F-21 + F-23 (P2). Полный ре-рендер на каждый ответ и запись в localStorage на каждый символ

`src/ui/quiz.ts:1055` (конец `recordQuizAnswer`): `saveAndRender();` → `src/ui/ui.ts:20-26` → `render()` в `src/ui/ui_card.ts:83-114`:

```ts
  if (virtualScrollInitialized) {
    grid.removeEventListener("scroll", onVirtualScroll);
    if (resizeHandler) window.removeEventListener("resize", resizeHandler);
    virtualScrollInitialized = false;
  }
  grid.classList.remove("virtual-scroll-container", "list-view", "grid");
  grid.innerHTML = "";
```

Также `src/ui/ui_writing.ts:275-303`: обработчик `input` у `#writing-answer` вызывает `saveDraft()` (синхронный `JSON.stringify` + `localStorage.setItem`, строки 516-531) на каждый символ. Квиз-таймер тикает раз в секунду и перерисовывает прогресс-бар; в спринте/выживании ре-рендер словаря на ответ добавляет лишние десятки миллисекунд в самый нагруженный момент.

**Фикс.** Для квиза — точечное обновление (`#quiz-score`, `#xp-*`, `#srs-badge`); для эссе — оставить только `debounce(500)`.

### F-27 (P2). «Работа над ошибками» не применяет фильтр

`src/ui/ui_mistakes.ts:175-185`:

```ts
export function startMistakeQuiz() {
  closeModal("mistakes-modal");
  closeModal("stats-modal");

  // Configure quiz to show mistakes
  const mistakeBtn = document.querySelector(".mistake-chip") as HTMLElement;
  if (mistakeBtn) setStarFilter("mistakes", mistakeBtn);

  // Open quiz modal
  openModal("quiz-modal");
```

Класса `.mistake-chip` нет ни в одном HTML/TS (есть `.filter-chip.status-btn.mistake` в `filter_panel.html:63-69`; в CSS остался осиротевший селектор `.filter-chip.mistake-chip.active` — `components.css:936`). `mistakeBtn === null` → `setStarFilter` не вызывается, квиз открывается с текущими фильтрами (обычно «Все»), т.е. кнопка «Работа над ошибками» не делает того, что обещает.

**Фикс.** `document.querySelector('#level-filters [data-value="mistakes"]')`.

### F-30 + F-31 + F-32 + F-33 + F-34 (P2). Мёртвый/дублирующийся код и сборка

- **Перезапись партиалов:** `bottom_nav.html` (126 строк) полностью уничтожается `nav.innerHTML` в `app.ts:1321`; `trash.html:17-42` (select-all/restore-all/empty-trash) выбрасывается `ui_trash.ts:51-64`; `quotes.html` недостижим из-за дубля `id="quotes-modal"` (`auth.html:669`); `common.html:62-65` (`#fullscreen-image-overlay`) не используется — JS создаёт свой оверлей (`ui_card.ts:746-779`); `study.html` (44 строки) не открывается вообще.
- **Дубли CSS:** `.quote-content/.quote-kr/.quote-ru/.quote-actions` определены в `pages.css:20-58` и повторно в `components.css:2338-2370`; `.sort-icon` — `layout.css:1071` (18px) и `layout.css:1258` (24px); `.skeleton-pulse` — `skeletons.css:18` и `components.css:2540`; `#toast-container` — 3 определения в `components.css`. `style.css` импортирует 12 CSS-файлов (143 КБ исходников → 107.58 КБ бандла).
- **Мёртвые классы:** 36 классов без потребителей (см. сводку б); `.hidden` используется в `filter_panel.html:2`, но в CSS не определён (панель скрывается только `transform: translateX(-100%)` — сейчас работает случайно).
- **Мёртвые JS-файлы/экспорты:** `src/ui/index.ts` — 0 байт; `src/core/ui_sync.ts` — 43 строки, `#sync-btn` в проекте отсутствует; `openTrashModal`, `openReadingModal`, `openWritingModal`, `updateShopUI`, `updateSettingsUI`, `updateVoiceUI`, `updateThemePickerUI` и др. — без вызовов. `setSyncState` импортирован в `app.ts:149` и не используется → **`npm run build` падает**: `src/app.ts(149,1): error TS6133` (`audit/logs/build.txt`; `audit/logs/tsc-head.txt` показывает, что на чистом HEAD такой ошибки нет — регрессия из незакоммиченных изменений).

### F-36/50 (P3/P2). Inline-обработчики и внешние скрипты без SRI

Инлайн `onclick` (`toolbar.html:25,33,56,100,142,163`; `auth.html:29,555,574,594`; `feedback.html:15`; `word_actions.html:15`), инлайн `onerror` (`ui_leaderboard.ts:281`, `ui_reading.ts:66`), динамический `onclick="location.reload()"` (`app.ts:157`, `ui.ts:95`) и `<link ... onload=` для шрифта (`index.html:15-28`) означают, что строгий `Content-Security-Policy` включить нельзя без рефакторинга. Внешние ресурсы без `integrity`: shрифт с `cdn.jsdelivr.net`, иконка с `cdn-icons-png.flaticon.com` (`index.html:12`), `html2canvas` с `html2canvas.hertzen.com` (`ui_feedback.ts:167`). Для PWA с офлайн-приоритетом это ещё и деградация в офлайне.

---

## (а) Таблица a11y-проблем по критериям WCAG 2.1 AA

| Критерий | Уровень | Проблема | Где | ID |
|---|---|---|---|---|
| 1.1.1 Non-text Content | A | `alt="Logo"/"Avatar"/"Cover"/"Fullscreen view"` — неинформативные/англоязычные; у `#writing-question-img` alt нет; canvas `#listening-visualizer` без fallback | header.html:5; auth.html:198; ui_reading.ts:66; common.html:64; writing.html:137; listening.html:15 | F-38 |
| 1.3.1 Info and Relationships | A | Чекбоксы без программных имён; заголовки h3 без h1; `div`-кнопки; вложенные labels (`ui_settings.ensureExtraInfoSetting`) | auth.html:271-283; index.html:438-467; auth.html:541-546; ui_settings.ts:313-337 | F-12, F-13, F-39 |
| 2.1.1 Keyboard | A | Нет клавиатуры: настройки-`div`, история поиска, чипы «Конструктора», карточки без семантики | auth.html:535-557; ui_interactions.ts:157-198; quiz_strategies.ts:582-611; renderer.ts:62-71 | F-10, F-13, F-40, F-41 |
| 2.3.3 Animation from Interactions | AAA (best practice) | Нет `prefers-reduced-motion` при 24 infinite-анимациях | layout.css:710; components.css:1200,1427; pages.css:184; skeletons.css:16 | F-18 |
| 2.4.3 Focus Order | A | Focus-trap/Esc работают с нижним окном стека; фокус может уйти в фон | app.ts:907-918; ui_modal.ts:46-50 | F-02 |
| 2.4.7 Focus Visible | AA | Карточки (`div tabindex=0`) без стиля фокуса; часть кнопок с `outline:none` без замены | renderer.ts:62-71; components.css:119-129; quiz.css:562-565 | F-10 |
| 1.4.3 Contrast (Minimum) | AA | Тёмная тема: 2.72:1 (кнопки), 1.92:1 (верный ответ), 2.69:1 (неверный); light success 3.77:1; gold 2.15:1 | base.css:38; quiz.css:455-476; components.css:39-43; ui_settings.ts:136-146 | F-09 |
| 2.5.8 Target Size (Minimum, WCAG 2.2 AA) | AA | 22×22 и 28×28 кнопки | components.css:2108-2128; layout.css:333-354 | F-17 |
| 3.1.2 Language of Parts | AA | Корейский без `lang="ko"` в карточках/цитатах/квизе | renderer.ts:207-214; app.ts:1037-1042; quiz_strategies.ts:73 | F-38 |
| 4.1.2 Name, Role, Value | A | 23/28 модалок без `role="dialog"/aria-modal`; чекбоксы без имени; `div`-кнопки без роли | см. F-11, F-12, F-13 | F-11 |
| 4.1.3 Status Messages | AA | Ошибки входа, «Проверка…», офлайн-статус без `aria-live` | auth.html:156; index.html:446-448; ui_writing.ts:830-840 | F-43 |
| 2.4.1 Bypass Blocks / 1.3.2 | A | Нет skip-link/landmark-разметки (`<main>` есть, но header/nav без aria-label) | index.html:462 | F-39 |

## (б) Таблица дублей/мёртвого кода с оценкой экономии

| Объект | Файл:строка | Оценка | Комментарий |
|---|---|---|---|
| `bottom_nav.html` (весь партиал) | `src/html/partials/bottom_nav.html:1-126` | ~126 строк (~5 КБ) | 100% перезаписывается `app.ts:1321` |
| `trash.html` select-all/restore-all/empty-trash | `src/html/modals/trash.html:17-42` | ~26 строк | выбрасывается `ui_trash.ts:51-64` |
| `quotes.html` (дубль quotes-modal) | `src/html/modals/quotes.html:1-16` | 16 строк | недостижим из-за дубля id (`auth.html:669`) |
| `study.html` | `src/html/modals/study.html:1-44` | 44 строки | модалка нигде не открывается |
| `#fullscreen-image-overlay` | `src/html/modals/common.html:62-65` | 4 строки | не используется (динамический оверлей в `ui_card.ts:746`) |
| `src/ui/index.ts` | файл | 0 байт | мёртвый файл |
| `src/core/ui_sync.ts` | 1-43 | 43 строки (~1.5 КБ) | нет `#sync-btn`; вызывает TS6133 в `app.ts:149` |
| `openTrashModal`, `openReadingModal`, `openWritingModal`, `updateShopUI`, `updateSettingsUI` и др. | ui_trash.ts:132; ui_reading.ts:160; ui_writing.ts:354; ui_shop.ts:263; ui_settings.ts:443 | ~60 строк | экспорты без вызовов |
| `.quote-*` блок | `pages.css:20-58` vs `components.css:2338-2370` | ~38 строк дубля | конфликтующие значения |
| `.sort-icon`, `.skeleton-pulse`, `#toast-container`, `.stats-strip`, `.view-btn`, `.view-toggle`, `.card-front`, `.card-back` | layout.css:1071/1258; skeletons.css:18/components.css:2540; components.css (3×); pages.css:61; components.css:2545/layout.css:415 | ~35–45 строк дубля | наследие нескольких итераций |
| 36 неиспользуемых классов | `association-*`, `pronunciation-*`, `multiselect-btn`, `multiselect-content`, `filter-search-input`, `card-level-pill`, `status-open/fixed/...`, `delete-quote-btn`, `slider-round` и др. | ~250–350 строк (~8–12 КБ исходников) | список получен скриптом по 521 классу |
| Мёртвые JS-обработчики `data-action` | `app.ts:413-811` (`toggle-select-mode` — нет элемента в HTML; `preview-theme` — нет элемента, только mouseover-ветки 818,827) | ~10 строк | — |
| Дублирующиеся функции | `ui_card.ts:595-626` `openAddToListModal` (копия `ui_collections.ts:742-773`); `ensureErrorOverlay` (`app.ts:154`) vs `showError` fallback (`ui.ts:91-105`) vs `#error-overlay` в `index.html:451` | ~45 строк | тройная реализация error overlay |
| Инлайн CSS в `index.html` | `index.html:31-391` | ~360 строк (~9 КБ) | часть дублирует components/layout (`btn-primary`, `bulk-bar`, `onboarding-*`) |
| **Итого оценка** | | **~1100–1250 строк / ~35–45 КБ исходников** | CSS-бандл 107.6 КБ; реальный выигрыш после чистки ≈ 8–12% |

## (в) Таблица «мёртвые кнопки/элементы»

| Элемент | Файл:строка | Почему не работает | ID |
|---|---|---|---|
| Кнопка «Фильтры» в тулбаре | toolbar.html:97-103 | двойной toggle за один клик | F-01 |
| «Отчёты» в нижней навигации | bottom_nav.html:106 | удаляется перезаписью `nav.innerHTML` | F-04 |
| «Корзина» в профиле | auth.html:496-499 | открывается пустая модалка (нет загрузки) | F-05 |
| Кнопки бонусов квиза | quiz.html (отсутствуют) | контейнер `#quiz-powerups` не создан | F-06 |
| «Создать новый список…» (bulk) | ui_bulk.ts:396 | `window.handleBulkAddToList` не определён | F-07 |
| Кнопка 🔊 в режиме «Аудио» | quiz_strategies.ts:478-482 | обработчик уничтожен `innerHTML +=` | F-08 |
| «Работа над ошибками» | ui_mistakes.ts:180 | `.mistake-chip` не существует | F-27 |
| «Сохранить» в «Учебной цели» | study.html:39 | модалка не открывается, обработчика нет | F-28 |
| «Восстановить все»/«Очистить корзину» | trash.html:36-42 | выбрасываются при пересоздании структуры | F-31 |
| `#srs-badge` | bottom_nav.html:84 | удалён перезаписью nav; `updateSRSBadge` — no-op | F-14 |
| Ссылки «Регистрация»/«Забыли пароль?» | auth.html:150-154 | `href="#"` без `preventDefault` в делегировании — прыжок URL/скролл к верху (не сломано, но грязно) | — |
| `.setting-item` без роли (настройки) | auth.html:489-556, 631-648 | доступны мышью, не с клавиатуры | F-13 |
| `#collection-filter-btn` в тулбаре | toolbar.html:80-95 | наполняется только когда фильтр активен — ок; но при неактивном `display:none` без `aria-hidden` — минор | — |

---

## Хорошо сделано

- **XSS-гигиена в шаблонах**: `escapeHtml` (`src/utils/utils.ts:6-15`) применяется в renderer/quiz/карточках/коллекциях/письме; окно подтверждения собирается через `replaceChildren`+`textContent` (`ui_modal.ts:161-166`) — сообщения с сервера безопасны; `renderTopicMastery` — редкое исключение.
- **Фокус-трап и возврат фокуса** уже реализованы (`ui_modal.ts:33-40, 80-111, 139-143`) — базу для a11y достаточно довести, а не строить заново.
- **Клавиатурная навигация квиза** (`ui.ts:112-168`): стрелки/Enter/Space по вариантам, защита от перехвата пробела в полях.
- **Производительность словаря**: настоящий виртуальный скролл (`ui_card.ts:244-401`), `contain: layout` (`layout.css:538`), поиск в Worker (`src/workers/searchWorker.ts`), debounce ввода 200 мс, `content-visibility` — единственный реальный кандидат на добавление.
- **Скелетоны и CLS**: `renderSkeletons` с фиксированной высотой до загрузки данных (`ui_card.ts:50-81`), `--card-height`.
- **`aria-live` для тостов** (`index.html:443`: `role="status" aria-live="polite" aria-atomic`), `visually-hidden`-лейблы в auth-форме, `aria-label` у большинства icon-кнопок тулбара/хедера.
- **Уважение reduced-motion в JS**: `disableForReducedMotion` во всех вызовах confetti (app.ts:953 и др.), `getAnimationDuration()` для Chart.js (`stats.ts:602-604`).
- **Модалки с подтверждением закрытия** (письмо с черновиком, `ui_writing.ts:385-408`), `openConfirm` с async-валидацией пароля (`ui_data.ts:105-133`), удаление с Undo (`showUndoToast`, `deleteList`/`bulkDelete`).
- **Ленивая инъекция и code-splitting**: `?raw`-партиалы, динамические `import()` для тяжёлых модулей (bulk, custom words, shop, review, share).
- **Обработка ошибок аудио/TTS** с fallback (`utils.ts:609-742`), `promiseWithTimeout` для сетевых вызовов, глобальный error-overlay с кнопкой reload.

---

## Ограничения аудита

- Приложение **не запускалось в браузере**: нет Lighthouse/axe/DevTools-профилей; выводы о поведении (двойной toggle, стек модалок, потерянные обработчики) сделаны по коду и подтверждены цепочками вызовов/подписками, но не воспроизведены визуально.
- Контраст рассчитан по токенам тем (sRGB-формула WCAG), без учёта `backdrop-filter`, полупрозрачных поверхностей (`surface-1: rgba(...)`) и реального фона под ними — фактические значения в тёмной теме могут отличаться на ±0.2–0.5.
- Анализ мёртвых CSS-классов — эвристика по строковому совпадению: не учитывает динамически собираемые имена (`font-size-${size}`, `status-${...}`), поэтому список из 36 — кандидаты, а не приговор; дубли селекторов посчитаны по «сырому» парсингу (псевдоэлементы/`@keyframes` отфильтрованы вручную).
- XSS-риски из F-15/F-47 помечены как data-dependent: содержимое таблицы `quotes`/`vocabulary`/`user_lists` в рабочей БД не проверялось (это скоуп security-auditor).
- Не аудировались (другие скоупы): `src/core/db.ts`, `state.ts`, `auth.ts`, `sync.ts`, `sw.ts`, `pwa.ts`, Supabase-миграции, Edge Functions, `vite.config.ts` целиком.
- Эталонные прогоны Lead: `tsc-head.txt` — чисто; `tsc.txt`/`build.txt` — ошибка `TS6133` (`app.ts:149`); `lint.txt` — пустой; `vite-build.txt` — успешный отдельный build; coverage — 1.87% (UI-слой 0%, т.е. фронтенд не покрыт тестами).
- Номера строк соответствуют текущему рабочему дереву (с незакоммиченными изменениями); после мержа они могут сместиться.

---

## Кросс-скоуп

- **security-auditor:**
  - `app.ts:1037-1052` — `innerHTML` из полей цитаты БД без escape (F-15) — потенциальный stored XSS.
  - Inline `onclick/onerror/onsubmit` + `onclick="location.reload()"` (`toolbar.html`, `auth.html`, `ui_leaderboard.ts:281`, `ui_reading.ts:66`, `app.ts:157`) — CSP без `unsafe-inline` невозможен; строковые `onerror` — вектор.
  - Внешние скрипты без SRI: `html2canvas` с `html2canvas.hertzen.com` (`ui_feedback.ts:167`), Chart.js CDN (мёртвая ветка), шрифт/иконка с jsDelivr/flaticon (`index.html:12-28`).
  - `ui_admin.ts:67` — `err.message` в `innerHTML`; `ui_card.ts:613-620` — `list.title/icon` без escape (функция-дубль, но паттерн показателен).
- **data-offline-auditor:**
  - `ui_writing.ts:566-576, 867-875` — base64-изображения в `localStorage`-истории (квоты, потеря данных) — F-24.
  - `ui_trash.ts:250-252` + `app.ts:1497` — `cleanupExpiredTrash()` вызывается в `setupTrash()` до восстановления сессии (`state.currentUser` ещё `null`), поэтому у залогиненного пользователя очистка по retention при старте не срабатывает.
  - `ui_bulk.ts:12-28`/`ui_modal.ts:12-30` — две подсистемы `history.pushState` конкурируют (F-42).
- **learning-logic-auditor:**
  - `quiz_modes_config.ts:350-353` + `quiz.ts:507-533`: режим «Аудирование» фильтрует пул по `w.type === "dialogue"`, тогда как базовый пул уже отфильтрован по `state.currentType` (кнопка либо навсегда disabled, либо квиз молча запускается на первых 10 словах из `state.dataStore`).
  - `updateSRSBadge` (`stats.ts:246-276`) и `Scheduler.getQueue` вызываются на каждый `saveAndRender` — пересчёт очереди на каждое действие UI.
- **quality-arch-auditor:**
  - `npm run build` (`tsc && vite build`) падает из-за `app.ts:149` (`setSyncState` unused) — регрессия незакоммиченных изменений (на HEAD чисто, см. `tsc-head.txt`).
  - Мёртвые файлы/экспорты: `src/ui/index.ts` (0 байт), `ui_sync.ts`, `openTrashModal/openReadingModal/openWritingModal`, дубли `openAddToListModal`, `ui/index.ts`; 50 глобальных `window`-биндингов при 6 используемых; `app.ts` 1646 строк с switch на 89 `data-action`.
  - UI-слой покрыт тестами на 0% (`coverage.txt`), что и объясняет живучесть регрессий F-01/F-03/F-07.
- **backend-auditor:** `#admin-modal` открывается только по `#admin`-хэшу (`ui_admin.ts:155-158`) и дёргает `get-feedback-reports` с `method: "GET"` — проверить, что функция реально принимает GET; форма фидбэка отправляет base64-вложения на edge-функцию (`submit-feedback`), лимит 50 МБ на файл в UI согласовать с лимитами функции.
