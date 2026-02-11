import { ShopItem } from "../types/index.ts";

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "item_streak_freeze",
    name: "Заморозка серии",
    description:
      "Защищает вашу серию (огонек) от сброса, если вы пропустите один день занятий.",
    price: 200,
    type: "feature",
    value: "streak_freeze",
    icon: "❄️",
  },
  {
    id: "theme_blue",
    name: "Синяя тема «Океан»",
    description: "Освежающая синяя тема для интерфейса.",
    price: 150,
    type: "theme",
    value: "blue",
    icon: "🌊",
  },
  {
    id: "theme_green",
    name: "Зеленая тема «Лес»",
    description: "Спокойная и натуральная тема.",
    price: 150,
    type: "theme",
    value: "green",
    icon: "🌳",
  },
  {
    id: "theme_orange",
    name: "Оранжевая тема «Закат»",
    description: "Теплая и энергичная тема.",
    price: 200,
    type: "theme",
    value: "orange",
    icon: "🌅",
  },
  {
    id: "theme_pink",
    name: "Розовая тема «Сакура»",
    description: "Нежная и стильная тема.",
    price: 200,
    type: "theme",
    value: "pink",
    icon: "🌸",
  },
  {
    id: "feature_custom_quiz",
    name: "Конструктор тестов",
    description:
      "Возможность создавать свои собственные тесты из выбранных слов (Скоро).",
    price: 500,
    type: "feature",
    value: "custom_quiz",
    icon: "🛠️",
  },
  {
    id: "feature_ai_examples",
    name: "AI-помощник для примеров",
    description:
      "Генерация дополнительных примеров предложений с помощью ИИ (Скоро).",
    price: 750,
    type: "feature",
    value: "ai_examples",
    icon: "🤖",
  },
];

export const DAILY_REWARDS = [
  { day: 1, type: "coins", amount: 50, icon: "💰" },
  { day: 2, type: "coins", amount: 75, icon: "💰" },
  { day: 3, type: "xp", amount: 100, icon: "✨" },
  { day: 4, type: "coins", amount: 150, icon: "💰" },
  { day: 5, type: "streakFreeze", amount: 1, icon: "❄️" },
  { day: 6, type: "coins", amount: 250, icon: "💰" },
  { day: 7, type: "mysteryBox", amount: 1, icon: "🎁" },
];

export const MYSTERY_BOX_REWARDS = [
  { type: "coins", amount: 500, message: "💰 500 монет!" },
  { type: "xp", amount: 500, message: "✨ 500 XP!" },
  { type: "streakFreeze", amount: 2, message: "❄️ 2 заморозки серии!" },
];
