// c:\Users\demir\OneDrive\Рабочий стол\TOPIK APP\ui_card.js

import { state } from '../core/state.js';
import { client } from '../core/supabaseClient.js';
import { parseBilingualString, speak, showToast, debounce } from '../utils/utils.js';
import { scheduleSaveState, recordAttempt } from '../core/db.js';
import { addXP, checkAchievements } from '../core/stats.js';
import { ensureSessionStarted } from '../core/session.js';
import { saveAndRender } from './ui.js';

// --- Virtual Scroll Constants (for List View) ---
const ITEM_HEIGHT_LIST = 72;  // Приблизительная высота элемента списка в пикселях
const BUFFER_ITEMS = 10;      // Количество элементов для рендера за пределами видимой области

let virtualScrollInitialized = false;
const debouncedRenderVisible = debounce(renderVisibleListItems, 50);

let currentRenderLimit = 50;

/** @type {IntersectionObserver | null} */
let scrollObserver = null;
/** @type {IntersectionObserver | null} */
let appearanceObserver = null;

/**
 * Returns the color associated with a topic string.
 * @param {string} text - Topic text (e.g., "Семья").
 * @returns {string} CSS color string.
 */

/**
 * Renders skeleton loaders while data is fetching.
 */
export function renderSkeletons() {
    const grid = document.getElementById('vocabulary-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    // Генерируем 12 заглушек для заполнения экрана
    for (let i = 0; i < 12; i++) {
        const el = document.createElement('div');
        el.className = 'card skeleton';
        el.innerHTML = `
            <div class="card-inner">
                <div class="card-front">
                    <div class="card-main">
                        <div class="word skeleton-pulse"></div>
                        <div class="hanja skeleton-pulse"></div>
                        <div class="card-meta-central">
                            <div class="meta-level skeleton-pulse"></div>
                            <div class="meta-info skeleton-pulse"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        fragment.appendChild(el);
    }
    grid.appendChild(fragment);
}

/**
 * Renders the vocabulary grid based on current state and filters.
 */
export function render() {
    const grid = document.getElementById('vocabulary-grid');
    if (!grid) return;

    // Очистка предыдущего состояния виртуального скролла
    if (virtualScrollInitialized) {
        grid.removeEventListener('scroll', /** @type {EventListener} */ (debouncedRenderVisible));
        virtualScrollInitialized = false;
    }
    grid.classList.remove('virtual-scroll-container', 'list-view', 'grid');
    grid.innerHTML = '';

    // --- LIST VIEW: VIRTUAL SCROLL ---
    const s = /** @type {any} */ (state);
    if (s.viewMode === 'list') {
        grid.classList.add('list-view', 'virtual-scroll-container');
        initVirtualScroll(/** @type {HTMLElement} */ (grid));
        return;
    }

    // --- GRID VIEW: PAGINATION (старая логика) ---
    grid.classList.add('grid');
    renderPaginatedGrid();
}

/**
 * @param {HTMLElement} grid
 */
function renderEmptyState(grid) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-sub); animation: fadeIn 0.5s;">
                <div style="font-size: 64px; margin-bottom: 20px; opacity: 0.5;">🔍</div>
                <div style="font-size: 20px; font-weight: 800; margin-bottom: 10px;">Ничего не найдено</div>
                <div style="font-size: 14px; margin-bottom: 25px;">Попробуйте изменить запрос или фильтры</div>
                <button class="btn" onclick="resetSearchHandler()">Сбросить поиск</button>
            </div>
        `;
}

function getFilteredData() {
    const s = /** @type {any} */ (state);
    const source = s.searchResults || s.dataStore || [];
    return source.filter((/** @type {any} */ w) => {
        if (!w) return false;
        if (s.currentStar !== 'all' && s.currentStar !== 'favorites' && w.level !== s.currentStar) return false;
        if (s.currentStar === 'favorites' && !s.favorites.has(w.id)) return false;
        if (w.type !== s.currentType) return false;
        const wTopic = w.topic || w.topic_ru || w.topic_kr;
        const topics = Array.isArray(s.currentTopic) ? s.currentTopic : [s.currentTopic];
        if (!topics.includes('all') && !topics.includes(wTopic)) return false;
        const wCat = w.category || w.category_ru || w.category_kr;
        if (s.currentCategory !== 'all' && wCat !== s.currentCategory) return false;
        return true;
    });
}

function renderPaginatedGrid(increaseLimit = false) {
    const grid = document.getElementById('vocabulary-grid');
    if (!grid) return;
    if (!increaseLimit) currentRenderLimit = 50;
    else currentRenderLimit += 50;

    const sourceData = getFilteredData();

    if (sourceData.length === 0) {
        renderEmptyState(grid);
        return;
    }

    if (!increaseLimit) grid.innerHTML = '';
    else {
        const sentinel = grid.querySelector('.infinite-scroll-sentinel');
        if (sentinel) sentinel.remove();
    }

    const fragment = document.createDocumentFragment();
    const dataToRender = sourceData.slice(increaseLimit ? currentRenderLimit - 50 : 0, currentRenderLimit);

    dataToRender.forEach((/** @type {any} */ item) => {
        fragment.appendChild(createCardElement(item));
    });

    grid.appendChild(fragment);

    if (sourceData.length > currentRenderLimit) {
        const sentinel = document.createElement('div');
        sentinel.className = 'infinite-scroll-sentinel';
        sentinel.style.gridColumn = '1 / -1';
        sentinel.style.height = '20px';
        grid.appendChild(sentinel);

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                observer.disconnect();
                renderPaginatedGrid(true);
            }
        }, { rootMargin: '200px' }); // Подгружаем заранее (за 200px до конца)
        observer.observe(sentinel);
    }

    setupScrollObserver(); // Анимации для сетки
}

/**
 * @param {HTMLElement} grid
 */
function initVirtualScroll(grid) {
    const sourceData = getFilteredData();

    if (sourceData.length === 0) {
        renderEmptyState(grid);
        return;
    }

    const sizer = document.createElement('div');
    sizer.className = 'virtual-sizer';
    sizer.style.height = `${sourceData.length * ITEM_HEIGHT_LIST}px`;
    grid.appendChild(sizer);

    grid.addEventListener('scroll', /** @type {EventListener} */ (debouncedRenderVisible));
    virtualScrollInitialized = true;

    renderVisibleListItems({ target: grid, sourceData });
}

/**
 * @param {any} params
 */
function renderVisibleListItems(params) {
    const grid = /** @type {HTMLElement} */ (params.target || params.currentTarget);
    if (!grid) return;
    
    const sourceData = params.sourceData || getFilteredData();

    const scrollTop = grid.scrollTop;
    const viewportHeight = grid.clientHeight;

    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT_LIST) - BUFFER_ITEMS);
    const visibleItemsCount = Math.ceil(viewportHeight / ITEM_HEIGHT_LIST);
    const endIndex = Math.min(sourceData.length, startIndex + visibleItemsCount + (BUFFER_ITEMS * 2));

    const visibleData = sourceData.slice(startIndex, endIndex);
    const fragment = document.createDocumentFragment();

    visibleData.forEach((/** @type {any} */ item, /** @type {number} */ index) => {
        const absoluteIndex = startIndex + index;
        const el = createListItem(item);
        el.style.position = 'absolute';
        el.style.top = `${absoluteIndex * ITEM_HEIGHT_LIST}px`;
        el.style.width = '100%';
        el.classList.add('visible');
        fragment.appendChild(el);
    });

    while (grid.children.length > 1) {
        if (grid.lastChild) grid.removeChild(grid.lastChild);
    }
    grid.appendChild(fragment);
}

/**
 * Creates the DOM element for a vocabulary card.
 * @param {any} item - The word object from dataStore.
 * @returns {HTMLElement} The constructed card element.
 */
function createCardElement(item) {
    const el = document.createElement('div');
    el.className = 'card'; // .visible будет добавлен через setupScrollObserver
    const s = /** @type {any} */ (state);
    if (s.hanjaMode) el.classList.add('hanja-mode');
    if (item.type === 'grammar') el.classList.add('grammar-card');
    if (s.learned.has(item.id)) el.classList.add('learned');
    if (s.mistakes.has(item.id)) el.classList.add('has-mistake');

    const inner = document.createElement('div'); inner.className = 'card-inner';
    
    // --- FRONT ---
    const front = createCardFront(item); 
    
    // --- BACK ---
    const back = createCardBack(item);

    inner.appendChild(front); inner.appendChild(back); el.appendChild(inner);
    el.onclick = () => { el.classList.toggle('revealed'); if (navigator.vibrate) navigator.vibrate(10); };
    return el;
}

/**
 * Creates the front face of the card.
 * @param {any} item 
 * @returns {HTMLElement}
 */
function createCardFront(item) {
    const front = document.createElement('div'); front.className = 'card-front';
    const s = /** @type {any} */ (state);
    const isFav = s.favorites.has(item.id); 

    // Top Row
    const topRow = document.createElement('div'); topRow.className = 'card-top-row';
    
    const levelBadge = document.createElement('div'); levelBadge.className = 'card-level-badge';
    levelBadge.textContent = item.level || '★☆☆';
    topRow.appendChild(levelBadge); 

    const controlsDiv = document.createElement('div'); controlsDiv.className = 'card-top-right';
    const speakBtn = document.createElement('button'); speakBtn.className = 'icon-btn'; speakBtn.textContent = '🔊';
    speakBtn.onclick = (e) => { 
        e.stopPropagation(); 
        speakBtn.textContent = '📶'; // Иконка "волн" во время проигрывания
        speakBtn.style.color = 'var(--primary)';
        speakBtn.style.borderColor = 'var(--primary)';
        
        const s = /** @type {any} */ (state);
        let url = item.audio_url; if (s.currentVoice === 'male' && item.audio_male) url = item.audio_male; 
        speak(item.word_kr || '', url).then(() => {
            speakBtn.textContent = '🔊'; // Возврат иконки
            speakBtn.style.color = '';
            speakBtn.style.borderColor = '';
        }); 
    };
    const favBtn = document.createElement('button'); favBtn.className = `icon-btn fav-btn ${isFav ? 'active' : ''}`;
    favBtn.textContent = isFav ? '❤️' : '🤍'; favBtn.title = isFav ? 'Убрать из избранного' : 'В избранное';
    favBtn.onclick = (e) => { e.stopPropagation(); toggleFavorite(item.id, favBtn); };
    controlsDiv.appendChild(speakBtn); controlsDiv.appendChild(favBtn);
    topRow.appendChild(controlsDiv);
    front.appendChild(topRow);

    // Main Content
    const mainContent = document.createElement('div'); mainContent.className = 'card-main';
    const wordDiv = document.createElement('div'); wordDiv.className = 'word'; wordDiv.textContent = item.word_kr || '';
    mainContent.appendChild(wordDiv);
    
    if (item.word_hanja) {
        const hanjaContainer = document.createElement('div');
        hanjaContainer.className = 'hanja-container';
        [...item.word_hanja].forEach(char => {
             const span = document.createElement('span');
             span.className = 'hanja-char';
             span.textContent = char;
             span.onclick = (e) => {
                 e.stopPropagation();
                 import('./ui_hanja.js').then(m => m.openHanjaModal(char));
             };
             hanjaContainer.appendChild(span);
        });
        mainContent.appendChild(hanjaContainer);
    }

    // Grammar Specific UI
    if (item.type === 'grammar' && item.grammar_info) {
        const grammarBadge = document.createElement('div');
        grammarBadge.className = 'grammar-badge';
        grammarBadge.textContent = '📘 Грамматика';
        grammarBadge.style.cursor = 'pointer';
        grammarBadge.onclick = (e) => {
            e.stopPropagation();
            import('./ui_grammar.js').then(m => m.openGrammarModal(item));
        };
        mainContent.appendChild(grammarBadge);
    }

    // Meta Data
    const getBi = (/** @type {string} */ field) => item['_parsed' + field.charAt(0).toUpperCase() + field.slice(1)] || { kr: '기타', ru: 'Общее' };
    const topicObj = getBi('topic');
    const catObj = getBi('category');
    const formatBi = (/** @type {any} */ obj) => (obj.kr && obj.ru && obj.kr !== obj.ru) ? `${obj.kr} (${obj.ru})` : (obj.kr || obj.ru);
    
    const bottomRow = document.createElement('div'); bottomRow.className = 'card-bottom-row';
    bottomRow.innerHTML = `
        <div class="meta-topic-badge">🏷 ${formatBi(topicObj)}</div>
        <div class="meta-cat-badge">${formatBi(catObj)}</div>
    `;
    
    const stats = s.wordHistory[item.id] || { attempts: 0, correct: 0 };
    if (stats.attempts > 0) {
        const accEl = document.createElement('div');
        let statusText = 'В процессе', barColor = 'var(--primary)', bgClass = 'neutral';
        const acc = getAccuracy(item.id);
        if (stats.attempts < 3) { statusText = 'Новое'; bgClass = 'neutral'; barColor = 'var(--info)'; }
        else if (acc >= 90) { statusText = 'Мастер'; bgClass = 'success'; barColor = 'var(--success)'; }
        else if (acc >= 70) { statusText = 'Хорошо'; bgClass = 'success'; barColor = '#55efc4'; }
        else if (acc >= 40) { statusText = 'Средне'; bgClass = 'neutral'; barColor = 'var(--warning)'; }
        else { statusText = 'Слабо'; bgClass = 'failure'; barColor = 'var(--danger)'; }
        
        accEl.className = 'attempt-indicator-central ' + bgClass;
        accEl.title = 'Мастер: 90%+, Хорошо: 70%+, Средне: 40%+';
        accEl.innerHTML = `
            <div class="acc-text">🎯 ${acc}% <span style="opacity:0.5; margin:0 4px;">|</span> ${statusText}</div>
            <div class="acc-bar-bg"><div class="acc-bar-fill" style="width:${acc}%; background:${barColor};"></div></div> 
            <div style="font-size: 10px; color: var(--text-sub); margin-top: 5px; opacity: 0.7; font-weight: 500;">(Мастер: >90% • Хорошо: >70%)</div>
        `;
        mainContent.appendChild(accEl);
    }
    front.appendChild(mainContent);
    front.appendChild(bottomRow);

    return front;
}

/**
 * Creates the back face of the card.
 * @param {any} item 
 * @returns {HTMLElement}
 */
function createCardBack(item) {
    const back = document.createElement('div'); back.className = 'card-back';
    const backContent = document.createElement('div'); backContent.className = 'card-back-content';

    const imgContainer = document.createElement('div'); imgContainer.className = 'card-image-container';
    const imgUrl = item.image;
    const img = document.createElement('img');
    img.className = 'card-image'; img.loading = 'lazy'; img.draggable = false;
    if (imgUrl) { img.src = imgUrl; img.onerror = function() { this.style.display = 'none'; }; } else { img.style.display = 'none'; }
    imgContainer.appendChild(img);

    const ctrls = document.createElement('div'); ctrls.className = 'img-controls';
    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.style.display = 'none';
    fileInput.onchange = async (e) => {
        const target = /** @type {HTMLInputElement} */ (e.target);
        const file = target.files ? target.files[0] : null; if (!file) return;
        try {
            showToast('⏳ Загрузка...');
            
            // FIX: Удаляем старую картинку, если она была загружена пользователем (содержит ID)
            if (item.image && item.image.includes(item.id + '_')) {
                const oldPath = item.image.split('/').pop().split('?')[0];
                await client.storage.from('image-files').remove([oldPath]);
            }

            const ext = file.name.split('.').pop();
            const path = `${item.id}_${Date.now()}.${ext}`;
            const { error: upErr } = await client.storage.from('image-files').upload(path, file, { upsert: true });
            if (upErr) throw upErr;
            const { data: { publicUrl } } = client.storage.from('image-files').getPublicUrl(path);
            // FIX: Помечаем источник как 'user', чтобы скрипт не перезаписал картинку
            const { error: dbErr } = await client.from('vocabulary').update({ image: publicUrl, image_source: 'user' }).eq('id', item.id);
            if (dbErr) throw dbErr; 
            item.image = publicUrl; img.src = publicUrl; img.style.display = 'block'; showToast('✅ Фото обновлено');
        } catch (err) { console.error(err); showToast('❌ Ошибка загрузки'); } 
        finally {
            /** @type {HTMLInputElement} */ (fileInput).value = ''; // Сброс, чтобы можно было выбрать тот же файл снова
        }
    };
    const upBtn = document.createElement('button'); upBtn.className = 'btn-mini'; upBtn.innerHTML = '📷'; upBtn.title = 'Загрузить фото';
    upBtn.onclick = (e) => { e.stopPropagation(); fileInput.click(); }; 
    ctrls.appendChild(fileInput); ctrls.appendChild(upBtn);

    if (item.image) {
        const delBtn = document.createElement('button'); delBtn.className = 'btn-mini delete'; delBtn.innerHTML = '🗑'; delBtn.title = 'Удалить свое фото';
        delBtn.onclick = async (e) => {
            e.stopPropagation(); if (!confirm('Удалить загруженное фото?')) return;
            try {
                // Сбрасываем и картинку, и ее источник
                const { error } = await client.from('vocabulary').update({ image: null, image_source: null }).eq('id', item.id);
                if (error) throw error;
                item.image = null;
                item.image_source = null;
                img.style.display = 'none'; 
                delBtn.remove(); showToast('🗑 Фото удалено');
            } catch (err) { console.error(err); showToast('❌ Ошибка'); }
        };
        ctrls.appendChild(delBtn);
    }
    imgContainer.appendChild(ctrls);
    backContent.appendChild(imgContainer);

    const trans = document.createElement('div'); trans.className = 'translation'; trans.textContent = item.translation || ''; backContent.appendChild(trans);
    
    if (item.synonyms || item.antonyms || item.collocations) {
        const tagsDiv = document.createElement('div'); tagsDiv.className = 'card-tags';
        if (item.synonyms) tagsDiv.innerHTML += `<span class="info-tag tag-syn">≈ ${item.synonyms}</span>`;
        if (item.antonyms) tagsDiv.innerHTML += `<span class="info-tag tag-ant">≠ ${item.antonyms}</span>`;
        if (item.collocations) tagsDiv.innerHTML += `<div class="info-tag tag-coll">🔗 ${item.collocations}</div>`;
        backContent.appendChild(tagsDiv);
    }

    if (item.example_kr || item.example_ru) backContent.innerHTML += `<div class="example-box"><div class="ex-kr">${item.example_kr || ''}</div><div class="ex-ru">${item.example_ru || ''}</div></div>`;
    if (item.my_notes) backContent.innerHTML += `<div class="note-box"><div style="font-size:16px;">💡</div><div>${item.my_notes}</div></div>`;
    if (item.grammar_info) backContent.innerHTML += `<div class="note-box"><div style="font-size:16px;">📘</div><div>${item.grammar_info}</div></div>`;

    back.appendChild(backContent);

    const actions = document.createElement('div'); actions.className = 'card-actions';
    const s = /** @type {any} */ (state);
    const isL = s.learned.has(item.id);
    const isM = s.mistakes.has(item.id);
    if (isL || isM) {
        const resetBtn = document.createElement('button'); resetBtn.className = 'action-btn action-reset'; resetBtn.textContent = 'Сброс';
        resetBtn.onclick = (e) => { e.stopPropagation(); resetProgress(item.id); };
        actions.appendChild(resetBtn);
    } else {
        const mistakeBtn = document.createElement('button'); mistakeBtn.className = 'action-btn action-mistake'; mistakeBtn.textContent = 'Забыл';
        mistakeBtn.onclick = (e) => { e.stopPropagation(); markMistake(item.id); };
        const learnedBtn = document.createElement('button'); learnedBtn.className = 'action-btn action-learned'; learnedBtn.textContent = 'Знаю';
        learnedBtn.onclick = (e) => { e.stopPropagation(); markLearned(item.id); };
        actions.appendChild(mistakeBtn); actions.appendChild(learnedBtn);
    }

    const practiceBtn = document.createElement('button'); practiceBtn.className = 'action-btn'; practiceBtn.textContent = '🗣️'; practiceBtn.title = 'Проверить произношение';
    practiceBtn.style.background = 'var(--info)'; practiceBtn.style.flex = '0.5';
    practiceBtn.onclick = (e) => { e.stopPropagation(); /** @type {any} */ (window).checkPronunciation(item.word_kr, practiceBtn); }; 
    actions.appendChild(practiceBtn);
    back.appendChild(actions);

    return back;
}

/**
 * Creates a list item element (Table View).
 * @param {any} item 
 * @returns {HTMLElement}
 */
function createListItem(item) {
    const el = document.createElement('div');
    el.className = 'list-item'; // .visible добавляется в renderVisibleListItems
    const s = /** @type {any} */ (state);
    if (s.learned.has(item.id)) el.classList.add('learned');
    if (s.mistakes.has(item.id)) el.classList.add('mistake');
    
    const isFav = s.favorites.has(item.id);

    // Left: Word & Translation
    const mainDiv = document.createElement('div'); mainDiv.className = 'list-col-main';
    mainDiv.innerHTML = `<div class="list-word">${item.word_kr} ${item.word_hanja ? `<span class="list-hanja">${item.word_hanja}</span>` : ''}</div><div class="list-trans">${item.translation}</div>`;
    
    // Middle: Level Badge
    const metaDiv = document.createElement('div'); metaDiv.className = 'list-col-meta';
    metaDiv.innerHTML = `<span class="list-badge">${item.level || '★☆☆'}</span>`;

    // Right: Actions
    const actionsDiv = document.createElement('div'); actionsDiv.className = 'list-col-actions';
    
    const speakBtn = document.createElement('button'); speakBtn.className = 'btn-icon list-action-btn'; speakBtn.textContent = '🔊';
    speakBtn.onclick = (e) => { e.stopPropagation(); speak(item.word_kr, item.audio_url); };
    
    const favBtn = document.createElement('button'); favBtn.className = `btn-icon list-action-btn ${isFav ? 'active' : ''}`; 
    favBtn.textContent = isFav ? '❤️' : '🤍';
    favBtn.onclick = (e) => { e.stopPropagation(); toggleFavorite(item.id, favBtn); };

    actionsDiv.appendChild(speakBtn); actionsDiv.appendChild(favBtn);

    el.appendChild(mainDiv); el.appendChild(metaDiv); el.appendChild(actionsDiv);
    return el;
}

/**
 * Calculates accuracy percentage for a word.
 * @param {number|string} id 
 * @returns {number}
 */
export function getAccuracy(id) {
    const s = /** @type {any} */ (state);
    const stats = s.wordHistory[id] || { attempts: 0, correct: 0 };
    if (stats.attempts === 0) return 0;
    return Math.min(100, Math.round((stats.correct / stats.attempts) * 100));
}

/**
 * Marks a word as learned.
 * @param {number|string} id 
 */
export function markLearned(id) {
    ensureSessionStarted();
    const s = /** @type {any} */ (state);
    s.learned.add(id); s.mistakes.delete(id);
    recordAttempt(id, true); s.dirtyWordIds.add(id);
    addXP(10); checkAchievements(); saveAndRender();
}

/**
 * Marks a word as a mistake.
 * @param {number|string} id 
 */
export function markMistake(id) {
    ensureSessionStarted();
    const s = /** @type {any} */ (state);
    s.mistakes.add(id); s.learned.delete(id);
    recordAttempt(id, false); s.dirtyWordIds.add(id);
    addXP(-5); saveAndRender();
}

/**
 * Toggles favorite status for a word.
 * @param {number|string} id 
 * @param {HTMLElement} [btn] 
 */
export function toggleFavorite(id, btn) {
    const s = /** @type {any} */ (state);
    if (s.favorites.has(id)) { s.favorites.delete(id); if(btn) { btn.textContent = '🤍'; btn.classList.remove('active'); } }
    else { s.favorites.add(id); if(btn) { btn.textContent = '❤️'; btn.classList.add('active'); } showToast('Добавлено в избранное'); }
    s.dirtyWordIds.add(id);
    scheduleSaveState();
    if (s.currentStar === 'favorites') render();
}

/**
 * Resets progress for a specific word.
 * @param {number|string} id 
 */
export function resetProgress(id) {
    const s = /** @type {any} */ (state);
    s.learned.delete(id); s.mistakes.delete(id);
    delete s.wordHistory[id]; s.dirtyWordIds.add(id);
    scheduleSaveState(); saveAndRender();
}

/**
 * Resets the search input and triggers a re-render.
 */
export function resetSearchHandler() {
    const s = /** @type {HTMLInputElement} */ (document.getElementById('searchInput'));
    if (s) {
        s.value = '';
        s.focus();
        s.dispatchEvent(new Event('input'));
    }
}

/**
 * Sets up IntersectionObservers for scroll effects and lazy loading.
 */
export function setupScrollObserver() {
    if (scrollObserver) scrollObserver.disconnect();
    if (appearanceObserver) appearanceObserver.disconnect();
    
    const cards = document.querySelectorAll('.card:not(.visible)');
    if (cards.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '50px' });
    appearanceObserver = observer;

    cards.forEach(card => observer.observe(card));
}

/**
 * Sets up 3D tilt effects for cards.
 */
export function setupGridEffects() {
    const grid = document.getElementById('vocabulary-grid');
    if (!grid) return;
    grid.addEventListener('mousemove', (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        const card = /** @type {HTMLElement} */ (target.closest('.card'));
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;
        card.style.setProperty('--rx', `${rotateX}deg`);
        card.style.setProperty('--ry', `${rotateY}deg`);
    });
    grid.addEventListener('mouseout', (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        const card = /** @type {HTMLElement} */ (target.closest('.card'));
        if (card && !card.contains(/** @type {Node} */ (e.relatedTarget))) {
            card.style.setProperty('--rx', '0deg');
            card.style.setProperty('--ry', '0deg');
        }
    });
}
