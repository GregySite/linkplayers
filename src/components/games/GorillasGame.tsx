import { useRef, useState, useEffect, useCallback } from 'react';
import { Game } from '@/hooks/useGame';
import { Button } from '@/components/ui/button';
import {
  GorillaState, GorillaPlayer, FIELD_WIDTH, FIELD_HEIGHT, SUN_POS,
  MAX_VELOCITY, TARGET_WINS,
} from '@/lib/gorillasUtils';

interface GorillasGameProps {
  game: Game;
  playerId: string;
  onThrow: (angle: number, velocity: number) => void;
  pendingTrajectory: { x: number; y: number }[] | null;
  onAnimationDone: () => void;
}

const BUILDING_SHADES = ['#2b3350', '#343d5e', '#3e4870', '#242b45', '#4a4470'];

export const GorillasGame = ({ game, playerId, onThrow, pendingTrajectory, onAnimationDone }: GorillasGameProps) => {
  const state = game.game_state as unknown as GorillaState;
  const amPlayer1 = game.player1_id === playerId;
  const me: GorillaPlayer = amPlayer1 ? 'player1' : 'player2';
  const opponent: GorillaPlayer = amPlayer1 ? 'player2' : 'player1';
  const isMyTurn = game.current_turn === playerId && game.status === 'playing';
  const isFinished = game.status === 'finished' || !!game.winner;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 320, h: 180 });
  // Réglages mémorisés par joueur : chacun retrouve son dernier tir, comme dans
  // l'original (et en local, le joueur 2 n'hérite pas des réglages du joueur 1).
  const [aimByPlayer, setAimByPlayer] = useState<Record<string, { angle: number; velocity: number }>>({});
  const aim = aimByPlayer[me] ?? { angle: 45, velocity: 25 };
  const angle = aim.angle;
  const velocity = aim.velocity;
  const setAngle = (v: number) => setAimByPlayer(prev => ({ ...prev, [me]: { ...(prev[me] ?? { angle: 45, velocity: 25 }), angle: v } }));
  const setVelocity = (v: number) => setAimByPlayer(prev => ({ ...prev, [me]: { ...(prev[me] ?? { angle: 45, velocity: 25 }), velocity: v } }));
  const [animPoint, setAnimPoint] = useState<{ x: number; y: number } | null>(null);
  const [sunHitAnim, setSunHitAnim] = useState(false);
  const [explosion, setExplosion] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const w = containerRef.current?.clientWidth || 320;
      const h = w * (FIELD_HEIGHT / FIELD_WIDTH);
      setCanvasSize({ w, h });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const scale = canvasSize.w / FIELD_WIDTH;
  const toScreen = useCallback((x: number, y: number) => ({ x: x * scale, y: y * scale }), [scale]);

  // Rejoue la trajectoire reçue après un lancer
  useEffect(() => {
    if (!pendingTrajectory || pendingTrajectory.length === 0) return;
    setExplosion(null);
    setSunHitAnim(false);
    let i = 0;
    const interval = setInterval(() => {
      const p = pendingTrajectory[i];
      setAnimPoint(p);
      if (Math.hypot(p.x - SUN_POS.x, p.y - SUN_POS.y) < SUN_POS.radius) setSunHitAnim(true);
      i++;
      if (i >= pendingTrajectory.length) {
        clearInterval(interval);
        setExplosion(p);
        setTimeout(() => {
          setAnimPoint(null);
          setExplosion(null);
          onAnimationDone();
        }, 500);
      }
    }, 16);
    return () => clearInterval(interval);
  }, [pendingTrajectory, onAnimationDone]);

  // Dessin
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !state?.buildings) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;

    // Ciel crépusculaire
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#0f1b3d');
    sky.addColorStop(0.55, '#2d3a6b');
    sky.addColorStop(1, '#6b4a7a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Étoiles (positions stables, dérivées d'une suite déterministe)
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let s = 0; s < 40; s++) {
      const sx = ((s * 73) % 100) / 100 * canvas.width;
      const sy = ((s * 37) % 45) / 100 * canvas.height;
      const size = s % 5 === 0 ? 1.6 : 1;
      ctx.globalAlpha = 0.25 + ((s * 13) % 60) / 100;
      ctx.fillRect(sx, sy, size, size);
    }
    ctx.globalAlpha = 1;

    // Soleil (halo + astre)
    const sunPx = toScreen(SUN_POS.x, SUN_POS.y);
    const sunR = SUN_POS.radius * scale;
    const halo = ctx.createRadialGradient(sunPx.x, sunPx.y, sunR * 0.6, sunPx.x, sunPx.y, sunR * 2.4);
    halo.addColorStop(0, sunHitAnim ? 'rgba(249,115,22,0.45)' : 'rgba(250,204,21,0.35)');
    halo.addColorStop(1, 'rgba(250,204,21,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(sunPx.x, sunPx.y, sunR * 2.4, 0, Math.PI * 2);
    ctx.fill();

    const sunGrad = ctx.createRadialGradient(sunPx.x - sunR * 0.3, sunPx.y - sunR * 0.3, sunR * 0.2, sunPx.x, sunPx.y, sunR);
    sunGrad.addColorStop(0, sunHitAnim ? '#fdba74' : '#fef9c3');
    sunGrad.addColorStop(1, sunHitAnim ? '#ea580c' : '#facc15');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunPx.x, sunPx.y, sunR, 0, Math.PI * 2);
    ctx.fill();

    // Visage du soleil (content / grognon si touché) — clin d'œil à l'original
    ctx.fillStyle = '#7c2d12';
    ctx.beginPath();
    ctx.arc(sunPx.x - sunR * 0.35, sunPx.y - sunR * 0.15, sunR * 0.13, 0, Math.PI * 2);
    ctx.arc(sunPx.x + sunR * 0.35, sunPx.y - sunR * 0.15, sunR * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = Math.max(1.5, sunR * 0.12);
    ctx.lineCap = 'round';
    if (sunHitAnim) {
      ctx.arc(sunPx.x, sunPx.y + sunR * 0.55, sunR * 0.3, Math.PI * 1.1, Math.PI * 1.9);
    } else {
      ctx.arc(sunPx.x, sunPx.y + sunR * 0.15, sunR * 0.35, 0.25, Math.PI - 0.25);
    }
    ctx.stroke();

    // Immeubles : façade dégradée, arête éclairée, toit marqué, fenêtres colorées
    state.buildings.forEach((b, i) => {
      const p = toScreen(b.x, FIELD_HEIGHT - b.height);
      const w = b.width * scale;
      const h = b.height * scale;
      const base = BUILDING_SHADES[i % BUILDING_SHADES.length];

      const facade = ctx.createLinearGradient(p.x, 0, p.x + w, 0);
      facade.addColorStop(0, base);
      facade.addColorStop(0.75, base);
      facade.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = facade;
      ctx.fillRect(p.x, p.y, w, h);

      // Arête gauche éclairée par le crépuscule
      ctx.fillStyle = 'rgba(255,220,180,0.10)';
      ctx.fillRect(p.x, p.y, Math.max(1, w * 0.06), h);
      // Bandeau de toit
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(p.x, p.y, w, Math.max(1.5, h * 0.02));

      // Fenêtres — quelques-unes éteintes, teintes légèrement variées
      const cols = Math.max(2, Math.floor(w / 9));
      const rows = Math.max(2, Math.floor(h / 9));
      const cellW = w / cols;
      const cellH = h / rows;
      const winW = Math.max(2, cellW * 0.42);
      const winH = Math.max(2, cellH * 0.38);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const seed = i * 17 + r * 5 + c * 3;
          if (seed % 3 === 0) continue;
          ctx.fillStyle = seed % 7 === 0
            ? 'rgba(186, 230, 253, 0.75)'   // quelques fenêtres bleutées
            : 'rgba(253, 224, 71, 0.8)';
          ctx.fillRect(
            p.x + cellW * c + (cellW - winW) / 2,
            p.y + cellH * r + (cellH - winH) / 2 + cellH * 0.15,
            winW,
            winH,
          );
        }
      }
    });

    // Gorilles
    const drawGorilla = (pos: { x: number; y: number }, color: string, isMine: boolean) => {
      const p = toScreen(pos.x, pos.y);
      const r = 3.4 * scale;

      // Corps
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - r * 0.75, r * 0.85, r * 1.0, 0, 0, Math.PI * 2);
      ctx.fill();
      // Bras levés (posture du gorille d'origine)
      ctx.beginPath();
      ctx.ellipse(p.x - r * 0.95, p.y - r * 0.9, r * 0.32, r * 0.75, 0.35, 0, Math.PI * 2);
      ctx.ellipse(p.x + r * 0.95, p.y - r * 0.9, r * 0.32, r * 0.75, -0.35, 0, Math.PI * 2);
      ctx.fill();
      // Tête
      ctx.beginPath();
      ctx.arc(p.x, p.y - r * 1.75, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      // Museau plus clair
      ctx.fillStyle = 'rgba(255, 220, 190, 0.55)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - r * 1.55, r * 0.32, r * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      // Yeux
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(p.x - r * 0.2, p.y - r * 1.9, Math.max(1, r * 0.09), 0, Math.PI * 2);
      ctx.arc(p.x + r * 0.2, p.y - r * 1.9, Math.max(1, r * 0.09), 0, Math.PI * 2);
      ctx.fill();

      // Liseré autour de MON gorille, pour le repérer d'un coup d'œil
      if (isMine) {
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y - r * 1.1, r * 1.55, 0, Math.PI * 2);
        ctx.stroke();
      }
    };
    drawGorilla(state.gorillas.player1, '#8b5a2b', me === 'player1');
    drawGorilla(state.gorillas.player2, '#5a3a24', me === 'player2');

    // Vent (flèche)
    if (Math.abs(state.wind) > 0.05) {
      const cy = 14 * scale;
      const cx = canvas.width / 2;
      const len = Math.min(30, Math.abs(state.wind) * 40) * scale / 10;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - (state.wind > 0 ? len : -len), cy);
      ctx.lineTo(cx + (state.wind > 0 ? len : -len), cy);
      ctx.stroke();
    }

    // Trajectoire (points déjà parcourus pendant l'animation)
    if (animPoint) {
      const bp = toScreen(animPoint.x, animPoint.y);
      const r = Math.max(2, 1.6 * scale);
      if (bp.y < r) {
        // Banane au-dessus du champ visible : indicateur en haut de l'écran (comme l'original)
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(bp.x, 2);
        ctx.lineTo(bp.x - r, 2 + r * 1.4);
        ctx.lineTo(bp.x + r, 2 + r * 1.4);
        ctx.closePath();
        ctx.fill();
      } else {
        // Banane : croissant jaune avec une petite rotation liée à sa position
        const rot = (animPoint.x + animPoint.y) * 0.35;
        ctx.save();
        ctx.translate(bp.x, bp.y);
        ctx.rotate(rot);
        ctx.fillStyle = '#fde047';
        ctx.strokeStyle = '#a16207';
        ctx.lineWidth = Math.max(0.8, r * 0.22);
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.25, Math.PI * 0.15, Math.PI * 0.95);
        ctx.arc(0, r * 0.35, r * 1.1, Math.PI * 0.95, Math.PI * 0.15, true);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
    if (explosion) {
      const ep = toScreen(explosion.x, explosion.y);
      const r = 6 * scale;
      const blast = ctx.createRadialGradient(ep.x, ep.y, r * 0.15, ep.x, ep.y, r);
      blast.addColorStop(0, 'rgba(255,255,255,0.95)');
      blast.addColorStop(0.35, 'rgba(253,224,71,0.9)');
      blast.addColorStop(0.7, 'rgba(249,115,22,0.75)');
      blast.addColorStop(1, 'rgba(220,38,38,0)');
      ctx.fillStyle = blast;
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, r, 0, Math.PI * 2);
      ctx.fill();
      // Éclats
      ctx.strokeStyle = 'rgba(253,224,71,0.85)';
      ctx.lineWidth = Math.max(1, scale * 0.4);
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(ep.x + Math.cos(ang) * r * 0.7, ep.y + Math.sin(ang) * r * 0.7);
        ctx.lineTo(ep.x + Math.cos(ang) * r * 1.25, ep.y + Math.sin(ang) * r * 1.25);
        ctx.stroke();
      }
    }
  }, [state, canvasSize, scale, animPoint, explosion, sunHitAnim, toScreen, me]);

  if (!state?.buildings) {
    return <p className="text-muted-foreground">Construction de la ville...</p>;
  }

  const canThrow = isMyTurn && !isFinished && !pendingTrajectory;

  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      <div className="flex items-center justify-between px-2">
        <div className={`text-center ${isMyTurn ? 'text-primary' : 'text-muted-foreground'}`}>
          <p className="text-xs uppercase tracking-wider">Toi</p>
          <p className="text-2xl font-bold">{state.scores[me]}</p>
        </div>
        <div className="text-center text-muted-foreground text-xs">1ᵉʳ à {TARGET_WINS}</div>
        <div className={`text-center ${!isMyTurn && !isFinished ? 'text-primary' : 'text-muted-foreground'}`}>
          <p className="text-xs uppercase tracking-wider">Adversaire</p>
          <p className="text-2xl font-bold">{state.scores[opponent]}</p>
        </div>
      </div>

      <div className="text-center text-sm min-h-[1.25rem]">
        {isFinished ? (
          <p className="text-lg font-bold">
            {game.winner === playerId ? <span className="text-primary">🎉 Victoire !</span>
              : game.winner ? <span className="text-destructive">😔 Défaite...</span>
              : <span className="text-muted-foreground">Égalité !</span>}
          </p>
        ) : isMyTurn ? (
          <p className="text-primary font-medium">{pendingTrajectory ? 'La banane vole...' : `Vent : ${state.wind > 0 ? '→' : state.wind < 0 ? '←' : 'aucun'} ${Math.abs(state.wind).toFixed(1)}`}</p>
        ) : (
          <p className="text-muted-foreground">Au tour de l'adversaire...</p>
        )}
      </div>

      <div ref={containerRef} className="rounded-xl overflow-hidden border border-border">
        <canvas ref={canvasRef} width={canvasSize.w} height={canvasSize.h} className="w-full h-auto block" />
      </div>

      {canThrow && (
        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Angle</span><span>{angle}°</span>
            </div>
            <input
              type="range" min={0} max={90} value={angle}
              onChange={e => setAngle(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Puissance</span><span>{velocity}</span>
            </div>
            <input
              type="range" min={1} max={MAX_VELOCITY} value={velocity}
              onChange={e => setVelocity(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
          <Button onClick={() => onThrow(angle, velocity)} className="w-full font-semibold">
            🍌 Lancer !
          </Button>
        </div>
      )}
    </div>
  );
};
