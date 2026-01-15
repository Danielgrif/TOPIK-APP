import { state } from '../core/state.js';
import { parseBilingualString } from '../utils/utils.js';
import { render } from './ui_card.js';

// Закрытие выпадающего списка при клике вне его
window.addEventListener('click', (e) => {
    document.querySelectorAll('.multiselect-content.show').forEach(el => {
        if (el.parentElement && e.target instanceof Node && !el.parentElement.contains(e.target)) el.classList.remove('show');
    });
});

/**
 * Toggles the visibility of the filter side panel.
 */
export function toggleFilterPanel() {
    const panel = document.getElementById('filter-panel');
    const overlay = document.getElementById('filter-panel-overlay');
    if (panel) panel.classList.toggle('show');
    if (overlay) overlay.classList.toggle('show');
    // Prevent body scroll when panel is open
    if (panel) document.body.style.overflow = panel.classList.contains('show') ? 'hidden' : '';
}

/**
 * Extracts and sorts unique topics from the dataStore based on the current content type.
 * @returns {string[]} Sorted array of topics.
 */
function getTopicsForCurrentType() {
    const topics = new Set();
    const s = /** @type {any} */ (state);
    state.dataStore.forEach(w => {
        if (w.type !== s.currentType) return;
        const t = w.topic || w.topic_ru || w.topic_kr;
        if (t) topics.add(t);
    });
    return Array.from(topics).sort();
}

/**
 * Handles the logic for selecting/deselecting a topic filter.
 * This function updates the state and then triggers a UI refresh.
 * @param {string} value - The topic value that was clicked.
 */
function handleTopicSelection(value) {
    const s = /** @type {any} */ (state);
    const isAllSelected = s.currentTopic.includes('all');
    const isCurrentlyChecked = s.currentTopic.includes(value);

    if (value === 'all') {
        s.currentTopic = ['all'];
    } else if (isAllSelected) {
        // If 'all' was selected, clicking another topic starts a new selection.
        s.currentTopic = [value];
    } else if (isCurrentlyChecked) {
        // Item is already checked, so uncheck it.
        s.currentTopic = s.currentTopic.filter((/** @type {string} */ t) => t !== value);
        // If the selection becomes empty, default back to 'all'.
        if (s.currentTopic.length === 0) {
            s.currentTopic = ['all'];
        }
    } else {
        // Add the new topic to the selection.
        s.currentTopic.push(value);
    }

    // Re-render filters and card grid to reflect the new state.
    populateFilters();
    render();
}

/**
 * Creates a single item for the multiselect dropdown.
 * @param {string} value - The value for the item.
 * @param {string} label - The display label for the item.
 * @returns {HTMLElement} The created div element for the item.
 */
function createMultiselectItem(value, label) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'multiselect-item';
    
    const s = /** @type {any} */ (state);
    const isChecked = s.currentTopic.includes(value);
    // Checkbox is readonly as the parent div handles the click.
    itemDiv.innerHTML = `<input type="checkbox" ${isChecked ? 'checked' : ''} readonly> <span>${label}</span>`;
    
    itemDiv.onclick = (e) => {
        e.stopPropagation(); // Prevent the dropdown from closing.
        handleTopicSelection(value);
    };
    
    return itemDiv;
}

/**
 * Populates the topic filter dropdown based on current data.
 */
export function populateFilters() {
    const topicSelect = document.getElementById('topicSelect');
    if (!topicSelect) return;
    
    // FIX: Сохраняем состояние открытия перед перерисовкой
    const wasOpen = topicSelect.querySelector('.multiselect-content.show') !== null;
    
    // Очищаем контейнер
    topicSelect.innerHTML = '';

    // Кнопка открытия списка
    const btn = document.createElement('div');
    btn.className = 'multiselect-btn';
    btn.style.cursor = 'pointer';
    const s = /** @type {any} */ (state);
    const countLabel = s.currentTopic.includes('all') 
        ? 'Все темы' 
        : `Темы: ${s.currentTopic.length}`;
    btn.innerHTML = `<span>${countLabel}</span><span style="font-size: 10px; opacity: 0.6;">▼</span>`;
    btn.onclick = (e) => {
        e.stopPropagation();
        topicSelect.querySelector('.multiselect-content')?.classList.toggle('show');
    };
    topicSelect.appendChild(btn);

    // Выпадающий список
    const content = document.createElement('div');
    content.className = 'multiselect-content';
    if (wasOpen) {
        content.classList.add('show');
    }

    // Populate dropdown with items
    content.appendChild(createMultiselectItem('all', 'Все темы'));
    const sortedTopics = getTopicsForCurrentType();
    sortedTopics.forEach(t => {
        const topicLabel = parseBilingualString(t).ru;
        content.appendChild(createMultiselectItem(t, topicLabel));
    });
    topicSelect.appendChild(content);

    populateCategoryFilter();
}

/**
 * Populates the category filter dropdown.
 */
export function populateCategoryFilter() {
    const categorySelect = /** @type {HTMLSelectElement} */ (document.getElementById('categorySelect'));
    if (!categorySelect) return;
    const categories = new Set();
    const s = /** @type {any} */ (state);
    state.dataStore.forEach(w => {
        if (w.type !== s.currentType) return;
        const t = w.topic || w.topic_ru || w.topic_kr;
        const topics = Array.isArray(s.currentTopic) ? s.currentTopic : [s.currentTopic];
        if (!topics.includes('all') && !topics.includes(t)) return;
        const c = w.category || w.category_ru || w.category_kr;
        if (c) categories.add(c);
    });
    categorySelect.innerHTML = '<option value="all">Все категории</option>';
    Array.from(categories).sort().forEach(c => {
        const opt = document.createElement('option'); opt.value = c; opt.textContent = parseBilingualString(c).ru; categorySelect.appendChild(opt);
    });
    categorySelect.value = 'all'; s.currentCategory = 'all';
}

/** @param {string} val */
export function handleTopicChange(val) { /* Deprecated for multi-select */ }

/** @param {string} val */
export function handleCategoryChange(val) { /** @type {any} */ (state).currentCategory = val; render(); }

/**
 * @param {string} type
 * @param {HTMLElement} btn
 */
export function setTypeFilter(type, btn) { /** @type {any} */ (state).currentType = type; document.querySelectorAll('#type-filters button').forEach(b => b.classList.remove('active')); if(btn) btn.classList.add('active'); populateFilters(); render(); }

/**
 * @param {string} star
 * @param {HTMLElement} btn
 */
export function setStarFilter(star, btn) { /** @type {any} */ (state).currentStar = star; document.querySelectorAll('#level-filters button').forEach(b => b.classList.remove('active')); btn.classList.add('active'); render(); }