import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight,
} from 'lucide-react';
import { Game } from '@/hooks/useGame';
import { Button } from '@/components/ui/button';
import {
  FootballState, ROWS, COLS, GOAL_ROWS, legalMoveDirections, getCarrier, isGoalkeeper,
  tacklableToken, MAX_MOVES_PER_TURN,
} from '@/lib/footballUtils';

interface FootballGameProps {
  game: Game;
  playerId: string;
  onMove: (tokenId: string, dr: number, dc: number) => void;
  onPass: (dr: number, dc: number) => void;
  onShoot: (dr: number, dc: number) => void;
  onTackle: () => void;
  onEndTurn: () => void;
}

const ARROWS: { label: string; dr: number; dc: number; Icon: typeof ArrowUp }[] = [
  { label: 'N', dr: -1, dc: 0, Icon: ArrowUp },
  { label: 'S', dr: 1, dc: 0, Icon: ArrowDown },
  { label: 'O', dr: 0, dc: -1, Icon: ArrowLeft },
  { label: 'E', dr: 0, dc: 1, Icon: ArrowRight },
  { label: 'NO', dr: -1, dc: -1, Icon: ArrowUpLeft },
  { label: 'NE', dr: -1, dc: 1, Icon: ArrowUpRight },
  { label: 'SO', dr: 1, dc: -1, Icon: ArrowDownLeft },
  { label: 'SE', dr: 1, dc: 1, Icon: ArrowDownRight },
];

export const FootballGame = ({ game, playerId, onMove, onPass, onShoot, onTackle, onEndTurn }: FootballGameProps) => {
  const state = game.game_state as unknown as FootballState;
  const amPlayer1 = game.player1_id === playerId;
  const me = amPlayer1 ? 'player1' : 'player2';
  const opponent = amPlayer1 ? 'player2' : 'player1';
  const isMyTurn = game.current_turn === playerId && game.status === 'playing';
  const isFinished = game.status === 'finished' || !!game.winner;

  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<'pass' | 'shoot' | null>(null);

  useEffect(() => { setSelectedToken(null); setActionMode(null); }, [game.updated_at]);

  if (!state?.players) {
    return <p className="text-muted-foreground">Coup d'envoi en préparation...</p>;
  }

  const carrier = isMyTurn ? getCarrier(state) : null;
  const iHaveBall = carrier === me;
  const canTackle = isMyTurn && !state.ballActionUsed && !!tacklableToken(state, me);
  const movesLeft = MAX_MOVES_PER_TURN - state.movesUsed;
  const legalDirs = selectedToken && isMyTurn ? legalMoveDirections(state, me, selectedToken) : [];

  const tokenAt = (row: number, col: number) => {
    const p1 = state.players.player1.find(t => t.row === row && t.col === col);
    if (p1) return { owner: 'player1' as const, id: p1.id };
    const p2 = state.players.player2.find(t => t.row === row && t.col === col);
    if (p2) return { owner: 'player2' as const, id: p2.id };
    return null;
  };

  const handleCellClick = (row: number, col: number) => {
    if (!isMyTurn || !selectedToken) {
      if (!isMyTurn) return;
      const occupant = tokenAt(row, col);
      if (occupant && occupant.owner === me) setSelectedToken(occupant.id);
      return;
    }
    const token = state.players[me].find(t => t.id === selectedToken);
    if (!token) return;
    const dr = row - token.row;
    const dc = col - token.col;
    if (legalDirs.some(d => d.dr === dr && d.dc === dc)) {
      onMove(selectedToken, dr, dc);
      setSelectedToken(null);
      return;
    }
    const occupant = tokenAt(row, col);
    setSelectedToken(occupant && occupant.owner === me ? occupant.id : null);
  };

  const isGoalCell = (row: number, col: number) => (col === 0 || col === COLS - 1) && GOAL_ROWS.includes(row);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between px-2">
        <div className={`text-center ${isMyTurn ? 'text-primary' : 'text-muted-foreground'}`}>
          <p className="text-xs uppercase tracking-wider">Toi</p>
          <p className="text-2xl font-bold">{state.scores[me]}</p>
        </div>
        <div className="text-center text-muted-foreground text-xs">
          <p>Tour {state.turnsPlayed} · 1ᵉʳ à 3 buts</p>
          {isMyTurn && <p>{movesLeft} déplacement(s) · action ballon {state.ballActionUsed ? 'utilisée' : 'dispo'}</p>}
        </div>
        <div className={`text-center ${!isMyTurn && !isFinished ? 'text-primary' : 'text-muted-foreground'}`}>
          <p className="text-xs uppercase tracking-wider">Adversaire</p>
          <p className="text-2xl font-bold">{state.scores[opponent]}</p>
        </div>
      </div>

      <div className="text-center text-sm min-h-[1.5rem]">
        {isFinished ? (
          <p className="text-lg font-bold">
            {game.winner === playerId ? <span className="text-primary">🎉 Victoire !</span>
              : game.winner ? <span className="text-destructive">😔 Défaite...</span>
              : <span className="text-muted-foreground">Égalité !</span>}
          </p>
        ) : isMyTurn ? (
          <p className="text-primary font-medium">
            {canTackle ? 'Tacle possible ! Reprends le ballon à l\'adversaire'
              : iHaveBall ? 'Le porteur du ballon ne peut pas bouger — passe ou tire pour avancer'
              : selectedToken ? 'Choisis une case surlignée' : 'Déplace tes joueurs, ou termine ton tour'}
          </p>
        ) : (
          <p className="text-muted-foreground">Au tour de l'adversaire...</p>
        )}
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-green-950/10">
        {Array.from({ length: ROWS }).map((_, row) => (
          <div key={row} className="flex">
            {Array.from({ length: COLS }).map((_, col) => {
              const occupant = tokenAt(row, col);
              const hasBall = state.ball.row === row && state.ball.col === col;
              const token = selectedToken ? state.players[me].find(t => t.id === selectedToken) : null;
              const isLegal = token ? legalDirs.some(d => token.row + d.dr === row && token.col + d.dc === col) : false;
              const isSelected = occupant?.id === selectedToken;
              const frozen = occupant && hasBall; // porteur du ballon = figé
              const goalCell = isGoalCell(row, col);

              return (
                <button
                  key={col}
                  onClick={() => handleCellClick(row, col)}
                  className={`relative flex-1 aspect-square flex items-center justify-center border-[0.5px] border-border/30 ${
                    goalCell ? 'bg-yellow-500/10' : (row + col) % 2 === 0 ? 'bg-muted/20' : 'bg-transparent'
                  } ${isLegal ? 'bg-primary/20' : ''} ${isSelected ? 'ring-2 ring-primary ring-inset' : ''}`}
                >
                  {occupant && (
                    <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 ${
                      occupant.owner === 'player1' ? 'bg-primary border-primary/70' : 'bg-foreground border-foreground/70'
                    } ${isGoalkeeper(occupant.id) ? 'ring-2 ring-yellow-400' : ''} ${frozen ? 'opacity-70' : ''}`} />
                  )}
                  {hasBall && (
                    <div className="absolute w-2 h-2 rounded-full bg-white border border-black/40" style={{ top: '15%', right: '15%' }} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-center text-[0.65rem] text-muted-foreground">
        <span className="inline-block w-2.5 h-2.5 rounded-full ring-2 ring-yellow-400 align-middle mr-1" /> = gardien ·
        pion pâle = porteur du ballon (immobile)
      </p>

      {isMyTurn && !isFinished && (
        <div className="space-y-2">
          <div className="flex justify-center gap-2 flex-wrap">
            {canTackle && (
              <Button size="sm" variant="default" onClick={onTackle}>
                🦵 Tacler
              </Button>
            )}
            {iHaveBall && !state.ballActionUsed && (
              <>
                <Button
                  size="sm"
                  variant={actionMode === 'pass' ? 'default' : 'outline'}
                  onClick={() => setActionMode(prev => (prev === 'pass' ? null : 'pass'))}
                >
                  Passer
                </Button>
                <Button
                  size="sm"
                  variant={actionMode === 'shoot' ? 'default' : 'outline'}
                  onClick={() => setActionMode(prev => (prev === 'shoot' ? null : 'shoot'))}
                >
                  Tirer
                </Button>
              </>
            )}
          </div>
          {actionMode && (
            <div className="grid grid-cols-4 gap-1.5 max-w-[12rem] mx-auto">
              {ARROWS.map(({ label, dr, dc, Icon }) => (
                <button
                  key={label}
                  onClick={() => {
                    if (actionMode === 'pass') onPass(dr, dc); else onShoot(dr, dc);
                    setActionMode(null);
                  }}
                  className="w-9 h-9 rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/10 flex items-center justify-center text-foreground"
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isMyTurn && !isFinished && (
        <div className="flex justify-center pt-1">
          <Button variant="secondary" onClick={onEndTurn} className="font-medium">
            ✓ Terminer le tour
          </Button>
        </div>
      )}
    </motion.div>
  );
};
