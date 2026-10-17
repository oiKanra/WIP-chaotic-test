import React from 'react';

interface StartScreenProps {
  onStart: () => void;
  highScore: number;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, highScore }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 animate-fade-in">
      <div className="relative mb-8">
        <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent animate-pulse">
          SPACE
        </h1>
        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-clip-text text-transparent">
          DEFENDER
        </h1>
        <div className="absolute -top-4 -right-4 text-4xl animate-bounce">🚀</div>
      </div>

      <div className="mb-8 space-y-2">
        <p className="text-gray-300 text-lg">Защити галактику от вторжения!</p>
        <div className="flex flex-col gap-1 text-sm text-gray-400 mt-4">
          <p>🎮 <span className="text-cyan-400">← →</span> или <span className="text-cyan-400">A D</span> — движение</p>
          <p>🔫 <span className="text-cyan-400">Пробел</span> — стрельба</p>
          <p>📱 На мобильных — касание экрана</p>
        </div>
      </div>

      {highScore > 0 && (
        <div className="mb-6 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
          <p className="text-yellow-400 text-lg">🏆 Рекорд: {highScore}</p>
        </div>
      )}

      <button
        onClick={onStart}
        className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xl font-bold rounded-xl shadow-lg shadow-cyan-500/30 transform hover:scale-105 transition-all duration-200 active:scale-95"
      >
        ▶ НАЧАТЬ ИГРУ
      </button>

      <div className="mt-12 flex gap-6 text-gray-500 text-sm">
        <span>⚡ Уничтожай врагов</span>
        <span>💎 Собирай бонусы</span>
        <span>🛡️ Выживай дольше</span>
      </div>
    </div>
  );
};

export default StartScreen;
