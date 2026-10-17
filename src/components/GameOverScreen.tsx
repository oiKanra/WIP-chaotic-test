import React from 'react';

interface GameOverScreenProps {
  score: number;
  highScore: number;
  onRestart: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ score, highScore, onRestart }) => {
  const isNewRecord = score >= highScore && score > 0;

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 animate-fade-in">
      <div className="text-6xl mb-4">💥</div>
      <h1 className="text-5xl md:text-6xl font-bold text-red-500 mb-4">GAME OVER</h1>

      {isNewRecord && (
        <div className="mb-4 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg animate-pulse">
          <p className="text-yellow-400 text-xl">🎉 НОВЫЙ РЕКОРД!</p>
        </div>
      )}

      <div className="mb-8 space-y-3">
        <div className="px-6 py-3 bg-gray-800/80 rounded-lg border border-gray-700">
          <p className="text-gray-400 text-sm">Очки</p>
          <p className="text-3xl font-bold text-cyan-400">{score}</p>
        </div>
        <div className="px-6 py-3 bg-gray-800/80 rounded-lg border border-gray-700">
          <p className="text-gray-400 text-sm">Лучший результат</p>
          <p className="text-2xl font-bold text-yellow-400">{highScore}</p>
        </div>
      </div>

      <button
        onClick={onRestart}
        className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white text-xl font-bold rounded-xl shadow-lg shadow-green-500/30 transform hover:scale-105 transition-all duration-200 active:scale-95"
      >
        🔄 ИГРАТЬ СНОВА
      </button>
    </div>
  );
};

export default GameOverScreen;
