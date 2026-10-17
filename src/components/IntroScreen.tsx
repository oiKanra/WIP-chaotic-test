import React from 'react';

interface IntroScreenProps {
  onStart: () => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 animate-fade-in relative overflow-hidden">
      {/* Фоновые линии как в шпионских фильмах */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(0,255,0,0.1) 50px, rgba(0,255,0,0.1) 51px), repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(0,255,0,0.1) 50px, rgba(0,255,0,0.1) 51px)'
        }}></div>
      </div>

      <div className="relative z-10">
        <div className="text-8xl mb-6 animate-bounce">🕵️</div>
        <h1 className="text-5xl md:text-7xl font-bold text-green-400 mb-2 tracking-wider" style={{
          textShadow: '0 0 20px rgba(0,255,0,0.5), 0 0 40px rgba(0,255,0,0.3)'
        }}>
          SPY ROOM
        </h1>
        <p className="text-gray-400 text-lg mb-8 italic">Вдохновлено Spy vs Spy</p>

        <div className="mb-8 space-y-2 text-left bg-gray-900/50 border border-green-900/50 rounded-lg p-6 max-w-md">
          <p className="text-green-400 text-sm font-mono">{'>'} МИССИЯ: ОБЫСК КОМНАТЫ</p>
          <p className="text-gray-300 text-sm">🖱️ Двигайте мышью — шпион следует за курсором</p>
          <p className="text-gray-300 text-sm">🚪 Кликайте на объекты для взаимодействия</p>
          <p className="text-gray-300 text-sm">🔍 Найдите все секреты в комнате</p>
        </div>

        <button
          onClick={onStart}
          className="px-8 py-4 bg-green-600 hover:bg-green-500 text-black text-xl font-bold rounded-lg shadow-lg shadow-green-500/30 transform hover:scale-105 transition-all duration-200 active:scale-95 border-2 border-green-400"
          style={{ textShadow: 'none' }}
        >
          ▶ НАЧАТЬ МИССИЮ
        </button>

        <p className="text-gray-600 text-xs mt-8 font-mono">CLASSIFIED // TOP SECRET // EYES ONLY</p>
      </div>
    </div>
  );
};

export default IntroScreen;
