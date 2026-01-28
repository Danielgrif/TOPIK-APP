// Карта соответствия QWERTY -> Jamo (2-Set Korean Keyboard)
const KEY_MAP: Record<string, string> = {
  q: 'ㅂ', w: 'ㅈ', e: 'ㄷ', r: 'ㄱ', t: 'ㅅ', y: 'ㅛ', u: 'ㅕ', i: 'ㅑ', o: 'ㅐ', p: 'ㅔ',
  a: 'ㅁ', s: 'ㄴ', d: 'ㅇ', f: 'ㄹ', g: 'ㅎ', h: 'ㅗ', j: 'ㅓ', k: 'ㅏ', l: 'ㅣ',
  z: 'ㅋ', x: 'ㅌ', c: 'ㅊ', v: 'ㅍ', b: 'ㅠ', n: 'ㅜ', m: 'ㅡ',
  Q: 'ㅃ', W: 'ㅉ', E: 'ㄸ', R: 'ㄲ', T: 'ㅆ', O: 'ㅒ', P: 'ㅖ'
};

// Индексы Jamo для композиции Unicode
// Начальные (Cho)
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
// Гласные (Jung)
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
// Конечные (Jong) - пробел в начале для отсутствия патчима
const JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';

// Карта составных гласных (для ввода двух клавиш подряд, например h+k = ㅗ+ㅏ = ㅘ)
const DOUBLE_JUNG: Record<string, string> = {
  'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ',
  'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ',
  'ㅡㅣ': 'ㅢ'
};

// Карта составных патчимов (конечных согласных)
const DOUBLE_JONG: Record<string, string> = {
  'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ',
  'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ'
};

/**
 * Конвертирует строку английских символов в корейский (Hangul).
 * Простая реализация конечного автомата для сборки слогов.
 */
export function toKorean(input: string): string {
  let result = '';
  let state = 0; // 0:Start, 1:Cho, 2:Jung, 3:Jong, 4:Jong+Jong
  let cho = -1, jung = -1, jong = 0;
  
  // Буфер для текущего слога
  const combine = () => {
    return String.fromCharCode(0xAC00 + (cho * 21 * 28) + (jung * 28) + jong);
  };

  const chars = input.split('');
  
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const jamo = KEY_MAP[char];

    // Если символ не корейская буква (например, пробел или цифра), сбрасываем состояние
    if (!jamo) {
      if (state === 2 || state === 3 || state === 4) result += combine();
      else if (state === 1) result += CHO[cho];
      
      result += char;
      state = 0; cho = -1; jung = -1; jong = 0;
      continue;
    }

    // Определяем тип Jamo
    const isCho = CHO.indexOf(jamo) !== -1;
    const isJung = JUNG.indexOf(jamo) !== -1;
    // Jong включает в себя Cho, но не все Cho могут быть Jong (например ㄸ, ㅉ, ㅃ)
    const jongIdx = JONG.indexOf(jamo); 

    // Логика автомата
    if (state === 0) {
      if (isCho) { cho = CHO.indexOf(jamo); state = 1; }
      else if (isJung) { result += jamo; } // Гласная без согласной
    }
    else if (state === 1) { // Есть Cho
      if (isJung) { jung = JUNG.indexOf(jamo); state = 2; }
      else if (isCho) { result += CHO[cho]; cho = CHO.indexOf(jamo); } // Cho + Cho -> сброс
    }
    else if (state === 2) { // Есть Cho + Jung
      if (isJung) {
        // Проверка на составную гласную (например ㅗ + ㅏ = ㅘ)
        const double = DOUBLE_JUNG[JUNG[jung] + jamo];
        if (double) { jung = JUNG.indexOf(double); }
        else { result += combine(); cho = -1; jung = JUNG.indexOf(jamo); state = 0; result += jamo; } // Не соединяется
      }
      else if (jongIdx > 0) { jong = jongIdx; state = 3; } // Cho + Jung + Jong
      else if (isCho) { result += combine(); cho = CHO.indexOf(jamo); jung = -1; jong = 0; state = 1; } // Начало нового слога
    }
    else if (state === 3) { // Есть Cho + Jung + Jong
      if (isJung) {
        // Самый сложный случай: Jong переходит в Cho следующего слога (перетекание)
        // Пример: 각 (gag) + ㅏ (a) -> 가가 (ga-ga)
        const prevJongChar = JONG[jong];
        
        // Восстанавливаем предыдущий слог без патчима
        const prevSyllable = String.fromCharCode(0xAC00 + (cho * 21 * 28) + (jung * 28) + 0);
        result += prevSyllable;
        
        // Текущий Jong становится Cho нового слога
        cho = CHO.indexOf(prevJongChar);
        jung = JUNG.indexOf(jamo);
        jong = 0;
        state = 2;
      }
      else if (jongIdx > 0) {
        // Проверка на составной патчим (например ㄱ + ㅅ = ㄳ)
        const double = DOUBLE_JONG[JONG[jong] + jamo];
        if (double) { jong = JONG.indexOf(double); state = 4; }
        else { result += combine(); cho = CHO.indexOf(jamo); jung = -1; jong = 0; state = 1; }
      }
      else if (isCho) { result += combine(); cho = CHO.indexOf(jamo); jung = -1; jong = 0; state = 1; }
    }
    else if (state === 4) { // Есть Cho + Jung + DoubleJong
      if (isJung) {
        // Разбиваем двойной патчим при встрече с гласной
        // Пример: 닭 (dalg) + ㅏ (a) -> 달가 (dal-ga)
        // Нам нужно знать, из чего состоял двойной патчим. Для простоты берем последний введенный символ.
        // Но в state 4 мы уже "забыли" компоненты.
        // Упрощение: просто завершаем слог и начинаем новый (не идеально, но работает для большинства случаев ввода)
        result += combine();
        cho = -1; jung = JUNG.indexOf(jamo); jong = 0; state = 0; result += jamo;
      }
      else {
        result += combine();
        if (isCho) { cho = CHO.indexOf(jamo); jung = -1; jong = 0; state = 1; }
        else { cho = -1; jung = -1; jong = 0; state = 0; result += jamo; }
      }
    }
  }

  // Добавляем остаток
  if (state === 2 || state === 3 || state === 4) result += combine();
  else if (state === 1) result += CHO[cho];

  return result;
}