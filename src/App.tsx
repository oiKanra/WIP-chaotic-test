import { useState, useRef, useCallback, useEffect } from 'react';

/*
  Point-and-click управление с pathfinding и вращением камеры
  
  Мышь бежит к объекту по клику, огибая препятствия.
  Камера вращается через drag (Shift+клик) или кнопки.
*/

type RoomId = 'living' | 'kitchen' | 'corridor' | 'cheese-storage';

/* ── Изометрические хелперы с учётом поворота ── */
function iso(a: number, b: number, h = 0, rotation = 0): [number, number] {
  const cx = a - 0.5;
  const cy = b - 0.5;
  
  const angle = (rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  const rx = cx * cos - cy * sin;
  const ry = cx * sin + cy * cos;
  
  const screenX = 400 + 250 * (rx + ry);
  const screenY = 345 + 125 * (ry - rx) - h;
  
  return [screenX, screenY];
}

/* Обратное преобразование: экранные координаты → iso (a, b) */
function screenToIso(sx: number, sy: number, rotation = 0): { a: number; b: number } {
  // Сначала получаем rx, ry из экранных координат
  const rxPlusRy = (sx - 400) / 250;
  const ryMinusRx = (sy - 345) / 125;
  
  const rx = (rxPlusRy - ryMinusRx) / 2;
  const ry = (rxPlusRy + ryMinusRx) / 2;
  
  // Обратное вращение
  const angle = (-rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  const cx = rx * cos - ry * sin;
  const cy = rx * sin + ry * cos;
  
  return { a: cx + 0.5, b: cy + 0.5 };
}

function isoPoly(points: [number, number][]): string {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

function isoBox(
  a: number, b: number, w: number, d: number, h: number,
  colors: { top: string; left: string; right: string; bottom?: string; backLeft?: string; backRight?: string },
  rotation = 0
) {
  const p = (da: number, db: number, dh: number) => iso(a + da, b + db, dh, rotation);
  
  // Все 6 граней куба
  const faces = [
    { // Верхняя грань (z = h)
      points: isoPoly([p(0, 0, h), p(w, 0, h), p(w, d, h), p(0, d, h)]),
      color: colors.top,
      depth: h
    },
    { // Нижняя грань (z = 0)
      points: isoPoly([p(0, 0, 0), p(w, 0, 0), p(w, d, 0), p(0, d, 0)]),
      color: colors.bottom || darken(colors.top, 0.3),
      depth: 0
    },
    { // Передняя левая грань (a = 0)
      points: isoPoly([p(0, 0, h), p(0, d, h), p(0, d, 0), p(0, 0, 0)]),
      color: colors.left,
      depth: (iso(a, b + d/2, h/2, rotation)[0] + iso(a, b + d/2, h/2, rotation)[1]) / 2
    },
    { // Передняя правая грань (b = 0)
      points: isoPoly([p(0, 0, h), p(w, 0, h), p(w, 0, 0), p(0, 0, 0)]),
      color: colors.right,
      depth: (iso(a + w/2, b, h/2, rotation)[0] + iso(a + w/2, b, h/2, rotation)[1]) / 2
    },
    { // Задняя левая грань (a = w)
      points: isoPoly([p(w, 0, h), p(w, d, h), p(w, d, 0), p(w, 0, 0)]),
      color: colors.backLeft || darken(colors.left, 0.15),
      depth: (iso(a + w, b + d/2, h/2, rotation)[0] + iso(a + w, b + d/2, h/2, rotation)[1]) / 2
    },
    { // Задняя правая грань (b = d)
      points: isoPoly([p(0, d, h), p(w, d, h), p(w, d, 0), p(0, d, 0)]),
      color: colors.backRight || darken(colors.right, 0.15),
      depth: (iso(a + w/2, b + d, h/2, rotation)[0] + iso(a + w/2, b + d, h/2, rotation)[1]) / 2
    },
  ];
  
  // Сортируем по глубине (painter's algorithm) — дальние рисуем первыми
  faces.sort((a, b) => a.depth - b.depth);
  
  return (
    <g>
      {faces.map((face, i) => (
        <polygon key={i} points={face.points} fill={face.color} stroke={face.color} strokeWidth="0.5" />
      ))}
    </g>
  );
}

// Вспомогательная функция для затемнения цвета
function darken(color: string, amount: number): string {
  let hex = color.replace('#', '');
  // Обработка коротких hex (#abc → #aabbcc)
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  // Если не hex — возвращаем как есть
  if (hex.length !== 6 || !/^[0-9a-fA-F]+$/.test(hex)) {
    return color;
  }
  const r = Math.max(0, parseInt(hex.substring(0, 2), 16) * (1 - amount));
  const g = Math.max(0, parseInt(hex.substring(2, 4), 16) * (1 - amount));
  const b = Math.max(0, parseInt(hex.substring(4, 6), 16) * (1 - amount));
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/* ── Конфигурация комнат ── */
interface Door { id: string; side: 'left' | 'right'; targetRoom: RoomId; label: string; position?: number }
interface ClickableObject { id: string; a: number; b: number; label: string; action: string }

const ROOMS: Record<RoomId, { name: string; doors: Door[]; objects: ClickableObject[] }> = {
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
      { id: 'door-4', side: 'right', targetRoom: 'kitchen', label: '→ Ванная (скоро)', position: 0.85 },
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
};

interface Obstacle { a1: number; b1: number; a2: number; b2: number }

const OBSTACLES: Record<RoomId, Obstacle[]> = {
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
    { a1: 0.15, b1: 0.45, a2: 0.25, b2: 0.55 }, // Растение
    { a1: 0.75, b1: 0.45, a2: 0.85, b2: 0.55 }, // Лампа
    { a1: 0.45, b1: 0.65, a2: 0.55, b2: 0.75 }, // Котик
  ],
  'cheese-storage': [
    { a1: 0.4, b1: 0.4, a2: 0.6, b2: 0.6 }, // Гора сыра
    { a1: 0.15, b1: 0.25, a2: 0.35, b2: 0.45 }, // Сырное колесо
    { a1: 0.65, b1: 0.25, a2: 0.85, b2: 0.45 }, // Полка с сыром
    { a1: 0.4, b1: 0.65, a2: 0.6, b2: 0.85 }, // Сырный фонтан
  ],
};

/* ── A* Pathfinding ── */
type GridPos = { a: number; b: number };

function heuristic(a: GridPos, b: GridPos): number {
  return Math.abs(a.a - b.a) + Math.abs(a.b - b.b);
}

function isBlocked(pos: GridPos, obstacles: Obstacle[]): boolean {
  for (const obs of obstacles) {
    if (pos.a >= obs.a1 && pos.a <= obs.a2 && pos.b >= obs.b1 && pos.b <= obs.b2) {
      return true;
    }
  }
  return false;
}

function findPath(start: GridPos, end: GridPos, obstacles: Obstacle[]): GridPos[] {
  const GRID_SIZE = 0.05;
  const openSet: GridPos[] = [start];
  const cameFrom = new Map<string, GridPos>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  const key = (p: GridPos) => `${p.a.toFixed(3)},${p.b.toFixed(3)}`;
  
  gScore.set(key(start), 0);
  fScore.set(key(start), heuristic(start, end));

  const getNeighbors = (pos: GridPos): GridPos[] => {
    const neighbors: GridPos[] = [];
    const directions = [
      { a: GRID_SIZE, b: 0 }, { a: -GRID_SIZE, b: 0 },
      { a: 0, b: GRID_SIZE }, { a: 0, b: -GRID_SIZE },
      { a: GRID_SIZE, b: GRID_SIZE }, { a: -GRID_SIZE, b: -GRID_SIZE },
      { a: GRID_SIZE, b: -GRID_SIZE }, { a: -GRID_SIZE, b: GRID_SIZE },
    ];
    
    for (const dir of directions) {
      const next = { a: pos.a + dir.a, b: pos.b + dir.b };
      if (next.a >= 0 && next.a <= 1 && next.b >= 0 && next.b <= 1 && !isBlocked(next, obstacles)) {
        neighbors.push(next);
      }
    }
    return neighbors;
  };

  while (openSet.length > 0) {
    openSet.sort((a, b) => (fScore.get(key(a)) || Infinity) - (fScore.get(key(b)) || Infinity));
    const current = openSet.shift()!;
    
    if (Math.abs(current.a - end.a) < GRID_SIZE && Math.abs(current.b - end.b) < GRID_SIZE) {
      const path: GridPos[] = [current];
      let curr = current;
      while (cameFrom.has(key(curr))) {
        curr = cameFrom.get(key(curr))!;
        path.unshift(curr);
      }
      return path;
    }

    for (const neighbor of getNeighbors(current)) {
      const tentativeG = (gScore.get(key(current)) || Infinity) + heuristic(current, neighbor);
      if (tentativeG < (gScore.get(key(neighbor)) || Infinity)) {
        cameFrom.set(key(neighbor), current);
        gScore.set(key(neighbor), tentativeG);
        fScore.set(key(neighbor), tentativeG + heuristic(neighbor, end));
        if (!openSet.some(n => key(n) === key(neighbor))) {
          openSet.push(neighbor);
        }
      }
    }
  }

  return [start, end];
}

function App() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentRoom, setCurrentRoom] = useState<RoomId>('living');
  const [mousePos, setMousePos] = useState<GridPos>({ a: 0.5, b: 0.8 });
  const [targetPos, setTargetPos] = useState<GridPos | null>(null);
  const [path, setPath] = useState<GridPos[]>([]);
  const [pathIndex, setPathIndex] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [mood, setMood] = useState(50);
  const [cheeseLeft, setCheeseLeft] = useState(5);
  const [carryingCheese, setCarryingCheese] = useState(0);
  const [activeObject, setActiveObject] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [hoveredObject, setHoveredObject] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  // Камера
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; rotation: number } | null>(null);

  const animationRef = useRef<number>();
  const moodRef = useRef(50);

  // Обработчики вращения камеры
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) { // Средняя кнопка (колёсико)
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, rotation };
    }
  };

  const handleCameraMove = (e: React.MouseEvent) => {
    if (isDragging && dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      setRotation(dragStartRef.current.rotation + dx * 0.5);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const rotateCamera = (delta: number) => {
    setRotation(prev => prev + delta);
  };

  /* Анимация движения мыши по пути */
  useEffect(() => {
    if (!isMoving || path.length === 0 || pathIndex >= path.length) {
      setIsMoving(false);
      return;
    }

    const target = path[pathIndex];
    const speed = 0.008;

    const animate = () => {
      setMousePos(prev => {
        const da = target.a - prev.a;
        const db = target.b - prev.b;
        const dist = Math.sqrt(da * da + db * db);

        if (dist < speed) {
          setPathIndex(i => i + 1);
          return target;
        }

        return {
          a: prev.a + (da / dist) * speed,
          b: prev.b + (db / dist) * speed,
        };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isMoving, path, pathIndex]);

  /* Логика настроения */
  useEffect(() => {
    const interval = setInterval(() => {
      const objects = ROOMS[currentRoom].objects;
      let zone: string | null = null;
      let totalRate = 0;

      // На складе сыра мышь всегда счастлива!
      const isCheeseStorage = currentRoom === 'cheese-storage';
      if (isCheeseStorage) {
        totalRate += 0.5; // Базовое счастье от окружения
      }

      for (const obj of objects) {
        const dist = Math.sqrt((mousePos.a - obj.a) ** 2 + (mousePos.b - obj.b) ** 2);
        if (dist < 0.15) {
          let rate = isCheeseStorage ? 0.6 : 0.3; // На складе сыра радость сильнее
          // Котик тоже радует мышь
          if (obj.id === 'cat') {
            rate = 0.5;
          }
          totalRate += rate * (1 - dist / 0.15);
          zone = obj.id;
        }
      }

      const isEating = zone === 'kitchen-table' && cheeseLeft > 0;
      const effectiveRate = isEating ? totalRate * 1.8 : totalRate;

      let newMood = moodRef.current;
      newMood = effectiveRate > 0
        ? Math.min(100, newMood + effectiveRate)
        : Math.max(0, newMood - 0.08);

      moodRef.current = newMood;
      setMood(newMood);
      setActiveObject(zone);
    }, 100);
    return () => clearInterval(interval);
  }, [mousePos, cheeseLeft, currentRoom]);

  /* Клик на объект */
  const handleObjectClick = useCallback((obj: ClickableObject) => {
    if (transitioning || isMoving) return;

    // Для объектов на складе сыра показываем диалог выбора действия
    if (currentRoom === 'cheese-storage' && ['cheese-mountain', 'cheese-wheel', 'cheese-shelf', 'cheese-fountain'].includes(obj.id)) {
      setTargetPos({ a: obj.a, b: obj.b });
      const newPath = findPath(mousePos, { a: obj.a, b: obj.b }, OBSTACLES[currentRoom]);
      setPath(newPath);
      setPathIndex(0);
      setIsMoving(true);
      
      setTimeout(() => {
        setMessage(`Выберите действие: [1] Поесть 🧀 или [2] Забрать на кухню 📦`);
        // Устанавливаем обработчик клавиш для выбора
        const handleKeyPress = (e: KeyboardEvent) => {
          if (e.key === '1') {
            // Поесть
            moodRef.current = Math.min(100, moodRef.current + 10);
            setMood(moodRef.current);
            setMessage('Ням-ням! Вкусный сыр! 🧀😋');
            setTimeout(() => setMessage(null), 2000);
            window.removeEventListener('keydown', handleKeyPress);
          } else if (e.key === '2') {
            // Забрать на кухню
            setCarryingCheese(p => p + 1);
            setMessage('Сыр забран! Несу на кухню 📦🧀');
            setTimeout(() => setMessage(null), 2000);
            window.removeEventListener('keydown', handleKeyPress);
          }
        };
        window.addEventListener('keydown', handleKeyPress);
      }, newPath.length * 150);
      return;
    }

    const newPath = findPath(mousePos, { a: obj.a, b: obj.b }, OBSTACLES[currentRoom]);
    setPath(newPath);
    setPathIndex(0);
    setIsMoving(true);
    setTargetPos({ a: obj.a, b: obj.b });

    setTimeout(() => {
      setMessage(obj.action);
      setTimeout(() => setMessage(null), 2000);

      if (obj.id === 'kitchen-table') {
        if (carryingCheese > 0) {
          // Положить сыр на кухню
          setCheeseLeft(p => p + carryingCheese);
          setCarryingCheese(0);
          setMessage(`Сыр положен на кухню! Теперь тут ${cheeseLeft + carryingCheese} кусочков 🧀`);
          setTimeout(() => setMessage(null), 2000);
        } else if (cheeseLeft > 0) {
          // Поесть сыр
          setCheeseLeft(p => p - 1);
          moodRef.current = Math.min(100, moodRef.current + 8);
          setMood(moodRef.current);
        }
      }
      
      // Котик повышает настроение
      if (obj.id === 'cat') {
        moodRef.current = Math.min(100, moodRef.current + 12);
        setMood(moodRef.current);
        setMessage('Мур-мур! Барсик доволен! 🐱💕');
        setTimeout(() => setMessage(null), 2000);
      }
    }, newPath.length * 150);
  }, [mousePos, currentRoom, transitioning, isMoving, cheeseLeft]);

  /* Клик на дверь */
  const handleDoorClick = useCallback((door: Door) => {
    if (transitioning || isMoving) return;

    const pos = door.position || 0.5;
    const doorPos = door.side === 'left' ? { a: pos, b: 0.05 } : { a: 0.95, b: pos };
    const newPath = findPath(mousePos, doorPos, OBSTACLES[currentRoom]);
    setPath(newPath);
    setPathIndex(0);
    setIsMoving(true);

    setTimeout(() => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentRoom(door.targetRoom);
        setMousePos({ a: 0.5, b: 0.8 });
        setPath([]);
        setPathIndex(0);
        setIsMoving(false);
        setTimeout(() => setTransitioning(false), 300);
      }, 300);
    }, newPath.length * 150);
  }, [mousePos, currentRoom, transitioning, isMoving]);

  /* Клик на пол — мышь бежит в любую точку */
  const handleFloorClick = useCallback((e: React.MouseEvent<SVGPolygonElement>) => {
    if (transitioning || isMoving || isDragging) return;
    e.stopPropagation();

    // Получаем координаты клика относительно SVG
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    
    // Масштабируем координаты клика к viewBox
    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;

    // Конвертируем в iso-координаты
    const target = screenToIso(svgX, svgY, rotation);
    
    // Ограничиваем пределами комнаты
    const clampedA = Math.max(0.05, Math.min(0.95, target.a));
    const clampedB = Math.max(0.05, Math.min(0.95, target.b));
    
    // Проверяем что не попали в препятствие
    const testPos = { a: clampedA, b: clampedB };
    if (isBlocked(testPos, OBSTACLES[currentRoom])) return;

    const newPath = findPath(mousePos, { a: clampedA, b: clampedB }, OBSTACLES[currentRoom]);
    setPath(newPath);
    setPathIndex(0);
    setIsMoving(true);
    setTargetPos({ a: clampedA, b: clampedB });
  }, [mousePos, currentRoom, transitioning, isMoving, isDragging, rotation]);

  const [sx, sy] = iso(mousePos.a, mousePos.b, 0, rotation);
  const moodEmoji = mood > 80 ? '😍' : mood > 60 ? '😊' : mood > 40 ? '🐁' : mood > 20 ? '😐' : '😢';
  const moodLabel = mood > 80 ? 'Счастлива!' : mood > 60 ? 'Довольна' : mood > 40 ? 'Нормально' : mood > 20 ? 'Скучно...' : 'Грустно...';
  const mouseEmoji = currentRoom === 'cheese-storage' 
    ? '🐁🧀' 
    : activeObject === 'kitchen-table' && cheeseLeft > 0 
      ? '🐁✨' 
      : mood > 80 
        ? '🐁💕' 
        : '🐁';
  const roomConfig = ROOMS[currentRoom];

  return (
    <div className="w-full h-screen overflow-hidden flex items-center justify-center" style={{
      background: 'linear-gradient(180deg, #87CEEB 0%, #98D8E8 100%)',
    }}>
      {/* HUD */}
      <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-gray-200">
          <span className="text-sm font-semibold text-gray-700">🏠 {roomConfig.name}</span>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-lg">{moodEmoji}</span>
            <span className="text-xs font-medium text-gray-600">{moodLabel}</span>
          </div>
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ${mood > 60 ? 'bg-green-400' : mood > 30 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${mood}%` }} />
          </div>
          <div className="text-[10px] text-gray-400 mt-1 text-right">{Math.round(mood)}%</div>
        </div>
        {currentRoom === 'kitchen' && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow border border-gray-200">
            <span className="text-xs text-gray-500">🧀 Сыр на кухне: {cheeseLeft > 0 ? '🧀'.repeat(cheeseLeft) : 'пусто 😢'}</span>
          </div>
        )}
        {carryingCheese > 0 && (
          <div className="bg-yellow-50/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow border border-yellow-300">
            <span className="text-xs text-yellow-700">📦 Несу сыр: {'🧀'.repeat(carryingCheese)}</span>
          </div>
        )}
      </div>

      {message && (
        <div className="absolute top-4 right-4 z-50 bg-blue-50 border border-blue-300 rounded-lg px-4 py-2 shadow pointer-events-none animate-fade-in">
          <span className="text-sm text-blue-800">{message}</span>
        </div>
      )}

      {/* Кнопки поворота камеры */}
      <div className="absolute bottom-20 right-4 z-50 flex flex-col gap-2">
        <button
          onClick={() => rotateCamera(-45)}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center text-lg"
          title="Повернуть влево"
        >
          ↺
        </button>
        <button
          onClick={() => rotateCamera(45)}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center text-lg"
          title="Повернуть вправо"
        >
          ↻
        </button>
        <button
          onClick={() => setRotation(0)}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center text-xs font-bold"
          title="Сбросить поворот"
        >
          ⟳
        </button>
      </div>

      {/* SVG сцена */}
      <svg
        ref={svgRef}
        viewBox="0 0 800 600"
        className={`w-full h-full max-w-4xl max-h-[700px] transition-opacity duration-300 ${transitioning ? 'opacity-0' : 'opacity-100'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleCameraMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onAuxClick={(e) => { if (e.button === 1) e.preventDefault(); }}
        style={{ cursor: isDragging ? 'grabbing' : 'default' }}
      >
        {/* Паттерн травы */}
        <defs>
          <pattern id="grass" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="#7CB342" />
            <path d="M2,20 Q3,15 2,10" stroke="#558B2F" strokeWidth="1" fill="none" />
            <path d="M7,20 Q8,14 7,8" stroke="#689F38" strokeWidth="1" fill="none" />
            <path d="M12,20 Q13,16 12,11" stroke="#558B2F" strokeWidth="1" fill="none" />
            <path d="M17,20 Q18,13 17,7" stroke="#689F38" strokeWidth="1" fill="none" />
            <circle cx="5" cy="12" r="0.5" fill="#9CCC65" />
            <circle cx="15" cy="8" r="0.5" fill="#AED581" />
          </pattern>
        </defs>
        
        {/* Фон с травой */}
        <rect width="800" height="600" fill="url(#grass)" />
        {/* Пол */}
        <polygon 
          points={isoPoly([iso(0, 0, 0, rotation), iso(1, 0, 0, rotation), iso(1, 1, 0, rotation), iso(0, 1, 0, rotation)])} 
          fill={currentRoom === 'living' ? '#e8e2d8' : currentRoom === 'kitchen' ? '#ddd5c5' : currentRoom === 'corridor' ? '#bcaaa4' : '#FFE0B2'} 
          stroke="#c8c0b0" 
          strokeWidth="0.5"
          onClick={handleFloorClick}
          style={{ cursor: 'pointer' }}
        />
        {Array.from({ length: 10 }).map((_, i) => {
          const t = i / 10;
          return (
            <g key={`grid-${i}`} opacity="0.12">
              <line x1={iso(t, 0, 0, rotation)[0]} y1={iso(t, 0, 0, rotation)[1]} x2={iso(t, 1, 0, rotation)[0]} y2={iso(t, 1, 0, rotation)[1]} stroke="#a09080" strokeWidth="0.5" />
              <line x1={iso(0, t, 0, rotation)[0]} y1={iso(0, t, 0, rotation)[1]} x2={iso(1, t, 0, rotation)[0]} y2={iso(1, t, 0, rotation)[1]} stroke="#a09080" strokeWidth="0.5" />
            </g>
          );
        })}

        {/* Стены */}
        <polygon points={isoPoly([iso(0, 0, 0, rotation), iso(1, 0, 0, rotation), iso(1, 0, 150, rotation), iso(0, 0, 150, rotation)])} fill={currentRoom === 'living' ? '#e0dbd4' : currentRoom === 'kitchen' ? '#ebe5d8' : currentRoom === 'corridor' ? '#d7ccc8' : '#FFECB3'} />
        <polygon points={isoPoly([iso(1, 0, 0, rotation), iso(1, 1, 0, rotation), iso(1, 1, 150, rotation), iso(1, 0, 150, rotation)])} fill={currentRoom === 'living' ? '#d4cfc6' : currentRoom === 'kitchen' ? '#e0d9cc' : currentRoom === 'corridor' ? '#c8b8b0' : '#FFE082'} />
        <line x1={iso(1, 0, 0, rotation)[0]} y1={iso(1, 0, 0, rotation)[1]} x2={iso(1, 0, 150, rotation)[0]} y2={iso(1, 0, 150, rotation)[1]} stroke="#b8b0a5" strokeWidth="1" />

        {/* Двери */}
        {roomConfig.doors.map(door => {
          const doorH = 70;
          const isLeft = door.side === 'left';
          const pos = door.position || 0.5;
          const doorWidth = 0.12;
          
          let points: [number, number][];
          let handlePos: [number, number];
          let labelPos: [number, number];
          
          if (isLeft) {
            // Дверь на левой стене (b = 0)
            const a1 = pos - doorWidth / 2;
            const a2 = pos + doorWidth / 2;
            points = [
              iso(a1, 0, 0, rotation), 
              iso(a2, 0, 0, rotation), 
              iso(a2, 0, doorH, rotation), 
              iso(a1, 0, doorH, rotation)
            ];
            handlePos = iso(a2 - 0.03, 0, doorH * 0.45, rotation);
            labelPos = iso(pos, 0, doorH + 12, rotation);
          } else {
            // Дверь на правой стене (a = 1)
            const b1 = pos - doorWidth / 2;
            const b2 = pos + doorWidth / 2;
            points = [
              iso(1, b1, 0, rotation), 
              iso(1, b2, 0, rotation), 
              iso(1, b2, doorH, rotation), 
              iso(1, b1, doorH, rotation)
            ];
            handlePos = iso(1, b1 + 0.03, doorH * 0.45, rotation);
            labelPos = iso(1, pos, doorH + 12, rotation);
          }
          
          const isHovered = hoveredObject === door.id;

          return (
            <g key={door.id} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleDoorClick(door); }} onMouseEnter={() => setHoveredObject(door.id)} onMouseLeave={() => setHoveredObject(null)}>
              <polygon points={isoPoly(points)} fill={isHovered ? '#7B5236' : '#5A3520'} stroke="#3A1A08" strokeWidth="1.5" />
              <circle cx={handlePos[0]} cy={handlePos[1]} r="2.5" fill="#FFD700" />
              {isHovered && (
                <text x={labelPos[0]} y={labelPos[1]} textAnchor="middle" fontSize="10" fontFamily="monospace" fill="#22c55e">
                  {door.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Содержимое комнаты */}
        {currentRoom === 'living' && (
          <g>
            <polygon points={isoPoly([iso(0.2, 0, 30, rotation), iso(0.45, 0, 30, rotation), iso(0.45, 0, 85, rotation), iso(0.2, 0, 85, rotation)])} fill="#87CEEB" stroke="#8B7355" strokeWidth="2" />
            <line x1={iso(0.325, 0, 30, rotation)[0]} y1={iso(0.325, 0, 30, rotation)[1]} x2={iso(0.325, 0, 85, rotation)[0]} y2={iso(0.325, 0, 85, rotation)[1]} stroke="#8B7355" strokeWidth="1.2" />
            <line x1={iso(0.2, 0, 57.5, rotation)[0]} y1={iso(0.2, 0, 57.5, rotation)[1]} x2={iso(0.45, 0, 57.5, rotation)[0]} y2={iso(0.45, 0, 57.5, rotation)[1]} stroke="#8B7355" strokeWidth="1.2" />
            
            {isoBox(0.05, 0.45, 0.12, 0.12, 55, { top: '#8899AA', left: '#667788', right: '#778899' }, rotation)}
            {isoBox(0.17, 0.45, 0.12, 0.12, 55, { top: '#8090A0', left: '#607080', right: '#708090' }, rotation)}
            {isoBox(0.29, 0.45, 0.12, 0.12, 55, { top: '#8899AA', left: '#667788', right: '#778899' }, rotation)}
            
            {isoBox(0.38, 0.42, 0.25, 0.18, 38, { top: '#b8884c', left: '#7a5828', right: '#8a6830' }, rotation)}
            {isoBox(0.33, 0.43, 0.08, 0.06, 42, { top: '#555', left: '#444', right: '#4a4a4a' }, rotation)}
          </g>
        )}

        {currentRoom === 'kitchen' && (
          <g>
            {isoBox(0.45, 0.55, 0.2, 0.15, 35, { top: '#f0f0f0', left: '#c8c8c8', right: '#d0d0d0' }, rotation)}
            
            <ellipse cx={iso(0.55, 0.62, 36, rotation)[0]} cy={iso(0.55, 0.62, 36, rotation)[1]} rx="10" ry="5" fill="#fff" stroke="#ddd" strokeWidth="0.5" />
            {cheeseLeft > 0 && Array.from({ length: Math.min(cheeseLeft, 5) }).map((_, i) => (
              <rect key={i} x={iso(0.53 + (i % 3) * 0.02, 0.61 + Math.floor(i / 3) * 0.02, 37, rotation)[0] - 3} y={iso(0.53 + (i % 3) * 0.02, 0.61 + Math.floor(i / 3) * 0.02, 37, rotation)[1] - 2.5} width="6" height="5" rx="0.5" fill="#FFD700" />
            ))}
            
            {isoBox(0.7, 0.25, 0.15, 0.18, 40, { top: '#444', left: '#333', right: '#3a3a3a' }, rotation)}
            <ellipse cx={iso(0.74, 0.31, 41, rotation)[0]} cy={iso(0.74, 0.31, 41, rotation)[1]} rx="4" ry="2" fill="#222" stroke="#555" strokeWidth="0.5" />
            
            {isoBox(0.05, 0.25, 0.13, 0.15, 80, { top: '#f5f5f5', left: '#ddd', right: '#e0e0e0' }, rotation)}
          </g>
        )}

        {currentRoom === 'corridor' && (
          <g>
            {/* Растение в горшке */}
            {isoBox(0.15, 0.45, 0.1, 0.1, 15, { top: '#8D6E63', left: '#6D4C41', right: '#795548' }, rotation)}
            <ellipse cx={iso(0.2, 0.5, 20, rotation)[0]} cy={iso(0.2, 0.5, 20, rotation)[1]} rx="8" ry="12" fill="#4CAF50" />
            <ellipse cx={iso(0.18, 0.48, 25, rotation)[0]} cy={iso(0.18, 0.48, 25, rotation)[1]} rx="6" ry="8" fill="#66BB6A" />
            <ellipse cx={iso(0.22, 0.52, 22, rotation)[0]} cy={iso(0.22, 0.52, 22, rotation)[1]} rx="5" ry="7" fill="#81C784" />
            
            {/* Картина на стене */}
            <rect x={iso(0.5, 0.05, 60, rotation)[0] - 15} y={iso(0.5, 0.05, 60, rotation)[1] - 10} width="30" height="20" fill="#8D6E63" stroke="#5D4037" strokeWidth="2" />
            <rect x={iso(0.5, 0.05, 60, rotation)[0] - 12} y={iso(0.5, 0.05, 60, rotation)[1] - 7} width="24" height="14" fill="#E3F2FD" />
            <circle cx={iso(0.5, 0.05, 60, rotation)[0]} cy={iso(0.5, 0.05, 60, rotation)[1]} r="4" fill="#FFEB3B" />
            
            {/* Торшер */}
            {isoBox(0.75, 0.45, 0.1, 0.1, 5, { top: '#424242', left: '#212121', right: '#303030' }, rotation)}
            <line x1={iso(0.8, 0.5, 5, rotation)[0]} y1={iso(0.8, 0.5, 5, rotation)[1]} x2={iso(0.8, 0.5, 50, rotation)[0]} y2={iso(0.8, 0.5, 50, rotation)[1]} stroke="#616161" strokeWidth="2" />
            <ellipse cx={iso(0.8, 0.5, 55, rotation)[0]} cy={iso(0.8, 0.5, 55, rotation)[1]} rx="10" ry="6" fill="#FFF9C4" />
            <ellipse cx={iso(0.8, 0.5, 53, rotation)[0]} cy={iso(0.8, 0.5, 53, rotation)[1]} rx="8" ry="4" fill="#FFF176" opacity="0.6" />
            
            {/* Ковровая дорожка */}
            <polygon 
              points={isoPoly([iso(0.3, 0.2, 0.5, rotation), iso(0.7, 0.2, 0.5, rotation), iso(0.7, 0.8, 0.5, rotation), iso(0.3, 0.8, 0.5, rotation)])} 
              fill="#C62828" 
              opacity="0.7" 
            />
            <polygon 
              points={isoPoly([iso(0.35, 0.25, 0.6, rotation), iso(0.65, 0.25, 0.6, rotation), iso(0.65, 0.75, 0.6, rotation), iso(0.35, 0.75, 0.6, rotation)])} 
              fill="#D32F2F" 
              opacity="0.5" 
            />
            
            {/* Котик Барсик */}
            <g transform={`translate(${iso(0.5, 0.7, 0, rotation)[0]}, ${iso(0.5, 0.7, 0, rotation)[1]})`}>
              {/* Тело */}
              <ellipse cx="0" cy="0" rx="12" ry="8" fill="#FF9800" />
              {/* Голова */}
              <circle cx="10" cy="-5" r="8" fill="#FF9800" />
              {/* Уши */}
              <polygon points="6,-10 8,-15 10,-10" fill="#FF9800" />
              <polygon points="10,-10 12,-15 14,-10" fill="#FF9800" />
              <polygon points="7,-11 8,-14 9,-11" fill="#FFB74D" />
              <polygon points="11,-11 12,-14 13,-11" fill="#FFB74D" />
              {/* Глаза */}
              <circle cx="8" cy="-6" r="1.5" fill="#4CAF50" />
              <circle cx="12" cy="-6" r="1.5" fill="#4CAF50" />
              <circle cx="8" cy="-6" r="0.8" fill="#000" />
              <circle cx="12" cy="-6" r="0.8" fill="#000" />
              {/* Нос */}
              <polygon points="10,-3 9,-2 11,-2" fill="#E91E63" />
              {/* Усы */}
              <line x1="6" y1="-3" x2="2" y2="-4" stroke="#795548" strokeWidth="0.5" />
              <line x1="6" y1="-2" x2="2" y2="-2" stroke="#795548" strokeWidth="0.5" />
              <line x1="14" y1="-3" x2="18" y2="-4" stroke="#795548" strokeWidth="0.5" />
              <line x1="14" y1="-2" x2="18" y2="-2" stroke="#795548" strokeWidth="0.5" />
              {/* Хвост */}
              <path d="M -10,0 Q -15,-5 -12,-10" stroke="#FF9800" strokeWidth="3" fill="none" strokeLinecap="round" />
              {/* Полоски */}
              <line x1="-5" y1="-3" x2="-5" y2="3" stroke="#E65100" strokeWidth="1" opacity="0.5" />
              <line x1="0" y1="-4" x2="0" y2="4" stroke="#E65100" strokeWidth="1" opacity="0.5" />
              <line x1="5" y1="-3" x2="5" y2="3" stroke="#E65100" strokeWidth="1" opacity="0.5" />
            </g>
          </g>
        )}

        {currentRoom === 'cheese-storage' && (
          <g>
            {/* Гора сыра (центр) */}
            <ellipse cx={iso(0.5, 0.5, 5, rotation)[0]} cy={iso(0.5, 0.5, 5, rotation)[1]} rx="35" ry="18" fill="#FFC107" />
            <ellipse cx={iso(0.5, 0.5, 15, rotation)[0]} cy={iso(0.5, 0.5, 15, rotation)[1]} rx="28" ry="14" fill="#FFD54F" />
            <ellipse cx={iso(0.5, 0.5, 25, rotation)[0]} cy={iso(0.5, 0.5, 25, rotation)[1]} rx="20" ry="10" fill="#FFE082" />
            <ellipse cx={iso(0.5, 0.5, 35, rotation)[0]} cy={iso(0.5, 0.5, 35, rotation)[1]} rx="12" ry="6" fill="#FFECB3" />
            {/* Дырки в сыре */}
            <circle cx={iso(0.48, 0.48, 10, rotation)[0]} cy={iso(0.48, 0.48, 10, rotation)[1]} r="2" fill="#F57F17" opacity="0.6" />
            <circle cx={iso(0.52, 0.52, 20, rotation)[0]} cy={iso(0.52, 0.52, 20, rotation)[1]} r="1.5" fill="#F57F17" opacity="0.6" />
            <circle cx={iso(0.5, 0.5, 30, rotation)[0]} cy={iso(0.5, 0.5, 30, rotation)[1]} r="1" fill="#F57F17" opacity="0.6" />
            
            {/* Сырное колесо (слева) */}
            {isoBox(0.15, 0.25, 0.2, 0.2, 12, { top: '#FFB300', left: '#FF8F00', right: '#FFA000' }, rotation)}
            <ellipse cx={iso(0.25, 0.35, 12, rotation)[0]} cy={iso(0.25, 0.35, 12, rotation)[1]} rx="12" ry="6" fill="#FFC107" />
            <circle cx={iso(0.22, 0.32, 12, rotation)[0]} cy={iso(0.22, 0.32, 12, rotation)[1]} r="1.5" fill="#F57F17" opacity="0.5" />
            <circle cx={iso(0.28, 0.38, 12, rotation)[0]} cy={iso(0.28, 0.38, 12, rotation)[1]} r="1" fill="#F57F17" opacity="0.5" />
            
            {/* Полка с сыром (справа) */}
            {isoBox(0.65, 0.25, 0.2, 0.2, 30, { top: '#8D6E63', left: '#6D4C41', right: '#795548' }, rotation)}
            {/* Полки */}
            <polygon 
              points={isoPoly([iso(0.65, 0.25, 10, rotation), iso(0.85, 0.25, 10, rotation), iso(0.85, 0.45, 10, rotation), iso(0.65, 0.45, 10, rotation)])} 
              fill="#A1887F" 
              opacity="0.8"
            />
            <polygon 
              points={isoPoly([iso(0.65, 0.25, 20, rotation), iso(0.85, 0.25, 20, rotation), iso(0.85, 0.45, 20, rotation), iso(0.65, 0.45, 20, rotation)])} 
              fill="#A1887F" 
              opacity="0.8"
            />
            {/* Сыры на полках */}
            <ellipse cx={iso(0.7, 0.3, 12, rotation)[0]} cy={iso(0.7, 0.3, 12, rotation)[1]} rx="4" ry="2" fill="#FFEB3B" />
            <ellipse cx={iso(0.75, 0.35, 12, rotation)[0]} cy={iso(0.75, 0.35, 12, rotation)[1]} rx="4" ry="2" fill="#FFF176" />
            <ellipse cx={iso(0.8, 0.4, 12, rotation)[0]} cy={iso(0.8, 0.4, 12, rotation)[1]} rx="4" ry="2" fill="#FFD54F" />
            <ellipse cx={iso(0.7, 0.3, 22, rotation)[0]} cy={iso(0.7, 0.3, 22, rotation)[1]} rx="4" ry="2" fill="#FFC107" />
            <ellipse cx={iso(0.75, 0.35, 22, rotation)[0]} cy={iso(0.75, 0.35, 22, rotation)[1]} rx="4" ry="2" fill="#FFE082" />
            <ellipse cx={iso(0.8, 0.4, 22, rotation)[0]} cy={iso(0.8, 0.4, 22, rotation)[1]} rx="4" ry="2" fill="#FFECB3" />
            
            {/* Сырный фонтан (снизу) */}
            {isoBox(0.4, 0.65, 0.2, 0.2, 8, { top: '#FFA000', left: '#FF6F00', right: '#FF8F00' }, rotation)}
            <ellipse cx={iso(0.5, 0.75, 8, rotation)[0]} cy={iso(0.5, 0.75, 8, rotation)[1]} rx="15" ry="8" fill="#FFCA28" opacity="0.8" />
            {/* Струи сыра */}
            <path 
              d={`M ${iso(0.5, 0.75, 10, rotation)[0]} ${iso(0.5, 0.75, 10, rotation)[1]} 
                  Q ${iso(0.5, 0.75, 25, rotation)[0]} ${iso(0.5, 0.75, 25, rotation)[1]} 
                    ${iso(0.48, 0.73, 15, rotation)[0]} ${iso(0.48, 0.73, 15, rotation)[1]}`}
              stroke="#FFD54F" 
              strokeWidth="3" 
              fill="none" 
              opacity="0.7"
            />
            <path 
              d={`M ${iso(0.5, 0.75, 10, rotation)[0]} ${iso(0.5, 0.75, 10, rotation)[1]} 
                  Q ${iso(0.5, 0.75, 25, rotation)[0]} ${iso(0.5, 0.75, 25, rotation)[1]} 
                    ${iso(0.52, 0.77, 15, rotation)[0]} ${iso(0.52, 0.77, 15, rotation)[1]}`}
              stroke="#FFE082" 
              strokeWidth="3" 
              fill="none" 
              opacity="0.7"
            />
            <circle cx={iso(0.5, 0.75, 28, rotation)[0]} cy={iso(0.5, 0.75, 28, rotation)[1]} r="3" fill="#FFEB3B" opacity="0.6">
              <animate attributeName="opacity" values="0.6;0.3;0.6" dur="2s" repeatCount="indefinite" />
            </circle>
            
            {/* Маленькие кусочки сыра разбросаны */}
            <rect x={iso(0.3, 0.6, 1, rotation)[0] - 2} y={iso(0.3, 0.6, 1, rotation)[1] - 1} width="4" height="3" fill="#FFC107" transform={`rotate(${15} ${iso(0.3, 0.6, 1, rotation)[0]} ${iso(0.3, 0.6, 1, rotation)[1]})`} />
            <rect x={iso(0.7, 0.6, 1, rotation)[0] - 2} y={iso(0.7, 0.6, 1, rotation)[1] - 1} width="4" height="3" fill="#FFD54F" transform={`rotate(${-20} ${iso(0.7, 0.6, 1, rotation)[0]} ${iso(0.7, 0.6, 1, rotation)[1]})`} />
            <rect x={iso(0.35, 0.2, 1, rotation)[0] - 2} y={iso(0.35, 0.2, 1, rotation)[1] - 1} width="4" height="3" fill="#FFE082" transform={`rotate(${30} ${iso(0.35, 0.2, 1, rotation)[0]} ${iso(0.35, 0.2, 1, rotation)[1]})`} />
            <rect x={iso(0.65, 0.8, 1, rotation)[0] - 2} y={iso(0.65, 0.8, 1, rotation)[1] - 1} width="4" height="3" fill="#FFCA28" transform={`rotate(${-10} ${iso(0.65, 0.8, 1, rotation)[0]} ${iso(0.65, 0.8, 1, rotation)[1]})`} />
          </g>
        )}

        {/* Кликабельные объекты */}
        {roomConfig.objects.map(obj => (
          <circle
            key={obj.id}
            cx={iso(obj.a, obj.b, 0, rotation)[0]}
            cy={iso(obj.a, obj.b, 0, rotation)[1]}
            r="20"
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); handleObjectClick(obj); }}
            onMouseEnter={() => setHoveredObject(obj.id)}
            onMouseLeave={() => setHoveredObject(null)}
          />
        ))}

        {/* Подсказка при наведении */}
        {hoveredObject && !isMoving && (
          <text
            x={iso(
              roomConfig.objects.find(o => o.id === hoveredObject)?.a || 0.5,
              roomConfig.objects.find(o => o.id === hoveredObject)?.b || 0.5,
              20,
              rotation
            )[0]}
            y={iso(
              roomConfig.objects.find(o => o.id === hoveredObject)?.a || 0.5,
              roomConfig.objects.find(o => o.id === hoveredObject)?.b || 0.5,
              20,
              rotation
            )[1]}
            textAnchor="middle"
            fontSize="11"
            fontFamily="sans-serif"
            fill="#333"
            fontWeight="bold"
          >
            {roomConfig.objects.find(o => o.id === hoveredObject)?.label || roomConfig.doors.find(d => d.id === hoveredObject)?.label}
          </text>
        )}

        {/* Тень мыши */}
        <ellipse cx={sx + 2} cy={sy + 4} rx="8" ry="4" fill="rgba(0,0,0,0.07)" />

        {/* Мышка */}
        <text x={sx} y={sy} textAnchor="middle" dominantBaseline="central" fontSize="28" style={{ filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.1))' }}>
          {mouseEmoji}
        </text>
      </svg>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-gray-300 text-[10px] font-mono tracking-wider pointer-events-none">
        кликай на объекты • на складе сыра: [1] поесть или [2] забрать на кухню • зажми колёсико для поворота
      </div>
    </div>
  );
}

export default App;
