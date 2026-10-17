import { useState, useRef, useCallback, useEffect } from 'react';

/*
  Изометрическая комната (2:1 dimetric projection)
  
  Координаты пола (ромб):
    N (верх):  (400, 220)
    E (право): (650, 345)
    S (низ):   (400, 470)
    W (лево):  (150, 345)
  
  Стены высотой 150px вверх от пола.
  Угол наклона стен: atan(0.5) ≈ 26.57°
*/

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 400, y: 300 });
  const [moving, setMoving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const onMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    setMouse({ x: e.clientX - r.left, y: e.clientY - r.top });
    setMoving(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMoving(false), 120);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div
      ref={containerRef}
      className="w-full h-screen bg-white overflow-hidden relative flex items-center justify-center"
      onMouseMove={onMove}
      style={{ cursor: 'none' }}
    >
      <div className="relative" style={{ width: 800, height: 600 }}>

        {/* ═══════ ПОЛ ═══════ */}
        <div className="absolute" style={{
          left: 150, top: 220, width: 500, height: 250,
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          background: 'linear-gradient(135deg, #f0ebe3 0%, #e8e2d8 50%, #ddd6ca 100%)',
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
        {/* BBox: (150,70) → (400,345), size: 250×275 */}
        <div className="absolute" style={{
          left: 150, top: 70, width: 250, height: 275,
          clipPath: 'polygon(0% 100%, 100% 54.5%, 100% 0%, 0% 45.5%)',
          background: 'linear-gradient(to right, #eae6e0 0%, #e0dbd4 100%)',
        }} />

        {/* ═══════ ПРАВАЯ СТЕНА ═══════ */}
        {/* BBox: (400,70) → (650,345), size: 250×275 */}
        <div className="absolute" style={{
          left: 400, top: 70, width: 250, height: 275,
          clipPath: 'polygon(0% 54.5%, 100% 100%, 100% 45.5%, 0% 0%)',
          background: 'linear-gradient(to left, #ddd8d0 0%, #d4cfc6 100%)',
        }} />

        {/* ═══════ УГЛОВАЯ ЛИНИЯ ═══════ */}
        <div className="absolute" style={{
          left: 399, top: 70, width: 2, height: 150,
          background: 'linear-gradient(to bottom, #c8c2b8, transparent)',
        }} />

        {/* ═══════ ОКНО (левая стена) ═══════ */}
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
            {/* Облака */}
            <div className="absolute top-2 left-1 w-7 h-2.5 bg-white/80 rounded-full" />
            <div className="absolute top-1.5 left-3 w-5 h-2.5 bg-white/80 rounded-full" />
            <div className="absolute top-4 right-2 w-5 h-2 bg-white/60 rounded-full" />
          </div>
          {/* Подоконник */}
          <div className="absolute" style={{
            left: -4, bottom: -6, width: 93, height: 5,
            background: '#7a6345',
            transform: 'skewY(-26.5deg)',
            borderRadius: 1,
          }} />
        </div>

        {/* ═══════ ЛЕВАЯ ДВЕРЬ ═══════ */}
        <div className="absolute" style={{ left: 310, top: 128 }}>
          <div style={{
            width: 48, height: 105,
            background: 'linear-gradient(180deg, #6B4226 0%, #5A3520 60%, #4A2A18 100%)',
            border: '2px solid #3A1A08',
            transform: 'skewY(-26.5deg)',
            borderRadius: '2px 2px 0 0',
          }}>
            <div className="absolute top-[8%] left-[12%] right-[12%] h-[28%] border border-amber-900/30 rounded-sm bg-amber-950/10" />
            <div className="absolute top-[44%] left-[12%] right-[12%] h-[35%] border border-amber-900/30 rounded-sm bg-amber-950/10" />
            <div className="absolute top-[52%] right-[14%] w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-md shadow-yellow-600/40" />
          </div>
        </div>

        {/* ═══════ ПРАВАЯ ДВЕРЬ ═══════ */}
        <div className="absolute" style={{ left: 445, top: 128 }}>
          <div style={{
            width: 48, height: 105,
            background: 'linear-gradient(180deg, #7B5236 0%, #6A4530 60%, #5A3828 100%)',
            border: '2px solid #3A1A08',
            transform: 'skewY(26.5deg)',
            borderRadius: '2px 2px 0 0',
          }}>
            <div className="absolute top-[8%] left-[12%] right-[12%] h-[28%] border border-amber-900/30 rounded-sm bg-amber-950/10" />
            <div className="absolute top-[44%] left-[12%] right-[12%] h-[35%] border border-amber-900/30 rounded-sm bg-amber-950/10" />
            <div className="absolute top-[52%] left-[14%] w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-md shadow-yellow-600/40" />
          </div>
        </div>

        {/* ═══════ КОВЁР ═══════ */}
        <div className="absolute" style={{
          left: 330, top: 345, width: 140, height: 70,
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          background: '#c44a4e',
          opacity: 0.45,
        }} />
        <div className="absolute" style={{
          left: 340, top: 350, width: 120, height: 60,
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          background: '#d45a5e',
          opacity: 0.35,
        }} />
        {/* Узор ковра */}
        <div className="absolute" style={{
          left: 365, top: 362, width: 70, height: 35,
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          border: '1px solid rgba(255,200,100,0.3)',
          opacity: 0.4,
        }} />

        {/* ═══════ ШКАФЧИКИ (у задней стены, слева) ═══════ */}
        <IsoCabinet x={210} y={290} topColor="#8899AA" leftColor="#667788" rightColor="#778899" />
        <IsoCabinet x={250} y={270} topColor="#8090A0" leftColor="#607080" rightColor="#708090" />
        <IsoCabinet x={290} y={250} topColor="#8899AA" leftColor="#667788" rightColor="#778899" />

        {/* ═══════ СТОЛ ═══════ */}
        <IsoTable x={350} y={310} />

        {/* ═══════ НОУТБУК (на столе) ═══════ */}
        <IsoLaptop x={380} y={290} />

        {/* ═══════ ЛАМПА (на столе) ═══════ */}
        <div className="absolute" style={{ left: 430, top: 285 }}>
          {/* Основание */}
          <div className="absolute" style={{
            width: 12, height: 6, borderRadius: '50%',
            background: '#555', bottom: 0, left: 0,
          }} />
          {/* Ножка */}
          <div className="absolute" style={{
            width: 2, height: 18, background: '#666', bottom: 5, left: 5,
          }} />
          {/* Абажур */}
          <div className="absolute" style={{
            width: 16, height: 10, bottom: 22, left: -2,
            background: '#e8d888',
            borderRadius: '50% 50% 0 0',
            boxShadow: '0 4px 8px rgba(232,216,136,0.3)',
          }} />
        </div>

        {/* ═══════ РАМКА НА СТЕНЕ (правая) ═══════ */}
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

        {/* ═══════ ЧАСЫ НА СТЕНЕ ═══════ */}
        <div className="absolute" style={{ left: 565, top: 95 }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            border: '2px solid #8B7355',
            background: '#fff',
            transform: 'skewY(26.5deg)',
          }}>
            <div className="absolute top-1/2 left-1/2 w-[1px] h-2 bg-black origin-bottom -translate-x-1/2 -translate-y-full rotate-[30deg]" />
            <div className="absolute top-1/2 left-1/2 w-[1px] h-1.5 bg-black origin-bottom -translate-x-1/2 -translate-y-full rotate-[150deg]" />
          </div>
        </div>

        {/* ═══════ ТЕНЬ ОТ МЫШКИ ═══════ */}
        <div
          className="absolute pointer-events-none z-40"
          style={{
            left: mouse.x + 3,
            top: mouse.y + 5,
            width: 20, height: 10,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.08)',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* ═══════ МЫШКА-ЭМОДЗИ 🐁 ═══════ */}
        <div
          className="absolute pointer-events-none z-50"
          style={{
            left: mouse.x,
            top: mouse.y,
            transform: `translate(-50%, -50%) ${moving ? 'rotate(-8deg) scale(1.15)' : 'rotate(0deg) scale(1)'}`,
            transition: 'transform 0.12s ease-out',
            fontSize: 32,
            filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.12))',
            lineHeight: 1,
          }}
        >
          🐁
        </div>

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   КОМПОНЕНТЫ МЕБЕЛИ
   ═══════════════════════════════════════ */

function IsoTable({ x, y }: { x: number; y: number }) {
  const tw = 110; // ширина столешницы
  const th = 55;  // высота столешницы (ромб)
  const td = 35;  // глубина (высота ножек)

  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {/* Верхняя грань */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: tw, height: th,
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        background: 'linear-gradient(135deg, #b8884c 0%, #a07840 50%, #987038 100%)',
      }} />
      {/* Левая грань */}
      <div style={{
        position: 'absolute', top: th / 2, left: 0,
        width: tw / 2, height: td,
        clipPath: 'polygon(0% 0%, 100% 50%, 100% 100%, 0% 50%)',
        background: 'linear-gradient(180deg, #7a5828 0%, #6a4818 100%)',
      }} />
      {/* Правая грань */}
      <div style={{
        position: 'absolute', top: th / 2, left: tw / 2,
        width: tw / 2, height: td,
        clipPath: 'polygon(0% 50%, 100% 0%, 100% 50%, 0% 100%)',
        background: 'linear-gradient(180deg, #8a6830 0%, #7a5820 100%)',
      }} />
      {/* Ящик */}
      <div style={{
        position: 'absolute', top: th / 2 + 5, left: tw / 2 + 8,
        width: tw / 2 - 16, height: 12,
        clipPath: 'polygon(0% 20%, 100% 0%, 100% 80%, 0% 100%)',
        background: '#6a4818',
        border: '1px solid #5a3808',
      }} />
      {/* Ручка ящика */}
      <div className="absolute" style={{
        top: th / 2 + 10, left: tw / 2 + 22,
        width: 10, height: 2, background: '#c0a060', borderRadius: 1,
      }} />
    </div>
  );
}

function IsoLaptop({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {/* Основание */}
      <div style={{
        position: 'absolute', top: 8, left: 0,
        width: 36, height: 18,
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        background: '#555',
      }} />
      {/* Экран */}
      <div style={{
        position: 'absolute', top: -4, left: 4,
        width: 30, height: 20,
        background: '#333',
        borderRadius: 2,
        transform: 'perspective(100px) rotateX(10deg)',
        border: '1.5px solid #444',
      }}>
        <div className="absolute inset-[2px] bg-[#1a2a3a] rounded-sm flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function IsoCabinet({ x, y, topColor, leftColor, rightColor }: {
  x: number; y: number;
  topColor: string; leftColor: string; rightColor: string;
}) {
  const w = 40;
  const h = 20;
  const d = 45;

  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {/* Верх */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: w, height: h,
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        background: topColor,
      }} />
      {/* Лево */}
      <div style={{
        position: 'absolute', top: h / 2, left: 0,
        width: w / 2, height: d,
        clipPath: 'polygon(0% 0%, 100% 50%, 100% 100%, 0% 50%)',
        background: leftColor,
      }} />
      {/* Право */}
      <div style={{
        position: 'absolute', top: h / 2, left: w / 2,
        width: w / 2, height: d,
        clipPath: 'polygon(0% 50%, 100% 0%, 100% 50%, 0% 100%)',
        background: rightColor,
      }} />
      {/* Ручка */}
      <div className="absolute rounded-full bg-gray-600" style={{
        top: h / 2 + d / 2 - 2, left: w / 4 - 1,
        width: 3, height: 3,
      }} />
    </div>
  );
}

export default App;
