import React, { useState, useRef, useEffect, useCallback } from 'react';

interface RoomProps {
  message: string;
  showMessage: (msg: string) => void;
}

interface ObjectState {
  doorLeft: boolean;
  doorRight: boolean;
  cabinet1: boolean;
  cabinet2: boolean;
  cabinet3: boolean;
  laptop: boolean;
  window: boolean;
  drawer: boolean;
}

const Room: React.FC<RoomProps> = ({ message, showMessage }) => {
  const roomRef = useRef<HTMLDivElement>(null);
  const [spyX, setSpyX] = useState(50);
  const [spyY, setSpyY] = useState(75);
  const [spyDirection, setSpyDirection] = useState<'left' | 'right'>('right');
  const [isWalking, setIsWalking] = useState(false);
  const [objects, setObjects] = useState<ObjectState>({
    doorLeft: false,
    doorRight: false,
    cabinet1: false,
    cabinet2: false,
    cabinet3: false,
    laptop: false,
    window: false,
    drawer: false,
  });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!roomRef.current) return;
    const rect = roomRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Ограничиваем движение шпиона по полу (нижняя часть комнаты)
    const clampedX = Math.max(5, Math.min(95, x));
    const clampedY = Math.max(60, Math.min(92, y));

    if (clampedX > spyX + 1) setSpyDirection('right');
    else if (clampedX < spyX - 1) setSpyDirection('left');

    setSpyX(clampedX);
    setSpyY(clampedY);
    setIsWalking(true);
  }, [spyX]);

  useEffect(() => {
    const timer = setTimeout(() => setIsWalking(false), 200);
    return () => clearTimeout(timer);
  }, [spyX, spyY]);

  const handleObjectClick = (objectName: keyof ObjectState) => {
    const newState = !objects[objectName];
    setObjects(prev => ({ ...prev, [objectName]: newState }));

    const messages: Record<string, [string, string]> = {
      doorLeft: ['🚪 Левая дверь заперта... Нужен ключ-карта!', '🚪 Дверь открыта! Но за ней только стена...'],
      doorRight: ['🚪 Правая дверь заперта. Слышны шаги...', '🚪 Дверь приоткрыта. Пахнет сигаретами.'],
      cabinet1: ['🗄️ Шкафчик пуст. Или кто-то уже был тут?', '🗄️ Нашли фальшивый паспорт! Фото не ваше...'],
      cabinet2: ['🗄️ Заперто на кодовый замок.', '🗄️ Внутри: карта здания и рация.'],
      cabinet3: ['🗄️ Здесь только старые газеты.', '🗄️ Скрытая ниша! Пистолет и деньги.'],
      laptop: ['💻 Ноутбук заблокирован паролем.', '💻 Доступ получен! Файлы с планами операции...'],
      window: ['🪟 За окном ночь. Дождь. Никого нет.', '🪟 Вы открыли окно. Свежий воздух. Побег?'],
      drawer: ['🗃️ Ящик стола заперт.', '🗃️ Нашли ключ-карту и зашифрованную записку!'],
    };

    const [closed, opened] = messages[objectName];
    showMessage(newState ? opened : closed);
  };

  return (
    <div
      ref={roomRef}
      className="relative w-full h-full max-w-5xl max-h-[700px] overflow-hidden cursor-none select-none"
      onMouseMove={handleMouseMove}
      style={{ perspective: '1000px' }}
    >
      {/* Комната - вид сбоку с перспективой */}
      <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
        
        {/* Задняя стена */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900"
          style={{
            backgroundImage: `
              linear-gradient(to bottom, #4a4a5a 0%, #3a3a4a 40%, #2a2a3a 100%)
            `
          }}
        >
          {/* Текстура обоев */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(255,255,255,0.03) 30px, rgba(255,255,255,0.03) 31px)'
          }}></div>
        </div>

        {/* Пол */}
        <div className="absolute bottom-0 left-0 right-0 h-[40%]"
          style={{
            background: 'linear-gradient(to bottom, #3d2b1f 0%, #2a1f15 100%)',
            transform: 'perspective(500px) rotateX(10deg)',
            transformOrigin: 'bottom',
          }}
        >
          {/* Паркет */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `
              repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(0,0,0,0.2) 60px, rgba(0,0,0,0.2) 62px),
              repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 21px)
            `
          }}></div>
        </div>

        {/* Плинтус */}
        <div className="absolute bottom-[39%] left-0 right-0 h-3 bg-gray-900 border-t border-gray-600"></div>

        {/* === ЛЕВАЯ ДВЕРЬ === */}
        <div
          className="absolute left-[5%] bottom-[40%] w-[15%] h-[45%] cursor-pointer group"
          onClick={() => handleObjectClick('doorLeft')}
        >
          {/* Рама двери */}
          <div className="absolute inset-0 bg-gray-900 rounded-t-lg border-2 border-gray-600">
            {/* Дверное полотно */}
            <div
              className="absolute inset-1 rounded-t-md transition-transform duration-700 origin-left"
              style={{
                background: 'linear-gradient(135deg, #5c3d2e 0%, #4a2f20 50%, #3d2518 100%)',
                transform: objects.doorLeft ? 'perspective(300px) rotateY(-60deg)' : 'none',
              }}
            >
              {/* Панели двери */}
              <div className="absolute top-[10%] left-[15%] right-[15%] h-[30%] border-2 border-amber-900/50 rounded-sm bg-amber-950/20"></div>
              <div className="absolute top-[50%] left-[15%] right-[15%] h-[35%] border-2 border-amber-900/50 rounded-sm bg-amber-950/20"></div>
              {/* Ручка */}
              <div className="absolute top-[55%] right-[15%] w-3 h-3 rounded-full bg-yellow-600 shadow-lg shadow-yellow-500/30"></div>
            </div>
            {/* За дверью (видно когда открыта) */}
            {objects.doorLeft && (
              <div className="absolute inset-1 rounded-t-md bg-gray-950 flex items-center justify-center">
                <span className="text-2xl">🧱</span>
              </div>
            )}
          </div>
          {/* Подсказка */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-green-400 text-xs px-2 py-1 rounded whitespace-nowrap font-mono">
            [Левая дверь]
          </div>
        </div>

        {/* === ПРАВАЯ ДВЕРЬ === */}
        <div
          className="absolute right-[5%] bottom-[40%] w-[15%] h-[45%] cursor-pointer group"
          onClick={() => handleObjectClick('doorRight')}
        >
          <div className="absolute inset-0 bg-gray-900 rounded-t-lg border-2 border-gray-600">
            <div
              className="absolute inset-1 rounded-t-md transition-transform duration-700 origin-right"
              style={{
                background: 'linear-gradient(135deg, #5c3d2e 0%, #4a2f20 50%, #3d2518 100%)',
                transform: objects.doorRight ? 'perspective(300px) rotateY(60deg)' : 'none',
              }}
            >
              <div className="absolute top-[10%] left-[15%] right-[15%] h-[30%] border-2 border-amber-900/50 rounded-sm bg-amber-950/20"></div>
              <div className="absolute top-[50%] left-[15%] right-[15%] h-[35%] border-2 border-amber-900/50 rounded-sm bg-amber-950/20"></div>
              <div className="absolute top-[55%] left-[15%] w-3 h-3 rounded-full bg-yellow-600 shadow-lg shadow-yellow-500/30"></div>
            </div>
            {objects.doorRight && (
              <div className="absolute inset-1 rounded-t-md bg-gray-950 flex items-center justify-center">
                <span className="text-2xl opacity-50">👣</span>
              </div>
            )}
          </div>
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-green-400 text-xs px-2 py-1 rounded whitespace-nowrap font-mono">
            [Правая дверь]
          </div>
        </div>

        {/* === ОКНО === */}
        <div
          className="absolute left-[35%] top-[8%] w-[30%] h-[28%] cursor-pointer group"
          onClick={() => handleObjectClick('window')}
        >
          {/* Рама окна */}
          <div className="absolute inset-0 bg-gray-800 rounded border-4 border-gray-600 shadow-inner">
            {/* Стекло */}
            <div
              className="absolute inset-2 transition-all duration-500"
              style={{
                background: objects.window
                  ? 'linear-gradient(to bottom, #1a1a3a 0%, #0a0a2a 50%, #050520 100%)'
                  : 'linear-gradient(to bottom, #1a2a4a 0%, #0a1a3a 50%, #050520 100%)',
              }}
            >
              {/* Ночное небо */}
              <div className="absolute inset-0">
                {/* Звёзды */}
                <div className="absolute top-[15%] left-[20%] w-1 h-1 bg-white rounded-full animate-pulse"></div>
                <div className="absolute top-[25%] left-[60%] w-1 h-1 bg-white rounded-full"></div>
                <div className="absolute top-[10%] left-[80%] w-0.5 h-0.5 bg-white rounded-full"></div>
                <div className="absolute top-[35%] left-[40%] w-0.5 h-0.5 bg-white rounded-full animate-pulse"></div>
                {/* Луна */}
                <div className="absolute top-[15%] right-[20%] w-6 h-6 rounded-full bg-yellow-100 shadow-lg shadow-yellow-200/30"></div>
                {/* Дождь */}
                {objects.window && (
                  <div className="absolute inset-0 opacity-40">
                    {Array.from({ length: 15 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-px bg-blue-300/50 animate-rain"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          height: `${8 + Math.random() * 12}px`,
                          animationDelay: `${Math.random() * 2}s`,
                          animationDuration: `${0.5 + Math.random() * 0.5}s`,
                        }}
                      ></div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Перекладины */}
            <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-gray-600 -translate-x-1/2"></div>
            <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-600 -translate-y-1/2"></div>
          </div>
          {/* Подоконник */}
          <div className="absolute -bottom-2 left-[-5%] right-[-5%] h-3 bg-gray-700 rounded-sm border border-gray-600"></div>
          {/* Шторы */}
          <div className="absolute -top-2 -left-3 w-6 h-[105%] bg-gradient-to-r from-red-900 to-red-800 rounded-b opacity-80"></div>
          <div className="absolute -top-2 -right-3 w-6 h-[105%] bg-gradient-to-l from-red-900 to-red-800 rounded-b opacity-80"></div>
          {/* Карниз */}
          <div className="absolute -top-4 -left-4 -right-4 h-2 bg-amber-800 rounded"></div>

          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-green-400 text-xs px-2 py-1 rounded whitespace-nowrap font-mono">
            [Окно]
          </div>
        </div>

        {/* === СТОЛ === */}
        <div className="absolute left-[28%] bottom-[20%] w-[44%] h-[22%]">
          {/* Столешница */}
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-amber-800 to-amber-900 rounded-t border-t-2 border-amber-700 shadow-lg"></div>
          {/* Ножки стола */}
          <div className="absolute top-4 left-[5%] w-3 bottom-0 bg-amber-900"></div>
          <div className="absolute top-4 right-[5%] w-3 bottom-0 bg-amber-900"></div>
          {/* Передняя панель */}
          <div className="absolute top-4 left-[8%] right-[8%] bottom-[10%] bg-amber-950/50 border border-amber-900/30"></div>
        </div>

        {/* === ШКАФЧИКИ (под столом) === */}
        <div className="absolute left-[28%] bottom-[5%] w-[18%] h-[18%] flex gap-1">
          {/* Шкафчик 1 */}
          <div
            className="flex-1 cursor-pointer group relative"
            onClick={() => handleObjectClick('cabinet1')}
          >
            <div className="absolute inset-0 bg-gray-700 rounded border border-gray-600 transition-transform duration-300 origin-bottom"
              style={{ transform: objects.cabinet1 ? 'translateY(-5px)' : 'none' }}
            >
              <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gray-400"></div>
            </div>
            {objects.cabinet1 && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs">📋</div>
            )}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-green-400 text-[10px] px-1 py-0.5 rounded whitespace-nowrap font-mono">
              [Шкаф 1]
            </div>
          </div>
          {/* Шкафчик 2 */}
          <div
            className="flex-1 cursor-pointer group relative"
            onClick={() => handleObjectClick('cabinet2')}
          >
            <div className="absolute inset-0 bg-gray-700 rounded border border-gray-600 transition-transform duration-300 origin-bottom"
              style={{ transform: objects.cabinet2 ? 'translateY(-5px)' : 'none' }}
            >
              <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gray-400"></div>
            </div>
            {objects.cabinet2 && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs">📡</div>
            )}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-green-400 text-[10px] px-1 py-0.5 rounded whitespace-nowrap font-mono">
              [Шкаф 2]
            </div>
          </div>
          {/* Шкафчик 3 */}
          <div
            className="flex-1 cursor-pointer group relative"
            onClick={() => handleObjectClick('cabinet3')}
          >
            <div className="absolute inset-0 bg-gray-700 rounded border border-gray-600 transition-transform duration-300 origin-bottom"
              style={{ transform: objects.cabinet3 ? 'translateY(-5px)' : 'none' }}
            >
              <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gray-400"></div>
            </div>
            {objects.cabinet3 && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs">🔫</div>
            )}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-green-400 text-[10px] px-1 py-0.5 rounded whitespace-nowrap font-mono">
              [Шкаф 3]
            </div>
          </div>
        </div>

        {/* === ЯЩИК СТОЛА === */}
        <div
          className="absolute left-[55%] bottom-[12%] w-[14%] h-[8%] cursor-pointer group"
          onClick={() => handleObjectClick('drawer')}
        >
          <div
            className="absolute inset-0 bg-amber-900 rounded border border-amber-700 transition-transform duration-300"
            style={{ transform: objects.drawer ? 'translateY(8px)' : 'none' }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-1.5 rounded bg-amber-600"></div>
          </div>
          {objects.drawer && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-xs bg-black/80 text-yellow-400 px-2 py-0.5 rounded">
              🔑 Ключ-карта!
            </div>
          )}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-green-400 text-[10px] px-1 py-0.5 rounded whitespace-nowrap font-mono">
            [Ящик]
          </div>
        </div>

        {/* === НОУТБУК === */}
        <div
          className="absolute left-[42%] bottom-[34%] w-[16%] h-[10%] cursor-pointer group"
          onClick={() => handleObjectClick('laptop')}
        >
          {/* Экран */}
          <div
            className="absolute top-0 left-[10%] right-[10%] h-[65%] bg-gray-900 rounded-t border-2 border-gray-600 transition-all duration-300 origin-bottom"
            style={{ transform: objects.laptop ? 'rotateX(-20deg)' : 'rotateX(-10deg)' }}
          >
            <div className={`absolute inset-1 rounded-sm ${objects.laptop ? 'bg-green-900' : 'bg-gray-800'} flex items-center justify-center`}>
              {objects.laptop ? (
                <div className="text-green-400 text-[8px] font-mono animate-pulse">
                  ACCESS GRANTED
                </div>
              ) : (
                <div className="text-gray-600 text-[8px]">🔒</div>
              )}
            </div>
          </div>
          {/* Клавиатура */}
          <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-gray-700 rounded-b border border-gray-600">
            <div className="absolute inset-1 grid grid-cols-6 grid-rows-2 gap-px">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-gray-600 rounded-sm"></div>
              ))}
            </div>
          </div>
          {/* Индикатор */}
          <div className={`absolute bottom-[30%] right-[15%] w-1 h-1 rounded-full ${objects.laptop ? 'bg-green-400 animate-pulse' : 'bg-red-800'}`}></div>

          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-green-400 text-xs px-2 py-1 rounded whitespace-nowrap font-mono">
            [Ноутбук]
          </div>
        </div>

        {/* === ЛАМПА НАСТОЛЬНАЯ === */}
        <div className="absolute left-[65%] bottom-[34%] w-[6%] h-[14%]">
          {/* Абажур */}
          <div className="absolute top-0 left-0 right-0 h-[40%] bg-green-800 rounded-t-full border border-green-700"
            style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' }}
          ></div>
          {/* Ножка */}
          <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-1 h-[50%] bg-gray-500"></div>
          {/* Основание */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-2 bg-gray-600 rounded-full"></div>
          {/* Свет */}
          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 w-[80%] h-[60%] bg-yellow-200/5 rounded-b-full blur-sm"></div>
        </div>

        {/* === ШПИОН (персонаж) === */}
        <div
          className="absolute transition-all duration-150 ease-out pointer-events-none z-20"
          style={{
            left: `${spyX}%`,
            top: `${spyY}%`,
            transform: `translateX(-50%) translateY(-100%) ${spyDirection === 'left' ? 'scaleX(-1)' : ''}`,
          }}
        >
          <div className={`relative ${isWalking ? 'animate-walk' : ''}`}>
            {/* Тень */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-2 bg-black/40 rounded-full blur-sm"></div>
            {/* Тело */}
            <div className="relative">
              {/* Ноги */}
              <div className={`absolute bottom-0 left-1 w-2 h-4 bg-gray-900 rounded-b ${isWalking ? 'animate-leg-left' : ''}`}></div>
              <div className={`absolute bottom-0 right-1 w-2 h-4 bg-gray-900 rounded-b ${isWalking ? 'animate-leg-right' : ''}`}></div>
              {/* Торс */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-6 h-7 bg-gray-800 rounded-t-lg border border-gray-700">
                {/* Галстук */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-4 bg-red-700" style={{ clipPath: 'polygon(50% 0%, 100% 10%, 80% 100%, 20% 100%, 0% 10%)' }}></div>
              </div>
              {/* Голова */}
              <div className="absolute bottom-9 left-1/2 -translate-x-1/2 w-5 h-5 bg-amber-200 rounded-full border border-amber-300">
                {/* Шляпа */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-7 h-2.5 bg-gray-900 rounded-full"></div>
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-4 h-3 bg-gray-900 rounded-t-full"></div>
                {/* Глаза (солнцезащитные очки) */}
                <div className="absolute top-2 left-0.5 w-2 h-1 bg-black rounded"></div>
                <div className="absolute top-2 right-0.5 w-2 h-1 bg-black rounded"></div>
              </div>
            </div>
          </div>
        </div>

        {/* === КУРСОР (прицел) === */}
        <div className="absolute w-4 h-4 pointer-events-none z-30 mix-blend-difference"
          style={{
            left: `${spyX}%`,
            top: `${spyY - 15}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="w-full h-full border-2 border-green-400 rounded-full opacity-50 animate-pulse"></div>
        </div>

        {/* === СООБЩЕНИЕ === */}
        {message && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-black/90 border border-green-500 rounded-lg px-6 py-3 animate-fade-in">
            <p className="text-green-400 font-mono text-sm">{message}</p>
          </div>
        )}

        {/* Виньетка */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)'
        }}></div>

        {/* Скан-линии (эффект старого монитора) */}
        <div className="absolute inset-0 pointer-events-none opacity-5" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)'
        }}></div>
      </div>
    </div>
  );
};

export default Room;
