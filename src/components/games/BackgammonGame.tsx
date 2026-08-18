import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Game } from '@/hooks/useGame';
import { Button } from '@/components/ui/button';
import { BackgammonState, legalMovesForDie, BackgammonMove } from '@/lib/backgammonUtils';

interface BackgammonGameProps {
  game: Game;
  playerId: string;
  onRoll: () => void;
  onMove: (from: number, die: number) => void;
}

const Checker = ({ owner, small = false }: { owner: 'player1' | 'player2'; small?: boolean }) => (
  <div
    className={`rounded-full border-2 ${small ? 'w-4 h-4' : 'w-6 h-6'} ${
      owner === 'player1' ? 'bg-primary border-primary/70' : 'bg-foreground border-foreground/70'
    }`}
  />
);

export const BackgammonGame = ({ game, playerId, onRoll, onMove }: BackgammonGameProps) => {
  const state = game.game_state as unknown as BackgammonState;
  const amPlayer1 = game.player1_id === playerId;
  const me = amPlayer1 ? 'player1' : 'player2';
  const opponent = amPlayer1 ? 'player2' : 'player1';
  const isMyTurn = game.current_turn === playerId && game.status === 'playing';
  const isFinished = game.status === 'finished' || !!game.winner;

  const [selectedFrom, setSelectedFrom] = useState<number | null>(null);

  useEffect(() => { setSelectedFrom(null); }, [game.updated_at]);

  if (!state?.points) {
    return <p className="text-muted-foreground">Préparation du plateau...</p>;
  }

  const remainingDice = [...new Set(state.dice)];
  const destinationsForSelected: (BackgammonMove & { die: number })[] = [];
  if (selectedFrom !== null && isMyTurn) {
    for (const die of remainingDice) {
      const moves = legalMovesForDie(state, me, die);
      const match = moves.find(m => m.from === selectedFrom);
      if (match) destinationsForSelected.push({ ...match, die });
    }
  }

  const canSelect = (index: number): boolean => {
    if (!isMyTurn || state.dice.length === 0) return false;
    if (state.bar[me] > 0) return false; // doit d'abord rentrer depuis la barre
    return remainingDice.some(die => legalMovesForDie(state, me, die).some(m => m.from === index));
  };

  const canEnterFromBar = isMyTurn && state.bar[me] > 0 &&
    remainingDice.some(die => legalMovesForDie(state, me, die).some(m => m.from === -1));

  const handlePointClick = (index: number) => {
    if (!isMyTurn) return;
    if (destinationsForSelected.some(d => d.to === index)) {
      const d = destinationsForSelected.find(d => d.to === index)!;
      onMove(selectedFrom as number, d.die);
      setSelectedFrom(null);
      return;
    }
    if (canSelect(index)) setSelectedFrom(index === selectedFrom ? null : index);
  };

  const handleBarClick = () => {
    if (!canEnterFromBar) return;
    setSelectedFrom(-1);
  };

  const handleOffClick = () => {
    if (selectedFrom === null) return;
    const d = destinationsForSelected.find(d => d.to === 'off');
    if (d) { onMove(selectedFrom, d.die); setSelectedFrom(null); }
  };

  // Ordre d'affichage classique : haut = points 13-24 (gauche→droite), bas = points 12-1 (gauche→droite)
  const topIndices = Array.from({ length: 12 }, (_, i) => 12 + i); // points 13..24 → index 12..23
  const bottomIndices = Array.from({ length: 12 }, (_, i) => 11 - i); // points 12..1 → index 11..0

  const renderPoint = (index: number, isTop: boolean) => {
    const value = state.points[index];
    const owner: 'player1' | 'player2' | null = value > 0 ? 'player1' : value < 0 ? 'player2' : null;
    const count = Math.abs(value);
    const selected = selectedFrom === index;
    const isDestination = destinationsForSelected.some(d => d.to === index);
    const selectable = canSelect(index) && (owner === me);

    return (
      <button
        key={index}
        onClick={() => handlePointClick(index)}
        disabled={!selectable && !isDestination}
        className={`relative flex-1 flex flex-col ${isTop ? 'justify-start' : 'justify-end'} items-center h-28 ${
          index % 2 === 0 ? 'bg-muted/40' : 'bg-muted/10'
        } ${selected ? 'ring-2 ring-primary ring-inset' : ''} ${isDestination ? 'bg-primary/20' : ''}`}
      >
        <div className={`flex flex-col ${isTop ? '' : 'flex-col-reverse'} items-center gap-0.5 py-1`}>
          {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
            <Checker key={i} owner={owner as 'player1' | 'player2'} small={count > 4} />
          ))}
          {count > 5 && <span className="text-[0.6rem] text-muted-foreground">+{count - 5}</span>}
        </div>
        {isDestination && <div className="absolute inset-0 border-2 border-dashed border-primary rounded pointer-events-none" />}
      </button>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-lg mx-auto space-y-4">
      {/* Scores / statut */}
      <div className="flex items-center justify-between px-2">
        <div className={`text-center ${isMyTurn ? 'text-primary' : 'text-muted-foreground'}`}>
          <p className="text-xs uppercase tracking-wider">Toi</p>
          <p className="text-lg font-bold">{state.off[me]}/15 sortis</p>
        </div>
        <div className="text-center text-muted-foreground text-xs">
          {state.dice.length > 0 && (
            <div className="flex gap-1 justify-center">
              {state.dice.map((d, i) => (
                <span key={i} className="w-6 h-6 rounded bg-card border border-border flex items-center justify-center font-bold text-foreground">{d}</span>
              ))}
            </div>
          )}
        </div>
        <div className={`text-center ${!isMyTurn && !isFinished ? 'text-primary' : 'text-muted-foreground'}`}>
          <p className="text-xs uppercase tracking-wider">Adversaire</p>
          <p className="text-lg font-bold">{state.off[opponent]}/15 sortis</p>
        </div>
      </div>

      <div className="text-center text-sm min-h-[1.5rem]">
        {isFinished ? (
          <p className="text-lg font-bold">
            {game.winner === playerId ? <span className="text-primary">🎉 Victoire !</span> : <span className="text-destructive">😔 Défaite...</span>}
          </p>
        ) : isMyTurn ? (
          state.dice.length === 0 ? (
            <Button onClick={onRoll} size="sm">Lancer les dés</Button>
          ) : canEnterFromBar ? (
            <p className="text-primary font-medium">Tu as un pion sur la barre — tape la barre pour le faire rentrer</p>
          ) : selectedFrom !== null ? (
            <p className="text-primary font-medium">Choisis une case surlignée pour déplacer ce pion</p>
          ) : (
            <p className="text-primary font-medium">Choisis un de tes pions à déplacer</p>
          )
        ) : (
          <p className="text-muted-foreground">Au tour de l'adversaire...</p>
        )}
      </div>

      {/* Barre */}
      {(state.bar.player1 > 0 || state.bar.player2 > 0) && (
        <div className="flex justify-center gap-4">
          {state.bar[me] > 0 && (
            <button
              onClick={handleBarClick}
              disabled={!canEnterFromBar}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border ${canEnterFromBar ? 'border-primary bg-primary/10' : 'border-border'}`}
            >
              <Checker owner={me} small />
              <span className="text-xs">Ta barre ({state.bar[me]})</span>
            </button>
          )}
          {state.bar[opponent] > 0 && (
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border">
              <Checker owner={opponent} small />
              <span className="text-xs text-muted-foreground">Barre adverse ({state.bar[opponent]})</span>
            </div>
          )}
        </div>
      )}

      {/* Plateau */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex">{topIndices.map(i => renderPoint(i, true))}</div>
        <div className="h-2 bg-border" />
        <div className="flex">{bottomIndices.map(i => renderPoint(i, false))}</div>
      </div>

      {/* Sortie */}
      {selectedFrom !== null && destinationsForSelected.some(d => d.to === 'off') && (
        <div className="flex justify-center">
          <Button onClick={handleOffClick} variant="secondary">Sortir ce pion</Button>
        </div>
      )}
    </motion.div>
  );
};
