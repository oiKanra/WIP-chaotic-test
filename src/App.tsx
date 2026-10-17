import { useState } from 'react';
import Room from './components/Room';
import IntroScreen from './components/IntroScreen';

type GameState = 'intro' | 'playing';

function App() {
  const [gameState, setGameState] = useState<GameState>('intro');
  const [message, setMessage] = useState<string>('');

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="w-full h-screen bg-black overflow-hidden flex items-center justify-center">
      {gameState === 'intro' && <IntroScreen onStart={() => setGameState('playing')} />}
      {gameState === 'playing' && <Room message={message} showMessage={showMessage} />}
    </div>
  );
}

export default App;
