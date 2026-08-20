import { useRef, useState, useEffect, useCallback } from 'react';
import { Game } from '@/hooks/useGame';
import {
  SoccerStarsState, FIELD_WIDTH, FIELD_HEIGHT, GOAL_HALF_WIDTH, TOKEN_RADIUS, BALL_RADIUS,
  flickVelocity, FlickFrame, SoccerPlayer,
} from '@/lib/soccerStarsUtils';

interface SoccerStarsGameProps {
  game: Game;
  playerId: string;
  onFlick: (tokenId: string, vx: number, vy: number) => void;
  /** Frames d'animation à rejouer localement juste après avoir tiré (fournies par le handler). */
  pendingFrames: FlickFrame[] | null;
  onAnimationDone: () => void;
}

const COLORS = {
  player1: '#2662ed', // bleu principal du site
  player2: '#1f2937', // foreground-ish dark
  ball: '#ffffff',
  field: '#14532d',
  line: 'rgba(255,255,255,0.35)',
};

export const SoccerStarsGame = ({ game, playerId, onFlick, pendingFrames, onAnimationDone }: SoccerStarsGameProps) => {
  const state = game.game_state as unknown as SoccerStarsState;
  const amPlayer1 = game.player1_id === playerId;
  const me: SoccerPlayer = amPlayer1 ? 'player1' : 'player2';
  const opponent: SoccerPlayer = amPlayer1 ? 'player2' : 'player1';
  const isMyTurn = game.current_turn === playerId && game.status === 'playing';
  const isFinished = game.status === 'finished' || !!game.winner;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 300, h: 500 });
  const [drag, setDrag] = useState<{ tokenId: string; startX: number; startY: number; curX: number; curY: number; freeAim: boolean } | null>(null);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [animFrame, setAnimFrame] = useState<FlickFrame | null>(null);

  // Adapte la taille du canvas au conteneur, en gardant le ratio du terrain
  useEffect(() => {
    const update = () => {
      const w = containerRef.current?.clientWidth || 300;
      const h = w * (FIELD_HEIGHT / FIELD_WIDTH);
      setCanvasSize({ w, h: Math.min(h, 560) });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Annule la sélection dès que le plateau change (nouveau tour, tir de l'adversaire...)
  useEffect(() => {
    setSelectedToken(null);
    setDrag(null);
  }, [game.updated_at]);

  const scale = canvasSize.w / FIELD_WIDTH;
  const toScreen = useCallback((x: number, y: number) => ({ x: x * scale, y: y * scale }), [scale]);
  const toField = useCallback((px: number, py: number) => ({ x: px / scale, y: py / scale }), [scale]);

  // Rejoue les frames d'animation reçues après un tir (celles du joueur qui a tiré, ou reçues via sync)
  useEffect(() => {
    if (!pendingFrames || pendingFrames.length === 0) return;
    let i = 0;
    const interval = setInterval(() => {
      setAnimFrame(pendingFrames[i]);
      i++;
      if (i >= pendingFrames.length) {
        clearInterval(interval);
        setAnimFrame(null);
        onAnimationDone();
      }
    }, 16);
    return () => clearInterval(interval);
  }, [pendingFrames, onAnimationDone]);

  // Dessin
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;

    const display = animFrame || {
      ball: state?.ball ?? { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 },
      tokens: state?.tokens ?? { player1: [], player2: [] },
    };

    ctx.fillStyle = COLORS.field;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ligne médiane + ronds
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvasSize.h / 2);
    ctx.lineTo(canvasSize.w, canvasSize.h / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(canvasSize.w / 2, canvasSize.h / 2, canvasSize.w * 0.18, 0, Math.PI * 2);
    ctx.stroke();

    // Cages (traits en haut et en bas)
    const goalPx1 = toScreen(FIELD_WIDTH / 2 - GOAL_HALF_WIDTH, 0);
    const goalPx2 = toScreen(FIELD_WIDTH / 2 + GOAL_HALF_WIDTH, 0);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(goalPx1.x, 2); ctx.lineTo(goalPx2.x, 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(goalPx1.x, canvasSize.h - 2); ctx.lineTo(goalPx2.x, canvasSize.h - 2); ctx.stroke();

    // Pions
    const drawToken = (x: number, y: number, color: string, isMe: boolean) => {
      const p = toScreen(x, y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, TOKEN_RADIUS * scale, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = isMe ? '#ffffff' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = isMe ? 2 : 1;
      ctx.stroke();
    };
    for (const t of display.tokens.player1) drawToken(t.x, t.y, COLORS.player1, me === 'player1');
    for (const t of display.tokens.player2) drawToken(t.x, t.y, COLORS.player2, me === 'player2');

    // Ballon
    const bp = toScreen(display.ball.x, display.ball.y);
    ctx.beginPath();
    ctx.arc(bp.x, bp.y, BALL_RADIUS * scale, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.ball;
    ctx.fill();
    ctx.strokeStyle = '#0003';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Halo sur le pion sélectionné (permet de viser depuis n'importe où)
    if (selectedToken && !drag) {
      const token = state.tokens[me].find(t => t.id === selectedToken);
      if (token) {
        const p = toScreen(token.x, token.y);
        ctx.strokeStyle = '#ffffffcc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, TOKEN_RADIUS * scale * 1.4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Ligne de visée pendant le drag
    if (drag) {
      const token = state.tokens[me].find(t => t.id === drag.tokenId);
      if (token) {
        const start = toScreen(token.x, token.y);
        ctx.strokeStyle = '#ffffffaa';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        // La flèche part dans le sens opposé au glissement (façon lance-pierre)
        const pullX = drag.startX - drag.curX;
        const pullY = drag.startY - drag.curY;
        ctx.lineTo(start.x + pullX, start.y + pullY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [state, animFrame, canvasSize, scale, drag, me, toScreen, selectedToken]);

  if (!state?.tokens) {
    return <p className="text-muted-foreground">Mise en place du terrain...</p>;
  }

  const canInteract = isMyTurn && !isFinished && !pendingFrames;

  const getPointerField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return toField(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canInteract) return;
    const pos = getPointerField(e);
    const token = state.tokens[me].find(t => Math.hypot(t.x - pos.x, t.y - pos.y) < TOKEN_RADIUS * 1.8);

    if (token) {
      // Geste direct sur le pion : on tire depuis sa position
      setSelectedToken(token.id);
      const screenPos = toScreen(token.x, token.y);
      setDrag({ tokenId: token.id, startX: screenPos.x, startY: screenPos.y, curX: screenPos.x, curY: screenPos.y, freeAim: false });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // Pion déjà sélectionné : on peut viser depuis n'importe où sur le terrain.
    // Indispensable quand le pion est collé à un bord et qu'il n'y a plus de place pour tirer.
    if (selectedToken && state.tokens[me].some(t => t.id === selectedToken)) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      setDrag({ tokenId: selectedToken, startX: px, startY: py, curX: px, curY: py, freeAim: true });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    setDrag({ ...drag, curX: e.clientX - rect.left, curY: e.clientY - rect.top });
  };

  const handlePointerUp = () => {
    if (!drag) return;
    const pullX = drag.startX - drag.curX;
    const pullY = drag.startY - drag.curY;
    const dist = Math.hypot(pullX, pullY);
    setDrag(null);
    if (dist < 8) return; // trop court, on annule
    const normalized = Math.min(dist / (canvasSize.w * 0.55), 1);
    const power = normalized * normalized; // courbe non-linéaire : un petit geste tire vraiment doucement
    const { vx, vy } = flickVelocity(pullX, pullY, power);
    setSelectedToken(null);
    onFlick(drag.tokenId, vx, vy);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      <div className="flex items-center justify-between px-2">
        <div className={`text-center ${isMyTurn ? 'text-primary' : 'text-muted-foreground'}`}>
          <p className="text-xs uppercase tracking-wider">Toi</p>
          <p className="text-2xl font-bold">{state.scores[me]}</p>
        </div>
        <div className="text-center text-muted-foreground text-xs">1ᵉʳ à 3 buts</div>
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
          <p className="text-primary font-medium">{pendingFrames ? 'Tir en cours...' : selectedToken ? 'Glisse depuis n\'importe où pour viser, puis relâche' : 'Glisse un pion vers l\'arrière, ou tape-le pour viser de loin'}</p>
        ) : (
          <p className="text-muted-foreground">Au tour de l'adversaire...</p>
        )}
      </div>

      <div ref={containerRef} className="rounded-xl overflow-hidden border border-border touch-none select-none">
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setDrag(null)}
          className="w-full h-auto block"
        />
      </div>
      <p className="text-center text-[0.65rem] text-muted-foreground">
        Comme au air-hockey : tes pions ({me === 'player1' ? 'bleus' : 'foncés'}) percutent le ballon selon leur trajectoire.
      </p>
    </div>
  );
};
