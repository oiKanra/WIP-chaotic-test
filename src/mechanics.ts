import { InventoryItem, Quest, Achievement } from './types';

// Время суток
export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

export interface GameState {
  timeOfDay: TimeOfDay;
  timeCounter: number; // 0-1000, цикл дня
  weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  inventory: InventoryItem[];
  quests: Quest[];
  achievements: Achievement[];
  isSleeping: boolean;
}

export const INITIAL_GAME_STATE: GameState = {
  timeOfDay: 'morning',
  timeCounter: 0,
  weather: 'sunny',
  inventory: [],
  quests: [
    {
      id: 'collect-cheese',
      title: 'Сырный запас',
      description: 'Принести 3 кусочка сыра на кухню',
      completed: false,
      progress: 0,
      target: 3,
    },
    {
      id: 'make-friends',
      title: 'Друзья навсегда',
      description: 'Познакомиться со всеми персонажами',
      completed: false,
      progress: 0,
      target: 5,
    },
  ],
  achievements: [
    {
      id: 'first-steps',
      title: 'Первые шаги',
      description: 'Посетить первую комнату',
      unlocked: false,
      icon: '👣',
    },
    {
      id: 'cheese-lover',
      title: 'Сырный гурман',
      description: 'Съесть 5 кусочков сыра',
      unlocked: false,
      icon: '🧀',
    },
    {
      id: 'explorer',
      title: 'Исследователь',
      description: 'Посетить все комнаты',
      unlocked: false,
      icon: '🗺️',
    },
  ],
  isSleeping: false,
};

export function updateTime(gameState: GameState): GameState {
  const newCounter = (gameState.timeCounter + 1) % 1000;
  
  let timeOfDay: TimeOfDay = gameState.timeOfDay;
  if (newCounter < 250) timeOfDay = 'morning';
  else if (newCounter < 500) timeOfDay = 'day';
  else if (newCounter < 750) timeOfDay = 'evening';
  else timeOfDay = 'night';

  // Случайная смена погоды (1% шанс)
  let weather = gameState.weather;
  if (Math.random() < 0.01) {
    const weathers: Array<'sunny' | 'cloudy' | 'rainy' | 'snowy'> = ['sunny', 'cloudy', 'rainy', 'snowy'];
    weather = weathers[Math.floor(Math.random() * weathers.length)];
  }

  return {
    ...gameState,
    timeCounter: newCounter,
    timeOfDay,
    weather,
  };
}

export function addToInventory(gameState: GameState, item: Omit<InventoryItem, 'count'>): GameState {
  const existingItem = gameState.inventory.find(i => i.id === item.id);
  
  if (existingItem) {
    return {
      ...gameState,
      inventory: gameState.inventory.map(i =>
        i.id === item.id ? { ...i, count: i.count + 1 } : i
      ),
    };
  }

  return {
    ...gameState,
    inventory: [...gameState.inventory, { ...item, count: 1 }],
  };
}

export function updateQuestProgress(gameState: GameState, questId: string, amount: number = 1): GameState {
  return {
    ...gameState,
    quests: gameState.quests.map(q => {
      if (q.id === questId && !q.completed) {
        const newProgress = Math.min(q.progress + amount, q.target);
        return {
          ...q,
          progress: newProgress,
          completed: newProgress >= q.target,
        };
      }
      return q;
    }),
  };
}

export function unlockAchievement(gameState: GameState, achievementId: string): GameState {
  return {
    ...gameState,
    achievements: gameState.achievements.map(a =>
      a.id === achievementId ? { ...a, unlocked: true } : a
    ),
  };
}

export function getTimeEmoji(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case 'morning': return '🌅';
    case 'day': return '☀️';
    case 'evening': return '🌆';
    case 'night': return '🌙';
  }
}

export function getWeatherEmoji(weather: string): string {
  switch (weather) {
    case 'sunny': return '☀️';
    case 'cloudy': return '☁️';
    case 'rainy': return '🌧️';
    case 'snowy': return '🌨️';
    default: return '☀️';
  }
}

export function getSkyColor(timeOfDay: TimeOfDay, weather: string): string {
  if (weather === 'rainy' || weather === 'snowy') {
    return 'linear-gradient(180deg, #6B7280 0%, #9CA3AF 100%)';
  }
  if (weather === 'cloudy') {
    return 'linear-gradient(180deg, #94A3B8 0%, #CBD5E1 100%)';
  }
  
  switch (timeOfDay) {
    case 'morning': return 'linear-gradient(180deg, #FDB813 0%, #87CEEB 100%)';
    case 'day': return 'linear-gradient(180deg, #87CEEB 0%, #98D8E8 100%)';
    case 'evening': return 'linear-gradient(180deg, #FF6B6B 0%, #4ECDC4 100%)';
    case 'night': return 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)';
  }
}
