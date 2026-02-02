/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
import { client } from "../core/supabaseClient.ts";
import { showToast, showUndoToast } from "../utils/utils.ts";
import { render } from "./ui_card.ts";
import { openModal, closeModal, openConfirm } from "./ui_modal.ts";
import {
  collectionsState,
  setCollectionFilter as setStateFilter,
  UserList,
} from "../core/collections_data.ts";

export async function loadCollections() {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return;

  // 1. Загружаем списки (свои + публичные)
  const { data: lists, error } = await client
    .from("user_lists")
    .select("*")
    .or(`user_id.eq.${user.id},is_public.eq.true`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading lists:", error);
    return;
  }
  collectionsState.userLists = lists || [];

  // 2. Загружаем содержимое списков
  // Оптимизация: загружаем только для видимых списков, но пока загрузим всё для простоты
  const { data: items, error: itemsError } = await client
    .from("list_items")
    .select("*");

  if (itemsError) {
    console.error("Error loading list items:", itemsError);
    return;
  }

  collectionsState.listItems = {};
  items?.forEach((item: any) => {
    if (!collectionsState.listItems[item.list_id])
      collectionsState.listItems[item.list_id] = new Set();
    collectionsState.listItems[item.list_id].add(item.word_id);
  });

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
    .from("user_lists")
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
      (l: UserList) => l.id === listId,
    );
    if (listIndex === -1) return;
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
        const { error } = await client
          .from("user_lists")
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
    .from("user_lists")
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
    client.auth.getSession().then(({ data: { session } }: any) => {
      const myId = session?.user?.id;
      const lists = collectionsState.userLists || [];

      let html = "";

      // Добавляем опцию "Без списка" для поиска потерянных слов
      html += `
        <div class="collection-item-card" style="background: var(--surface-2); border: 1px dashed var(--border-color); margin-bottom: 10px;">
            <div onclick="window.setCollectionFilter('uncategorized')" style="flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0; cursor: pointer;" title="Показать слова без списка">
                <span style="font-size: 24px; flex-shrink: 0;">📦</span>
                <div style="display: flex; flex-direction: column; min-width: 0;">
                    <span style="font-weight: bold; font-size: 15px;">Без списка</span>
                    <span style="font-size: 11px; color: var(--text-sub);">Слова, не входящие ни в одну коллекцию</span>
                </div>
            </div>
        </div>
        `;

      if (lists.length === 0) {
        html +=
          '<div style="text-align:center; padding:20px; color:var(--text-sub);">У вас пока нет списков</div>';
      } else {
        html += lists
          .map((list: UserList) => {
            const isMine = list.user_id === myId;
            if (!isMine) return ""; // В управлении показываем только свои

            // Safe escaping for onclick handlers
            const safeTitle = list.title
              .replace(/'/g, "\\'")
              .replace(/"/g, "&quot;");
            const safeIcon = (list.icon || "📁")
              .replace(/'/g, "\\'")
              .replace(/"/g, "&quot;");

            return `
                <div class="collection-item-card">
                    <div onclick="window.setCollectionFilter('${list.id}')" style="flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0; cursor: pointer;" title="Открыть список">
                        <span style="font-size: 24px; flex-shrink: 0;">${list.icon || "📁"}</span>
                        <div style="display: flex; flex-direction: column; min-width: 0;">
                            <span style="font-weight: bold; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${list.title}</span>
                            <span style="font-size: 11px; color: var(--text-sub); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${list.is_public ? "🌐 Публичный" : "🔒 Личный"} • Слов: ${collectionsState.listItems[list.id]?.size || 0}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-shrink: 0;">
                        <button class="btn-icon" onclick="window.openEditListModal('${list.id}', '${safeTitle}', '${safeIcon}')" title="Редактировать" style="width: 36px; height: 36px; font-size: 16px; background: var(--surface-3);">✏️</button>
                        <button class="btn-icon" data-action="open-add-word-modal" data-value="${list.id}" title="Добавить слово в этот список" style="width: 36px; height: 36px; font-size: 16px; background: var(--surface-3);">➕</button>
                        <button class="btn-icon" onclick="window.deleteList('${list.id}', this)" title="Удалить список" style="width: 36px; height: 36px; font-size: 16px; color: var(--danger); background: rgba(255,0,0,0.05);">🗑️</button>
                    </div>
                </div>
                `;
          })
          .join("");
      }
      container.innerHTML = html;
    });
  }

  // 2. Обновляем селект в модальном окне добавления слова
  const select = document.getElementById(
    "new-word-target-list",
  ) as HTMLSelectElement;
  if (select) {
    client.auth.getSession().then(({ data: { session } }: any) => {
      const myLists = collectionsState.userLists.filter(
        (l: UserList) => l.user_id === session?.user?.id,
      );
      select.innerHTML =
        '<option value="" disabled selected>-- Выберите список --</option>' +
        '<option value="create-new-list" style="font-weight:bold; color:var(--primary);">➕ Создать новый список...</option>' +
        myLists
          .map((l: UserList) => `<option value="${l.id}">${l.title}</option>`)
          .join("");
    });
  }

  // 3. Обновляем кнопку фильтра
  const filterBtn = document.getElementById("collection-filter-btn");
  if (filterBtn) {
    if (collectionsState.currentCollectionFilter) {
      if (collectionsState.currentCollectionFilter === "uncategorized") {
        filterBtn.innerHTML = `<span>📦 Без списка</span> <span>✕</span>`;
      } else {
        const list = collectionsState.userLists.find(
          (l: UserList) => l.id === collectionsState.currentCollectionFilter,
        );
        filterBtn.innerHTML = `<span>${list?.icon || "📁"} ${list?.title || "Список"}</span> <span>✕</span>`;
      }
      filterBtn.onclick = (e) => {
        e.stopPropagation();
        setStateFilter(null);
        updateCollectionUI();
        render();
      };
    } else {
      filterBtn.innerHTML = `<span>Все слова</span> <span>›</span>`;
      filterBtn.onclick = () => openModal("collections-modal"); // Или отдельное окно выбора для фильтрации
    }
  }
}

export function setCollectionFilter(listId: string) {
  setStateFilter(listId);
  updateCollectionUI();
  render();
  closeModal("collections-modal");

  if (listId === "uncategorized") {
    showToast("💡 Нажмите ☑️ чтобы выбрать и удалить слова", 4000);
  }
}
