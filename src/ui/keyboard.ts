import { toKorean, disassemble, isHangul } from "../utils/hangul.ts";

export function renderVirtualKeyboard(
  container: HTMLElement,
  input: HTMLInputElement | HTMLTextAreaElement,
  kbToggle: HTMLButtonElement,
) {
  // Предотвращаем дублирование
  if (container.querySelector(".virtual-keyboard")) return null;

  const kbContainer = document.createElement("div");
  kbContainer.className = "virtual-keyboard";
  kbContainer.style.cssText = `
        margin-top: 10px; 
        padding: 8px; 
        background: var(--surface-2); 
        border-radius: 12px;
        display: none; 
        grid-template-rows: auto auto auto auto auto;
        gap: 6px;
        user-select: none;
        width: 100%;
        box-shadow: var(--shadow-md);
        z-index: 100;
        padding-bottom: 20px; /* Safe area for bottom */
        transition: background-color 0.3s ease, box-shadow 0.3s ease;
    `;

  let isShifted = false;
  let isSymbolMode = false;

  // Ряд 0: Цифры
  const row0 = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
  const row0_s = ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")"];

  // Стандартная раскладка 2-Set Korean
  // Ряд 1: q w e r t y u i o p
  const row1 = ["ㅂ", "ㅈ", "ㄷ", "ㄱ", "ㅅ", "ㅛ", "ㅕ", "ㅑ", "ㅐ", "ㅔ"];
  const row1_s = ["ㅃ", "ㅉ", "ㄸ", "ㄲ", "ㅆ", "ㅛ", "ㅕ", "ㅑ", "ㅒ", "ㅖ"]; // С Shift

  // Ряд 2: a s d f g h j k l
  const row2 = ["ㅁ", "ㄴ", "ㅇ", "ㄹ", "ㅎ", "ㅗ", "ㅓ", "ㅏ", "ㅣ"];

  // Ряд 3: z x c v b n m
  const row3 = ["⇧", "ㅋ", "ㅌ", "ㅊ", "ㅍ", "ㅠ", "ㅜ", "ㅡ", "⌫"];

  // Ряд 4: Знаки препинания и пробел
  const row4 = ["?123", ",", ".", "SPACE", "↵"];

  // --- Symbol Layout ---
  // Ряд 1 (Symbols)
  const symRow1 = ["+", "×", "÷", "=", "/", "_", "<", ">", "[", "]"];
  // Ряд 2 (Symbols)
  const symRow2 = ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")"];
  // Ряд 3 (Symbols)
  const symRow3 = ["-", "'", '"', ":", ";", "~", "\\", "|", "⌫"];
  // Ряд 4 (Symbols)
  const symRow4 = ["ABC", "{", "}", "SPACE", "↵"];

  const createButton = (char: string) => {
    const btn = document.createElement("button");
    btn.textContent = char === "SPACE" ? "Пробел" : char;
    btn.className = "btn-kb";
    btn.style.cssText = `
            flex: 1;
            height: 42px; 
            background: var(--surface-1); 
            border: 1px solid var(--border-color); 
            border-radius: 6px; 
            font-weight: bold;
            font-size: 16px;
            cursor: pointer;
            color: var(--text-main);
            display: flex; align-items: center; justify-content: center;
            touch-action: manipulation;
            min-width: 28px;
            transition: background-color 0.1s, color 0.1s;
        `;

    // Стили для спецкнопок
    if (char === "⇧" || char === "⌫") {
      btn.style.background = "var(--surface-3)";
      btn.style.flex = "1.5";
    }

    if (char === "SPACE") btn.style.flex = "4";
    if (char === "↵") {
      btn.style.background = "var(--primary)";
      btn.style.color = "var(--text-inverse)";
      btn.style.flex = "1.5";
    }
    if (char === "?123" || char === "ABC") btn.style.flex = "1.5";

    if (char === "⇧" && isShifted) {
      btn.style.background = "var(--primary)";
      btn.style.color = "var(--text-inverse)";
    }

    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (char === "⇧") {
        isShifted = !isShifted;
        renderKeys(); // Перерисовываем клавиатуру
        return;
      }

      if (char === "?123") {
        isSymbolMode = true;
        isShifted = false;
        renderKeys();
        return;
      }

      if (char === "ABC") {
        isSymbolMode = false;
        renderKeys();
        return;
      }

      const start = input.selectionStart || input.value.length;
      const end = input.selectionEnd || input.value.length;

      if (char === "⌫") {
        if (start !== end) {
          input.value = input.value.substring(0, start) + input.value.substring(end);
          input.setSelectionRange(start, start);
        } else if (start > 0) {
          input.value = input.value.substring(0, start - 1) + input.value.substring(start);
          input.setSelectionRange(start - 1, start - 1);
        }
      } else {
        let charToInsert = char;
        if (char === "SPACE") charToInsert = " ";
        else if (char === "↵") charToInsert = "\n";

        if (char === "↵") {
          // Для Enter просто вставляем перенос строки и не запускаем логику Hangul
          input.value = input.value.substring(0, start) + "\n" + input.value.substring(end);
          input.setSelectionRange(start + 1, start + 1);
          input.dispatchEvent(new Event("input"));
          input.focus();
          return;
        }

        // Логика Hangul Composition
        // Если вставляем пробел или знак препинания - просто вставляем.
        // Если вставляем букву, пытаемся соединить с предыдущим символом.

        const prevChar = input.value.substring(start - 1, start);
        const isHangulChar = isHangul(prevChar) || /[ㄱ-ㅎㅏ-ㅣ]/.test(prevChar);
        const isNewCharHangul = /[ㄱ-ㅎㅏ-ㅣ]/.test(charToInsert);

        if (start > 0 && isHangulChar && isNewCharHangul) {
          // 1. Разбираем предыдущий символ на Jamo
          const parts = disassemble(prevChar);
          // 2. Добавляем новый Jamo
          parts.push(charToInsert);
          // 3. Собираем заново (toKorean умеет собирать массив Jamo)
          const newVal = toKorean(parts.join(""));

          input.value = input.value.substring(0, start - 1) + newVal + input.value.substring(end);
          // Корректируем курсор: длина могла измениться (например 닭 + ㅏ -> 달가, длина 1 -> 2)
          const newCursorPos = start - 1 + newVal.length;
          input.setSelectionRange(newCursorPos, newCursorPos);
        } else {
          input.value = input.value.substring(0, start) + charToInsert + input.value.substring(end);
          input.setSelectionRange(start + 1, start + 1);
        }

        // Авто-сброс Shift после ввода символа (как на мобильных)
        if (isShifted) {
          isShifted = false;
          renderKeys();
        }
      }

      input.dispatchEvent(new Event("input")); // Для обновления счетчиков/валидации
      input.focus();
    };
    return btn;
  };

  const renderRow = (chars: string[]) => {
    const div = document.createElement("div");
    div.style.cssText = "display: flex; gap: 4px; justify-content: center; width: 100%;";
    chars.forEach((c) => div.appendChild(createButton(c)));
    kbContainer.appendChild(div);
  };

  const renderKeys = () => {
    kbContainer.innerHTML = "";

    // Ряд цифр всегда отображается, но меняется при Shift
    renderRow(isShifted ? row0_s : row0);

    if (isSymbolMode) {
      renderRow(symRow1);
      renderRow(symRow2);
      renderRow(symRow3);
      renderRow(symRow4);
    } else {
      renderRow(isShifted ? row1_s : row1);
      renderRow(row2);
      renderRow(row3);
      renderRow(row4);
    }
  };

  // Инициализация
  renderKeys();
  container.appendChild(kbContainer);

  // Обработчик клика вне клавиатуры для закрытия
  const handleOutsideClick = (e: MouseEvent) => {
    if (!document.body.contains(kbContainer)) {
      document.removeEventListener("mousedown", handleOutsideClick);
      return;
    }

    if (kbContainer.style.display === "none") return;

    const target = e.target as Node;
    if (!kbContainer.contains(target) && target !== input && !kbToggle.contains(target)) {
      kbContainer.style.display = "none";
    }
  };
  document.addEventListener("mousedown", handleOutsideClick);

  return kbContainer;
}
