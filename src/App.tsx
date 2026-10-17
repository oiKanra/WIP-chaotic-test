import { useState, useRef, useCallback, useEffect } from 'react';

/*
  Изометрическая комната на SVG — точная графика без артефактов.

  Система координат пола (a, b) ∈ [0,1]×[0,1]:
    W(0,0) → (150, 345)
    N(1,0) → (400, 220)
    E(1,1) → (650, 345)
    S(0,1) → (400, 470)

  Формула: screenX = 150 + 250*(a+b), screenY = 345 + 125*(b-a)
  Высота: screenY -= height
*/

type RoomId = 'living' | 'kitchen';

/* ── Изометрические хелперы ── */
function iso(a: number, b: number, h = 0): [number, number] {
  return [150 + 250 * (a + b), 345 + 125 * (b - a) - h];
}

function isoPoly(points: [number, number][]): string {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

/* Изометрический куб: позиция (a,b), размеры (w,d) в единицах пола, высота h */
function isoBox(
  a: number, b: number, w: number, d: number, h: number,
  colors: { top: string; left: string; right: string }
) {
  const p = (da: number, db: number, dh: number) => iso(a + da, b + db, dh);

  const topFace = isoPoly([p(0, 0, h), p(w, 0, h), p(w, d, h), p(0, d, h)]);
  const leftFace = isoPoly([p(0, 0, h), p(0, d, h), p(0, d, 0), p(0, 0, 0)]);
  const rightFace = isoPoly([p(0, 0, h), p(w, 0, h), p(w, 0, 0), p(0, 0, 0)]);

  return (
    <g>
      <polygon points={leftFace} fill={colors.left} />
      <polygon points={rightFace} fill={colors.right} />
      <polygon points={topFace} fill={colors.top} />
    </g>
  );
}

/* ── Конфигурация комнат ── */
interface Door { id: string; side: 'left' | 'right'; targetRoom: RoomId; label: string }

const ROOMS: Record<RoomId, { name: string; doors: Door[] }> = {
  living: {
    name: 'Гостиная',
    doors: [
      { id: 'door-left', side: 'left', targetRoom: 'kitchen', label: '→ Кухня' },
      { id: 'door-right', side: 'right', targetRoom: 'kitchen', label: '→ Кухня' },
    ],
  },
  kitchen: {
    name: 'Кухня',
    doors: [
      { id: 'door-left', side: 'left', targetRoom: 'living', label: '→ Гостиная' },
      { id: 'door-right', side: 'right', targetRoom: 'living', label: '→ Гостиная' },
    ],
  },
};

const INTEREST_POINTS: Record<RoomId, Array<{ id: string; a: number; b: number; radius: number; rate: number; label: string }>> = {
  living: [
    { id: 'window', a: 0.25, b: 0.1, radius: 90, rate: 0.35, label: '🪟 Окно' },
    { id: 'cabinets', a: 0.15, b: 0.55, radius: 80, rate: 0.25, label: '🗄️ Шкафчики' },
  ],
  kitchen: [
    { id: 'kitchen-table', a: 0.55, b: 0.65, radius: 80, rate: 0.55, label: '🧀 Кухня' },
    { id: 'stove', a: 0.75, b: 0.35, radius: 70, rate: 0.3, label: '🔥 Плита' },
  ],
};

/* ── Экранная позиция из iso-координат ── */
function isoToScreen(a: number, b: number): [number, number] {
  return iso(a, b, 0);
}

function App() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentRoom, setCurrentRoom] = useState<RoomId>('living');
  const [mouse, setMouse] = useState({ x: 400, y: 400 });
  const [moving, setMoving] = useState(false);
  const [mood, setMood] = useState(50);
  const [eating, setEating] = useState(false);
  const [cheeseLeft, setCheeseLeft] = useState(5);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [hoveredDoor, setHoveredDoor] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const moodRef = useRef(50);
  const eatingRef = useRef(false);

  /* Конвертация экранных координат в iso (a,b) */
  const screenToIso = useCallback((sx: number, sy: number): [number, number] => {
    // Обратное преобразование:
    // sx = 150 + 250*(a+b)  →  a+b = (sx-150)/250
    // sy = 345 + 125*(b-a)  →  b-a = (sy-345)/125
    const sum = (sx - 150) / 250;
    const diff = (sy - 345) / 125;
    return [(sum - diff) / 2, (sum + diff) / 2];
  }, []);

  /* Логика настроения */
  useEffect(() => {
    const interval = setInterval(() => {
      const [ma, mb] = screenToIso(mouse.x, mouse.y);
      const points = INTEREST_POINTS[currentRoom];
      let zone: string | null = null;
      let totalRate = 0;

      for (const pt of points) {
        const [px, py] = isoToScreen(pt.a, pt.b);
        const dx = mouse.x - px;
        const dy = mouse.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < pt.radius) {
          totalRate += pt.rate * (1 - dist / pt.radius);
          zone = pt.id;
        }
      }

      const isEating = zone === 'kitchen-table' && cheeseLeft > 0;
      if (isEating && !eatingRef.current) { eatingRef.current = true; setEating(true); }
      else if (!isEating && eatingRef.current) { eatingRef.current = false; setEating(false); }

      const effectiveRate = isEating ? totalRate * 1.8 : totalRate;
      let newMood = moodRef.current;
      newMood = effectiveRate > 0
        ? Math.min(100, newMood + effectiveRate)
        : Math.max(0, newMood - 0.08);

      moodRef.current = newMood;
      setMood(newMood);
      setActiveZone(zone);
    }, 100);
    return () => clearInterval(interval);
  }, [mouse.x, mouse.y, cheeseLeft, currentRoom, screenToIso]);

  const handleClick = useCallback(() => {
    if (eatingRef.current && cheeseLeft > 0) {
      setCheeseLeft(p => p - 1);
      moodRef.current = Math.min(100, moodRef.current + 8);
      setMood(moodRef.current);
    }
  }, [cheeseLeft]);

  const handleDoorClick = useCallback((targetRoom: RoomId) => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrentRoom(targetRoom);
      setMouse({ x: 400, y: 400 });
      setTimeout(() => setTransitioning(false), 300);
    }, 300);
  }, [transitioning]);

  const onMove = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current || transitioning) return;
    const r = svgRef.current.getBoundingClientRect();
    // Масштабируем координаты — SVG viewBox 800x600, но реальный размер может отличаться
    const scaleX = 800 / r.width;
    const scaleY = 600 / r.height;
    setMouse({ x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY });
    setMoving(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMoving(false), 120);
  }, [transitioning]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const moodEmoji = mood > 80 ? '😍' : mood > 60 ? '😊' : mood > 40 ? '🐁' : mood > 20 ? '😐' : '😢';
  const moodLabel = mood > 80 ? 'Счастлива!' : mood > 60 ? 'Довольна' : mood > 40 ? 'Нормально' : mood > 20 ? 'Скучно...' : 'Грустно...';
  const mouseEmoji = eating ? '🐁✨' : mood > 80 ? '🐁💕' : '🐁';
  const roomConfig = ROOMS[currentRoom];

  /* ── Двери в изометрии ── */
  const renderDoor = (side: 'left' | 'right', door: Door) => {
    // Левая стена: от W(0,0) к N(1,0), дверь на b=0
    // Правая стена: от N(1,0) к E(1,1), дверь на a=1
    const doorW = 0.12; // ширина двери в iso-единицах
    const doorH = 70;   // высота двери в пикселях

    let points: [number, number][];
    let handlePos: [number, number];

    if (side === 'left') {
      // Дверь на левой стене, позиция a от 0.55 до 0.67
      const a1 = 0.55, a2 = 0.67;
      points = [
        iso(a1, 0, 0), iso(a2, 0, 0),
        iso(a2, 0, doorH), iso(a1, 0, doorH),
      ];
      handlePos = iso(a2 - 0.03, 0, doorH * 0.45);
    } else {
      // Дверь на правой стене, позиция b от 0.33 до 0.45
      const b1 = 0.33, b2 = 0.45;
      points = [
        iso(1, b1, 0), iso(1, b2, 0),
        iso(1, b2, doorH), iso(1, b1, doorH),
      ];
      handlePos = iso(1, b1 + 0.03, doorH * 0.45);
    }

    const isHovered = hoveredDoor === door.id;

    return (
      <g
        key={door.id}
        style={{ cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); handleDoorClick(door.targetRoom); }}
        onMouseEnter={() => setHoveredDoor(door.id)}
        onMouseLeave={() => setHoveredDoor(null)}
      >
        {/* Рама */}
        <polygon
          points={isoPoly(points)}
          fill={isHovered ? '#7B5236' : '#5A3520'}
          stroke="#3A1A08"
          strokeWidth="1.5"
        />
        {/* Панели */}
        {side === 'left' ? (
          <>
            <rect x={0} y={0} width={0} height={0} /> {/* placeholder */}
            <polygon
              points={isoPoly([iso(0.57, 0, 15), iso(0.65, 0, 15), iso(0.65, 0, 40), iso(0.57, 0, 40)])}
              fill="none" stroke="#4A2A18" strokeWidth="0.8" opacity="0.5"
            />
            <polygon
              points={isoPoly([iso(0.57, 0, 45), iso(0.65, 0, 45), iso(0.65, 0, 65), iso(0.57, 0, 65)])}
              fill="none" stroke="#4A2A18" strokeWidth="0.8" opacity="0.5"
            />
          </>
        ) : (
          <>
            <polygon
              points={isoPoly([iso(1, 0.35, 15), iso(1, 0.43, 15), iso(1, 0.43, 40), iso(1, 0.35, 40)])}
              fill="none" stroke="#4A2A18" strokeWidth="0.8" opacity="0.5"
            />
            <polygon
              points={isoPoly([iso(1, 0.35, 45), iso(1, 0.43, 45), iso(1, 0.43, 65), iso(1, 0.35, 65)])}
              fill="none" stroke="#4A2A18" strokeWidth="0.8" opacity="0.5"
            />
          </>
        )}
        {/* Ручка */}
        <circle cx={handlePos[0]} cy={handlePos[1]} r="2.5" fill="#FFD700" />
        {/* Подсказка */}
        {isHovered && (
          <text
            x={(side === 'left' ? iso(0.61, 0, doorH + 12) : iso(1, 0.39, doorH + 12))[0]}
            y={(side === 'left' ? iso(0.61, 0, doorH + 12) : iso(1, 0.39, doorH + 12))[1]}
            textAnchor="middle"
            fontSize="10"
            fontFamily="monospace"
            fill="#22c55e"
          >
            {door.label}
          </text>
        )}
      </g>
    );
  };

  /* ── Окно (на левой стене) ── */
  const renderWindow = () => {
    const a1 = 0.2, a2 = 0.45, h1 = 30, h2 = 85;
    const pts = [iso(a1, 0, h1), iso(a2, 0, h1), iso(a2, 0, h2), iso(a1, 0, h2)];
    return (
      <g>
        {/* Рама */}
        <polygon points={isoPoly(pts)} fill="#87CEEB" stroke="#8B7355" strokeWidth="2.5" />
        {/* Перекладины */}
        <line {...lineProps(iso((a1 + a2) / 2, 0, h1), iso((a1 + a2) / 2, 0, h2))} stroke="#8B7355" strokeWidth="1.5" />
        <line {...lineProps(iso(a1, 0, (h1 + h2) / 2), iso(a2, 0, (h1 + h2) / 2))} stroke="#8B7355" strokeWidth="1.5" />
        {/* Облака */}
        <ellipse cx={iso(0.27, 0, 72)[0]} cy={iso(0.27, 0, 72)[1]} rx="8" ry="4" fill="white" opacity="0.7" />
        <ellipse cx={iso(0.32, 0, 75)[0]} cy={iso(0.32, 0, 75)[1]} rx="6" ry="3" fill="white" opacity="0.6" />
        {/* Подоконник */}
        <polygon
          points={isoPoly([iso(a1 - 0.02, 0, h1 - 2), iso(a2 + 0.02, 0, h1 - 2), iso(a2 + 0.02, 0.03, h1 - 2), iso(a1 - 0.02, 0.03, h1 - 2)])}
          fill="#7a6345"
        />
        {/* Цветок */}
        <circle cx={iso(0.33, 0.015, h1 + 3)[0]} cy={iso(0.33, 0.015, h1 + 3)[1]} r="3" fill="#e06060" />
        <line x1={iso(0.33, 0.015, h1 + 3)[0]} y1={iso(0.33, 0.015, h1 + 3)[1]} x2={iso(0.33, 0.015, h1 - 1)[0]} y2={iso(0.33, 0.015, h1 - 1)[1]} stroke="#4a884a" strokeWidth="1" />
      </g>
    );
  };

  return (
    <div className="w-full h-screen bg-white overflow-hidden flex items-center justify-center">
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
            <div
              className={`h-full rounded-full transition-all duration-300 ${mood > 60 ? 'bg-green-400' : mood > 30 ? 'bg-yellow-400' : 'bg-red-400'}`}
              style={{ width: `${mood}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-400 mt-1 text-right">{Math.round(mood)}%</div>
        </div>
        {activeZone && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow border border-gray-200">
            <span className="text-xs text-gray-500">
              {INTEREST_POINTS[currentRoom].find(p => p.id === activeZone)?.label}
            </span>
          </div>
        )}
        {currentRoom === 'kitchen' && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow border border-gray-200">
            <span className="text-xs text-gray-500">
              🧀 Сыр: {cheeseLeft > 0 ? '🧀'.repeat(cheeseLeft) : 'пусто 😢'}
            </span>
          </div>
        )}
      </div>

      {eating && (
        <div className="absolute top-4 right-4 z-50 bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-2 shadow animate-pulse pointer-events-none">
          <span className="text-sm text-yellow-800">🐁 Ням-ням! Кликни чтобы съесть! 🧀</span>
        </div>
      )}

      {/* SVG сцена */}
      <svg
        ref={svgRef}
        viewBox="0 0 800 600"
        className={`w-full h-full max-w-4xl max-h-[700px] transition-opacity duration-300 ${transitioning ? 'opacity-0' : 'opacity-100'}`}
        onMouseMove={onMove}
        onClick={handleClick}
        style={{ cursor: transitioning ? 'wait' : 'none' }}
      >
        {/* ═══ ПОЛ ═══ */}
        <polygon
          points={isoPoly([iso(0, 0, 0), iso(1, 0, 0), iso(1, 1, 0), iso(0, 1, 0)])}
          fill={currentRoom === 'living' ? '#e8e2d8' : '#ddd5c5'}
          stroke="#c8c0b0"
          strokeWidth="0.5"
        />
        {/* Паркет */}
        {Array.from({ length: 10 }).map((_, i) => {
          const t = i / 10;
          return (
            <g key={`grid-${i}`} opacity="0.12">
              <line {...lineProps(iso(t, 0, 0), iso(t, 1, 0))} stroke="#a09080" strokeWidth="0.5" />
              <line {...lineProps(iso(0, t, 0), iso(1, t, 0))} stroke="#a09080" strokeWidth="0.5" />
            </g>
          );
        })}

        {/* ═══ ЛЕВАЯ СТЕНА ═══ */}
        <polygon
          points={isoPoly([iso(0, 0, 0), iso(1, 0, 0), iso(1, 0, 150), iso(0, 0, 150)])}
          fill={currentRoom === 'living' ? '#e0dbd4' : '#ebe5d8'}
        />

        {/* ═══ ПРАВАЯ СТЕНА ═══ */}
        <polygon
          points={isoPoly([iso(1, 0, 0), iso(1, 1, 0), iso(1, 1, 150), iso(1, 0, 150)])}
          fill={currentRoom === 'living' ? '#d4cfc6' : '#e0d9cc'}
        />

        {/* Угловая линия */}
        <line {...lineProps(iso(1, 0, 0), iso(1, 0, 150))} stroke="#b8b0a5" strokeWidth="1" />

        {/* ═══ ДВЕРИ ═══ */}
        {roomConfig.doors.map(door => renderDoor(door.side, door))}

        {/* ═══ СОДЕРЖИМОЕ КОМНАТЫ ═══ */}
        {currentRoom === 'living' && <LivingRoomSVG />}
        {currentRoom === 'kitchen' && <KitchenSVG cheeseLeft={cheeseLeft} />}

        {/* ═══ КОВЁР (гостиная) ═══ */}
        {currentRoom === 'living' && (
          <polygon
            points={isoPoly([iso(0.35, 0.45, 0.3), iso(0.65, 0.45, 0.3), iso(0.65, 0.7, 0.3), iso(0.35, 0.7, 0.3)])}
            fill="#c44a4e"
            opacity="0.35"
          />
        )}

        {/* ═══ ТЕНЬ МЫШКИ ═══ */}
        <ellipse cx={mouse.x + 2} cy={mouse.y + 4} rx="8" ry="4" fill="rgba(0,0,0,0.07)" />

        {/* ═══ МЫШКА-ЭМОДЗИ ═══ */}
        <text
          x={mouse.x}
          y={mouse.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="28"
          style={{
            transform: moving ? 'rotate(-8deg)' : 'rotate(0deg)',
            transformOrigin: `${mouse.x}px ${mouse.y}px`,
            transition: 'transform 0.12s ease-out',
            filter: eating
              ? 'drop-shadow(0 0 6px rgba(255,200,0,0.5))'
              : mood > 70
                ? 'drop-shadow(0 0 4px rgba(255,100,150,0.4))'
                : 'drop-shadow(1px 2px 2px rgba(0,0,0,0.1))',
          }}
        >
          {mouseEmoji}
        </text>

        {/* Частицы при еде */}
        {eating && (
          <g>
            <text x={mouse.x - 10} y={mouse.y - 18} fontSize="10" className="animate-float-up">✨</text>
            <text x={mouse.x + 6} y={mouse.y - 22} fontSize="10" className="animate-float-up" style={{ animationDelay: '0.3s' }}>⭐</text>
            <text x={mouse.x - 2} y={mouse.y - 14} fontSize="10" className="animate-float-up" style={{ animationDelay: '0.6s' }}>💛</text>
          </g>
        )}
      </svg>

      {/* Подсказка */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-gray-300 text-[10px] font-mono tracking-wider pointer-events-none">
        {currentRoom === 'living' ? 'подойди к окну 🪟 или шкафчикам 🗄️ • кликни на дверь' : 'подойди к сыру 🧀 и кликай • кликни на дверь'}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   SVG КОМПОНЕНТЫ КОМНАТ
   ═══════════════════════════════════════ */

function LivingRoomSVG() {
  return (
    <g>
      {/* Окно */}
      {renderWindowStatic()}

      {/* Шкафчики */}
      {isoBox(0.05, 0.45, 0.12, 0.12, 55, { top: '#8899AA', left: '#667788', right: '#778899' })}
      {isoBox(0.17, 0.45, 0.12, 0.12, 55, { top: '#8090A0', left: '#607080', right: '#708090' })}
      {isoBox(0.29, 0.45, 0.12, 0.12, 55, { top: '#8899AA', left: '#667788', right: '#778899' })}
      {/* Ручки шкафчиков */}
      {[0.11, 0.23, 0.35].map((a, i) => (
        <circle key={i} cx={iso(a, 0.51, 25)[0]} cy={iso(a, 0.51, 25)[1]} r="1.5" fill="#555" />
      ))}

      {/* Стол */}
      {isoBox(0.38, 0.42, 0.25, 0.18, 38, { top: '#b8884c', left: '#7a5828', right: '#8a6830' })}

      {/* Ноутбук на столе */}
      {isoBox(0.44, 0.46, 0.08, 0.06, 42, { top: '#555', left: '#444', right: '#4a4a4a' })}
      {/* Экран ноутбука */}
      <polygon
        points={isoPoly([iso(0.44, 0.46, 42), iso(0.52, 0.46, 42), iso(0.52, 0.46, 55), iso(0.44, 0.46, 55)])}
        fill="#333" stroke="#444" strokeWidth="0.5"
      />
      <polygon
        points={isoPoly([iso(0.445, 0.46, 43), iso(0.515, 0.46, 43), iso(0.515, 0.46, 54), iso(0.445, 0.46, 54)])}
        fill="#1a2a3a"
      />
      <circle cx={iso(0.48, 0.46, 48)[0]} cy={iso(0.48, 0.46, 48)[1]} r="1.5" fill="#22c55e" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Лампа на столе */}
      <ellipse cx={iso(0.57, 0.52, 38)[0]} cy={iso(0.57, 0.52, 38)[1]} rx="4" ry="2" fill="#555" />
      <line {...lineProps(iso(0.57, 0.52, 38), iso(0.57, 0.52, 52))} stroke="#666" strokeWidth="1.5" />
      <ellipse cx={iso(0.57, 0.52, 54)[0]} cy={iso(0.57, 0.52, 54)[1]} rx="6" ry="3" fill="#e8d888" />

      {/* Рамка на правой стене */}
      <polygon
        points={isoPoly([iso(1, 0.55, 50), iso(1, 0.7, 50), iso(1, 0.7, 80), iso(1, 0.55, 80)])}
        fill="#f5f0e0" stroke="#8B7355" strokeWidth="1.5"
      />
      <polygon
        points={isoPoly([iso(1, 0.57, 53), iso(1, 0.68, 53), iso(1, 0.68, 77), iso(1, 0.57, 77)])}
        fill="#c8e0c8" opacity="0.4"
      />

      {/* Часы на правой стене */}
      <circle cx={iso(1, 0.78, 95)[0]} cy={iso(1, 0.78, 95)[1]} r="8" fill="#fff" stroke="#8B7355" strokeWidth="1.5" />
      <line
        x1={iso(1, 0.78, 95)[0]} y1={iso(1, 0.78, 95)[1]}
        x2={iso(1, 0.78, 95)[0] + 3} y2={iso(1, 0.78, 95)[1] - 5}
        stroke="#333" strokeWidth="1"
      />
      <line
        x1={iso(1, 0.78, 95)[0]} y1={iso(1, 0.78, 95)[1]}
        x2={iso(1, 0.78, 95)[0] - 4} y2={iso(1, 0.78, 95)[1] - 2}
        stroke="#333" strokeWidth="0.8"
      />
    </g>
  );
}

function KitchenSVG({ cheeseLeft }: { cheeseLeft: number }) {
  return (
    <g>
      {/* Кухонный стол */}
      {isoBox(0.45, 0.55, 0.2, 0.15, 35, { top: '#f0f0f0', left: '#c8c8c8', right: '#d0d0d0' })}
      {/* Дверца */}
      <polygon
        points={isoPoly([iso(0.5, 0.7, 5), iso(0.5, 0.7, 28), iso(0.6, 0.7, 28), iso(0.6, 0.7, 5)])}
        fill="#bbb" stroke="#aaa" strokeWidth="0.5"
      />
      <circle cx={iso(0.55, 0.7, 16)[0]} cy={iso(0.55, 0.7, 16)[1]} r="1.2" fill="#888" />

      {/* Тарелка с сыром */}
      <ellipse cx={iso(0.55, 0.62, 36)[0]} cy={iso(0.55, 0.62, 36)[1]} rx="10" ry="5" fill="#fff" stroke="#ddd" strokeWidth="0.5" />
      {cheeseLeft > 0 && Array.from({ length: Math.min(cheeseLeft, 5) }).map((_, i) => {
        const cx = iso(0.53 + (i % 3) * 0.02, 0.61 + Math.floor(i / 3) * 0.02, 37)[0];
        const cy = iso(0.53 + (i % 3) * 0.02, 0.61 + Math.floor(i / 3) * 0.02, 37)[1];
        return (
          <g key={i}>
            <rect x={cx - 3} y={cy - 2.5} width="6" height="5" rx="0.5" fill="#FFD700" transform={`rotate(${i * 15 - 20} ${cx} ${cy})`} />
            <circle cx={cx + 1} cy={cy} r="0.8" fill="#DAA520" opacity="0.4" />
          </g>
        );
      })}
      {cheeseLeft === 0 && (
        <text x={iso(0.55, 0.62, 38)[0]} y={iso(0.55, 0.62, 38)[1]} textAnchor="middle" fontSize="8" opacity="0.4">🍽️</text>
      )}

      {/* Плита */}
      {isoBox(0.7, 0.25, 0.15, 0.18, 40, { top: '#444', left: '#333', right: '#3a3a3a' })}
      {/* Конфорки */}
      <ellipse cx={iso(0.74, 0.31, 41)[0]} cy={iso(0.74, 0.31, 41)[1]} rx="4" ry="2" fill="#222" stroke="#555" strokeWidth="0.5" />
      <ellipse cx={iso(0.81, 0.37, 41)[0]} cy={iso(0.81, 0.37, 41)[1]} rx="4" ry="2" fill="#222" stroke="#555" strokeWidth="0.5" />
      {/* Огонь */}
      <ellipse cx={iso(0.74, 0.31, 41)[0]} cy={iso(0.74, 0.31, 41)[1]} rx="3" ry="1.5" fill="#ff6600" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.8;0.5" dur="0.8s" repeatCount="indefinite" />
      </ellipse>
      {/* Духовка */}
      <polygon
        points={isoPoly([iso(0.72, 0.43, 8), iso(0.72, 0.43, 32), iso(0.83, 0.43, 32), iso(0.83, 0.43, 8)])}
        fill="#1a1a1a" stroke="#444" strokeWidth="0.5"
      />
      <line {...lineProps(iso(0.75, 0.43, 28), iso(0.8, 0.43, 28))} stroke="#666" strokeWidth="1" />

      {/* Кастрюля */}
      <ellipse cx={iso(0.74, 0.31, 43)[0]} cy={iso(0.74, 0.31, 43)[1]} rx="5" ry="2.5" fill="#666" stroke="#555" strokeWidth="0.5" />
      <rect x={iso(0.74, 0.31, 43)[0] - 5} y={iso(0.74, 0.31, 43)[1]} width="10" height="5" rx="1" fill="#555" />
      {/* Пар */}
      <circle cx={iso(0.74, 0.31, 50)[0]} cy={iso(0.74, 0.31, 50)[1]} r="2" fill="#ddd" opacity="0.3">
        <animate attributeName="cy" values={`${iso(0.74, 0.31, 48)[1]};${iso(0.74, 0.31, 55)[1]}`} dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={iso(0.75, 0.31, 50)[0]} cy={iso(0.75, 0.31, 50)[1]} r="1.5" fill="#ddd" opacity="0.2">
        <animate attributeName="cy" values={`${iso(0.75, 0.31, 48)[1]};${iso(0.75, 0.31, 56)[1]}`} dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0" dur="2.5s" repeatCount="indefinite" />
      </circle>

      {/* Холодильник */}
      {isoBox(0.05, 0.25, 0.13, 0.15, 80, { top: '#f5f5f5', left: '#ddd', right: '#e0e0e0' })}
      <circle cx={iso(0.18, 0.32, 45)[0]} cy={iso(0.18, 0.32, 45)[1]} r="1.5" fill="#aaa" />

      {/* Рамка с рецептом на правой стене */}
      <polygon
        points={isoPoly([iso(1, 0.55, 50), iso(1, 0.68, 50), iso(1, 0.68, 75), iso(1, 0.55, 75)])}
        fill="#fffef0" stroke="#8B7355" strokeWidth="1.5"
      />
      <text x={iso(1, 0.615, 62)[0]} y={iso(1, 0.615, 62)[1]} textAnchor="middle" fontSize="8" fill="#999">📝</text>
    </g>
  );
}

/* ── Статическое окно (для LivingRoomSVG) ── */
function renderWindowStatic() {
  const a1 = 0.2, a2 = 0.45, h1 = 30, h2 = 85;
  return (
    <g>
      <polygon points={isoPoly([iso(a1, 0, h1), iso(a2, 0, h1), iso(a2, 0, h2), iso(a1, 0, h2)])} fill="#87CEEB" stroke="#8B7355" strokeWidth="2" />
      <line {...lineProps(iso((a1 + a2) / 2, 0, h1), iso((a1 + a2) / 2, 0, h2))} stroke="#8B7355" strokeWidth="1.2" />
      <line {...lineProps(iso(a1, 0, (h1 + h2) / 2), iso(a2, 0, (h1 + h2) / 2))} stroke="#8B7355" strokeWidth="1.2" />
      <ellipse cx={iso(0.27, 0, 72)[0]} cy={iso(0.27, 0, 72)[1]} rx="7" ry="3.5" fill="white" opacity="0.7" />
      <ellipse cx={iso(0.33, 0, 75)[0]} cy={iso(0.33, 0, 75)[1]} rx="5" ry="2.5" fill="white" opacity="0.6" />
      <polygon
        points={isoPoly([iso(a1 - 0.02, 0, h1 - 2), iso(a2 + 0.02, 0, h1 - 2), iso(a2 + 0.02, 0.03, h1 - 2), iso(a1 - 0.02, 0.03, h1 - 2)])}
        fill="#7a6345"
      />
      <circle cx={iso(0.33, 0.015, h1 + 3)[0]} cy={iso(0.33, 0.015, h1 + 3)[1]} r="3" fill="#e06060" />
      <line x1={iso(0.33, 0.015, h1 + 3)[0]} y1={iso(0.33, 0.015, h1 + 3)[1]} x2={iso(0.33, 0.015, h1 - 1)[0]} y2={iso(0.33, 0.015, h1 - 1)[1]} stroke="#4a884a" strokeWidth="1" />
    </g>
  );
}

/* ── Хелпер для SVG line ── */
function lineProps([x1, y1]: [number, number], [x2, y2]: [number, number]) {
  return { x1, y1, x2, y2 };
}

export default App;
