import React, { useRef, useEffect, useCallback, useState } from 'react';

interface GameProps {
  onGameOver: (score: number) => void;
}

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
}

interface Bullet {
  x: number;
  y: number;
  speed: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  health: number;
  type: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface PowerUp {
  x: number;
  y: number;
  type: 'shield' | 'rapid' | 'multi';
  speed: number;
}

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  health: number;
  maxHealth: number;
  shield: boolean;
  shieldTimer: number;
  rapidFire: boolean;
  rapidFireTimer: number;
  multiShot: boolean;
  multiShotTimer: number;
}

const Game: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const gameStateRef = useRef({
    player: {
      x: 0,
      y: 0,
      width: 40,
      height: 40,
      speed: 6,
      health: 3,
      maxHealth: 3,
      shield: false,
      shieldTimer: 0,
      rapidFire: false,
      rapidFireTimer: 0,
      multiShot: false,
      multiShotTimer: 0,
    } as Player,
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    stars: [] as Star[],
    particles: [] as Particle[],
    powerUps: [] as PowerUp[],
    score: 0,
    level: 1,
    enemySpawnTimer: 0,
    enemySpawnRate: 60,
    shootTimer: 0,
    shootRate: 15,
    frameCount: 0,
    gameOver: false,
    canvasWidth: 0,
    canvasHeight: 0,
    touchX: null as number | null,
  });

  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(3);
  const [level, setLevel] = useState(1);
  const [shieldActive, setShieldActive] = useState(false);
  const [rapidActive, setRapidActive] = useState(false);
  const [multiActive, setMultiActive] = useState(false);

  const initStars = useCallback((width: number, height: number) => {
    const stars: Star[] = [];
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.5 + Math.random() * 2,
        size: 0.5 + Math.random() * 2,
      });
    }
    return stars;
  }, []);

  const createParticles = (x: number, y: number, color: string, count: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color,
        size: 2 + Math.random() * 3,
      });
    }
    return particles;
  };

  const spawnEnemy = (width: number, level: number): Enemy => {
    const type = Math.random() < 0.2 + level * 0.05 ? Math.floor(Math.random() * 3) : 0;
    const sizes = [
      { w: 30, h: 30 },
      { w: 40, h: 40 },
      { w: 50, h: 50 },
    ];
    const healths = [1, 2, 3];
    const speeds = [2 + level * 0.3, 1.5 + level * 0.2, 1 + level * 0.15];

    return {
      x: Math.random() * (width - 60) + 30,
      y: -50,
      width: sizes[type].w,
      height: sizes[type].h,
      speed: speeds[type],
      health: healths[type],
      type,
    };
  };

  const spawnPowerUp = (x: number): PowerUp => {
    const types: Array<'shield' | 'rapid' | 'multi'> = ['shield', 'rapid', 'multi'];
    return {
      x,
      y: -20,
      type: types[Math.floor(Math.random() * types.length)],
      speed: 2,
    };
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player) => {
    const { x, y, width, height, shield } = player;

    // Корабль
    ctx.save();
    ctx.translate(x, y);

    // Огонь двигателя
    const flameHeight = 10 + Math.random() * 8;
    const gradient = ctx.createLinearGradient(0, height / 2, 0, height / 2 + flameHeight);
    gradient.addColorStop(0, '#ff6600');
    gradient.addColorStop(0.5, '#ffaa00');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-8, height / 2);
    ctx.lineTo(0, height / 2 + flameHeight);
    ctx.lineTo(8, height / 2);
    ctx.fill();

    // Корпус корабля
    ctx.fillStyle = '#00d4ff';
    ctx.beginPath();
    ctx.moveTo(0, -height / 2);
    ctx.lineTo(-width / 2, height / 2);
    ctx.lineTo(-width / 4, height / 3);
    ctx.lineTo(width / 4, height / 3);
    ctx.lineTo(width / 2, height / 2);
    ctx.closePath();
    ctx.fill();

    // Кабина
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.ellipse(0, -5, 6, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Крылья
    ctx.fillStyle = '#0088cc';
    ctx.beginPath();
    ctx.moveTo(-width / 2, height / 2);
    ctx.lineTo(-width / 2 - 8, height / 2 + 5);
    ctx.lineTo(-width / 3, height / 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(width / 2, height / 2);
    ctx.lineTo(width / 2 + 8, height / 2 + 5);
    ctx.lineTo(width / 3, height / 4);
    ctx.fill();

    // Щит
    if (shield) {
      ctx.strokeStyle = `rgba(0, 200, 255, ${0.5 + Math.sin(Date.now() / 100) * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, width / 2 + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(0, 200, 255, 0.1)`;
      ctx.fill();
    }

    ctx.restore();
  };

  const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy) => {
    const { x, y, width, height, type } = enemy;
    ctx.save();
    ctx.translate(x, y);

    const colors = ['#ff4444', '#ff8800', '#ff00ff'];
    const color = colors[type];

    // Тело врага
    ctx.fillStyle = color;
    if (type === 0) {
      // Простой враг - ромб
      ctx.beginPath();
      ctx.moveTo(0, -height / 2);
      ctx.lineTo(width / 2, 0);
      ctx.lineTo(0, height / 2);
      ctx.lineTo(-width / 2, 0);
      ctx.closePath();
      ctx.fill();
    } else if (type === 1) {
      // Средний враг - шестиугольник
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        const px = Math.cos(angle) * width / 2;
        const py = Math.sin(angle) * height / 2;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      // Большой враг - звезда
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const outerX = Math.cos(angle) * width / 2;
        const outerY = Math.sin(angle) * height / 2;
        const innerAngle = angle + Math.PI / 5;
        const innerX = Math.cos(innerAngle) * width / 4;
        const innerY = Math.sin(innerAngle) * height / 4;
        if (i === 0) ctx.moveTo(outerX, outerY);
        else ctx.lineTo(outerX, outerY);
        ctx.lineTo(innerX, innerY);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Глаз
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const drawBullet = (ctx: CanvasRenderingContext2D, bullet: Bullet) => {
    const gradient = ctx.createLinearGradient(bullet.x, bullet.y - 10, bullet.x, bullet.y + 5);
    gradient.addColorStop(0, '#00ffff');
    gradient.addColorStop(1, '#0066ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(bullet.x - 2, bullet.y - 8, 4, 16);

    // Свечение
    ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 6, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawPowerUp = (ctx: CanvasRenderingContext2D, powerUp: PowerUp) => {
    const { x, y, type } = powerUp;
    const colors = { shield: '#00aaff', rapid: '#ffaa00', multi: '#ff00ff' };
    const symbols = { shield: '🛡', rapid: '⚡', multi: '✦' };

    ctx.save();
    ctx.translate(x, y);

    // Свечение
    ctx.fillStyle = `${colors[type]}33`;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    // Основа
    ctx.fillStyle = colors[type];
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    // Символ
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbols[type], 0, 0);

    ctx.restore();
  };

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = gameStateRef.current;
    const { canvasWidth: W, canvasHeight: H } = state;

    if (state.gameOver) return;

    state.frameCount++;

    // Очистка
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    // Звёзды
    state.stars.forEach((star) => {
      star.y += star.speed;
      if (star.y > H) {
        star.y = 0;
        star.x = Math.random() * W;
      }
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + star.size / 4})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // Управление игроком
    const player = state.player;
    if (keysRef.current.has('ArrowLeft') || keysRef.current.has('a') || keysRef.current.has('A')) {
      player.x -= player.speed;
    }
    if (keysRef.current.has('ArrowRight') || keysRef.current.has('d') || keysRef.current.has('D')) {
      player.x += player.speed;
    }

    // Touch управление
    if (state.touchX !== null) {
      const diff = state.touchX - player.x;
      if (Math.abs(diff) > 5) {
        player.x += Math.sign(diff) * Math.min(Math.abs(diff) * 0.15, player.speed);
      }
    }

    // Ограничение позиции
    player.x = Math.max(player.width / 2, Math.min(W - player.width / 2, player.x));

    // Автоматическая стрельба
    state.shootTimer++;
    const currentShootRate = player.rapidFire ? state.shootRate / 3 : state.shootRate;
    if (state.shootTimer >= currentShootRate) {
      state.shootTimer = 0;
      if (player.multiShot) {
        state.bullets.push({ x: player.x - 15, y: player.y - player.height / 2, speed: -10 });
        state.bullets.push({ x: player.x, y: player.y - player.height / 2 - 5, speed: -10 });
        state.bullets.push({ x: player.x + 15, y: player.y - player.height / 2, speed: -10 });
      } else {
        state.bullets.push({ x: player.x, y: player.y - player.height / 2, speed: -10 });
      }
    }

    // Обновление таймеров бонусов
    if (player.shield) {
      player.shieldTimer--;
      if (player.shieldTimer <= 0) {
        player.shield = false;
        setShieldActive(false);
      }
    }
    if (player.rapidFire) {
      player.rapidFireTimer--;
      if (player.rapidFireTimer <= 0) {
        player.rapidFire = false;
        setRapidActive(false);
      }
    }
    if (player.multiShot) {
      player.multiShotTimer--;
      if (player.multiShotTimer <= 0) {
        player.multiShot = false;
        setMultiActive(false);
      }
    }

    // Обновление пуль
    state.bullets = state.bullets.filter((bullet) => {
      bullet.y += bullet.speed;
      return bullet.y > -20 && bullet.y < H + 20;
    });

    // Спавн врагов
    state.enemySpawnTimer++;
    if (state.enemySpawnTimer >= state.enemySpawnRate) {
      state.enemySpawnTimer = 0;
      state.enemies.push(spawnEnemy(W, state.level));
    }

    // Обновление врагов
    state.enemies = state.enemies.filter((enemy) => {
      enemy.y += enemy.speed;

      // Проверка столкновения с пулями
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const bullet = state.bullets[i];
        if (
          Math.abs(bullet.x - enemy.x) < enemy.width / 2 + 5 &&
          Math.abs(bullet.y - enemy.y) < enemy.height / 2 + 5
        ) {
          state.bullets.splice(i, 1);
          enemy.health--;
          if (enemy.health <= 0) {
            // Взрыв
            const colors = ['#ff4444', '#ff8800', '#ffaa00'];
            state.particles.push(...createParticles(enemy.x, enemy.y, colors[enemy.type], 12));
            state.score += (enemy.type + 1) * 10;
            setScore(state.score);

            // Шанс на бонус
            if (Math.random() < 0.15) {
              state.powerUps.push(spawnPowerUp(enemy.x));
            }
            return false;
          }
          break;
        }
      }

      // Проверка столкновения с игроком
      if (
        Math.abs(enemy.x - player.x) < (enemy.width + player.width) / 2 - 5 &&
        Math.abs(enemy.y - player.y) < (enemy.height + player.height) / 2 - 5
      ) {
        if (player.shield) {
          player.shield = false;
          setShieldActive(false);
          state.particles.push(...createParticles(enemy.x, enemy.y, '#00aaff', 8));
          return false;
        }
        player.health--;
        setHealth(player.health);
        state.particles.push(...createParticles(player.x, player.y, '#ff0000', 10));
        if (player.health <= 0) {
          state.gameOver = true;
          state.particles.push(...createParticles(player.x, player.y, '#ff4400', 30));
          setTimeout(() => onGameOver(state.score), 1000);
        }
        return false;
      }

      return enemy.y < H + 50;
    });

    // Обновление бонусов
    state.powerUps = state.powerUps.filter((powerUp) => {
      powerUp.y += powerUp.speed;

      // Проверка подбора
      if (
        Math.abs(powerUp.x - player.x) < 25 &&
        Math.abs(powerUp.y - player.y) < 25
      ) {
        switch (powerUp.type) {
          case 'shield':
            player.shield = true;
            player.shieldTimer = 300;
            setShieldActive(true);
            break;
          case 'rapid':
            player.rapidFire = true;
            player.rapidFireTimer = 300;
            setRapidActive(true);
            break;
          case 'multi':
            player.multiShot = true;
            player.multiShotTimer = 300;
            setMultiActive(true);
            break;
        }
        state.particles.push(...createParticles(powerUp.x, powerUp.y, '#ffffff', 6));
        return false;
      }

      return powerUp.y < H + 20;
    });

    // Обновление частиц
    state.particles = state.particles.filter((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.95;
      particle.vy *= 0.95;
      particle.life--;
      return particle.life > 0;
    });

    // Уровень
    const newLevel = Math.floor(state.score / 200) + 1;
    if (newLevel !== state.level) {
      state.level = newLevel;
      state.enemySpawnRate = Math.max(20, 60 - newLevel * 5);
      setLevel(newLevel);
    }

    // Отрисовка
    state.bullets.forEach((bullet) => drawBullet(ctx, bullet));
    state.enemies.forEach((enemy) => drawEnemy(ctx, enemy));
    state.powerUps.forEach((powerUp) => drawPowerUp(ctx, powerUp));
    drawPlayer(ctx, player);

    // Частицы
    state.particles.forEach((particle) => {
      const alpha = particle.life / particle.maxLife;
      ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!state.gameOver) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
  }, [onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      const width = Math.min(container.clientWidth, 500);
      const height = Math.min(container.clientHeight, 800);
      canvas.width = width;
      canvas.height = height;
      gameStateRef.current.canvasWidth = width;
      gameStateRef.current.canvasHeight = height;
      gameStateRef.current.player.x = width / 2;
      gameStateRef.current.player.y = height - 60;
      gameStateRef.current.stars = initStars(width, height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.key === ' ') e.preventDefault();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      gameStateRef.current.touchX = touch.clientX - rect.left;
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      gameStateRef.current.touchX = touch.clientX - rect.left;
    };
    const handleTouchEnd = () => {
      gameStateRef.current.touchX = null;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      cancelAnimationFrame(animationRef.current);
    };
  }, [gameLoop, initStars]);

  return (
    <div className="relative w-full h-full flex flex-col items-center">
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-start p-3 pointer-events-none">
        <div className="flex flex-col gap-1">
          <div className="text-cyan-400 font-bold text-lg">⭐ {score}</div>
          <div className="text-yellow-400 text-sm">Уровень {level}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                className={`text-lg ${i < health ? 'text-red-500' : 'text-gray-700'}`}
              >
                ❤️
              </span>
            ))}
          </div>
          <div className="flex gap-2 text-xs">
            {shieldActive && <span className="text-blue-400 animate-pulse">🛡 Щит</span>}
            {rapidActive && <span className="text-yellow-400 animate-pulse">⚡ Скорость</span>}
            {multiActive && <span className="text-purple-400 animate-pulse">✦ Мульти</span>}
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-full max-w-[500px] max-h-[800px] border border-gray-800 rounded-lg shadow-2xl shadow-blue-500/20"
      />
    </div>
  );
};

export default Game;
