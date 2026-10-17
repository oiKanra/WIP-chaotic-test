import { useState, useRef, useCallback, useEffect } from 'react';

/*
  Система комнат с переходами
  
  Комната 1: Гостиная (Living Room)
    - Стол с ноутбуком
    - Шкафчики
    - Окно
    - Двери: на кухню (правая стена), в коридор (левая стена)
  
  Комната 2: Кухня (Kitchen)
    - Плита с кастрюлей
    - Кухонный стол с сыром
    - Двери: в гостиную (левая стена), на балкон (правая стена)
*/

type RoomId = 'living' | 'kitchen';

interface Door {
  id: string;
  side: 'left' | 'right';
  targetRoom: RoomId;
  label: string;
}

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

/* Точки интереса для каждой комнаты */
const INTEREST_POINTS: Record<RoomId, Array<{ id: string; x: number; y: number; radius: number; rate: number; label: string }>> = {
  living: [
    { id: 'window', x: 262, y: 180, radius: 80, rate: 0.35, label: '🪟 Окно' },
    { id: 'cabinets', x: 270, y: 310, radius: 70, rate: 0.25, label: '🗄️ Шкафчики' },
  ],
  kitchen: [
    { id: 'kitchen-table', x: 400, y: 380, radius: 80, rate: 0.55, label: '🧀 Кухня' },
    { id: 'stove', x: 560, y: 280, radius: 60, rate: 0.3, label: '🔥 Плита' },
  ],
};

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  const [currentRoom, setCurrentRoom] = useState<RoomId>('living');
  const [mouse, setMouse] = useState({ x: 400, y: 400 });
  const [moving, setMoving] = useState(false);
  const [mood, setMood] = useState(50);
  const [eating, setEating] = useState(false);
  const [cheeseLeft, setCheeseLeft] = useState(5);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const moodRef = useRef(50);
  const eatingRef = useRef(false);

  /* Логика настроения */
  useEffect(() => {
    const interval = setInterval(() => {
      const mx = mouse.x;
      const my = mouse.y;
      const points = INTEREST_POINTS[currentRoom];

      let zone: string | null = null;
      let totalRate = 0;

      for (const pt of points) {
        const dx = mx - pt.x;
        const dy = my - pt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < pt.radius) {
          const proximity = 1 - dist / pt.radius;
          totalRate += pt.rate * proximity;
          zone = pt.id;
        }
      }

      const isEating = zone === 'kitchen-table' && cheeseLeft > 0;

      if (isEating && !eatingRef.current) {
        eatingRef.current = true;
        setEating(true);
      } else if (!isEating && eatingRef.current) {
        eatingRef.current = false;
        setEating(false);
      }

      const effectiveRate = isEating ? totalRate * 1.8 : totalRate;

      let newMood = moodRef.current;
      if (effectiveRate > 0) {
        newMood = Math.min(100, newMood + effectiveRate);
      } else {
        newMood = Math.max(0, newMood - 0.08);
      }

      moodRef.current = newMood;
      setMood(newMood);
      setActiveZone(zone);
    }, 100);

    return () => clearInterval(interval);
  }, [mouse.x, mouse.y, cheeseLeft, currentRoom]);

  /* Клик — съесть сыр или перейти через дверь */
  const handleClick = useCallback(() => {
    if (eatingRef.current && cheeseLeft > 0) {
      setCheeseLeft(prev => prev - 1);
      moodRef.current = Math.min(100, moodRef.current + 8);
      setMood(moodRef.current);
    }
  }, [cheeseLeft]);

  /* Переход в другую комнату */
  const handleDoorClick = useCallback((targetRoom: RoomId) => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrentRoom(targetRoom);
      setMouse({ x: 400, y: 400 }); // Центрируем мышь
      setTimeout(() => setTransitioning(false), 300);
    }, 300);
  }, [transitioning]);

  const onMove = useCallback((e: React.MouseEvent) => {
    if (!roomRef.current || transitioning) return;
    const r = roomRef.current.getBoundingClientRect();
    setMouse({ x: e.clientX - r.left, y: e.clientY - r.top });
    setMoving(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMoving(false), 120);
  }, [transitioning]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const moodEmoji = mood > 80 ? '😍' : mood > 60 ? '😊' : mood > 40 ? '🐁' : mood > 20 ? '😐' : '😢';
  const moodLabel = mood > 80 ? 'Счастлива!' : mood > 60 ? 'Довольна' : mood > 40 ? 'Нормально' : mood > 20 ? 'Скучно...' : 'Грустно...';
  const moodColor = mood > 60 ? 'bg-green-400' : mood > 30 ? 'bg-yellow-400' : 'bg-red-400';
  const mouseEmoji = eating ? '🐁✨' : moodEmoji === '😍' ? '🐁💕' : '🐁';

  const roomConfig = ROOMS[currentRoom];

  return (
    <div
      ref={containerRef}
      className="w-full h-screen bg-white overflow-hidden relative flex items-center justify-center"
      style={{ cursor: transitioning ? 'wait' : 'none' }}
    >
      <div
        ref={roomRef}
        className={`relative transition-opacity duration-300 ${transitioning ? 'opacity-0' : 'opacity-100'}`}
        style={{ width: 800, height: 600 }}
        onMouseMove={onMove}
        onClick={handleClick}
      >

        {/* ═══════ ПОЛ ═══════ */}
        <div className="absolute" style={{
          left: 150, top: 220, width: 500, height: 250,
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          background: currentRoom === 'living'
            ? 'linear-gradient(135deg, #f0ebe3 0%, #e8e2d8 50%, #ddd6ca 100%)'
            : 'linear-gradient(135deg, #e8e0d0 0%, #ddd5c5 50%, #d2cab8 100%)',
        }}>
          <svg width="500" height="250" className="absolute inset-0 opacity-15">
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={`a${i}`} x1={i * 50} y1={0} x2={i * 50} y2={250} stroke="#b0a090" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <line key={`b${i}`} x1={0} y1={i * 50} x2={500} y2={i * 50} stroke="#b0a090" strokeWidth="0.5" />
            ))}
          </svg>
        </div>

        {/* ═══════ ЛЕВАЯ СТЕНА ═══════ */}
        <div className="absolute" style={{
          left: 150, top: 70, width: 250, height: 275,
          clipPath: 'polygon(0% 100%, 100% 54.5%, 100% 0%, 0% 45.5%)',
          background: currentRoom === 'living'
            ? 'linear-gradient(to right, #eae6e0 0%, #e0dbd4 100%)'
            : 'linear-gradient(to right, #f5f0e8 0%, #ebe5d8 100%)',
        }} />

        {/* ═══════ ПРАВАЯ СТЕНА ═══════ */}
        <div className="absolute" style={{
          left: 400, top: 70, width: 250, height: 275,
          clipPath: 'polygon(0% 54.5%, 100% 100%, 100% 45.5%, 0% 0%)',
          background: currentRoom === 'living'
            ? 'linear-gradient(to left, #ddd8d0 0%, #d4cfc6 100%)'
            : 'linear-gradient(to left, #ebe5d8 0%, #e0d9cc 100%)',
        }} />

        {/* ═══════ УГЛОВАЯ ЛИНИЯ ═══════ */}
        <div className="absolute" style={{
          left: 399, top: 70, width: 2, height: 150,
          background: 'linear-gradient(to bottom, #c8c2b8, transparent)',
        }} />

        {/* ═══════ ДВЕРИ ═══════ */}
        {roomConfig.doors.map(door => (
          <IsoDoor
            key={door.id}
            side={door.side}
            onClick={() => handleDoorClick(door.targetRoom)}
            label={door.label}
          />
        ))}

        {/* ═══════ СОДЕРЖИМОЕ КОМНАТЫ ═══════ */}
        {currentRoom === 'living' && <LivingRoomContent />}
        {currentRoom === 'kitchen' && <KitchenContent cheeseLeft={cheeseLeft} />}

        {/* ═══════ HUD ═══════ */}
        <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 pointer-events-none">
          {/* Название комнаты */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-gray-200">
            <span className="text-sm font-semibold text-gray-700">🏠 {roomConfig.name}</span>
          </div>

          {/* Настроение */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{moodEmoji}</span>
              <span className="text-xs font-medium text-gray-600">{moodLabel}</span>
            </div>
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full ${moodColor} rounded-full transition-all duration-300`} style={{ width: `${mood}%` }} />
            </div>
            <div className="text-[10px] text-gray-400 mt-1 text-right">{Math.round(mood)}%</div>
          </div>

          {/* Активная зона */}
          {activeZone && (
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow border border-gray-200 animate-fade-in">
              <span className="text-xs text-gray-500">
                {INTEREST_POINTS[currentRoom].find(p => p.id === activeZone)?.label}
              </span>
            </div>
          )}

          {/* Сыр (только на кухне) */}
          {currentRoom === 'kitchen' && (
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow border border-gray-200">
              <span className="text-xs text-gray-500">
                🧀 Сыр: {cheeseLeft > 0 ? '🧀'.repeat(cheeseLeft) : 'пусто 😢'}
              </span>
            </div>
          )}
        </div>

        {/* Подсказка при еде */}
        {eating && (
          <div className="absolute top-4 right-4 z-50 bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-2 shadow animate-pulse pointer-events-none">
            <span className="text-sm text-yellow-800">🐁 Ням-ням! Кликни чтобы съесть! 🧀</span>
          </div>
        )}

        {/* ═══════ ТЕНЬ ОТ МЫШКИ ═══════ */}
        <div
          className="absolute pointer-events-none z-40"
          style={{
            left: mouse.x + 3, top: mouse.y + 5,
            width: 20, height: 10,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.08)',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* ═══════ МЫШКА-ЭМОДЗИ ═══════ */}
        <div
          className="absolute pointer-events-none z-50"
          style={{
            left: mouse.x, top: mouse.y,
            transform: `translate(-50%, -50%) ${moving ? 'rotate(-8deg) scale(1.15)' : 'rotate(0deg) scale(1)'}`,
            transition: 'transform 0.12s ease-out',
            fontSize: 32,
            filter: eating
              ? 'drop-shadow(0 0 8px rgba(255,200,0,0.5))'
              : mood > 70
                ? 'drop-shadow(0 0 6px rgba(255,100,150,0.4))'
                : 'drop-shadow(1px 2px 3px rgba(0,0,0,0.12))',
            lineHeight: 1,
          }}
        >
          {mouseEmoji}
        </div>

        {/* Частицы при еде */}
        {eating && (
          <div className="absolute pointer-events-none z-40" style={{ left: mouse.x, top: mouse.y - 20 }}>
            <span className="absolute text-xs animate-float-up" style={{ left: -8, animationDelay: '0s' }}>✨</span>
            <span className="absolute text-xs animate-float-up" style={{ left: 4, animationDelay: '0.3s' }}>⭐</span>
            <span className="absolute text-xs animate-float-up" style={{ left: -2, animationDelay: '0.6s' }}>💛</span>
          </div>
        )}

        {/* Подсказка */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-gray-300 text-[10px] font-mono tracking-wider pointer-events-none">
          {currentRoom === 'living' ? 'подойди к окну 🪟 или шкафчикам 🗄️ • кликни на дверь для перехода' : 'подойди к сыру 🧀 и кликай • кликни на дверь для перехода'}
        </div>

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   КОМПОНЕНТЫ КОМНАТ
   ═══════════════════════════════════════ */

function LivingRoomContent() {
  return (
    <>
      {/* Окно */}
      <div className="absolute" style={{ left: 220, top: 105 }}>
        <div style={{
          width: 85, height: 72,
          background: 'linear-gradient(180deg, #a8d8f0 0%, #87CEEB 60%, #6bb8d9 100%)',
          border: '3px solid #8B7355',
          transform: 'skewY(-26.5deg)',
          boxShadow: 'inset 0 0 20px rgba(135,206,235,0.4)',
        }}>
          <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-amber-800/70 -translate-x-1/2" />
          <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-amber-800/70 -translate-y-1/2" />
          <div className="absolute top-2 left-1 w-7 h-2.5 bg-white/80 rounded-full" />
          <div className="absolute top-1.5 left-3 w-5 h-2.5 bg-white/80 rounded-full" />
          <div className="absolute top-4 right-2 w-5 h-2 bg-white/60 rounded-full" />
        </div>
        <div className="absolute" style={{
          left: -4, bottom: -6, width: 93, height: 5,
          background: '#7a6345',
          transform: 'skewY(-26.5deg)',
          borderRadius: 1,
        }} />
        <div className="absolute" style={{ left: 30, bottom: -2 }}>
          <div style={{ width: 8, height: 8, background: '#e06060', borderRadius: '50%', transform: 'skewY(-26.5deg)' }} />
          <div style={{ width: 2, height: 6, background: '#4a8', position: 'absolute', bottom: -5, left: 3 }} />
          <div style={{ width: 7, height: 4, background: '#8B6345', borderRadius: '0 0 2px 2px', position: 'absolute', bottom: -9, left: 0, transform: 'skewY(-26.5deg)' }} />
        </div>
      </div>

      {/* Шкафчики */}
      <IsoCabinet x={210} y={290} topColor="#8899AA" leftColor="#667788" rightColor="#778899" />
      <IsoCabinet x={250} y={270} topColor="#8090A0" leftColor="#607080" rightColor="#708090" />
      <IsoCabinet x={290} y={250} topColor="#8899AA" leftColor="#667788" rightColor="#778899" />

      {/* Стол */}
      <IsoTable x={350} y={310} />

      {/* Ноутбук */}
      <IsoLaptop x={380} y={290} />

      {/* Лампа */}
      <div className="absolute" style={{ left: 430, top: 285 }}>
        <div className="absolute" style={{ width: 12, height: 6, borderRadius: '50%', background: '#555', bottom: 0, left: 0 }} />
        <div className="absolute" style={{ width: 2, height: 18, background: '#666', bottom: 5, left: 5 }} />
        <div className="absolute" style={{
          width: 16, height: 10, bottom: 22, left: -2,
          background: '#e8d888', borderRadius: '50% 50% 0 0',
          boxShadow: '0 4px 8px rgba(232,216,136,0.3)',
        }} />
      </div>

      {/* Ковёр */}
      <div className="absolute" style={{
        left: 330, top: 345, width: 140, height: 70,
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        background: '#c44a4e', opacity: 0.45,
      }} />
      <div className="absolute" style={{
        left: 340, top: 350, width: 120, height: 60,
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        background: '#d45a5e', opacity: 0.35,
      }} />

      {/* Рамка */}
      <div className="absolute" style={{ left: 520, top: 115 }}>
        <div style={{
          width: 40, height: 32,
          border: '2px solid #8B7355',
          background: '#f5f0e0',
          transform: 'skewY(26.5deg)',
        }}>
          <div className="absolute inset-1 bg-gradient-to-br from-green-200 to-blue-200 opacity-50" />
        </div>
      </div>

      {/* Часы */}
      <div className="absolute" style={{ left: 565, top: 95 }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          border: '2px solid #8B7355', background: '#fff',
          transform: 'skewY(26.5deg)',
        }}>
          <div className="absolute top-1/2 left-1/2 w-[1px] h-2 bg-black origin-bottom -translate-x-1/2 -translate-y-full rotate-[30deg]" />
          <div className="absolute top-1/2 left-1/2 w-[1px] h-1.5 bg-black origin-bottom -translate-x-1/2 -translate-y-full rotate-[150deg]" />
        </div>
      </div>
    </>
  );
}

function KitchenContent({ cheeseLeft }: { cheeseLeft: number }) {
  return (
    <>
      {/* Кухонный стол */}
      <IsoKitchenTable x={360} y={350} />

      {/* Тарелка с сыром */}
      <IsoCheesePlate x={390} y={335} pieces={cheeseLeft} />

      {/* Плита */}
      <IsoStove x={520} y={260} />

      {/* Кастрюля */}
      <div className="absolute" style={{ left: 533, top: 242 }}>
        <div style={{
          width: 14, height: 10, borderRadius: '0 0 4px 4px',
          background: 'linear-gradient(180deg, #666 0%, #444 100%)',
          border: '1px solid #555',
        }}>
          <div className="absolute -top-3 left-1 w-1 h-3 bg-gray-300/40 rounded-full animate-pulse" />
          <div className="absolute -top-4 left-3 w-1 h-4 bg-gray-300/30 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
          <div className="absolute -top-2 left-5 w-1 h-2 bg-gray-300/30 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
        </div>
      </div>

      {/* Холодильник */}
      <IsoFridge x={200} y={280} />

      {/* Рамка с рецептом */}
      <div className="absolute" style={{ left: 520, top: 115 }}>
        <div style={{
          width: 40, height: 32,
          border: '2px solid #8B7355',
          background: '#fffef0',
          transform: 'skewY(26.5deg)',
        }}>
          <div className="absolute inset-1 text-[6px] text-gray-400 font-mono">📝</div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════
   КОМПОНЕНТЫ МЕБЕЛИ
   ═══════════════════════════════════════ */

function IsoDoor({ side, onClick, label }: { side: 'left' | 'right'; onClick: () => void; label: string }) {
  const isLeft = side === 'left';
  return (
    <div
      className="absolute cursor-pointer group"
      style={{ left: isLeft ? 310 : 445, top: 128 }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <div style={{
        width: 48, height: 105,
        background: 'linear-gradient(180deg, #6B4226 0%, #5A3520 60%, #4A2A18 100%)',
        border: '2px solid #3A1A08',
        transform: `skewY(${isLeft ? -26.5 : 26.5}deg)`,
        borderRadius: '2px 2px 0 0',
        transition: 'all 0.2s',
      }}
        className="group-hover:brightness-110"
      >
        <div className="absolute top-[8%] left-[12%] right-[12%] h-[28%] border border-amber-900/30 rounded-sm bg-amber-950/10" />
        <div className="absolute top-[44%] left-[12%] right-[12%] h-[35%] border border-amber-900/30 rounded-sm bg-amber-950/10" />
        <div className={`absolute top-[52%] ${isLeft ? 'right-[14%]' : 'left-[14%]'} w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-md shadow-yellow-600/40`} />
      </div>
      {/* Подсказка */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-green-400 text-xs px-2 py-1 rounded whitespace-nowrap font-mono">
        {label}
      </div>
    </div>
  );
}

function IsoTable({ x, y }: { x: number; y: number }) {
  const tw = 110, th = 55, td = 35;
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: tw, height: th, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', background: 'linear-gradient(135deg, #b8884c 0%, #a07840 50%, #987038 100%)' }} />
      <div style={{ position: 'absolute', top: th / 2, left: 0, width: tw / 2, height: td, clipPath: 'polygon(0% 0%, 100% 50%, 100% 100%, 0% 50%)', background: 'linear-gradient(180deg, #7a5828 0%, #6a4818 100%)' }} />
      <div style={{ position: 'absolute', top: th / 2, left: tw / 2, width: tw / 2, height: td, clipPath: 'polygon(0% 50%, 100% 0%, 100% 50%, 0% 100%)', background: 'linear-gradient(180deg, #8a6830 0%, #7a5820 100%)' }} />
      <div style={{ position: 'absolute', top: th / 2 + 5, left: tw / 2 + 8, width: tw / 2 - 16, height: 12, clipPath: 'polygon(0% 20%, 100% 0%, 100% 80%, 0% 100%)', background: '#6a4818', border: '1px solid #5a3808' }} />
      <div className="absolute" style={{ top: th / 2 + 10, left: tw / 2 + 22, width: 10, height: 2, background: '#c0a060', borderRadius: 1 }} />
    </div>
  );
}

function IsoLaptop({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      <div style={{ position: 'absolute', top: 8, left: 0, width: 36, height: 18, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', background: '#555' }} />
      <div style={{ position: 'absolute', top: -4, left: 4, width: 30, height: 20, background: '#333', borderRadius: 2, transform: 'perspective(100px) rotateX(10deg)', border: '1.5px solid #444' }}>
        <div className="absolute inset-[2px] bg-[#1a2a3a] rounded-sm flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function IsoCabinet({ x, y, topColor, leftColor, rightColor }: {
  x: number; y: number; topColor: string; leftColor: string; rightColor: string;
}) {
  const w = 40, h = 20, d = 45;
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: w, height: h, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', background: topColor }} />
      <div style={{ position: 'absolute', top: h / 2, left: 0, width: w / 2, height: d, clipPath: 'polygon(0% 0%, 100% 50%, 100% 100%, 0% 50%)', background: leftColor }} />
      <div style={{ position: 'absolute', top: h / 2, left: w / 2, width: w / 2, height: d, clipPath: 'polygon(0% 50%, 100% 0%, 100% 50%, 0% 100%)', background: rightColor }} />
      <div className="absolute rounded-full bg-gray-600" style={{ top: h / 2 + d / 2 - 2, left: w / 4 - 1, width: 3, height: 3 }} />
    </div>
  );
}

function IsoKitchenTable({ x, y }: { x: number; y: number }) {
  const tw = 80, th = 40, td = 30;
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: tw, height: th, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', background: 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 50%, #d5d5d5 100%)' }} />
      <div style={{ position: 'absolute', top: th / 2, left: 0, width: tw / 2, height: td, clipPath: 'polygon(0% 0%, 100% 50%, 100% 100%, 0% 50%)', background: 'linear-gradient(180deg, #c8c8c8 0%, #b0b0b0 100%)' }} />
      <div style={{ position: 'absolute', top: th / 2, left: tw / 2, width: tw / 2, height: td, clipPath: 'polygon(0% 50%, 100% 0%, 100% 50%, 0% 100%)', background: 'linear-gradient(180deg, #d0d0d0 0%, #b8b8b8 100%)' }} />
      <div style={{ position: 'absolute', top: th / 2 + 3, left: tw / 2 + 6, width: tw / 2 - 12, height: td - 8, clipPath: 'polygon(0% 10%, 100% 0%, 100% 90%, 0% 100%)', background: '#bbb', border: '1px solid #aaa' }} />
      <div className="absolute" style={{ top: th / 2 + td / 2, left: tw / 2 + 16, width: 8, height: 2, background: '#888', borderRadius: 1 }} />
    </div>
  );
}

function IsoCheesePlate({ x, y, pieces }: { x: number; y: number; pieces: number }) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: 30, height: 15,
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        background: 'linear-gradient(135deg, #fff 0%, #f0f0f0 50%, #e8e8e8 100%)',
        border: '1px solid #ddd',
      }} />
      {pieces > 0 && (
        <div className="absolute" style={{ top: -2, left: 8 }}>
          {Array.from({ length: Math.min(pieces, 5) }).map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                width: 6, height: 5,
                background: `linear-gradient(135deg, #FFD700 0%, #FFC107 50%, #FFB300 100%)`,
                borderRadius: '1px',
                left: (i % 3) * 5 - 2,
                top: Math.floor(i / 3) * 3 - 1,
                transform: `rotate(${i * 15 - 20}deg)`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              }}
            >
              <div className="absolute w-1 h-1 rounded-full bg-amber-600/30" style={{ top: 1, left: 2 }} />
            </div>
          ))}
        </div>
      )}
      {pieces === 0 && (
        <div className="absolute text-[8px]" style={{ top: -4, left: 6, opacity: 0.4 }}>
          🍽️
        </div>
      )}
    </div>
  );
}

function IsoStove({ x, y }: { x: number; y: number }) {
  const w = 50, h = 25, d = 55;
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: w, height: h, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', background: 'linear-gradient(135deg, #444 0%, #333 100%)' }}>
        <div className="absolute" style={{ top: '30%', left: '25%', width: 8, height: 4, borderRadius: '50%', background: '#222', border: '1px solid #555' }} />
        <div className="absolute" style={{ top: '30%', left: '55%', width: 8, height: 4, borderRadius: '50%', background: '#222', border: '1px solid #555' }} />
        <div className="absolute animate-pulse" style={{ top: '25%', left: '26%', width: 6, height: 3, borderRadius: '50%', background: 'radial-gradient(#ff6600, #ff4400, transparent)', opacity: 0.7 }} />
      </div>
      <div style={{ position: 'absolute', top: h / 2, left: 0, width: w / 2, height: d, clipPath: 'polygon(0% 0%, 100% 50%, 100% 100%, 0% 50%)', background: 'linear-gradient(180deg, #333 0%, #222 100%)' }} />
      <div style={{ position: 'absolute', top: h / 2, left: w / 2, width: w / 2, height: d, clipPath: 'polygon(0% 50%, 100% 0%, 100% 50%, 0% 100%)', background: 'linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%)' }}>
        <div style={{ position: 'absolute', top: '15%', left: '15%', right: '15%', bottom: '15%', background: '#1a1a1a', border: '1px solid #444', borderRadius: 2 }}>
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-gray-600 rounded" />
        </div>
      </div>
    </div>
  );
}

function IsoFridge({ x, y }: { x: number; y: number }) {
  const w = 45, h = 22, d = 70;
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: w, height: h, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)' }} />
      <div style={{ position: 'absolute', top: h / 2, left: 0, width: w / 2, height: d, clipPath: 'polygon(0% 0%, 100% 50%, 100% 100%, 0% 50%)', background: 'linear-gradient(180deg, #ddd 0%, #ccc 100%)' }} />
      <div style={{ position: 'absolute', top: h / 2, left: w / 2, width: w / 2, height: d, clipPath: 'polygon(0% 50%, 100% 0%, 100% 50%, 0% 100%)', background: 'linear-gradient(180deg, #e0e0e0 0%, #d0d0d0 100%)' }}>
        <div className="absolute rounded-full bg-gray-400" style={{ top: '40%', left: '20%', width: 3, height: 3 }} />
      </div>
    </div>
  );
}

export default App;
