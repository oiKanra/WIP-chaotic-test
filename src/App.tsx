import { useState } from 'react';
import Game from './components/Game';
import StartScreen from './components/StartScreen';
import GameOverScreen from './components/GameOverScreen';

type GameState = 'start' | 'playing' | 'gameover';

function App() {
  const [gameState, setGameState] = useState<GameState>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('spaceDefenderHighScore');
    return saved ? parseInt(saved) : 0;
  });

  const handleStart = () => {
    setScore(0);
    setGameState('playing');
  };

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('spaceDefenderHighScore', finalScore.toString());
    }
    setGameState('gameover');
  };

  return (
    <div className="w-full h-screen bg-gray-900 overflow-hidden flex items-center justify-center">
      {gameState === 'start' && <StartScreen onStart={handleStart} highScore={highScore} />}
      {gameState === 'playing' && <Game onGameOver={handleGameOver} />}
      {gameState === 'gameover' && (
        <GameOverScreen score={score} highScore={highScore} onRestart={handleStart} />
      )}
    </div>
  );
}

export default App;
