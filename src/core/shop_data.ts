import { ShopItem } from "../types/index.ts";

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "item_streak_freeze",
    name: "Заморозка серии",
    description: "Защищает серию при пропуске дня. Максимум 2 в инвентаре.",
    price: 200,
    type: "feature",
    value: "streak_freeze",
    icon: "❄️",
  },
  {
    id: "item_survival_heal",
    name: "Аптечка",
    description: "Восстанавливает 1 жизнь в режиме Выживания.",
    price: 150,
    type: "feature",
    value: "survival_heal",
    icon: "❤️",
  },
  {
    id: "theme_blue",
    name: "Тема: Океан",
    description: "Спокойный синий дизайн.",
    price: 150,
    type: "theme",
    value: "blue",
    icon: "🌊",
  },
  {
    id: "theme_green",
    name: "Тема: Лес",
    description: "Натуральный зеленый дизайн.",
    price: 150,
    type: "theme",
    value: "green",
    icon: "🌳",
  },
  {
    id: "theme_orange",
    name: "Тема: Закат",
    description: "Теплый оранжевый дизайн.",
    price: 200,
    type: "theme",
    value: "orange",
    icon: "🌅",
  },
  {
    id: "theme_pink",
    name: "Тема: Сакура",
    description: "Нежный розовый дизайн.",
    price: 200,
    type: "theme",
    value: "pink",
    icon: "🌸",
  },
];

export const RARE_THEMES: ShopItem[] = [
  {
    id: "theme_ruby",
    name: "Тема: Рубин",
    description: "Роскошный красный дизайн. Редкая награда.",
    price: 0, // Not for sale
    type: "theme",
    value: "ruby",
    icon: "💎",
  },
  {
    id: "theme_amethyst",
    name: "Тема: Аметист",
    description: "Королевский фиолетовый. Редкая награда.",
    price: 0, // Not for sale
    type: "theme",
    value: "amethyst",
    icon: "🔮",
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
  { type: "rare_theme", amount: 1, message: "🎨 Редкая тема!" },
];
