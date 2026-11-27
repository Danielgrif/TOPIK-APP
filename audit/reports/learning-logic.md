# Аудит учебной логики TOPIK II Master Pro

**Дата аудита:** 2026-11-22 (Asia/Tashkent, UTC+5)
**Объект:** рабочее дерево `C:\Users\demir\OneDrive\Рабочий стол\TOPIK APP` (есть незакоммиченные изменения, аудит — по рабочему дереву)
**Commit (HEAD):** `cc7f8333272c715de22d1a883b924bb576f2cbd0` (`refs/heads/main`; ветка `gh-pages` — `d0031bf7eac5f797e57a15a0e4b975a5c841d2d5`). Hash прочитан из `.git/HEAD` и `.git/refs/heads/*`; git-команды не запускались.
**Исполнитель:** logic-auditor (task-3)
**Ограничение на запись:** создан/изменён только этот файл.

> Примечание о размерах: в брифе указаны stats.ts 1469 строк, quiz.ts 1411, quiz_strategies.ts 978. В рабочем дереве фактически **stats.ts — 1476 строк, quiz.ts — 1602, quiz_strategies.ts — 1108**. Номера строк ниже проверены чтением рабочего дерева.

---

## 1. Охват и прочитанные файлы

**Охват:** SM-2-планировщик, XP/уровни/лиги/стрики/ачивки/магазин, квизовые режимы и начисление наград, распознавание речи и оценка произношения, хангыль-утилиты, тесты ядра.

### Полностью прочитано
- `src/core/scheduler.ts` (159), `src/core/scheduler.test.ts` (119)
- `src/core/stats.ts` (1476), `src/core/stats.test.ts` (104)
- `src/core/xp.ts` (26), `src/core/state.ts` (536), `src/core/sync.ts` (209)
- `src/core/session.ts` (156), `src/core/session.test.ts` (91), `src/core/db.test.ts` (77), `src/test-setup.ts` (55)
- `src/core/shop_data.ts` (96), `src/core/collections_data.ts` (17), `src/core/associations.ts` (85), `src/core/confusing_words.ts` (43), `src/core/constants.ts` (92)
- `src/core/speech.ts` (296), `src/ui/quiz.ts` (1602), `src/ui/quiz_strategies.ts` (1108), `src/ui/quiz_modes_config.ts` (361)
- `src/ui/ui_review.ts` (176), `src/ui/ui_shop.ts` (495), `src/ui/ui_leaderboard.ts` (320), `src/ui/ui_data.ts` (316), `src/ui/keyboard.ts` (232)
- `src/utils/hangul.ts` (296), `src/utils/utils.ts` (743), `src/types/index.ts` (179)
- `src/html/modals/study.html` (44), `README.md` (254), `package.json` (50), `vite.config.ts` (121)
- `audit/logs/tsc.txt`, `audit/logs/build.txt`, `audit/logs/lint.txt`, `audit/logs/test.txt`

### Прочитано фрагментарно (только относящиеся к учебной логике участки)
- `src/core/db.ts` — строки 1–200, 380–912 (не прочитаны 201–379: загрузка словаря), плюс точечные фрагменты
- `src/app.ts` — 470–480, 625–665, 1246–1260, 1460–1520, плюс grep по всему файлу
- `src/ui/ui_card.ts` — 560–709 + grep; `src/core/renderer.ts` — 470–607 + grep; `src/ui/ui.ts` — 1–80
- `src/ui/ui_listening.ts` — 150–269; `src/ui/ui_custom_words.ts` — 80–169; `src/ui/ui_modal.ts` — 95–233; `src/ui/ui_mistakes.ts` — 130–185
- `src/ui/component_loader.ts` — только grep (импорт study.html)

**Не читалось (вне моего скоупа):** `node_modules`, `dist`, `.git/objects`, `supabase/**` (backend-auditor), CSS, auth/network/PWA.

---

## 2. Вердикт

Ядро обучения работает не так, как заявлено: это не SM-2/FSRS, а кастомный SM-2-вариант, в котором **ветка «good» (grade 4) недостижима из UI**, из-за чего все успешные повторения идут через множитель «easy» ×1.3, а провал («Забыл») у зрелого слова откладывает его на **20 дней** вместо 1 дня и одновременно с этим квизовый путь помечает то же слово «due прямо сейчас» — две подсистемы планирования противоречат друг другу (LL-01, LL-02).
SRS почти не связан с основным квизовым потоком: правильные ответы в квизах не двигают SM-2, а любое слово с историей без `sm2` попадает в очередь повторения как «просроченное сейчас», поэтому очередь повторения — это в основном «все слова, которые когда-либо встречались в квизе» (LL-03).
Геймификация содержит несколько **неограниченных источников XP/монет**: двойной клик по «Верно» в эссе, повторная проверка в «Конструкторе», цикл «Знаю → Сброс», двойное начисление монет в ежедневном вызове и mystery box (LL-04, LL-05, LL-07, LL-10), плюс двойной учёт сессий (LL-06).
Учебные вспомогательные функции содержат ошибки данных: ошибки микрофона штрафуются как неверный ответ, возможна утечка микрофона, `toKorean` съедает пробелы и превращает латиницу в «корейский» мусор, виртуальная клавиатура вставляет символ в конец при курсоре в позиции 0 (LL-08, LL-09, LL-11, LL-12, LL-13).
Тесты ядра частично фиктивны (`session.test.ts` — `void import().then()`; `db.test.ts` вообще не импортирует db; `sync.test.ts` отсутствует), поэтому перечисленное выше не ловится (LL-21).
**Итог:** 2 × P0, 9 × P1, 19 × P2, 9 × P3 — до релиза необходимо исправить P0/P1, иначе интервалы, статистика и экономика недостоверны; UI-каркас при этом в целом работоспособен.

---

## 3. Сводная таблица находок

| ID | Severity | Область | Файл:строка | Суть | Влияние | Исправление |
|---|---|---|---|---|---|---|
| LL-01 | P0 | SRS | `scheduler.ts:61-68`, `scheduler.ts:134-135`, `db.ts:169-175` | Провал: soft-lapse 20 % интервала (100→20) и `nextReview = now + 20 дней`; в квизе тот же grade 0 ставит `nextReview = now` | Забытое зрелое слово не возвращается 3 недели; две подсистемы дают разные даты | Провал →`interval=1 день` (+relearning-шаги), единый код `nextReview` |
| LL-02 | P0 | SRS | `scheduler.ts:41-56`, `scheduler.ts:70`, `ui_review.ts:123-125` | Grade 4 («good») не вызывается из UI: остались 5/3/0; все успехи идут через ×1.3 | Интервалы систематически завышены ~30 %, ветка `round(I*EF)` — мёртвый код | Явные 4 оценки или «Знаю»=4, отдельная «Легко» |
| LL-03 | P1 | SRS↔Quiz | `db.ts:162-184`, `quiz.ts:942-948`, `scheduler.ts:93-101`, `quiz.ts:983-994` | Правильный ответ в квизе не обновляет `sm2`; `recordAttempt` создаёт историю без `sm2` → слово «due» с `nextReview:0`; «Изучено» = 1 правильный ответ | Очередь повторения = все отвеченные слова; прогресс SRS не растёт от квизов; ложное «Изучено» | Единый `recordAnswer`, обновляющий SM-2 на любом ответе; `learned` — по критерию (n подряд) |
| LL-04 | P1 | Quiz/фарм | `quiz_strategies.ts:371-378`, `quiz.ts:942-1102` | В «Эссе» кнопки «Верно/Неверно» не блокируются после клика | Двойной клик = повторный `recordQuizAnswer`: +10 XP/монет за клик, без ограничений | Guard `answered` в `recordQuizAnswer` + disable кнопок |
| LL-05 | P1 | Quiz/фарм | `quiz_strategies.ts:567-577`, `quiz_strategies.ts:613-648` | «Сброс» в «Конструкторе» после проверки включает «Проверить» снова | Бесконечный повтор `onAnswer(true)` → +10 XP/монет за каждую проверку | Запрет re-check после первого `onAnswer` |
| LL-06 | P1 | Статистика | `quiz.ts:1133-1143`, `session.ts:64-87` | Каждый квиз пушит сессию, затем `endSession` пушит ещё одну с накопленными счётчиками; `accuracy` = общая точность за всё время | Двойной учёт сессий/слов/времени, накрутка ачивки `sessions_5`, искажение графиков | Один владелец сессий; убрать push из `endQuiz`; в сессии — точность сессии |
| LL-07 | P1 | Экономика | `stats.ts:96-100`, `quiz_modes_config.ts:279-290`, `ui_shop.ts:424-430`, `ui_shop.ts:461-476` | `addXP(val)` скрыто добавляет `val` монет; сверху daily challenge добавляет `totalCoins`, mystery box XP-награда тоже даёт монеты | Монеты начисляются дважды: показано +80, реально +130; «500 XP» = +500 монет | Отделить `addCoins`; убрать коины из `addXP`/пересчитать награды |
| LL-08 | P1 | Speech | `speech.ts:271-281`, `quiz_strategies.ts:1008-1096` | `onerror` → `onResult(0, "")` → `onAnswer(false)` | Запрет микрофона/«no-speech» = ошибка слова, −2 XP, ошибка в статистике, сброс комбо | Техническую ошибку не считать ответом (не вызывать `onAnswer`) |
| LL-09 | P1 | Speech/приватность | `speech.ts:79-93`, `speech.ts:155-163`, `speech.ts:174-184`, `speech.ts:283-295` | Поток `getUserMedia` не останавливается в `cleanup`; при исключении `new MediaRecorder`/оверрайде обработчиков треки живут; `rec.start()` без try | Микрофон может остаться включённым; гонки при повторном нажатии | Единый `abort()` в `finally`, `stream.getTracks().stop()` всегда, try/catch вокруг `start()` |
| LL-10 | P1 | Фарм | `ui_card.ts:634-648`, `ui_card.ts:650-659`, `ui_card.ts:682-690` | `markLearned` начисляет +10 XP и +10 монет без проверки «уже изучено»; `resetProgress` не откатывает награды | Цикл «Знаю → Сброс → Знаю» = неограниченные монеты/XP | Идемпотентность: награда только за первое изучение, откат при reset |
| LL-11 | P1 | XP/лидерборд | `xp.ts:20-26`, `ui_leaderboard.ts:242-247`, `db.ts:442-449` | `getTotalXP` — цикл до `level` без защиты; уровень из облака не валидируется | Пользователь с `level=1e9` в таблице лидеров вешает вкладку у всех (DoS) | Ограничить уровень (например, 999) + считать total по формуле/кэшу |
| LL-12 | P2 | Клавиатура | `keyboard.ts:122-123` | `selectionStart \|\| length`: 0 — falsy | При курсоре в начале строки символ вставляется в конец → неверный ответ | `??` вместо `\|\|` |
| LL-13 | P2 | Hangul | `hangul.ts:44`, `hangul.ts:107-109`, `ui_custom_words.ts:112-125` | Пробел входит в строку `JONG` и распознаётся как jamo → пробелы съедаются; латиница без проверки романизации конвертируется в «корейский» мусор | `toKorean("a b") → "뮤"`, `toKorean("hello world") → "ㅗ디ㅣㅐ재깅"`; автоисправление портит пользовательские слова | Исключить whitespace из `JONG`-проверки; не автоисправлять латиницу без валидной романизации |
| LL-14 | P2 | Quiz | `quiz.ts:507-516`, `quiz.ts:1354-1363`, `quiz.ts:1380-1389` | Фильтр старта: `w.topic_ru \|\| w.topic_kr`, а счётчики/доступность: `w.topic \|\| ...` | «Доступно слов: N» при фактическом пуле 0 → квиз не стартует | Один общий `matchesFilter` |
| LL-15 | P2 | Quiz/данные | `quiz_strategies.ts:26-33`, `quiz_strategies.ts:75-81` | `getOptions` не исключает дубли переводов и пустые переводы, нет защиты от «мало слов» | Два одинаковых варианта, один помечен неверным; пустые кнопки; при ≤4 словах 1 вариант | Дедуп по тексту/непустоте, fallback-режим при малом словаре |
| LL-16 | P2 | SRS UI | `ui_review.ts:80`, `ui_review.ts:87-125` | Кнопки «Знаю/Сомневаюсь/Забыл» не блокируются, `next()` через 50 мс | Двойной клик случайно оценивает следующее слово, интервал уходит 1→6 дней | `disabled` до `next()`, задержка ≥300 мс |
| LL-17 | P2 | Стрик | `db.ts:121-154`, `session.ts:28-41` | Дата локальная (`toLocaleDateString("en-CA")`), стрик растёт от запуска сессии | Смена TZ/часов: сброс или накрутка серии; серия растёт без учёбы | UTC-дата сервера/день по фиксированному TZ, инкремент только за учебное действие |
| LL-18 | P2 | Лиги | `stats.ts:19-34`, `db.ts:468-474` | Неделя — локальный ISO-week; `weeklyXp` из облака берётся максимумом | Пересечение line of date → двойной сброс/понижение; «воскрешение» weeklyXp прошлой недели | Серверный week_id, не мержить weeklyXp после сброса |
| LL-19 | P2 | XP/уровни | `xp.ts:10-14`, `stats.ts:1373-1388` | Формула изменена (было `100+lvl*50`, стало power-law) без миграции; «Божество» = 100 lvl ≈ 1 129 175 XP | Потеря «заслуженного» уровня при апдейте; 113 тыс. ответов до топ-роли | Версия формулы + пересчёт/гранд-период; смягчить кривую |
| LL-20 | P2 | Импорт/защиты | `ui_data.ts:235-252`, `ui_data.ts:258-259`, `stats.ts:101-118` | Импорт JSON без валидации (`Infinity` из `1e999`, отрицательные coins, любой `wordHistory`); guard 1000 уровней с анимацией | Битое состояние, «Infinity» в UI, сотни анимаций, сохранение отклоняется | Схема-валидация импорта + `Number.isFinite` + clamps |
| LL-21 | P2 | Тесты | `session.test.ts:30-35`, `db.test.ts:62-76`, `README.md:210-222` | `session.test` не возвращает промисы (assertions после теста), `db.test` не импортирует db, `sync.test` нет; `scheduler.test` зависит от `Math.random` | Ложное покрытие; регрессии LL-01…LL-11 не ловятся | Реальные ассерты + мок `Math.random` + тесты на лиги/квиз/стрик |
| LL-22 | P2 | Мёртвая фича | `study.html:1-44`, `component_loader.ts:71` | Модалка «Учебная цель» загружается, но её никто не открывает; `studyGoal` нигде не используется | Дневная цель недоступна, прогресса нет | Открытие/handler/save + расчёт прогресса |
| LL-23 | P2 | Мёртвые режимы | `quiz.ts:1246-1257`, `quiz.ts:807`, `quiz.ts:1267-1349` | `timeFreeze/skipQuestion/fiftyFifty` нигде не выдаются; 50/50 считается по DOM до рендера вариантов | Пауэрапы мертвы (кнопки всегда disabled); 50/50 не появляется на 1-м вопросе | Награждать пауэрапы или удалить; перенести `renderPowerups` после `strategy.render` |
| LL-24 | P2 | Quiz/таймер | `quiz.ts:570-586`, `quiz.ts:1093-1098`, `quiz.ts:1274-1287` | Пока `isQuizPaused`/`isTimeFrozen`, `quizLastTick` не обновляется; после — дельта включает паузу | «Заморозка» отнимает время пачкой (60 → 49), пауза TTS «догоняется» | Обновлять `quizLastTick` и при пропуске тика |
| LL-25 | P2 | Режимы/конфиг | `quiz_modes_config.ts:78-87`, `quiz_modes_config.ts:315-320`, `quiz.ts:535-539`, `quiz.ts:985` | Спринт/выживание размножают слова, а `startQuizMode` дедупит; ассоциации = 3 dummy → после дедупа 1 раунд; `learned.add("dummy")` | Задуманные 100/200 вопросов и 3 раунда не работают; «dummy» в «Изучено» | Не дедупить служебные режимы; не класть dummy в learned/XP |
| LL-26 | P2 | Speech | `speech.ts:222-293`, `ui_modal.ts:113-145` | `onresult` может прийти несколько раз; по закрытию модалки распознавание/запись не отменяются | Двойной `onAnswer` (двойной XP/штраф), запись продолжается после выхода | `handled`-флаг на слово + `abort/stop` при закрытии |
| LL-27 | P2 | Данные обучения | `quiz.ts:983-1016`, `ui_review.ts:94-106` | Правильный ответ в квизе добавляет в `learned`, неверный — не убирает; review «Забыл» — убирает | Семантика «Изучено» ломается: слово может быть learned и mistake одновременно | Единые правила статуса слова |
| LL-28 | P2 | Мотивация | `ui_review.ts:87-113`, `quiz.ts:993` | За SRS-повторение не дают ни XP, ни монет; `sessionWordsReviewed` не растёт | Студенты мотивированы гриндить квиз, а не повторять (перевёрнутые стимулы) | +XP за review-ответ, учёт в сессии |
| LL-29 | P2 | Производительность | `stats.ts:277-298`, `stats.ts:535-545`, `quiz.ts:1054-1055`, `confusing_words.ts:12-40` | `cachedAccuracy` не присваивается (код после `return` недостижим); на каждый ответ — O(n) точность + O(n log n) очередь + полный `render()`; `findConfusingWords` O(n²) на каждый вопрос | На словаре 3–5 тыс. слов — заметные лаги в квизе | Починить кэш, считать инкрементально, кэшировать группы |
| LL-30 | P2 | Награды/время | `app.ts:1474-1478`, `ui_shop.ts:326-341`, `ui_shop.ts:389-393` | Ежедневная награда выдаётся автоматически при загрузке; дата — локальная | Перевод часов/смена TZ → повторные награды (гость без сервера) | Серверный/UTC-день, выдавать только по действию |
| LL-31 | P3 | XP/сохранение | `stats.ts:96`, `db.ts:35-52`, `quiz.ts:1015`, `ui_card.ts:656` | Отрицательный XP (штрафы −2/−5) → `validateUserStats` false → `saveUserStats` молча прерывается | Пока XP < 0, stats не сохраняются; на перезагрузке clamp в 0 | Не давать XP < 0 (или отдельный «долг»), не блокировать весь save |
| LL-32 | P3 | SRS/данные | `scheduler.ts:70-76`, `scheduler.ts:130-136` | EF не ограничен сверху, интервал ×(EF×1.3) растёт ~×4 за повтор; битый `ef=NaN` даёт `nextReview=NaN` | Теоретически «вечный» интервал/Infinity; слово навсегда выпадает из очереди | Cap EF/interval, санитайз `sm2` при загрузке |
| LL-33 | P3 | SRS UI | `scheduler.ts:73-76`, `ui_review.ts:80`, `ui_review.ts:111-112` | Preview считается с новым случайным fuzz, фактический `submitReview` — с другим | Обещанный интервал (например, 12 дн) может стать 11–13; тост и кнопка расходятся | Preview без fuzz + общий seed/фактический интервал в тосте |
| LL-34 | P3 | Hangul | `hangul.ts:180-195`, `hangul.ts:99` | В состоянии 3 (одиночный jong) сложный jong (`ㄳ`) не разбирается: `CHO.indexOf` = −1 | `toKorean("ㄷㅏㄳㅏ")` → `"다ꦴ"` (U+AAB4) — мусорный кодпоинт | Разбирать составной jong и в state 3 |
| LL-35 | P3 | Unicode | `quiz_strategies.ts:254-297`, `speech.ts:242-246`, `confusing_words.ts:6` | Нет `normalize("NFC")` при сравнении ввода; длины считаются в code units | NFD-корейский («한») не совпадает с NFC: ложные ошибки, неверные дистанции | NFC-нормализация всех сравнений и длин |
| LL-36 | P3 | Ачивки | `stats.ts:419-425`, `stats.ts:363-369`, `stats.ts:481` | «Покупатель» = `streakFreeze > 0` (заморозка падает из box), «Перфекционист» = `mistakes.size===0 && learned>=5`; `localStorage.setItem` без try | Ачивки открываются не за то действие; при quota — исключение в потоке ответа | Отдельные счётчики покупок, try/catch |
| LL-37 | P3 | Мёртвые поля | `state.ts:93-94`, `types/index.ts:90-93`, `types/index.ts:108`, `state.ts:59` | `streakCount/lastDate`, `userStats.achievements`, `sm2_confidence`, `StudyGoal.type:"time"` vs `study.html` `data-value="minutes"`, `sprintRecord` = число правильных, а описание «очки» | Мусор в типах/сейвах, рассинхрон ожиданий | Удалить/унифицировать |
| LL-38 | P3 | Магазин | `shop_data.ts:7-8`, `ui_shop.ts:277-305` | «Максимум 2 в инвентаре» не проверяется: расходник покупается неограниченно | Лимит из описания не существует | Проверка лимита перед списанием |
| LL-39 | P3 | Качество | `quiz_modes_config.ts:43-48`, `confusing_words.ts:21-24`, `quiz.ts:581-586` | `sort(() => Math.random() − 0.5)` — смещённая тасовка; недостижимый `continue`; `Math.round(deltaSeconds)` дрейф таймера при медленном таймере | Неравномерные вопросы; мёртвый код; спринт может длиться дольше при throttling | Fisher–Yates, убрать dead code, копить дробную дельту |

---

## 4. Подробные разборы

### P0

#### LL-01 · P0 · SRS: soft-lapse 20 % + рассинхрон `nextReview` между review и quiz

`src/core/scheduler.ts:61-68`
```ts
    } else {
      if (interval > 10) {
        interval = Math.max(1, Math.round(interval * 0.2));
      } else {
        interval = 1;
      }
      repetitions = 0;
    }
```
`src/core/scheduler.ts:134-135`
```ts
    const nextReviewDate = Date.now() + result.interval * 24 * 60 * 60 * 1000;
    entry.sm2.nextReview = nextReviewDate;
```
`src/core/db.ts:169-175`
```ts
  if (!isCorrect && stats.sm2) {
    const result = Scheduler.calculate(0, stats.sm2);
    stats.sm2.interval = result.interval;
    ...
    stats.sm2.nextReview = Date.now();
  }
```

**Математика (интервал 100 дней, «Забыл»):** SM-2 ожидает `interval = 1` день и `repetitions = 0`. Факт: `round(100 × 0.2) = 20` → `nextReview = now + 20 × 86400000`; для пользователя «22.11 → 12.12». Для интервала 10 дней — ровно 1 день, для 11 — 2 дня (граница 10/11 — тест `scheduler.test.ts:80-91` это закрепляет). При этом тот же grade 0 из квиза (`recordAttempt`) оставляет `interval = 20`, но ставит `nextReview = now`, т.е. слово «просрочено немедленно». Две записи одного и того же события дают несовместимые даты; после открытия review `previewNextIntervals` покажет «Знаю = 24 дн» (`calculate(5, {interval:20,repetitions:0}) → round(20×1.2)=24`), что ещё дальше усугубляет.

**Влияние:** забытое зрелое слово не повторяется 3 недели — это прямая деградация удержания; данные `interval` и `nextReview` противоречат друг другу; README (`README.md:43`) обещает SM-2/FSRS, где провал возвращает карточку на 1 день.

**Фикс:** ввести `lapses` и relearning-шаги (`1 день → 10 мин → 1 день`); при `grade < 3` ставить `nextReview = now + 1 день`, а `interval` хранить отдельно как «старый интервал»; убрать отдельную SM-2-логику из `recordAttempt`, оставить единый `applyGrade()`.

#### LL-02 · P0 · Grade 4 недостижим, «Знаю» = easy ×1.3, стандартная ветка SM-2 — мёртвый код

`src/core/scheduler.ts:41-56`
```ts
    if (grade >= 3) {
      if (repetitions === 0) {
        ...
      } else if (repetitions === 1) {
        interval = Math.max(6, Math.round(effectiveInterval * ef));
      } else if (grade === 3) {
        interval = Math.round(effectiveInterval * 1.2);
      } else if (grade === 5) {
        interval = Math.round(effectiveInterval * ef * 1.3);
      } else {
        interval = Math.round(effectiveInterval * ef);
      }
```
`src/ui/ui_review.ts:123-125`
```ts
    actions.appendChild(mkBtn("Знаю", fmt(previews.easy), "btn btn-quiz", 5));
    actions.appendChild(mkBtn("Сомневаюсь", fmt(previews.hard), "btn", 3));
    actions.appendChild(mkBtn("Забыл", fmt(previews.fail), "btn action-mistake", 0));
```

**Проверка достижимости:** `calculate(4, ...)` встречается только в `scheduler.test.ts:24` и `:58`; `submitReview` вызывается только из `ui_review` с оценками `5/3/0`; `recordAttempt` использует `calculate(0, ...)`. Значит `else`-ветка (`round(I×EF)`) в production **не выполняется никогда**. Все успехи — `grade 5`, т.е. `I × EF × 1.3`.

**Математика (10-й день, EF 2.5):** SM-2 good: `round(10×2.5)=25` дн. Факт: `round(10×2.5×1.3)=33` дн (+32 %). Серия «Знаю» для нового слова при EF 2.5–2.8: `1, 6, 21, 76, 287, 1119, 4510…` дней вместо `1, 6, 15, 38, 95, 238…`. К 10-му повторению разница — месяцы.

**Влияние:** систематическое перерастягивание интервалов и рост просрочек; заявленный SM-2 не реализован (у SM-2 нет множителя easy и нет «hard ×1.2»); FSRS отсутствует полностью (нет stability/difficulty/desired retention).

**Фикс:** 4 кнопки (`Забыл=0/1`, `Трудно=3`, `Хорошо=4`, `Легко=5`) с отдельными множителями; либо оставить 3 оценки, но «Знаю» → grade 4, а «Легко» — отдельной кнопкой. ML-модель FSRS — отдельным этапом.

### P1

#### LL-03 · P1 · Правильный ответ в квизе не обновляет SRS, а любая история без `sm2` = «due сейчас»

`src/core/db.ts:162-167`
```ts
export function recordAttempt(id: number | string, isCorrect: boolean) {
  if (!state.wordHistory[id]) state.wordHistory[id] = { attempts: 0, correct: 0, lastReview: null };
  const stats = state.wordHistory[id];
  stats.attempts++;
  if (isCorrect) stats.correct++;
  stats.lastReview = Date.now();
```
`src/core/scheduler.ts:93-101`
```ts
      const h = this._history[key];
      if (!h) continue;
      if (!h.sm2) {
        due.push({ ...word, nextReview: 0 });
        seen.add(key);
        continue;
      }
```
`src/ui/quiz.ts:983-994`
```ts
  if (isCorrect) {
    quizCorrectCount++;
    state.learned.add(word.id);
    ...
    addXP(10);
```

**Пример:** новый пользователь отвечает в квизе на 10 слов правильно. В `wordHistory` у них `attempts:1, correct:1`, `sm2` нет. `Scheduler.getQueue` вернёт **все 10 слов с `nextReview:0`** — бейдж SRS показывает 10 «повторов» сразу после того, как слова только что отвечены правильно; `state.learned` тоже +10, хотя интервалы не назначены. Открытие review начинает планирование с нуля (`repetitions=0 → 1 день`).

**Влияние:** главный квизовый поток не влияет на расписание — SRS держится только на отдельной модалке «Повторение» и на ошибках; «Изучено» = один правильный ответ, что рассогласовано с ачивкой «Мастер» (`attempts≥3 и ≥90 %`, `stats.ts:306-311`).

**Фикс:** вызывать `Scheduler.applyGrade` на каждом ответе квиза (correct→4, wrong→1), `learned` считать по критерию (например, 2 верных подряд / interval ≥ 6 дней).

#### LL-04 · P1 · «Эссе»: двойной клик по «Верно» — неограниченный XP/монеты

`src/ui/quiz_strategies.ts:371-378`
```ts
        const correctBtn = document.createElement("button");
        correctBtn.className = "quiz-option correct";
        correctBtn.textContent = "✓ Верно";
        correctBtn.onclick = () => onAnswer(true);
        const incorrectBtn = document.createElement("button");
        incorrectBtn.className = "quiz-option incorrect";
        incorrectBtn.textContent = "✗ Неверно";
        incorrectBtn.onclick = () => onAnswer(false);
```

В отличие от выбора варианта (`handleChoiceClick`, `quiz_strategies.ts:35-50`, отключает все `.quiz-option`), здесь кнопки **не блокируются**. `onAnswer` → `recordQuizAnswer` (`quiz.ts:942`) без guard: `addXP(10)` (`quiz.ts:993`) и `quizCorrectCount++` на каждый клик; переход к следующему вопросу — только через 1.5–3 с (`quiz.ts:1081-1090`). За это окно можно кликнуть 10+ раз: **+100 XP и +100 монет за один вопрос**; `quizCorrectCount` может превысить число вопросов, точность в сводке станет >100 %.

**Фикс:** флаг `questionAnswered` в `quiz.ts`, немедленный `disable` обеих кнопок, защита в `recordQuizAnswer` (`if (questionAnswered) return;`).

#### LL-05 · P1 · «Конструктор»: «Сброс» после проверки реактивирует «Проверить»

`src/ui/quiz_strategies.ts:567-577`
```ts
      resetBtn.onclick = () => {
        currentAnswer.length = 0;
        ...
        checkBtn.disabled = false;
        checkBtn.style.display = "none";
        renderChips();
      };
```
`src/ui/quiz_strategies.ts:613-648`
```ts
      checkBtn.onclick = () => {
        const userAnswer = currentAnswer.map((x) => x.text).join(" ");
        const isCorrect = userAnswer === sentence;
        checkBtn.disabled = true;
        ...
        onAnswer(isCorrect, false);
        const nextBtn = document.createElement("button");
        ...
        nextBtn.onclick = () => onAnswer(null, true, true);
```

После первой проверки `onAnswer(isCorrect, false)` уже начислил (или списал) награду, но `resetBtn` остаётся видимым; после сброса `checkBtn.disabled = false`. Пользователь снова собирает предложение и жмёт «Проверить» → второй `recordQuizAnswer(true)` → ещё +10 XP/монет, и так **без ограничений на одном вопросе**. Каждая повторная проверка добавляет ещё один «Далее», что ломает навигацию (несколько кнопок, каждая двигает индекс).

**Фикс:** `answered`-флаг на вопрос, после первого `onAnswer` блокировать reset/check; отдельный `renderChips` без повторной проверки.

#### LL-06 · P1 · Двойной учёт сессий: `endQuiz` + `endSession`

`src/ui/quiz.ts:1133-1143`
```ts
  if (state.sessionActive && quizWords && quizIndex >= 0) {
    const count = quizIndex + 1;
    state.sessions.push({
      date: new Date().toISOString(),
      duration: Math.round((Date.now() - quizStart) / 1000),
      wordsReviewed: count,
      accuracy: count > 0 ? Math.round((quizCorrectCount / count) * 100) : null, // percentage
    });
```
`src/core/session.ts:76-87`
```ts
  const sessionData = {
    date: new Date().toISOString(),
    duration: state.sessionSeconds,
    wordsReviewed: state.sessionWordsReviewed,
    accuracy: calculateOverallAccuracy() || 0,
  };
  state.sessions.push(sessionData);
```

**Пример:** 3 квиза по 10 слов. Каждый `endQuiz` пишет сессию (10/10/10 слов), затем пользователь жмёт кнопку таймера → `endSession` пишет ещё одну с `wordsReviewed = 30` и `duration =` всё время приложения. Итог: 4 сессии, 60 «слов» вместо 30, суммарное время задвоено; `sessions_5` открывается за 3–5 быстрых запусков; `getLast7DaysActivity`/`renderActivityChart` (`stats.ts:612-631,763-873`) строят графики по этим данным (плюс костыль `×0.5` в `stats.ts:801`). `accuracy` в сессии от `endSession` — это **общая** точность за всё время (`calculateOverallAccuracy`), а не сессии, т.е. смешаны две семантики.

**Фикс:** сессии должны завершаться только в одном месте: убрать push из `endQuiz` (или наоборот — не писать в `endSession` то, что уже записал квиз); в `endSession` хранить точность сессии (`sessionCorrect/sessionAttempts`), а не lifetime; добавить `forceEnd`-проверку, чтобы мгновенный выход не писал «1 слово, 0 %».

#### LL-07 · P1 · Скрытое двойное начисление монет: `addXP` = XP + монеты, поверх — `coins +=`

`src/core/stats.ts:96-100`
```ts
  state.userStats.xp = (state.userStats.xp || 0) + val;
  if (val > 0) {
    state.userStats.weeklyXp = (state.userStats.weeklyXp || 0) + val;
  }
  if (val > 0) state.userStats.coins = (state.userStats.coins || 0) + val;
```
`src/ui/quiz_modes_config.ts:279-290`
```ts
    const baseCoins = 50 * multiplier;
    const streakBonus = Math.min(streak, 7) * 10 * multiplier;
    const totalCoins = baseCoins + streakBonus;
    const xpAward = 50 * multiplier;

    addXP(xpAward);
    state.userStats.coins += totalCoins;
```
`src/ui/ui_shop.ts:424-430`
```ts
  if (finalReward.type === "coins") {
    state.userStats.coins = (state.userStats.coins || 0) + (finalReward.amount || 0);
  } else if (finalReward.type === "xp") {
    addXP(finalReward.amount || 0);
```

**Математика (ежедневный вызов, будний день, серия 3):** сообщение `+50 XP | +80 💰`; фактически `addXP(50)` даёт +50 XP **и +50 монет скрыто**, затем `coins += 80` → **+130 монет** (+62 % к обещанному). Воскресенье (×2): обещано +160, реально +260. Mystery box «✨ 500 XP!» → 500 XP + 500 монет, при цене тем 150–200 это 2–3 темы за одну коробку.

**Фикс:** `addXP` не должен трогать монеты; награды в монетах — только явные `addCoins`; пересчитать `DAILY_REWARDS`/`MYSTERY_BOX_REWARDS` под новую экономику.

#### LL-08 · P1 · Ошибки распознавания речи штрафуются как неверный ответ

`src/core/speech.ts:271-281`
```ts
  rec.onerror = (event: SpeechRecognitionErrorEvent) => {
    let errorMessage = "Ошибка распознавания";
    if (event.error === "no-speech") errorMessage = "Не удалось распознать речь. Попробуйте снова.";
    else if (event.error === "not-allowed" || event.error === "service-not-allowed")
      errorMessage = "Доступ к микрофону запрещен.";
    ...
    stopRecordingAndGetUrl(() => {
      if (onResult) onResult(0, "");
    });
```
`src/ui/quiz_strategies.ts:1008-1096` (сокращённо)
```ts
            const isPass = similarity >= 60;
            ...
            controls.style.display = "none";
            onAnswer(isPass, false);
```

**Цепочка:** запрет микрофона → `similarity = 0` → `onAnswer(false, false)` → `recordQuizAnswer(false)` → `addXP(-2)`, `state.mistakes.add`, `quizStreak = 0` (`quiz.ts:1009-1016`). Пользователь оштрафован за политику браузера/тишину в комнате. То же при `no-speech`.

**Фикс:** ввести в `onResult` признак `error`; при ошибке не вызывать `onAnswer`, показать объяснение и разрешить повтор без штрафа. Аналогично — при `similarity` ниже порога и пустом распознанном тексте.

#### LL-09 · P1 · Утечка микрофона и гонки при повторном запуске распознавания

`src/core/speech.ts:79-93` (создание потока) и `:155-163` (создание рекордера)
```ts
        stream = await navigator.mediaDevices.getUserMedia({ ... });
        ...
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = ...;
        mediaRecorder.start();
      } catch (e) {
        console.warn("Recording failed:", e);
      }
```
`src/core/speech.ts:174-184` и `:283-295`
```ts
  const cleanup = () => {
    if (animationId) cancelAnimationFrame(animationId);
    if (audioContext) { ... }
    ...
  };
  ...
  rec.onend = () => {
    ...
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());
    }
  };

  rec.start();
```

**Сценарии:** (а) `getUserMedia` уже выдал `stream`, но `new MediaRecorder(stream)` бросил исключение (неподдерживаемый контейнер/браузер) — catch только логирует, `stream` не останавливается, `onend` не остановит его, т.к. `mediaRecorder === null`; (б) пользователь нажал микрофон второй раз: `rec.abort()` старый, затем перезаписываются `rec.onresult/onerror/onend`; «onend» старого вызова придёт в **новые** обработчики, а старый `stream`/`MediaRecorder` не остановятся; (в) `rec.start()` вне try — при `InvalidStateError` на повторном старте необработанное исключение и кнопка остаётся `disabled` (`speech.ts:168-171`).

**Влияние:** индикатор микрофона может гореть после ухода из квиза; приватность + нагрев/батарея; второй запуск может не сработать.

**Фикс:** хранить активный `stream` и `mediaRecorder` в модульном состоянии; единый `stopEverything()` в `finally`/при закрытии квиза (`ui_modal.closeModal`); `try/catch` вокруг `start()`; не создавать новый `MediaRecorder`, если предыдущий ещё активен.

#### LL-10 · P1 · Неограниченные монеты через «Знаю → Сброс»

`src/ui/ui_card.ts:634-648`
```ts
export function markLearned(id: string | number) {
  ensureSessionStarted();
  state.learned.add(id);
  state.mistakes.delete(id);
  recordAttempt(id, true);
  ...
  addXP(10);
```
`src/ui/ui_card.ts:682-690`
```ts
export function resetProgress(id: string | number) {
  state.learned.delete(id);
  state.mistakes.delete(id);
  delete state.wordHistory[id];
  ...
}
```

`renderer.ts:505-533` показывает «Знаю/Забыл» только если слово не learned и не mistake, но кнопка «Сброс» возвращает слово в это состояние. Цикл из двух кликов даёт **+10 XP и +10 монет без ограничений** (reset не откатывает ни XP, ни монеты, ни уровень). Аналогично `markMistake` (`ui_card.ts:650-659`) списывает только XP (−5), **не** списывая монеты, т.е. отрицательные значения не компенсируют накопленное.

**Фикс:** начислять награду только за первое изучение (`learnedDate`), при reset откатывать награду или запрещать повторное начисление за тот же id; ввести дневной лимит наград за карточки.

#### LL-11 · P1 · `getTotalXP` без защиты от огромного `level` (зависание лидерборда)

`src/core/xp.ts:20-26`
```ts
export function getTotalXP(level: number, currentXP: number): number {
  let total = currentXP;
  for (let i = 1; i < level; i++) {
    total += getXPForNextLevel(i);
  }
  return total;
}
```
`src/ui/ui_leaderboard.ts:242-247`
```ts
      const score =
        this.currentMode === "weekly"
          ? user.weekly_xp || 0
          : getTotalXP(user.level || 1, user.xp || 0);
```

`level` приходит из таблицы `user_global_stats` (поле, которое клиент сам и пишет в `sync.ts:113-134`), а `loadFromSupabase` применяет облачный уровень без клампа (`db.ts:442-449`). Значение `level = 1e9` (или созданное через импорт `1e999 → Infinity`) даёт **миллиард итераций на каждого пользователя при открытии вкладки «Все время»** — фактически DoS для остальных. `getXPForNextLevel(1e9) ≈ 3.9e12`, сумма — тоже долго.

**Фикс:** ограничить уровень (например, ≤ 500) при загрузке/синке/на лидерборде; для all-time рейтинга хранить `total_xp` на сервере, а не пересчитывать; добавить `Number.isFinite`-валидацию.

### P2

#### LL-12 · P2 · Курсор в начале строки → вставка в конец (виртуальная клавиатура)

`src/ui/keyboard.ts:122-123`
```ts
      const start = input.selectionStart || input.value.length;
      const end = input.selectionEnd || input.value.length;
```

`selectionStart === 0` — falsy, поэтому при курсоре в начале непустого поля `start` становится длиной строки: символ уходит в конец. В режимах «Написание»/«Диктант» это портит ответ и приводит к ложной ошибке. Фикс: `input.selectionStart ?? input.value.length`.

#### LL-13 · P2 · `toKorean` съедает пробелы и превращает латиницу в мусор (автоисправление пользовательских слов)

`src/utils/hangul.ts:44`
```ts
const JONG = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";
```
`src/utils/hangul.ts:107-109`
```ts
    const jamo =
      KEY_MAP[char] ||
      (CHO.includes(char) || JUNG.includes(char) || JONG.includes(char) ? char : null);
```
`src/ui/ui_custom_words.ts:117-125`
```ts
      // Авто-исправление: если слово похоже на английский ввод ...
      if (/^[a-zA-Z0-9\s.,?!~-]+$/.test(w)) {
        const corrected = toKorean(w);
        // Если результат содержит корейские слоги, считаем это опечаткой и исправляем
        if (/[가-힣]/.test(corrected)) {
          wordToAdd = corrected;
```

`JONG` начинается с пробела-заглушки («нет патчима»), и `JONG.includes(" ")` истинно: реальный пробел распознаётся как jamo и теряется. Проверено исполнением (`node` + импорт TS): `toKorean("a b") → "뮤"`, `toKorean("hello world") → "ㅗ디ㅣㅐ재깅"`, `toKorean("rkskek zjavk") → "가나다컴파"`. Так как `ui_custom_words` считает любую латиницу «опечаткой», английское слово/фраза («hello world») автоисправляется в бессмысленный набор хангыля и попадает в заявку на слово. Для сравнения, правильные последовательности работают: `"gksrmf" → "한글"`, `"dkssud" → "안녕"`, `"rkqt" → "값"`, `"dkssudgktpdy" → "안녕하세요"`.

**Фикс:** проверять `JONG.indexOf(char) > 0` (или `char !== " "`); в `ui_custom_words` автоисправлять только при наличии признаков романизации (например, латиница + только согласные/гласные паттерны) и никогда не терять пробелы.

#### LL-14 · P2 · Счётчик «Доступно слов» и фактический пул квиза фильтруются по-разному

`src/ui/quiz.ts:507-516` (старт)
```ts
    const wTopic = w.topic_ru || w.topic_kr;
    const matchTopic = quizTopic === "all" || wTopic === quizTopic;
    const wCat = w.category_ru || w.category_kr;
    const matchCat = quizCategory === "all" || wCat === quizCategory;
```
`src/ui/quiz.ts:1354-1363` (счётчик) и `:1380-1389` (доступность)
```ts
    const wTopic = w.topic || w.topic_ru || w.topic_kr;
    const matchTopic = quizTopic === "all" || wTopic === quizTopic;
    const wCat = w.category || w.category_ru || w.category_kr;
```

Слова с заполненным только `topic`/`category` (старые записи) входят в счётчик и в проверку доступности режима, но не проходят фильтр `startQuizMode`. Итог: UI пишет «Доступно слов: 40», пользователь выбирает тему, видит тост «Нет слов для тренировки в выбранной теме» и возврат; либо (при пустом результате) срабатывает fallback `quizWords = state.dataStore.slice(0, 10)` (`quiz.ts:529-531`), который **игнорирует тип и фильтры** — в квиз попадают слова другого раздела.

**Фикс:** один хелпер `wordMatchesQuizFilter(w, state)` для всех трёх мест; fallback только по тому же типу.

#### LL-15 · P2 · Варианты ответа: дубли переводов, пустые кнопки, «один вариант» на малом словаре

`src/ui/quiz_strategies.ts:26-33`
```ts
function getOptions(correctWord: Word, count: number = 4): Word[] {
  const options: Word[] = [correctWord];
  while (options.length < count && state.dataStore.length > count) {
    const r = state.dataStore[Math.floor(Math.random() * state.dataStore.length)];
    if (r && !options.find((o) => o.id === r.id)) options.push(r);
  }
  return options.sort(() => Math.random() - 0.5);
}
```
`src/ui/quiz_strategies.ts:75-81`
```ts
      getOptions(word).forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.textContent = opt.translation;
        if (opt.id === word.id) btn.dataset.correct = "true";
```

Дедупликация идёт по `id`, а не по отображаемому тексту: два разных слова с одинаковым переводом («красивый») дают два **идентичных варианта**, из которых один помечен неверным — пользователь выбирает визуально верный и получает «Ошибка». Пустые/`undefined` переводы дают пустые кнопки (`textContent = undefined → "undefined"`), у «обратного»/«аудио» режимов — пустой `word_kr`. Если в словаре ≤ 4 слов, `while` не выполняется и остаётся 1 вариант — вопрос не имеет смысла (и не фармабелен, но ломает статистику). Теоретически `while` без ограничения итераций может крутиться долго, если в `dataStore` остались дубли id (импорт кастомных слов).

**Фикс:** дедуп по нормализованному тексту + фильтр непустых значений; при < 2 валидных вариантах — режим «свободный ответ»; ограничить цикл попыток и fallback на перемешанный срез.

#### LL-16 · P2 · Повторение: кнопки не блокируются, двойной клик оценивает следующее слово

`src/ui/ui_review.ts:80-113` (сокращённо)
```ts
    const previews = Scheduler.previewNextIntervals(w.id);
    ...
    const handleReview = (grade: number) => {
      ensureSessionStarted();
      const res = Scheduler.submitReview(w.id, grade);
      ...
      setTimeout(next, 50);
    };
```

После первого клика через **50 мс** вызывается `next()`, который перерисовывает контейнер на следующее слово; кнопки старого DOM удаляются, но двойной клик (обычно 100–300 мс) попадает уже в кнопку **нового** слова на той же позиции — слово оценивается без прочтения, а интервал получает grade 5. Если второй клик случится до `next()`, `submitReview` вызовется дважды: для нового слова `1 → 6 дней` за один день. Аналогично двойной клик может «пропустить» слово. **Фикс:** `disabled` кнопок сразу после клика, `setTimeout(next, 300)`, guard `isAdvancing`.

#### LL-17 · P2 · Стрик: локальная дата, смена TZ/часов, старт сессии

`src/core/db.ts:121-128` (далее — `:147-149`: `else { state.streak.count = 1; }`)
```ts
export function updateStreak() {
  const today = new Date().toLocaleDateString("en-CA");
  if (state.streak.lastDate !== today) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = d.toLocaleDateString("en-CA");

    if (state.streak.lastDate === yesterday) state.streak.count++;
```
`src/core/session.ts:28-41` (фрагмент) и `src/ui/quiz.ts:502-505`
```ts
export function startSession() {
  state.sessionActive = true;
  ...
  startInterval();
  updateStreak();
  resetIdleTimer();
}
```
```ts
export function startQuizMode(mode: string) {
  currentQuizMode = mode;
  currentConfig = getQuizConfig(mode);
  ensureSessionStarted();
```

**Пример TZ:** серия 5, `lastDate = 2026-11-22`; пользователь летит на запад и локальная дата становится 2026-11-21. `today=21`, `lastDate=22` не равно ни сегодня, ни «вчера» (20) → `count = 1` — серия 5 обнулена без пропуска дня. При возврате на восток (снова 22) `lastDate=21 === yesterday` → `count = 2`; серия навсегда испорчена. Перевод часов вперёд на день даёт +1 к серии за действие; назад — сброс. Кроме того, `startSession` вызывает `updateStreak` при **открытии режима квиза** — серию можно поддерживать, не отвечая ни на один вопрос.

**Фикс:** хранить дату последней учебной активности в UTC/по серверному времени; серия инкрементируется только при реальном ответе; при смене TZ — сверять календарные дни по UTC.

#### LL-18 · P2 · Недельные лиги: локальная неделя и «воскрешение» weeklyXp

`src/core/stats.ts:19-26`
```ts
export function getCurrentWeekId() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${weekNo}`;
}
```
`src/core/db.ts:468-474`
```ts
      if (globalData.weekly_xp !== undefined) {
        state.userStats.weeklyXp = Math.max(
          state.userStats.weeklyXp || 0,
          globalData.weekly_xp || 0,
        );
      }
```

**Важно:** сам ISO-расчёт недели корректен — проверено на кромках: `2025-12-29 → 2026-W1`, `2026-01-01 → 2026-W1`, `2026-12-31 → 2026-W53`, `2027-01-01 → 2026-W53`, `2028-01-01 → 2027-W52`. Проблемы в другом: (а) неделя локальная — перелёт через line of date может откатить `getCurrentWeekId()` на предыдущую неделю → `checkWeeklyReset` срабатывает повторно: второй раз `prevXp = 0`, и понижение лиги (`idx > 0 && 0 < demoThresholds[idx]`, `stats.ts:46`) срабатывает несправедливо (Gold → Silver при `lastWeekId` W48→W47→W48); (б) `loadFromSupabase` берёт `weeklyXp = max(local, cloud)`: после понедельничного сброса локально 0, а из облака ещё приходит прошлая неделя — weeklyXp «воскресает» и лига повышается на старом XP; (в) `promoThresholds[7] = Infinity` и `demoThresholds[0] = 0` — мёртвые элементы (P3-нить).

**Фикс:** неделя и лига — по серверному `week_id` (RPC), `weeklyXp` не мержить после сброса, добавить версию недели в облачную строку.

#### LL-19 · P2 · Смена формулы уровней без миграции; недостижимые роли

`src/core/xp.ts:10-14`
```ts
export function getXPForNextLevel(lvl: number): number {
  // Было: 100 + lvl * 50 (Линейная)
  // Стало: 100 * (lvl ^ 1.2) (Слегка экспоненциальная, сложнее на высоких уровнях)
  return Math.floor(100 * Math.pow(Math.max(1, lvl), 1.2));
}
```

`state.userStats.xp` — это «остаток внутри уровня», и формула порогов изменилась без пересчёта сохранений. Пример: при старой линейной формуле уровень 5 требовал 350 XP; сохранение `level:5, xp:400` при новой формуле (`getXPForNextLevel(5)=689`) означает, что следующий уровень придёт только после ещё 289 XP — «заработанный» уровень потерян. Кроме того, leaderboard-очки `getTotalXP` пересчитываются по текущей формуле, поэтому игроки до/после апдейта несравнимы.

Кривая (проверено `node`): lvl 1→100 XP, 2→229, 5→689, 10→1584; суммарно до 10 уровня ≈ 6417 XP (642 ответа), до 20 ≈ 31 282, до 50 ≈ 243 013, до 100 ≈ **1 129 175 XP (≈113 тыс. правильных ответов)**. При этом `ROLES` (`stats.ts:1373-1388`) содержит «Титан» (75), «Божество» (100) — недостижимые в обозримом обучении. Комментарий «слегка экспоненциальная» неверен: это степенная функция.

**Фикс:** версия формулы + одноразовый пересчёт (сохранить «заработанные» уровни хотя бы на текущем); смягчить кривую (например, `lvl^1.1`) либо пересчитать роли; кэшированные пороги для `getTotalXP`.

#### LL-20 · P2 · Импорт прогресса без валидации; `level=Infinity`; guard 1000 с анимациями

`src/ui/ui_data.ts:235-240`
```ts
      if (data.stats) {
        state.userStats.xp = Number(data.stats.xp) || 0;
        state.userStats.level = Math.max(1, Number(data.stats.level) || 1);
        state.userStats.sprintRecord = data.stats.sprintRecord || 0;
        state.userStats.survivalRecord = data.stats.survivalRecord || 0;
        state.userStats.coins = data.stats.coins || 0;
```
`src/ui/ui_data.ts:258-259`
```ts
      if (data.wordHistory)
        state.wordHistory = data.wordHistory as Record<string | number, WordHistoryItem>;
```
`src/core/stats.ts:101-118`
```ts
  let currentLevel = Math.max(1, Math.floor(Number(state.userStats.level) || 1));
  ...
  while (
    state.userStats.xp >= requiredForCurrentLevel &&
    requiredForCurrentLevel > 0 &&
    guard++ < 1000
  ) {
    state.userStats.xp -= requiredForCurrentLevel;
    currentLevel++;
    showLevelUpAnimation(currentLevel);
```

JSON допускает `1e999` → `Infinity` при `JSON.parse`: `Number(Infinity) || 0 = Infinity`, `Math.max(1, Infinity) = Infinity` → уровень Infinity, `getXPForNextLevel(Infinity)=Infinity`; `state.userStats.coins = -100` (truthy) сохраняется отрицательным; `wordHistory` принимается целиком, включая `sm2.ef = "2.5"` или `null`, что ломает арифметику планировщика. `showLevelUpAnimation` внутри цикла при большом XP выдаёт до 1000 анимаций/нотификаций (`stats.ts:108-117`), что подвешивает UI. `state.ts:516-517` нормализует при загрузке, но импорт идёт **после** загрузки, без повторной нормализации.

**Фикс:** `validateUserStats`/схема для импорта (`Number.isFinite`, `>=0`, `level<=MAX`), нормализация `wordHistory.sm2` (числа, клампы), батч-анимация «+N уровней» вместо цикла.

#### LL-21 · P2 · Тесты: фиктивные assertions, нет `sync.test`, README вводит в заблуждение

`src/core/session.test.ts:30-35`
```ts
    void import("./session.ts").then((mod) => {
      mod.startSession();
      expect(state.sessionActive).toBe(true);
      expect(state.sessionSeconds).toBe(0);
      expect(state.sessionWordsReviewed).toBe(0);
    });
```
`src/core/db.test.ts:62-76`
```ts
describe("db module — dirty word tracking", () => {
  ...
  it("state.dirtyWordIds is a Set", () => {
    expect(state.dirtyWordIds).toBeInstanceOf(Set);
  });
```

В `session.test.ts` все 6 тестов не возвращают промис: assertions выполняются после завершения теста и не влияют на результат (vitest засчитывает «прошло»). В `db.test.ts` нет импорта `./db.ts` — тестируется только `state.dirtyWordIds`, а `db.ts` замокан. `README.md:210-222` обещает `db`, `stats`, `session`, `sync` — файла `sync.test.ts` нет (glob: только `scheduler.test.ts`, `session.test.ts`, `db.test.ts`, `stats.test.ts`). `scheduler.test.ts:29-37` и `:55-64` полагаются на реальный `Math.random` в fuzz — assertions подобраны широко, но детерминизма нет; `stats.test.ts:60-66` («защита от бесконечного цикла») проверяет только `addXP(0)` при level=0, но не `Infinity` и не guard=1000.

**Фикс:** вернуть промисы/`await`, убрать фиктивные тесты, добавить: лиги (promo/demote, TZ), review double-click, XP-фарм сценарии, `recordAttempt`+SM-2, speech error path; замокать `Math.random`.

#### LL-22 · P2 · «Дневная цель» — мёртвая фича

`src/html/modals/study.html:2-18`
```html
<div id="study-goal-modal" class="modal">
  ...
        Установите ежедневную цель, чтобы поддерживать мотивацию.
      </p>
      <div class="segment-control" id="study-goal-type">
        <button class="segment-btn" data-value="words">Слова</button>
        <button class="segment-btn" data-value="minutes">Минуты</button>
```
`src/ui/component_loader.ts:71` — HTML загружается, но `grep "study-goal\|studyGoal\|save-study-goal"` по `src/**/*.ts` не находит **ни открытия модалки, ни обработчика slider/сохранения, ни расчёта прогресса** (только load/export/sync в `state.ts:185,501`, `ui_data.ts:160,281`, `db.ts:544-546`, `sync.ts:100`). То есть модалка в DOM есть, но пользователь не может её открыть, а цель ни на что не влияет; в `types/index.ts:90-93` тип `"time"`, а в HTML — `data-value="minutes"` (ещё и рассинхрон).

**Фикс:** либо реализовать (открытие из профиля, `save`, прогресс на дашборде, влияние на XP/серию), либо удалить HTML/поля/тип.

#### LL-23 · P2 · Три пауэрапа никогда не выдаются; 50/50 считается до рендера вариантов

`src/ui/quiz.ts:1267-1287` (начало `useTimeFreeze`) и `:1291-1294`
```ts
function useSkipQuestion() {
  if ((state.userStats.skipQuestion || 0) <= 0) return;
  state.userStats.skipQuestion = (state.userStats.skipQuestion || 0) - 1;
```
`src/ui/quiz.ts:807` и `:852-870`
```ts
  renderPowerups(); // Re-render to update states (e.g. 50/50 availability)
  const word = quizWords[quizIndex];
  ...
  const strategy = QuizStrategies[strategyKey] || QuizStrategies["multiple-choice"];

  strategy.render(...)
```
`src/ui/quiz.ts:1246-1257`
```ts
  // 3. 50/50 (Only for multiple choice with enough options)
  const optionsCount = document.querySelectorAll("#quiz-opts .quiz-option").length;
  if (optionsCount >= 4 && (currentQuizMode === "multiple-choice" || ...)) {
```

Grep показывает, что `timeFreeze`, `skipQuestion`, `fiftyFifty` только **уменьшаются** (`quiz.ts:1267-1349`); ни магазин (`SHOP_ITEMS`), ни награды (`DAILY_REWARDS`, `MYSTERY_BOX_REWARDS`) их не выдают — счётчики всегда 0, кнопки всегда `disabled`. 50/50 вдобавок вычисляет `optionsCount` в `renderPowerups()`, который вызывается **до** `strategy.render(...)`; на первом вопросе контейнер ещё пуст (0 вариантов), на последующих — там варианты **предыдущего** вопроса. Т.е. даже при наличии зарядов 50/50 не отрисуется на 1-м вопросе, а на 2-м будет доступен «по наследству».

**Фикс:** либо выдавать пауэрапы (магазин/награды), либо удалить; `renderPowerups` — после рендера стратегии (или через `requestAnimationFrame`); проверять режим по `currentQuizMode`, а не по DOM.

#### LL-24 · P2 · Таймер: пауза и «заморозка» догоняются одним тиком

`src/ui/quiz.ts:570-586`
```ts
  quizInterval = window.setInterval(() => {
    const now = Date.now();
    if (now - quizLastTick < 100) return;
    if (isQuizPaused) return;
    if (!currentConfig || !currentConfig.onTick) return;
    if (isTimeFrozen) return;
    const deltaSeconds = Math.round((now - quizLastTick) / 1000);
    if (deltaSeconds < 1) return;
    const { gameOver, nextTimer, ui } = currentConfig.onTick(quizTimerValue, deltaSeconds);
```
`src/ui/quiz.ts:1274-1287`
```ts
  isTimeFrozen = true;
  ...
  freezeTimeout = window.setTimeout(() => {
    isTimeFrozen = false;
    ...
  }, 10000); // 10 seconds
```

Пока `isQuizPaused`/`isTimeFrozen` истинны, `quizLastTick` не обновляется; когда флаг снимается, `deltaSeconds` включает всю паузу, и `onTick` вычитает её разом. Для «заморозки» это прямо противоположно названию: спринт 60 с после 10-секундной заморозки упадёт сразу до ≈49. Пауза TTS (`isQuizPaused` на время `playAndSpeak`, `quiz.ts:1093-1098`) тоже «догоняется» — визуально таймер стоит, потом прыгает. Любые throttling-задержки браузера аналогично списываются пачкой (`Math.round` при 1.4–1.5 с даёт 1, см. LL-39).

**Фикс:** обновлять `quizLastTick = now` перед `return` в ветках паузы; хранить дробную дельту; для «заморозки» — сдвигать `quizLastTick` на время заморозки.

#### LL-25 · P2 · Режимы: размножение слов дедуплицируется; «ассоциации» = 1 раунд; dummy попадает в learned

`src/ui/quiz_modes_config.ts:78-87`
```ts
  getWords(pool: Word[]): Word[] {
    ...
    if (words.length > 0 && words.length < 100) {
      const original = [...words];
      while (words.length < 100) words = words.concat(original);
    }
    return words.slice(0, 100);
  }
```
`src/ui/quiz_modes_config.ts:315-320`
```ts
class AssociationQuizConfig extends BaseQuizConfig {
  getWords(_pool: Word[]): Word[] {
    // Возвращаем 3 раунда ассоциаций вместо 5, чтобы не затягивать
    return Array(3).fill({ id: "dummy" } as Word);
  }
}
```
`src/ui/quiz.ts:535-539`
```ts
  const uniqueQuizMap = new Map();
  quizWords.forEach((w) => {
    if (!uniqueQuizMap.has(w.id)) uniqueQuizMap.set(w.id, w);
  });
  quizWords = Array.from(uniqueQuizMap.values());
```
`src/ui/quiz.ts:985`
```ts
    state.learned.add(word.id);
```

`startQuizMode` дедуплицирует `quizWords` по `id`: спринт/выживание (100/200 копий) превращаются в число уникальных слов, а ассоциации — в **1** элемент `dummy` (вместо задуманных 3 раундов). При завершении раунда ассоциаций `recordQuizAnswer(true)` с `word.id === "dummy"` вызывает `state.learned.add("dummy")` — в «Изучено» и в прогрессе ачивки `first_10` появляется фиктивный id (в `state.dataStore` его нет, до `cleanupInvalidStateIds` он живёт). Проверка доступности режима (`quiz.ts:1418-1419`) для ассоциаций считает `state.dataStore.length`, хотя `findAssociations` требует ≥5 пар (иначе режим молча закрывается через `quitQuiz(true)`). Режим «Аудирование» (`dialogue`) требует одновременно `currentType === "dialogue"` (фильтр `startQuizMode`) и `w.type === "dialogue"` (конфиг); при типе «word» пул пуст, и за счёт fallback `quiz.ts:529-531` квиз стартует **на произвольных словах из `dataStore`**, а не на диалогах (при выбранной теме — просто тост «Нет слов»).

**Фикс:** не дедупить слова для режимов, которым нужны повторы; для ассоциаций — явное число раундов без dummy; исключить `"dummy"` из `learned`/`addXP`/счётчиков; согласовать доступность режимов с реальными требованиями.

#### LL-26 · P2 · Speech: повторный `onresult` и отсутствие отмены при закрытии квиза

`src/core/speech.ts:222-269`
```ts
  rec.onresult = (event: SpeechRecognitionEvent) => {
    ...
    if (!finalTranscript) return;
    const spokenText = finalTranscript.trim();
    ...
    stopRecordingAndGetUrl((url) => {
      if (onResult) onResult(similarity, spokenText, url, diffHtml);
    });
```

`onResult` не защищён флагом «ответ уже обработан»: распознавание может выдать более одного `final`-сегмента (пользователь говорит фразу с паузами), тогда `onAnswer` вызовется несколько раз для одного слова — повторный `recordQuizAnswer` (двойные XP/штрафы, повторный `recordAttempt`). При закрытии квиза (`ui_modal.ts:113-145` → `quitQuiz(true)`) распознавание/MediaRecorder не отменяются: запись продолжается, а `onResult` может вызвать `onAnswer` уже после завершения квиза/смены `quizIndex`. Фикс: `let resultHandled = false` на вызов; `abort()` + остановка треков в `closeModal("quiz-modal")`/`quitQuiz`.

#### LL-27 · P2 · Несогласованная семантика `learned`/`mistakes`

`src/ui/quiz.ts:983-1016`
```ts
  if (isCorrect) {
    quizCorrectCount++;
    state.learned.add(word.id);
    state.mistakes.delete(word.id);
    ...
  } else {
    state.mistakes.add(word.id);
    ...
    quizStreak = 0;
    addXP(-2);
```
`src/ui/ui_review.ts:94-106`
```ts
      if (grade >= 3) {
        stats.remembered++;
        if (state.mistakes.has(w.id)) {
          state.mistakes.delete(w.id);
        }
```

Правильный ответ в квизе (один!) сразу добавляет слово в «Изучено»; неправильный — не удаляет из «Изучено» (в отличие от review, где `state.learned.delete` есть). В результате слово может одновременно быть `learned` и `mistake`; счётчик «Изучено» (`stats.ts:174-245`) и прогресс темы (`renderTopicMastery`, `stats.ts:558-585`) завышены; фильтр «Новые: N» (`updateQuizCount`) показывает меньше новых слов, чем реально. **Фикс:** определить статус как функцию (`learned` — только при SM-2 `repetitions ≥ 2`/`interval ≥ 6`), применять при любом ответе, инвалидировать кэш темы.

#### LL-28 · P2 · За SRS-повторение не дают наград — стимулы перевёрнуты

`src/ui/ui_review.ts:87-113`
```ts
    const handleReview = (grade: number) => {
      ensureSessionStarted();
      const res = Scheduler.submitReview(w.id, grade);
      invalidateStatsCache();
      state.dirtyWordIds.add(w.id);
      ...
      setTimeout(next, 50);
    };
```
`src/ui/quiz.ts:993`
```ts
    addXP(10);
```

В квизе +10 XP/монет за правильный ответ, а в SRS-повторении — **0** (только статистика слова); `state.sessionWordsReviewed` инкрементируется лишь в `recordAttempt` (`db.ts:182`), поэтому review-слова не попадают в счётчик сессии `endSession`. Учебно правильная активность (повторение) не вознаграждается, а гриндинг квиза — вознаграждается, это стимулирует худшую стратегию. **Фикс:** XP за review (например, +5, бонус за «вовремя»), учёт в `sessionWordsReviewed`, streak за review.

#### LL-29 · P2 · Производительность: мёртвый кэш точности, O(n)-сканы и полный ререндер на каждый ответ

`src/core/stats.ts:277-298`
```ts
export function calculateOverallAccuracy() {
  if (cachedAccuracy !== null) return cachedAccuracy;
  ...
  if (totalAttempts === 0) return 0;
  return Math.round((totalCorrect / totalAttempts) * 100);
  if (totalAttempts === 0) {
    cachedAccuracy = 0;
    return 0;
  }
  cachedAccuracy = Math.round((totalCorrect / totalAttempts) * 100);
  return cachedAccuracy;
}
```
`src/ui/quiz.ts:1054-1055`
```ts
  checkAchievements();
  saveAndRender();
```

`cachedAccuracy` (`stats.ts:535`) **никогда не присваивается**: строки 292-297 недостижимы после `return` на 291-й; `invalidateStatsCache()` (`stats.ts:543`) — no-op. Значит, каждый вызов `calculateOverallAccuracy` — O(n) по `wordHistory`; вызывается в `updateStats` и в `endSession`. `saveAndRender()` на каждый ответ запускает `updateSRSBadge` (`Scheduler.getQueue({limit:999})` — O(n) + сортировка), `updateStats` (O(n)) и `render()` — перерисовку всей сетки карточек; при 3–5 тыс. слов квиз ощутимо тормозит. `findConfusingWords` (`confusing_words.ts:12-40`) заново строит O(n²) пары и вызывается **на каждый вопрос** через `QuizStrategies.confusing.render` (`quiz_strategies.ts:660`), а также в `ConfusingQuizConfig.getWords` — без кэша.

**Фикс:** присвоить `cachedAccuracy` перед `return` (и/или считать инкрементально), кэшировать `findConfusingWords`/`findAssociations` на версию `dataStore`, не вызывать полный `render()` на каждый ответ (только точечные DOM-обновления).

#### LL-30 · P2 · Ежедневная награда: авто-выдача при загрузке, локальная дата

`src/app.ts:1474-1478`
```ts
  import("./ui/ui_shop.ts").then((m) => {
    if (m.canClaimDailyReward()) {
      m.claimDailyReward(); // Автоматически проверяем и выдаем ежедневную награду
    }
  });
```
`src/ui/ui_shop.ts:326-341`
```ts
function isSameDay(ts1: number, ts2: number): boolean {
  const d1 = new Date(ts1);
  const d2 = new Date(ts2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    ...
```
`src/ui/ui_shop.ts:389-393`
```ts
export function canClaimDailyReward(): boolean {
  const { lastDailyReward } = state.userStats;
  if (!lastDailyReward) return true;
  return !isSameDay(lastDailyReward, Date.now());
}
```

Награда выдаётся **без действия пользователя** при каждом запуске, если локальная дата отличается. Для гостя (без сервера) перевод системных часов на «следующий день» + перезагрузка = повторная награда без ограничений (монеты/XPP/mystery box, из которых 7-й день — 500 монет и т.п.). Для авторизованного пользователя часть рисков снимается сверкой облачного `lastDailyReward`, но локальная дата остаётся источником истины при офлайне. **Фикс:** выдавать по явному клику, дата — серверная (RPC), при офлайне — запрет на повторную выдачу по локальным часам.

### P3

#### LL-31 · P3 · Отрицательный XP ломает сохранение stats

`src/core/stats.ts:96` — `state.userStats.xp = (state.userStats.xp || 0) + val;` (val бывает −2/+−5). `src/core/db.ts:42-48`:
```ts
  const numericFields = ["xp", "level", "coins", "sprintRecord", "survivalRecord"];
  const isValid = numericFields.every((field) => {
    const value = s[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return false;
```
Пример: уровень 1, xp 0, неверный ответ в квизе → xp = −2 → `validateUserStats` возвращает false → `saveUserStats` (`db.ts:744-753`) молча выходит, не сохраняя **весь** блок stats (включая недавние награды/уровни) до следующего положительного XP. На загрузке `state.ts:517` клампит xp в 0. **Фикс:** отдельный счётчик «долга» или порог 0; `saveUserStats` не должен блокироваться из-за одного отрицательного значения (клампить поле).

#### LL-32 · P3 · EF без верхнего предела, переполнение интервала, NaN «залипание»

`src/core/scheduler.ts:70-76`
```ts
    ef = ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    if (ef < 1.3) ef = 1.3;
    if (interval > 2) {
      const fuzz = Math.random() * 0.1 - 0.05;
      interval = Math.round(interval * (1 + fuzz));
    }
```
EF растёт на +0.1 за каждый grade 5; интервал растёт как минимум ×(EF×1.3) ≈ ×3.4–4 на повтор: `1, 6, 21, 76, 287, 1119, 4510, 18762, 80489, 355761, 1618713, 7575577…`. Теоретически после ~150 повторений `interval × 86400000` превысит `Number.MAX_SAFE_INTEGER`/Infinity — слово «навсегда» выпадет из очереди (`nextReview <= now` никогда не выполнится). Практически недостижимо для обычного пользователя, но `ef = NaN` из повреждённого сохранения/импорта (см. LL-20) даёт `nextReview = NaN` сразу и **необратимо** (getQueue `h.sm2.nextReview <= now` → false). **Фикс:** cap `interval` (например, 36500 дней) и `ef` (≤3.0), санитайз `sm2` (Number.isFinite + clamp) при загрузке/синке.

#### LL-33 · P3 · Preview интервалов не совпадает с фактическим (двойной fuzz)

`src/core/scheduler.ts:73-76` (fuzz внутри `calculate`) и `src/ui/ui_review.ts:80`:
```ts
    const previews = Scheduler.previewNextIntervals(w.id);
```
`:111-112`
```ts
      const d = Math.round(res.interval * 10) / 10;
      if (d > 1) showToast(`📅 Увидимся через ${d} дн.`, 1000);
```
`previewNextIntervals` вызывает `calculate` (с fuzz) для 0/3/5, а `submitReview` — ещё раз с новым случайным fuzz. Для `interval=10, grade 5` preview может показать 32, факт — 34 (или наоборот). Пользователь видит одно, планировщик ставит другое. **Фикс:** preview без fuzz (`calculate(..., {fuzz:false})`) и показывать в тосте фактический `res.interval`.

#### LL-34 · P3 · `toKorean`: сложный патчим в состоянии 3 даёт мусорный кодпоинт

`src/utils/hangul.ts:180-195`
```ts
    } else if (state === 3) {
      // Есть Cho + Jung + Jong
      if (isJung) {
        const prevJongChar = JONG[jong];
        ...
        const prevSyllable = String.fromCharCode(0xac00 + cho * 21 * 28 + jung * 28 + 0);
        result.push(prevSyllable);
        // Текущий Jong становится Cho нового слога
        cho = CHO.indexOf(prevJongChar);
```
Если в состоянии 3 оказывается составной jong (`ㄳ` и т.п., возможен через прямой ввод jamo/вставку), `CHO.indexOf("ㄳ") = -1`, и `combine()` (`hangul.ts:99`) считает `0xAC00 + (-1)*21*28 + …` → неверный символ. Проверено: `toKorean("ㄷㅏㄳㅏ")` → `"다ꦴ"` (U+AAB4). Через виртуальную клавиатуру недостижимо (она разбирает составной jong через `disassemble`), но как экспортируемая утилита и при вставке — баг. **Фикс:** обрабатывать `REVERSE_DOUBLE_JONG` и в state 3; валидировать индексы (`cho >= 0 && jung >= 0`).

#### LL-35 · P3 · Нет NFC-нормализации при сравнении корейского ввода

`src/ui/quiz_strategies.ts:254-273`
```ts
        const val = input.value.trim().toLowerCase();
        const correct = word.word_kr.trim().toLowerCase();
        ...
        const dist = levenshtein(val, correct);
        const isRight = dist <= (correct.length > 3 ? 1 : 0);
```
`src/core/speech.ts:242-246`
```ts
    const normalize = (s: string) =>
      s
        .normalize("NFC")
        ...
```
`confusing_words.ts:6` — `w.word_kr.length > 1` и `levenshtein` по code units. Проверено: `'한글'.length === 2`, `'한글'.normalize("NFD").length === 6`. Для NFD-вставки (macOS/iOS-буфер, некоторые IME) сравнение в «Написании» даёт `dist` больше порога → ложная ошибка; `confusing_words` считает dist по jamo-единицам; `generateDiffHtml` подсвечивает всё. Speech нормализует, typing — нет. **Фикс:** `normalize("NFC")` во всех сравнениях/длинах; `Array.from` вместо `.length` там, где считаются «символы».

#### LL-36 · P3 · Ачивки: условия не соответствуют описаниям; запись без try

`src/core/stats.ts:419-425`
```ts
    {
      id: "shopaholic",
      title: "Покупатель",
      description: "Купить предмет в магазине",
      emoji: "🛍️",
      progress: () => (state.userStats.streakFreeze > 0 ? 1 : 0),
      max: 1,
    },
```
`src/core/stats.ts:363-369`
```ts
    {
      id: "zero_mistakes",
      title: "Перфекционист",
      description: "Выучить 5 слов без единой ошибки",
      ...
      progress: () => (state.mistakes.size === 0 && state.learned.size >= 5 ? 1 : 0),
```
«Покупатель» открывается от любой заморозки, в т.ч. полученной из mystery box/ежедневной награды (покупки не было). «Перфекционист» открывается, если в текущем моменте нет ошибок и изучено 5 слов, — это не «5 слов без единой ошибки». `stats.ts:448` (`night_owl`) и `:458` (`early_bird`) завязаны на время вызова `checkAchievements`, а не на факт учёбы. `stats.ts:481` — `localStorage.setItem` без try/catch: при quota/приватном режиме исключение из `checkAchievements` прерывает обработку ответа (вызывается в `recordQuizAnswer`/`recordAttempt`). **Фикс:** отдельные счётчики (покупки, слова с 100 % accuracy, время ответа) и `try/catch` вокруг записи.

#### LL-37 · P3 · Мёртвые поля и несоответствия типов/описаний

`src/core/state.ts:93-94`
```ts
  streakCount: number;
  lastDate: string | null;
```
`src/types/index.ts:90-93`
```ts
export interface StudyGoal {
  type: "words" | "time";
  target: number;
}
```
`src/types/index.ts:108`
```ts
  sm2_confidence?: "easy" | "medium" | "hard";
```
`src/ui/quiz_modes_config.ts:136-139`
```ts
  onEnd(correctCount: number) {
    if (correctCount > state.userStats.sprintRecord) {
      state.userStats.sprintRecord = correctCount;
```
- `state.streakCount`/`state.lastDate` нигде не используются (серия живёт в `state.streak`), но пишутся/экспортируются в `AppState`.
- `StudyGoal.type` — `"time"`, а HTML модалки шлёт `data-value="minutes"`; фича мертва (LL-22), так что рассинхрон латентный.
- `UserWordProgress.sm2_confidence` не пишется/не читается ни в `sync.ts`, ни в `db.ts` — мёртвое поле схемы (возможно, задумывалось для FSRS-подобной модели).
- `UserStats.achievements` (`types/index.ts:59`) дублирует `state.achievements`, но не используется (синк отправляет `state.achievements`, `sync.ts:123`).
- `sprintRecord/survivalRecord` = число правильных ответов, а UI/ачивки называют это «очками» (`stats.ts:395-409` — «Набрать 20 очков»); в комбо-режиме фактический счёт не учитывается.

**Фикс:** удалить мёртвые поля/типы или реализовать; переименовать метрику в «правильных ответов» либо считать очки.

#### LL-38 · P3 · «Максимум 2 в инвентаре» не проверяется

`src/core/shop_data.ts:7-8`
```ts
    description: "Защищает серию при пропуске дня. Максимум 2 в инвентаре.",
    price: 200,
```
`src/ui/ui_shop.ts:277-305`
```ts
  if ((state.userStats.coins || 0) < item.price) {
    showToast("Недостаточно монет!");
    return;
  }
  ...
      if (item.value === "streak_freeze") {
        state.userStats.streakFreeze = (state.userStats.streakFreeze || 0) + 1;
```
Проверка лимита отсутствует: можно накопить неограниченное число заморозок (и лечилок), что обесценивает серию/магазин. **Фикс:** проверять `streakFreeze < 2` перед покупкой.

#### LL-39 · P3 · Качество: смещённая тасовка, мёртвая ветка, дрейф таймера

`src/ui/quiz_modes_config.ts:43-48`
```ts
  getWords(pool: Word[]): Word[] {
    const unlearned = pool.filter((w) => !state.learned.has(w.id));
    const learned = pool.filter((w) => state.learned.has(w.id));
    unlearned.sort(() => Math.random() - 0.5);
    learned.sort(() => Math.random() - 0.5);
    return unlearned.concat(learned).slice(0, 10);
```
`src/core/confusing_words.ts:21-24`
```ts
      if (Math.abs(w2.length - w1.length) > 1) {
        if (w2.length > w1.length + 1) break;
        continue;
      }
```
`src/ui/quiz.ts:581-586`
```ts
    const deltaSeconds = Math.round((now - quizLastTick) / 1000);
    if (deltaSeconds < 1) return; // Ждем накопления полной секунды
    const { gameOver, nextTimer, ui } = currentConfig.onTick(quizTimerValue, deltaSeconds);
```
1) `sort(() => Math.random() - 0.5)` — известная смещённая тасовка (не Fisher–Yates), часть слов выпадает чаще; используется во всех режимах, включая `SprintQuizConfig.getWords`/`SurvivalQuizConfig.getWords`/`DailyQuizConfig`. 2) В `findConfusingWords` массив отсортирован по возрастанию длины, поэтому при `|Δlen| > 1` всегда `w2 > w1+1` и `break`, а `continue` недостижим. 3) `Math.round(deltaSeconds)` при «медленном» `setInterval` (например, 1400 мс из-за нагрузки/энергосбережения) округляет 1.4 → 1, и таймер спринта идёт медленнее реального времени (на 30–50 %), т.е. спринт можно «удлинить»; на скрытой вкладке троттлинг до 60 с наоборот корректно списывает время. **Фикс:** Fisher–Yates; убрать dead code; накапливать дробную дельту (`deltaMs`).

---

## 5. Учебная корректность: заявлено vs реально

| Алгоритм | Заявлено (README/комментарии) | Реально в коде | Вердикт |
|---|---|---|---|
| SM-2: EF-формула | README:43 «SM-2/FSRS»; классическая `EF' = EF + (0.1 − (5−q)(0.08+(5−q)0.02))` | Формула реализована буквально верно (`scheduler.ts:70`), clamp 1.3 есть, grade клампится 0–5 | ✅ соответствует |
| SM-2: интервалы | 1 → 6 → `I×EF` | 1 → 6 → `I×1.2` (q=3), `I×EF×1.3` (q=5); ветка `I×EF` (q=4) **недостижима**; fuzz ±5 % | ❌ не соответствует (LL-02) |
| SM-2: провал | `I = 1`, `reps = 0` | soft-lapse: `I×0.2` при `I>10` (100→20 дн), `reps=0`; `nextReview` = +20 дней; в квизе тот же провал → `nextReview = now` | ❌ не соответствует, хуже стандарта (LL-01) |
| SM-2: EF lower bound | — (стандарт 1.3) | 1.3 — верно | ✅ |
| FSRS | README:43 «SM-2/FSRS» | Нет FSRS: нет stability/difficulty/desired retention, нет вероятностной модели | ❌ отсутствует |
| SRS ↔ остальное приложение | «интервальное повторение как ядро» | Успехи в квизах не обновляют SM-2; очередь = все слова с историей без `sm2` (`nextReview:0`); review не даёт XP | ❌ частично/рассинхрон (LL-03, LL-28) |
| XP/уровни | stats.ts + xp.ts: XP и уровни | Формула power-law `100×lvl^1.2`; `addXP` скрыто начисляет монеты 1:1; guard 1000; отрицательный XP и `Infinity` не защищены | ⚠️ работает, экономика и миграция некорректны (LL-07, LL-19, LL-31) |
| Лиги | «лиги»; weekly промо/демоушен | Пороги promo/demo есть, но: локальная неделя, `weeklyXp`-merge, нет серверного week_id | ⚠️ работает, уязвимо ко времени/TZ (LL-18) |
| Стрики | серия дней подряд | Локальная дата, растёт от старта сессии, TZ/часы ломают | ⚠️ работает, уязвимо (LL-17) |
| Дневные цели | `study.html` «Учебная цель», `state.studyGoal` | Модалка не открывается, логики нет, тип не совпадает с HTML | ❌ отсутствует (LL-22) |
| Ачивки | определения в stats.ts | 18 ачивок; часть условий не соответствует описаниям («Покупатель», «Перфекционист»), запись без try | ⚠️ частично (LL-36) |
| Тесты ядра | README:210-222: db/stats/session/sync + «защита от бесконечного цикла» | scheduler — реальные тесты; stats — минимальные; session/db — фиктивные; sync — отсутствует | ❌ не соответствует (LL-21) |
| Хангыль/романизация | «характеристики хангыля» (ожидание) | Романизации нет вообще; `toKorean` — сборка с клавиатуры, но съедает пробелы, портит латиницу, ломается на составном jong в state 3 | ⚠️ частично (LL-13, LL-34, LL-35) |

---

## 6. Хорошо сделано

- **Формула EF реализована корректно и буквально по SM-2**, включая `grade` clamp 0–5 и нижнюю границу 1.3 (`scheduler.ts:31,70-71`) — проверено вычислительно: q=3 → −0.14, q=4 → 0, q=5 → +0.1, q=0 → −0.8.
- **ISO-неделя считается верно** на годовых границах (проверено: 2025-12-29 → 2026-W1, 2026-12-31 → 2026-W53, 2027-01-01 → 2026-W53, 2028-01-01 → 2027-W52) — проблема лиг не в формуле недели, а в TZ/merge.
- **Защита от деления на ноль в XP**: `getXPForNextLevel` клампит lvl ≥ 1 (`xp.ts:13`), `addXP` — `Math.max(1, …)` и guard 1000 (`stats.ts:103,111`); README-тест на level=0 действительно проходит.
- **Клампы/нормализация при загрузке `state.ts:512-533`**: level ≥ 1, xp/coins/sprintRecord/survivalRecord — неотрицательные конечные числа; это хорошая база, которой не хватает импорту/облаку.
- **Нет накопления float-погрешности XP**: все начисления целые (10/−2/50/500), вычет порогов целочисленный — классической проблемы «float при накоплении XP» здесь нет.
- **Ачивки: O(1)-поиск по Set** (`stats.ts:467-475`), нет дублей в одном проходе; `getAchievementsDefinitions` лениво кэширует `masteredCount`.
- **Levenshtein** (`utils.ts:310-335`) реализован с O(min(a,b)) памяти и корректной инициализацией — проверено на парах вручную.
- **Speech**: `similarity` защищена от деления на ноль (`Math.max(1, …)`), нормализация NFC и удаление пунктуации (`speech.ts:242-248`), `lang="ko-KR"`, голос выбирается по языку; ошибки `onerror` показываются пользователем.
- **Выбор вариантов защищён от двойного клика** в большинстве стратегий: `handleChoiceClick` отключает все `.quiz-option` (`quiz_strategies.ts:35-50`) — контраст с «Эссе» (LL-04).
- **Сессии ограничены 1000** при `endSession` (`session.ts:83`), аудио-кэш — LRU 50 (`utils.ts:381-382,628-638`), таймер `setInterval` очищается в `endQuiz`/`quitQuiz`; `state.isSyncing`-флаг в sync честно защищает от параллельных синков.
- **Scheduler-тесты** пишутся с числовыми ожиданиями (fuzz-диапазоны), т.е. автор понимал вероятностную природу интервалов — хорошая основа, если замокать `Math.random`.

---

## 7. Ограничения аудита

1. **Тесты/сборка не запускались мной**: по брифу полный прогон — за Lead; эталонные логи (`audit/logs/test.txt`) показывают, что `npm run test` в песочнице падает на `spawn EPERM` (esbuild), поэтому реальное исполнение vitest недоступно. Мой анализ тестов — статический; выводы о фиктивности `session.test.ts`/`db.test.ts` сделаны по AST/семантике, а не по отчёту vitest.
2. **Сборка сейчас красная**: `audit/logs/build.txt` — `src/app.ts(149,1): error TS6133: 'setSyncState' is declared but its value is never read`; `audit/logs/lint.txt` — 2 prettier-error (`network.ts:177`, `xp.ts:26`). Это вне учебной логики (quality/CI), но означает, что baseline-прогоны Lead не «зелёные».
3. **Нет браузерного/DOM-рантайма**: поведение Web Speech API, MediaRecorder, `localStorage`-квот, autoplay/TTS и точные сценарии TZ-перелётов моделировались статически. Speech-находки LL-08/LL-09/LL-26 — по коду и известному поведению API; часть помечена как гонки/теоретические риски.
4. **Нет доступа к реальным данным Supabase и `public/data`**: утверждения о «дублях переводов», пустых `translation`, `topic` vs `topic_ru` — по типам/коду; на реальном словаре частота может быть иной.
5. **Fuzz `Math.random`**: мои числовые примеры интервалов посчитаны с `fuzz=0` (`Math.random=0.5`); фактические значения отличаются на ±5 % (см. LL-33).
6. **Заявленные строки в брифе не совпали с рабочим деревом** (stats 1476, quiz 1602, quiz_strategies 1108) — аудит по фактическим файлам; возможно, у Lead другая ревизия/снимок HEAD (`audit/head-check`) и рабочее дерево новее HEAD.
7. **Вне скоупа:** `db.ts` (гонки загрузки/синка), `state.ts` (миграции localStorage), `sync.ts` (merge-конфликты), `auth`/`network`/PWA, `supabase/functions/**` — см. LL-кросс-скоуп ниже.

---

## 8. Кросс-скоуп (для других аудиторов и Lead)

| Наблюдение | Где | Кому |
|---|---|---|
| `recordAttempt` обновляет `sm2` только при ошибке и ставит `nextReview = now`; правильные ответы не планируются | `db.ts:162-184` | data-offline (данные), learning-logic (LL-01/LL-03) |
| `loadFromSupabase`: облачный `level`/`xp`/`weekly_xp`/`sessions`/`wordHistory` мержатся без валидации; `wordHistory` может быть перезаписан при `remoteAttempts >= localAttempts` | `db.ts:440-499,575-638` | data-offline, backend |
| `weeklyXp = max(local, cloud)` «воскрешает» прошлую неделю после сброса | `db.ts:468-474` | data-offline |
| `state.ts`: последовательная загрузка ключей — `null`/битый `daily_challenge` или `streak` обрывает загрузку остальных (включая словарь) | `state.ts:439-533` | data-offline |
| `linkа` `client.from(user_global_stats).upsert` c `level/xp/coins` от клиента; лидерборд рендерит чужие значения (`getTotalXP`) → DoS через `level=1e9` | `sync.ts:113-134`, `ui_leaderboard.ts:239-294` | security/backend (LL-11) |
| «Покупатель»/«Перфекционист» условия, магазин без лимита заморозок | `stats.ts:419-425,363-369`, `ui_shop.ts:277-305` | frontend/quality (LL-36/LL-38) |
| `startMistakeQuiz()` открывает квиз без настройки режима ошибок (только `setStarFilter("mistakes")`, которого нет в квизовых фильтрах) | `ui_mistakes.ts:175-185` | frontend |
| `toKorean`-автоисправление латиницы в заявках слов | `ui_custom_words.ts:112-125`, `hangul.ts:44` | frontend/data |
| Build/lint красные (`setSyncState` unused, prettier) | `audit/logs/build.txt`, `lint.txt`, `app.ts:149` | quality-arch |
| README: «FSRS», «покрыть тестами db/stats/session/sync», «SM-2» — не соответствуют коду/тестам | `README.md:43,210-222` | quality-arch |
| `WordHistoryItem.sm2` не санитайзится при импорте/облаке (`ef=NaN`/строки) — залипание слова | `state.ts:455`, `db.ts:613-630`, `ui_data.ts:258-259` | data-offline |

---

## 9. Приоритетный план исправлений (рекомендация)

1. **P0 (до релиза):** LL-01, LL-02 — привести планировщик к SM-2 (единый `applyGrade`, 4 оценки, `nextReview` при провале = +1 день, cap EF/interval), добавить тесты на числа.
2. **P1 (сразу после):** LL-03 (связать квиз с SM-2), LL-04/LL-05/LL-10 (guard от фарма), LL-06 (одна запись сессии), LL-07 (разделить XP/монеты + пересчитать награды), LL-08/LL-09 (speech: ошибка ≠ ответ, стоп микрофона), LL-11 (cap уровня).
3. **P2 (в течение итерации):** LL-12…LL-30 (TZ-даты, тесты, dead-фичи, производительность, фильтры/варианты).
4. **P3:** по остаточному принципу.

**Ожидаемый эффект:** интервалы станут детерминированными и соответствующими SM-2; статистика и экономика перестанут быть накручиваемыми; SRS-повторение станет осмысленной частью ядра, а не отдельной модалкой.
