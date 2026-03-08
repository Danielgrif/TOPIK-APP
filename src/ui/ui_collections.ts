import { state } from "../core/state.ts";
import { client } from "../core/supabaseClient.ts";
import { showToast, showUndoToast, escapeHtml } from "../utils/utils.ts";
import { render } from "./ui_card.ts";
import { openModal, closeModal, openConfirm } from "./ui_modal.ts";
import {
  collectionsState,
  setCollectionFilter as setStateFilter,
  UserList,
} from "../core/collections_data.ts";
import { DB_TABLES } from "../core/constants.ts";
import { Word } from "../types/index.ts";

export async function loadCollections() {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return;

  // 1. Загружаем списки (свои + публичные)
  const { data: lists, error } = await client
    .from(DB_TABLES.USER_LISTS)
    .select("*")
    .or(`user_id.eq.${user.id},is_public.eq.true`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading lists:", error);
    return;
  }
  collectionsState.userLists = lists || [];

  // Применяем сохраненный порядок сортировки
  const savedOrder = localStorage.getItem("user_lists_order");
  if (savedOrder) {
    try {
      const order = JSON.parse(savedOrder);

      // Валидация: убеждаемся, что это массив строк
      if (
        Array.isArray(order) &&
        order.every((item) => typeof item === "string")
      ) {
        const orderMap = new Map<string, number>(
          (order as string[]).map((id, index) => [id, index]),
        );
        collectionsState.userLists.sort((a, b) => {
          const ia = orderMap.get(a.id) ?? 9999;
          const ib = orderMap.get(b.id) ?? 9999;
          return ia - ib;
        });
      } else {
        console.warn("Invalid list order format in localStorage. Ignoring.");
        localStorage.removeItem("user_lists_order"); // Очищаем некорректные данные
      }
    } catch (e) {
      console.warn("Failed to parse list order", e);
      localStorage.removeItem("user_lists_order"); // Очищаем некорректные данные
    }
  }

  // 2. Загружаем содержимое списков
  // Оптимизация: загружаем только для видимых списков, но пока загрузим всё для простоты
  const { data: items, error: itemsError } = await client
    .from(DB_TABLES.LIST_ITEMS)
    .select("*");

  if (itemsError) {
    console.error("Error loading list items:", itemsError);
    return;
  }

  collectionsState.listItems = Object.create(null);
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!collectionsState.listItems[item.list_id])
        collectionsState.listItems[item.list_id] = new Set();
      collectionsState.listItems[item.list_id].add(item.word_id);
    }
  }

  updateCollectionUI();
}

export async function createList() {
  const titleInput = document.getElementById(
    "new-list-title",
  ) as HTMLInputElement;
  const iconInput = document.getElementById(
    "new-list-icon",
  ) as HTMLInputElement;
  const publicCheck = document.getElementById(
    "new-list-public",
  ) as HTMLInputElement;
  const title = titleInput.value.trim();
  const icon = iconInput.value.trim() || "📁";

  if (!title) {
    showToast("Введите название списка");
    return;
  }

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    showToast("⚠️ Войдите в аккаунт, чтобы создавать списки");
    return;
  }

  // UI: Показываем загрузку
  const btn = document.querySelector(
    '[data-action="create-list"]',
  ) as HTMLButtonElement;
  let originalContent = "";
  if (btn) {
    originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner-tiny"></div>';
  }

  const { data, error } = await client
    .from(DB_TABLES.USER_LISTS)
    .insert({
      title,
      is_public: publicCheck.checked,
      user_id: user.id,
      icon: icon,
    })
    .select()
    .single();

  // UI: Восстанавливаем кнопку
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = originalContent || "➕";
  }

  if (error) {
    showToast("Ошибка создания: " + error.message);
    return;
  }

  collectionsState.userLists.unshift(data);
  collectionsState.listItems[data.id] = new Set();

  titleInput.value = "";
  iconInput.value = "";
  publicCheck.checked = false;

  showToast("Список создан!");
  updateCollectionUI();

  // UX: Если мы находимся в процессе добавления слова, выбираем новый список и возвращаемся
  const addWordModal = document.getElementById("add-word-modal");
  if (addWordModal && addWordModal.classList.contains("active")) {
    setTimeout(() => {
      const select = document.getElementById(
        "new-word-target-list",
      ) as HTMLSelectElement;
      if (select) select.value = data.id;
      closeModal("collections-modal");
    }, 100); // Небольшая задержка, чтобы updateCollectionUI успел обновить DOM
  }
}

export function deleteList(listId: string, btn?: HTMLElement) {
  openConfirm("Удалить этот список?", async () => {
    if (btn) {
      const card = btn.closest(".collection-item-card") as HTMLElement;
      if (card) {
        card.style.transition = "all 0.3s ease";
        card.style.opacity = "0";
        card.style.transform = "translateX(20px)";
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    // Сохраняем данные для восстановления
    const listIndex = collectionsState.userLists.findIndex(
      (l: UserList) => String(l.id) === String(listId),
    );
    if (listIndex === -1) {
      console.error(`List with id ${listId} not found in local state`);
      return;
    }
    const listBackup = collectionsState.userLists[listIndex];
    const itemsBackup = collectionsState.listItems[listId];
    const wasActiveFilter = collectionsState.currentCollectionFilter === listId;

    // Оптимистичное удаление
    collectionsState.userLists.splice(listIndex, 1);
    delete collectionsState.listItems[listId];
    if (wasActiveFilter) {
      setStateFilter(null);
      render();
    }
    updateCollectionUI();

    showUndoToast(
      "Список удален",
      () => {
        // Undo
        collectionsState.userLists.splice(listIndex, 0, listBackup);
        collectionsState.listItems[listId] = itemsBackup;
        if (wasActiveFilter) {
          setStateFilter(listId);
          render();
        }
        updateCollectionUI();
      },
      async () => {
        // Commit
        // Ручная очистка элементов списка перед удалением самого списка (для надежности)
        await client.from(DB_TABLES.LIST_ITEMS).delete().eq("list_id", listId);

        const { error } = await client
          .from(DB_TABLES.USER_LISTS)
          .delete()
          .eq("id", listId);
        if (error) showToast("Ошибка удаления на сервере");
      },
    );
  });
}

export function openEditListModal(
  listId: string,
  currentTitle: string,
  currentIcon: string,
) {
  const idInput = document.getElementById("edit-list-id") as HTMLInputElement;
  const titleInput = document.getElementById(
    "edit-list-title",
  ) as HTMLInputElement;
  const iconInput = document.getElementById(
    "edit-list-icon",
  ) as HTMLInputElement;

  if (idInput && titleInput && iconInput) {
    idInput.value = listId;
    titleInput.value = currentTitle;
    iconInput.value = currentIcon || "📁";

    const modal = document.getElementById("edit-list-modal");
    if (modal) {
      const body = modal.querySelector(".modal-body-container");
      if (body) body.scrollTop = 0;
    }

    openModal("edit-list-modal");
  }
}

export async function saveListChanges() {
  const idInput = document.getElementById("edit-list-id") as HTMLInputElement;
  const titleInput = document.getElementById(
    "edit-list-title",
  ) as HTMLInputElement;
  const iconInput = document.getElementById(
    "edit-list-icon",
  ) as HTMLInputElement;

  const listId = idInput.value;
  const newTitle = titleInput.value.trim();
  const newIcon = iconInput.value.trim() || "📁";

  if (!newTitle) {
    showToast("Название не может быть пустым");
    return;
  }

  const { error } = await client
    .from(DB_TABLES.USER_LISTS)
    .update({ title: newTitle, icon: newIcon })
    .eq("id", listId);
  if (error) {
    showToast("Ошибка: " + error.message);
    return;
  }

  const list = collectionsState.userLists.find(
    (l: UserList) => l.id === listId,
  );
  if (list) {
    list.title = newTitle;
    list.icon = newIcon;
  }

  updateCollectionUI();
  if (collectionsState.currentCollectionFilter === listId) {
    const filterBtn = document.getElementById("collection-filter-btn");
    if (filterBtn)
      filterBtn.innerHTML = `<span>${newIcon} ${newTitle}</span> <span>✕</span>`;
  }
  closeModal("edit-list-modal");
  showToast("Список обновлен");
}

export function updateCollectionUI() {
  // 1. Обновляем список в модальном окне управления
  const container = document.getElementById("collections-list");
  if (container) {
    // FIX: Используем getSession для мгновенного доступа к ID пользователя (без запроса к серверу)
    client.auth.getSession().then(({ data: { session } }) => {
      const myId = session?.user?.id;
      const lists = collectionsState.userLists || [];

      // Filter lists
      const myLists = lists.filter((l: UserList) => l.user_id === myId);
      const publicLists = lists.filter((l: UserList) => l.user_id !== myId);

      // Count custom words
      const myCustomWordsCount = state.dataStore.filter(
        (w: Word) => w.created_by === myId,
      ).length;

      let html = "";

      // --- Section: My Content ---
      html += `<div class="section-title-sm" style="margin-top: 10px; margin-bottom: 12px;">👤 Мои материалы</div>`;

      // 1. My Custom Words (Virtual List)
      if (myCustomWordsCount > 0) {
        html += `
        <div class="collection-item-card special">
            <div class="collection-word-count">${myCustomWordsCount} слов</div>
            <div class="collection-info" data-action="set-collection-filter" data-value="my-custom" title="Показать мои слова">
                <div class="collection-icon" style="background: var(--surface-1); color: var(--primary);">✍️</div>
                <div class="collection-text">
                    <div class="collection-title" style="color: var(--primary);">Мои слова</div>
                    <div class="collection-meta">Созданные вами слова</div>
                </div>
            </div>
            <div class="collection-actions">
                <button class="btn-collection-action" data-action="manage-my-words" title="Выбрать несколько" style="background: var(--surface-1); color: var(--primary);">✅</button>
            </div>
        </div>
        `;
      }

      // 2. My Lists
      if (myLists.length === 0) {
        html += `<div style="text-align:center; padding: 40px 20px; color:var(--text-sub); background: var(--surface-2); border-radius: 20px; border: 1px dashed var(--border-color); margin-bottom: 15px;">
            <div style="font-size: 40px; margin-bottom: 10px; opacity: 0.6;">📭</div>
            <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px;">У вас нет личных списков</div>
            <div style="font-size: 13px; opacity: 0.8;">Создайте первый список выше!</div>
          </div>`;
      } else {
        html += '<div id="my-lists-container">';
        html += myLists
          .map((list: UserList, index: number) => {
            // Safe escaping for onclick handlers
            const safeTitle = list.title
              .replace(/\\/g, "\\\\")
              .replace(/'/g, "\\'")
              .replace(/"/g, "&quot;");
            const safeIcon = (list.icon || "📁")
              .replace(/\\/g, "\\\\")
              .replace(/'/g, "\\'")
              .replace(/"/g, "&quot;");

            return `
                <div class="collection-item-card" draggable="true" data-list-id="${list.id}" style="animation: fadeInUpList 0.3s ease-out ${index * 0.05}s backwards">
                    <div class="collection-word-count">${collectionsState.listItems[list.id]?.size || 0} слов</div>
                    <div class="collection-info" data-action="set-collection-filter" data-value="${list.id}" title="Открыть список">
                        <div class="collection-icon">${escapeHtml(list.icon || "📁")}</div>
                        <div class="collection-text">
                            <div class="collection-title">${escapeHtml(list.title)}</div>
                            <div class="collection-meta">${list.is_public ? "🌐 Публичный" : "🔒 Личный"}</div>
                        </div>
                    </div>
                    <div class="collection-actions">
                        <button class="btn-collection-action" data-action="share-list" data-value="${list.id}" title="Поделиться ссылкой">🔗</button>
                        <button class="btn-collection-action" data-action="edit-list" data-value="${list.id}" data-title="${safeTitle}" data-icon="${safeIcon}" title="Редактировать">✏️</button>
                        <button class="btn-collection-action" data-action="open-add-word-modal" data-value="${list.id}" title="Добавить слово">➕</button>
                        <button class="btn-collection-action delete" data-action="delete-list" data-value="${list.id}" title="Удалить">🗑️</button>
                    </div>
                </div>
                `;
          })
          .join("");
        html += "</div>";
      }

      // --- Section: Public Lists ---
      if (publicLists.length > 0) {
        html += `<div class="section-title-sm" style="margin-top: 20px;">🌐 Общие списки</div>`;
        html += publicLists
          .map((list: UserList, index: number) => {
            // For public lists, we might not allow editing/deleting, just viewing
            return `
                <div class="collection-item-card" style="animation: fadeInUpList 0.3s ease-out ${index * 0.05}s backwards">
                    <div class="collection-word-count">${collectionsState.listItems[list.id]?.size || 0} слов</div>
                    <div class="collection-info" data-action="set-collection-filter" data-value="${list.id}">
                        <div class="collection-icon">${escapeHtml(list.icon || "📁")}</div>
                        <div class="collection-text">
                            <div class="collection-title">${escapeHtml(list.title)}</div>
                            <div class="collection-meta">Автор: ${list.user_id ? "Пользователь" : "Система"}</div>
                        </div>
                    </div>
                    <div class="collection-actions">
                        <button class="btn-collection-action" data-action="share-list" data-value="${list.id}" title="Поделиться ссылкой">🔗</button>
                    </div>
                </div>
                `;
          })
          .join("");
      }

      container.innerHTML = html;
      setupCollectionDragAndDrop(container);
    });
  }

  // 2. Обновляем селект в модальном окне добавления слова
  const select = document.getElementById(
    "new-word-target-list",
  ) as HTMLSelectElement;
  if (select) {
    client.auth.getSession().then(({ data: { session } }) => {
      const myLists = collectionsState.userLists.filter(
        (l: UserList) => l.user_id === session?.user?.id,
      );
      select.innerHTML =
        '<option value="" disabled selected>-- Выберите список --</option>' +
        '<option value="create-new-list" style="font-weight:bold; color:var(--primary);">➕ Создать новый список...</option>' +
        myLists
          .map(
            (l: UserList) =>
              `<option value="${l.id}">${escapeHtml(l.title)}</option>`,
          )
          .join("");
    });
  }

  // 3. Обновляем кнопку фильтра
  const filterBtn = document.getElementById("collection-filter-btn");
  if (filterBtn) {
    if (collectionsState.currentCollectionFilter) {
      filterBtn.style.display = "inline-flex";
      const backBtnStyle = `
        display: inline-flex; 
        align-items: center; 
        justify-content: center; 
        width: 28px; 
        height: 28px; 
        margin-right: 8px; 
        border-radius: 50%; 
        background: var(--surface-2); 
        color: var(--text-main);
        font-size: 18px; 
        line-height: 1; 
        cursor: pointer; 
        transition: all 0.2s;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      `;
      const backIcon = `<span class="filter-back-btn" style="${backBtnStyle}" title="Назад">‹</span>`;

      if (collectionsState.currentCollectionFilter === "uncategorized") {
        filterBtn.innerHTML = `${backIcon}<span>📦 Без списка</span>`;
        filterBtn.onclick = (e) => {
          e.stopPropagation();
          setCollectionFilter(null);
        };
      } else if (collectionsState.currentCollectionFilter === "my-custom") {
        filterBtn.innerHTML = `${backIcon}<span>✍️ Мои слова</span>`;
        filterBtn.onclick = (e) => {
          e.stopPropagation();
          setCollectionFilter(null);
        };
      } else {
        const list = collectionsState.userLists.find(
          (l: UserList) => l.id === collectionsState.currentCollectionFilter,
        );
        const isOwner =
          list && state.currentUser && list.user_id === state.currentUser.id;

        if (isOwner && list) {
          filterBtn.innerHTML = `
            <span data-action="clear-collection-filter" class="filter-back-btn" style="${backBtnStyle}" title="Назад">‹</span>
            <span data-action="edit-list-title-inline" data-value="${list.id}" style="cursor: text; border-bottom: 1px dashed var(--text-tertiary); padding-bottom: 2px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;" title="Нажмите для переименования">
                ${escapeHtml(list.icon || "📁")} ${escapeHtml(list.title)}
            </span>`;
          filterBtn.onclick = null;
        } else {
          filterBtn.innerHTML = `${backIcon}<span>${escapeHtml(list?.icon || "📁")} ${escapeHtml(list?.title || "Список")}</span>`;
          filterBtn.onclick = (e) => {
            e.stopPropagation();
            setCollectionFilter(null);
          };
        }
      }

      // Add hover/active effect logic for back button
      const backBtns = filterBtn.querySelectorAll(".filter-back-btn");
      backBtns.forEach((btn) => {
        const el = btn as HTMLElement;
        el.onmousedown = () => (el.style.transform = "scale(0.9)");
        el.onmouseup = () => (el.style.transform = "scale(1)");
        el.onmouseleave = () => (el.style.transform = "scale(1)");
        el.onmouseenter = () => (el.style.background = "var(--surface-3)");
        el.onmouseout = () => (el.style.background = "var(--surface-2)");
      });
    } else {
      filterBtn.style.display = "none";
    }
  }
}

export function setCollectionFilter(listId: string | null, e?: Event) {
  const execute = () => {
    setStateFilter(listId);
    updateCollectionUI();
    render();
    closeModal("collections-modal");

    // Custom filter logic for "My Words"
    if (listId === "my-custom") {
      client.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          showToast("Показаны только ваши слова");
        }
      });
    }
  };

  if (e) {
    const card = (e.currentTarget as HTMLElement).closest(
      ".collection-item-card",
    );
    if (card) {
      card.classList.add("active-selection");
      // Небольшая задержка для отображения анимации перед закрытием
      setTimeout(execute, 200);
      return;
    }
  }

  execute();
}

export function manageMyWords(e: Event) {
  e.stopPropagation();
  setCollectionFilter("my-custom");
  import("./ui_bulk.ts").then((m) => {
    if (!state.selectMode) m.toggleSelectMode();
  });
}

export function clearCollectionFilter(e: Event) {
  e.stopPropagation();
  setCollectionFilter(null);
}

export function shareList(listId: string) {
  const list = collectionsState.userLists.find((l) => l.id === listId);
  if (!list) return;

  if (!list.is_public) {
    showToast("⚠️ Сделайте список публичным, чтобы делиться им");
    return;
  }

  const url = `${window.location.origin}${window.location.pathname}?share_list=${listId}`;
  navigator.clipboard.writeText(url);
  showToast("🔗 Ссылка скопирована в буфер обмена!");
}

export function editListTitleInline(listId: string, el: HTMLElement, e: Event) {
  e.stopPropagation();
  const list = collectionsState.userLists.find((l) => l.id === listId);
  if (!list) return;

  const currentTitle = list.title;
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentTitle;
  input.className = "inline-edit-input";
  input.style.cssText =
    "width: 120px; padding: 2px 4px; border: 1px solid var(--primary); border-radius: 6px; font-size: inherit; background: var(--surface-1); color: var(--text-main); outline: none;";

  input.onclick = (ev) => ev.stopPropagation();

  const save = async () => {
    const newTitle = input.value.trim();
    if (newTitle && newTitle !== currentTitle) {
      list.title = newTitle;
      updateCollectionUI();

      const { error } = await client
        .from(DB_TABLES.USER_LISTS)
        .update({ title: newTitle })
        .eq("id", listId);

      if (error) {
        showToast("Ошибка: " + error.message);
        list.title = currentTitle;
        updateCollectionUI();
      } else {
        showToast("Список переименован");
      }
    } else {
      updateCollectionUI();
    }
  };

  input.onblur = save;
  input.onkeydown = (ev) => {
    if (ev.key === "Enter") input.blur();
  };

  el.replaceWith(input);
  input.focus();
}

// --- Drag and Drop Logic ---
let draggedItem: HTMLElement | null = null;

function setupCollectionDragAndDrop(container: HTMLElement) {
  const items = container.querySelectorAll(
    '.collection-item-card[draggable="true"]',
  );
  items.forEach((item) => {
    item.addEventListener("dragstart", handleDragStart);
    item.addEventListener("dragover", handleDragOver);
    item.addEventListener("drop", handleDrop);
    item.addEventListener("dragenter", handleDragEnter);
    item.addEventListener("dragleave", handleDragLeave);
    item.addEventListener("dragend", handleDragEnd);
  });
}

function handleDragStart(e: Event) {
  const target = e.target as HTMLElement;
  draggedItem = target;
  (e as DragEvent).dataTransfer!.effectAllowed = "move";
  // Небольшая задержка для визуального эффекта
  setTimeout(() => target.classList.add("dragging"), 0);
}

function handleDragOver(e: Event) {
  e.preventDefault();
  (e as DragEvent).dataTransfer!.dropEffect = "move";
  const target = (e.target as HTMLElement).closest(".collection-item-card");
  if (target && target !== draggedItem) {
    target.classList.add("drag-over");
  }
}

function handleDragEnter(e: Event) {
  e.preventDefault();
}

function handleDragLeave(e: Event) {
  const target = (e.target as HTMLElement).closest(".collection-item-card");
  if (target) {
    target.classList.remove("drag-over");
  }
}

function handleDrop(e: Event) {
  e.stopPropagation();
  const target = (e.target as HTMLElement).closest(
    ".collection-item-card",
  ) as HTMLElement;

  if (draggedItem && target && target !== draggedItem) {
    const listId1 = draggedItem.dataset.listId;
    const listId2 = target.dataset.listId;

    if (listId1 && listId2) {
      const idx1 = collectionsState.userLists.findIndex(
        (l) => l.id === listId1,
      );
      const idx2 = collectionsState.userLists.findIndex(
        (l) => l.id === listId2,
      );

      if (idx1 > -1 && idx2 > -1) {
        const [moved] = collectionsState.userLists.splice(idx1, 1);
        collectionsState.userLists.splice(idx2, 0, moved);

        // Сохраняем порядок
        const ids = collectionsState.userLists.map((l) => l.id);
        localStorage.setItem("user_lists_order", JSON.stringify(ids));

        updateCollectionUI();
      }
    }
  }
  return false;
}

function handleDragEnd(e: Event) {
  const target = e.target as HTMLElement;
  target.classList.remove("dragging");
  document.querySelectorAll(".collection-item-card").forEach((el) => {
    el.classList.remove("drag-over");
  });
  draggedItem = null;
}

export async function openAddToListModal(wordId: number) {
  const modal = document.getElementById("add-to-list-modal");
  const content = document.getElementById("add-to-list-content");
  if (!modal || !content) return;

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    showToast("Войдите в аккаунт");
    return;
  }

  const myLists = collectionsState.userLists.filter(
    (l) => l.user_id === user.id,
  );

  content.scrollTop = 0;
  content.innerHTML = myLists
    .map((list, index) => {
      const hasWord = collectionsState.listItems[list.id]?.has(wordId);
      return `
        <div class="multiselect-item" data-action="toggle-word-in-list" data-list-id="${list.id}" data-word-id="${wordId}" style="animation: fadeInUpList 0.3s ease-out ${index * 0.05}s backwards">
            <input type="checkbox" ${hasWord ? "checked" : ""} style="pointer-events: none;">
            <span style="margin-left: 10px;">${escapeHtml(list.icon || "📁")} ${escapeHtml(list.title)}</span>
        </div>
        `;
    })
    .join("");

  openModal("add-to-list-modal");
}

export async function toggleWordInList(
  listId: string,
  wId: number,
  el: HTMLElement,
) {
  const checkbox = el.querySelector("input") as HTMLInputElement;
  const isAdding = !checkbox.checked;
  checkbox.checked = isAdding;

  if (isAdding) {
    await client
      .from(DB_TABLES.LIST_ITEMS)
      .insert({ list_id: listId, word_id: wId });
    if (!collectionsState.listItems[listId])
      collectionsState.listItems[listId] = new Set();
    collectionsState.listItems[listId].add(wId);
  } else {
    await client
      .from(DB_TABLES.LIST_ITEMS)
      .delete()
      .match({ list_id: listId, word_id: wId });
    collectionsState.listItems[listId]?.delete(wId);
  }
}
