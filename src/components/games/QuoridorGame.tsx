import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Game } from '@/hooks/useGame';
import {
  QuoridorState, QuoridorPosition, QuoridorWall, WallOrientation, BOARD_SIZE,
  legalPawnMoves, isValidWallPlacement,
} from '@/lib/quoridorUtils';
import { Button } from '@/components/ui/button';
import { MoveVertical, MoveHorizontal } from 'lucide-react';

interface QuoridorGameProps {
  game: Game;
  playerId: string;
  onMove: (to: QuoridorPosition) => void;
  onWall: (wall: QuoridorWall) => void;
}

const CELL = 30; // px
const GAP = 5; // px
const BAR = 11; // px, épaisseur visuelle d'un mur
const STEP = CELL + GAP;
const BOARD_PX = BOARD_SIZE * CELL + (BOARD_SIZE - 1) * GAP;

export const QuoridorGame = ({ game, playerId, onMove, onWall }: QuoridorGameProps) => {
  const [mode, setMode] = useState<'move' | 'wall'>('move');
  const [orientation, setOrientation] = useState<WallOrientation>('h');

  useEffect(() => { setMode('move'); }, [game.updated_at]);

  const state = game.game_state as unknown as QuoridorState;
  const amPlayer1 = game.player1_id === playerId;
  const me: 'player1' | 'player2' = amPlayer1 ? 'player1' : 'player2';
  const opponent = amPlayer1 ? 'player2' : 'player1';
  const isMyTurn = game.current_turn === playerId && game.status === 'playing';
  const isFinished = game.status === 'finished';

  const legalMoves = useMemo(() => (isMyTurn && mode === 'move' ? legalPawnMoves(state, me) : []), [state, me, isMyTurn, mode]);

  const wallCandidates = useMemo(() => {
    if (!isMyTurn || mode !== 'wall') return [];
    const list: { wall: QuoridorWall; valid: boolean }[] = [];
    for (let r = 0; r < BOARD_SIZE - 1; r++) {
      for (let c = 0; c < BOARD_SIZE - 1; c++) {
        const wall: QuoridorWall = { row: r, col: c, orientation };
        list.push({ wall, valid: isValidWallPlacement(state, me, wall) });
      }
    }
    return list;
  }, [state, me, isMyTurn, mode, orientation]);

  if (!state?.pawns) return <p className="text-muted-foreground">Chargement du plateau...</p>;

  const statusText = isFinished
    ? (game.winner === playerId ? '🎉 Victoire !' : game.winner ? '😔 Défaite...' : 'Partie terminée')
    : isMyTurn
      ? (mode === 'wall' ? 'Choisis un mur à poser' : 'Déplace ton pion ou pose un mur')
      : 'Adversaire joue...';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 flex flex-col items-center">
      <div className="flex items-center justify-between w-full max-w-[22rem] px-1 text-sm">
        <div className={`text-center ${me === 'player1' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
          <p>Toi</p>
          <p className="text-xs">🧱 {state.wallsLeft[me]}</p>
        </div>
        <p className={isFinished ? 'font-bold' : isMyTurn ? 'text-primary font-medium' : 'text-muted-foreground'}>{statusText}</p>
        <div className={`text-center ${opponent && game.current_turn !== playerId && !isFinished ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
          <p>Adv.</p>
          <p className="text-xs">🧱 {state.wallsLeft[opponent]}</p>
        </div>
      </div>

      <div className="relative bg-amber-950/40 rounded-lg p-2" style={{ width: BOARD_PX + 16, height: BOARD_PX + 16 }}>
        <div className="relative" style={{ width: BOARD_PX, height: BOARD_PX }}>
          {/* Cases */}
          {Array.from({ length: BOARD_SIZE }, (_, row) => (
            Array.from({ length: BOARD_SIZE }, (_, col) => {
              const isP1 = state.pawns.player1.row === row && state.pawns.player1.col === col;
              const isP2 = state.pawns.player2.row === row && state.pawns.player2.col === col;
              const isTarget = legalMoves.some(m => m.row === row && m.col === col);
              const isMyGoalRow = (me === 'player1' && row === 0) || (me === 'player2' && row === BOARD_SIZE - 1);
              return (
                <div
                  key={`${row}-${col}`}
                  onClick={() => isTarget && onMove({ row, col })}
                  className={`absolute rounded-sm flex items-center justify-center ${isMyGoalRow ? 'bg-primary/10' : 'bg-amber-100/90'} ${isTarget ? 'cursor-pointer ring-2 ring-primary' : ''}`}
                  style={{ width: CELL, height: CELL, left: col * STEP, top: row * STEP }}
                >
                  {isTarget && <div className="w-2.5 h-2.5 rounded-full bg-primary/60 animate-pulse" />}
                  {isP1 && (
                    <div className={`w-[80%] h-[80%] rounded-full bg-sky-600 border-2 border-sky-800 ${me === 'player1' ? 'ring-2 ring-offset-1 ring-sky-400' : ''}`} />
                  )}
                  {isP2 && (
                    <div className={`w-[80%] h-[80%] rounded-full bg-rose-600 border-2 border-rose-800 ${me === 'player2' ? 'ring-2 ring-offset-1 ring-rose-400' : ''}`} />
                  )}
                </div>
              );
            })
          ))}

          {/* Murs posés */}
          {state.walls.map((w, i) => (
            <div
              key={i}
              className="absolute bg-amber-700 rounded-sm shadow"
              style={w.orientation === 'h'
                ? { left: w.col * STEP, top: w.row * STEP + CELL - (BAR - GAP) / 2, width: CELL * 2 + GAP, height: BAR }
                : { left: w.col * STEP + CELL - (BAR - GAP) / 2, top: w.row * STEP, width: BAR, height: CELL * 2 + GAP }}
            />
          ))}

          {/* Emplacements de murs cliquables (mode pose) */}
          {mode === 'wall' && wallCandidates.map(({ wall, valid }) => (
            <div
              key={`${wall.row}-${wall.col}-${wall.orientation}`}
              onClick={() => valid && onWall(wall)}
              className={`absolute rounded-sm transition-colors ${valid ? 'bg-primary/40 hover:bg-primary/70 cursor-pointer' : 'bg-muted/20'}`}
              style={wall.orientation === 'h'
                ? { left: wall.col * STEP, top: wall.row * STEP + CELL - (BAR - GAP) / 2, width: CELL * 2 + GAP, height: BAR }
                : { left: wall.col * STEP + CELL - (BAR - GAP) / 2, top: wall.row * STEP, width: BAR, height: CELL * 2 + GAP }}
            />
          ))}
        </div>
      </div>

      {isMyTurn && !isFinished && (
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <Button size="sm" variant={mode === 'move' ? 'default' : 'outline'} onClick={() => setMode('move')}>
            Déplacer
          </Button>
          <Button size="sm" variant={mode === 'wall' ? 'default' : 'outline'} disabled={state.wallsLeft[me] <= 0} onClick={() => setMode('wall')}>
            Poser un mur
          </Button>
          {mode === 'wall' && (
            <div className="flex gap-1">
              <Button size="icon" variant={orientation === 'h' ? 'default' : 'outline'} onClick={() => setOrientation('h')} title="Mur horizontal">
                <MoveHorizontal className="w-4 h-4" />
              </Button>
              <Button size="icon" variant={orientation === 'v' ? 'default' : 'outline'} onClick={() => setOrientation('v')} title="Mur vertical">
                <MoveVertical className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
