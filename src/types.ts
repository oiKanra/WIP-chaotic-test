export type RoomId = 'living' | 'kitchen' | 'corridor' | 'cheese-storage' | 'yard' | 'bedroom' | 'garden' | 'library';

export interface Door {
  id: string;
  side: 'left' | 'right';
  targetRoom: RoomId;
  label: string;
  position?: number;
}

export interface ClickableObject {
  id: string;
  a: number;
  b: number;
  label: string;
  action: string;
}

export interface Obstacle {
  a1: number;
  b1: number;
  a2: number;
  b2: number;
}

export interface Character {
  id: string;
  emoji: string;
  name: string;
  room: RoomId;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  isMoving: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  emoji: string;
  count: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  progress: number;
  target: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: string;
}
