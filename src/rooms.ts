import { RoomId, Door, ClickableObject, Obstacle } from './types';

export const ROOMS: Record<RoomId, { name: string; doors: Door[]; objects: ClickableObject[] }> = {
  living: {
    name: 'Гостиная',
    doors: [
      { id: 'door-left', side: 'left', targetRoom: 'kitchen', label: '→ Кухня', position: 0.8 },
      { id: 'door-right', side: 'right', targetRoom: 'corridor', label: '→ Коридор', position: 0.5 },
    ],
    objects: [
      { id: 'window', a: 0.32, b: 0.08, label: '🪟 Окно', action: 'Смотреть в окно' },
      { id: 'cabinets', a: 0.2, b: 0.5, label: '🗄️ Шкафчики', action: 'Открыть шкафчик' },
      { id: 'table', a: 0.5, b: 0.55, label: '🪑 Стол', action: 'Осмотреть стол' },
      { id: 'laptop', a: 0.35, b: 0.45, label: '💻 Ноутбук', action: 'Включить ноутбук' },
    ],
  },
  kitchen: {
    name: 'Кухня',
    doors: [
      { id: 'door-left', side: 'left', targetRoom: 'living', label: '→ Гостиная', position: 0.3 },
      { id: 'door-right', side: 'right', targetRoom: 'corridor', label: '→ Коридор', position: 0.8 },
    ],
    objects: [
      { id: 'kitchen-table', a: 0.55, b: 0.65, label: '🧀 Кухонный стол', action: 'Поесть сыр' },
      { id: 'stove', a: 0.75, b: 0.35, label: '🔥 Плита', action: 'Посмотреть на плиту' },
      { id: 'fridge', a: 0.12, b: 0.35, label: '🧊 Холодильник', action: 'Открыть холодильник' },
    ],
  },
  corridor: {
    name: 'Коридор',
    doors: [
      { id: 'door-1', side: 'left', targetRoom: 'living', label: '→ Гостиная', position: 0.1 },
      { id: 'door-2', side: 'right', targetRoom: 'kitchen', label: '→ Кухня', position: 0.1 },
      { id: 'door-3', side: 'left', targetRoom: 'cheese-storage', label: '→ Склад сыра 🧀', position: 0.85 },
      { id: 'door-yard', side: 'right', targetRoom: 'yard', label: '→ Во двор 🎉', position: 0.5 },
      { id: 'door-bedroom', side: 'left', targetRoom: 'bedroom', label: '→ Спальня 🛏️', position: 0.4 },
      { id: 'door-library', side: 'right', targetRoom: 'library', label: '→ Библиотека 📚', position: 0.85 },
    ],
    objects: [
      { id: 'plant-1', a: 0.2, b: 0.5, label: '🌿 Растение', action: 'Посмотреть на растение' },
      { id: 'painting', a: 0.5, b: 0.3, label: '🖼️ Картина', action: 'Рассмотреть картину' },
      { id: 'lamp', a: 0.8, b: 0.5, label: '💡 Лампа', action: 'Включить свет' },
      { id: 'cat', a: 0.5, b: 0.7, label: '🐱 Котик Барсик', action: 'Погладить котика' },
    ],
  },
  'cheese-storage': {
    name: 'Склад сыра 🧀',
    doors: [
      { id: 'door-storage', side: 'left', targetRoom: 'corridor', label: '→ Коридор', position: 0.15 },
      { id: 'door-secret', side: 'right', targetRoom: 'kitchen', label: '→ Секретный ход', position: 0.85 },
    ],
    objects: [
      { id: 'cheese-mountain', a: 0.5, b: 0.5, label: '🧀 Гора сыра', action: 'Нырнуть в гору сыра!' },
      { id: 'cheese-wheel', a: 0.25, b: 0.35, label: '🧀 Сырное колесо', action: 'Покатить колесо сыра' },
      { id: 'cheese-shelf', a: 0.75, b: 0.35, label: '📦 Полка с сыром', action: 'Выбрать лучший сыр' },
      { id: 'cheese-fountain', a: 0.5, b: 0.75, label: '⛲ Сырный фонтан', action: 'Искупаться в сыре' },
    ],
  },
  yard: {
    name: 'Двор 🎉',
    doors: [
      { id: 'door-yard', side: 'right', targetRoom: 'corridor', label: '→ В дом', position: 0.3 },
      { id: 'door-garden', side: 'left', targetRoom: 'garden', label: '→ Сад 🌳', position: 0.85 },
    ],
    objects: [
      { id: 'birthday-cake', a: 0.5, b: 0.4, label: '🎂 Торт', action: 'Задувать свечи!' },
      { id: 'gifts', a: 0.3, b: 0.6, label: '🎁 Подарки', action: 'Открыть подарок' },
      { id: 'balloons', a: 0.7, b: 0.3, label: '🎈 Шарики', action: 'Полопать шарики' },
      { id: 'friends', a: 0.5, b: 0.7, label: '🐭 Друзья', action: 'Праздновать вместе!' },
    ],
  },
  bedroom: {
    name: 'Спальня 🛏️',
    doors: [
      { id: 'door-bedroom', side: 'left', targetRoom: 'corridor', label: '→ Коридор', position: 0.5 },
    ],
    objects: [
      { id: 'bed', a: 0.5, b: 0.5, label: '🛏️ Кровать', action: 'Поспать 💤' },
      { id: 'alarm', a: 0.2, b: 0.3, label: '⏰ Будильник', action: 'Посмотреть время' },
      { id: 'wardrobe', a: 0.8, b: 0.3, label: '👔 Шкаф', action: 'Выбрать одежду' },
    ],
  },
  garden: {
    name: 'Сад 🌳',
    doors: [
      { id: 'door-garden', side: 'right', targetRoom: 'yard', label: '→ Во двор', position: 0.5 },
    ],
    objects: [
      { id: 'pond', a: 0.5, b: 0.5, label: '🌊 Пруд', action: 'Посмотреть на рыбок' },
      { id: 'tree', a: 0.2, b: 0.3, label: '🌳 Дерево', action: 'Залезть на дерево' },
      { id: 'carrots', a: 0.8, b: 0.7, label: '🥕 Грядки', action: 'Собрать морковку' },
    ],
  },
  library: {
    name: 'Библиотека 📚',
    doors: [
      { id: 'door-library', side: 'right', targetRoom: 'corridor', label: '→ Коридор', position: 0.5 },
    ],
    objects: [
      { id: 'books', a: 0.3, b: 0.4, label: '📚 Книги', action: 'Почитать книгу' },
      { id: 'globe', a: 0.7, b: 0.3, label: '🌍 Глобус', action: 'Покрутить глобус' },
      { id: 'ladder', a: 0.5, b: 0.7, label: '🪜 Лестница', action: 'Залезть на лестницу' },
    ],
  },
};

export const OBSTACLES: Record<RoomId, Obstacle[]> = {
  living: [
    { a1: 0.05, b1: 0.45, a2: 0.41, b2: 0.57 },
    { a1: 0.38, b1: 0.42, a2: 0.63, b2: 0.60 },
  ],
  kitchen: [
    { a1: 0.45, b1: 0.55, a2: 0.65, b2: 0.70 },
    { a1: 0.70, b1: 0.25, a2: 0.85, b2: 0.43 },
    { a1: 0.05, b1: 0.25, a2: 0.18, b2: 0.40 },
  ],
  corridor: [
    { a1: 0.15, b1: 0.45, a2: 0.25, b2: 0.55 },
    { a1: 0.75, b1: 0.45, a2: 0.85, b2: 0.55 },
    { a1: 0.45, b1: 0.65, a2: 0.55, b2: 0.75 },
  ],
  'cheese-storage': [
    { a1: 0.4, b1: 0.4, a2: 0.6, b2: 0.6 },
    { a1: 0.15, b1: 0.25, a2: 0.35, b2: 0.45 },
    { a1: 0.65, b1: 0.25, a2: 0.85, b2: 0.45 },
    { a1: 0.4, b1: 0.65, a2: 0.6, b2: 0.85 },
  ],
  yard: [
    { a1: 0.4, b1: 0.3, a2: 0.6, b2: 0.5 },
    { a1: 0.2, b1: 0.5, a2: 0.4, b2: 0.7 },
    { a1: 0.4, b1: 0.6, a2: 0.6, b2: 0.8 },
  ],
  bedroom: [
    { a1: 0.4, b1: 0.4, a2: 0.6, b2: 0.6 },
    { a1: 0.15, b1: 0.25, a2: 0.25, b2: 0.35 },
    { a1: 0.75, b1: 0.25, a2: 0.85, b2: 0.35 },
  ],
  garden: [
    { a1: 0.4, b1: 0.4, a2: 0.6, b2: 0.6 },
    { a1: 0.15, b1: 0.25, a2: 0.25, b2: 0.35 },
    { a1: 0.75, b1: 0.65, a2: 0.85, b2: 0.75 },
  ],
  library: [
    { a1: 0.2, b1: 0.35, a2: 0.4, b2: 0.45 },
    { a1: 0.65, b1: 0.25, a2: 0.75, b2: 0.35 },
    { a1: 0.45, b1: 0.65, a2: 0.55, b2: 0.75 },
  ],
};
