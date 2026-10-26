import { Character, RoomId } from './types';

export const INITIAL_CHARACTERS: Character[] = [
  // Котик Барсик в коридоре
  {
    id: 'cat-barsik',
    emoji: '🐱',
    name: 'Барсик',
    room: 'corridor',
    x: 0.5,
    y: 0.7,
    targetX: 0.5,
    targetY: 0.7,
    speed: 0.002,
    isMoving: false,
  },
  // Щенок Бобик во дворе
  {
    id: 'dog-bobik',
    emoji: '🐶',
    name: 'Бобик',
    room: 'yard',
    x: 0.7,
    y: 0.6,
    targetX: 0.7,
    targetY: 0.6,
    speed: 0.003,
    isMoving: false,
  },
  // Воробей Чик в саду
  {
    id: 'bird-chik',
    emoji: '🐦',
    name: 'Чик',
    room: 'garden',
    x: 0.3,
    y: 0.4,
    targetX: 0.3,
    targetY: 0.4,
    speed: 0.004,
    isMoving: false,
  },
  // Лягушка Кваква в саду
  {
    id: 'frog-kvakva',
    emoji: '🐸',
    name: 'Кваква',
    room: 'garden',
    x: 0.5,
    y: 0.5,
    targetX: 0.5,
    targetY: 0.5,
    speed: 0.001,
    isMoving: false,
  },
  // Ёжик Пых в библиотеке
  {
    id: 'hedgehog-pyh',
    emoji: '🦔',
    name: 'Пых',
    room: 'library',
    x: 0.6,
    y: 0.6,
    targetX: 0.6,
    targetY: 0.6,
    speed: 0.001,
    isMoving: false,
  },
  // Пчёлка Жужа в саду
  {
    id: 'bee-zhuzha',
    emoji: '🐝',
    name: 'Жужа',
    room: 'garden',
    x: 0.7,
    y: 0.3,
    targetX: 0.7,
    targetY: 0.3,
    speed: 0.005,
    isMoving: false,
  },
];

export function updateCharacterMovement(character: Character): Character {
  if (!character.isMoving) {
    // Случайно решить начать движение (5% шанс)
    if (Math.random() < 0.05) {
      // Выбрать случайную цель в пределах комнаты (0.1 - 0.9)
      const newTargetX = 0.1 + Math.random() * 0.8;
      const newTargetY = 0.1 + Math.random() * 0.8;
      return {
        ...character,
        targetX: newTargetX,
        targetY: newTargetY,
        isMoving: true,
      };
    }
    return character;
  }

  // Двигаться к цели
  const dx = character.targetX - character.x;
  const dy = character.targetY - character.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 0.01) {
    // Достигли цели
    return {
      ...character,
      x: character.targetX,
      y: character.targetY,
      isMoving: false,
    };
  }

  // Нормализовать направление и двигаться
  const moveX = (dx / distance) * character.speed;
  const moveY = (dy / distance) * character.speed;

  return {
    ...character,
    x: character.x + moveX,
    y: character.y + moveY,
  };
}

export function getCharactersInRoom(characters: Character[], room: RoomId): Character[] {
  return characters.filter(c => c.room === room);
}
