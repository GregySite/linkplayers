import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Game } from '@/hooks/useGame';
import { Button } from '@/components/ui/button';
import {
  YanivCard, YanivState, SUIT_SYMBOLS, rankLabel, isRedSuit,
  isValidDiscard, canCallYaniv, handPoints, YANIV_ELIMINATION,
} from '@/lib/yanivUtils';

interface YanivGameProps {
  game: Game;
  playerId: string;
  onPlay: (discardIndices: number[], draw: { from: 'deck' } | { from: 'discard'; cardId: string }) => void;
  onYaniv: () => void;
}

const CardFace = ({ card, size = 'md' }: { card: YanivCard; size?: 'sm' | 'md' }) => (
  <div className={`flex flex-col items-center justify-center leading-none ${size === 'sm' ? 'text-xs' : 'text-sm'} ${card.suit !== 'joker' && isRedSuit(card.suit) ? 'text-destructive' : ''}`}>
    <span className={size === 'sm' ? 'text-base font-bold' : 'text-xl font-bold'}>{rankLabel(card)}</span>
    <span className={size === 'sm' ? 'text-xs' : 'text-base'}>{SUIT_SYMBOLS[card.suit]}</span>
  </div>
);

export const YanivGame = ({ game, playerId, onPlay, onYaniv }: YanivGameProps) => {
  const state = game.game_state as unknown as YanivState;
  const amPlayer1 = game.player1_id === playerId;
  const me = amPlayer1 ? 'player1' : 'player2';
  const opponent = amPlayer1 ? 'player2' : 'player1';
  const isMyTurn = game.current_turn === playerId && game.status === 'playing';
  const isFinished = game.status === 'finished' || !!game.winner;

  const [selected, setSelected] = useState<number[]>([]);

  // Réinitialise la sélection dès que le plateau change
  useEffect(() => {
    setSelected([]);
  }, [game.updated_at]);

  if (!state?.hands) {
    return <p className="text-muted-foreground">Distribution en cours...</p>;
  }

  const myHand = state.hands[me] || [];
  const opponentHandCount = (state.hands[opponent] || []).length;
  const scores = state.scores || { player1: 0, player2: 0 };
  const myScore = scores[me];
  const opponentScore = scores[opponent];
  const pickable = state.pickable || [];
  const discardTop = state.discardPile?.slice(-3) || [];

  const selectedCards = selected.map(i => myHand[i]).filter(Boolean);
  const selectionValid = selectedCards.length > 0 && isValidDiscard(selectedCards);
  const myTotal = handPoints(myHand);
  const canYaniv = isMyTurn && !isFinished && selected.length === 0 && canCallYaniv(myHand);

  const toggleCard = (index: number) => {
    if (!isMyTurn || isFinished) return;
    setSelected(prev => (prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]));
  };

  const drawFromDeck = () => {
    if (!selectionValid) return;
    onPlay(selected, { from: 'deck' });
    setSelected([]);
  };

  const drawFromDiscard = (cardId: string) => {
    if (!selectionValid) return;
    onPlay(selected, { from: 'discard', cardId });
    setSelected([]);
  };

  const summary = state.roundSummary;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto space-y-5">
      {/* Scores de partie */}
      <div className="flex items-center justify-between px-2">
        <div className={`text-center ${isMyTurn ? 'text-primary' : 'text-muted-foreground'}`}>
          <p className="text-xs uppercase tracking-wider">Toi</p>
          <p className="text-2xl font-bold">{myScore}</p>
        </div>
        <div className="text-center text-muted-foreground text-xs space-y-1">
          <p>Manche {state.round} · élim. à {YANIV_ELIMINATION}</p>
          <p>{state.deck.length} cartes au talon</p>
        </div>
        <div className={`text-center ${!isMyTurn && !isFinished ? 'text-primary' : 'text-muted-foreground'}`}>
          <p className="text-xs uppercase tracking-wider">Adversaire</p>
          <p className="text-2xl font-bold">{opponentScore}</p>
        </div>
      </div>

      {/* Statut */}
      <div className="text-center text-sm min-h-[1.5rem]">
        {isFinished ? (
          <p className="text-lg font-bold">
            {game.winner === playerId ? (
              <span className="text-primary">🎉 Victoire !</span>
            ) : game.winner ? (
              <span className="text-destructive">😔 Défaite...</span>
            ) : (
              <span className="text-muted-foreground">Égalité !</span>
            )}
          </p>
        ) : isMyTurn ? (
          <p className="text-primary font-medium">
            {selected.length === 0
              ? `Ta main : ${myTotal} pts — choisis des cartes à défausser, ou annonce Yaniv`
              : selectionValid
                ? 'Pioche au talon, ou reprends une carte de la défausse'
                : 'Combinaison invalide (brelan ou suite de même couleur uniquement)'}
          </p>
        ) : (
          <p className="text-muted-foreground">Au tour de l'adversaire...</p>
        )}
      </div>

      {/* Main adverse (dos de cartes) */}
      <div className="flex justify-center gap-1.5 flex-wrap">
        {Array.from({ length: opponentHandCount }).map((_, i) => (
          <div key={i} className="w-8 h-12 rounded-lg bg-muted border-2 border-border flex items-center justify-center text-muted-foreground/30">
            ?
          </div>
        ))}
      </div>

      {/* Défausse */}
      <div className="rounded-2xl border border-border bg-card/50 p-3 min-h-[6.5rem]">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-2 text-center">
          Défausse {isMyTurn && selectionValid ? '— tape une carte pour la reprendre' : ''}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <AnimatePresence>
            {discardTop.map((card) => {
              const isPickable = isMyTurn && selectionValid && pickable.some(c => c.id === card.id);
              return (
                <motion.button
                  key={card.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={isPickable ? { scale: 0.94 } : {}}
                  onClick={() => isPickable && drawFromDiscard(card.id)}
                  disabled={!isPickable}
                  className={`w-12 h-16 rounded-lg border-2 flex items-center justify-center transition-colors ${
                    isPickable
                      ? 'bg-card border-primary text-foreground hover:bg-primary/10'
                      : 'bg-card border-border text-foreground/70'
                  }`}
                >
                  <CardFace card={card} />
                </motion.button>
              );
            })}
          </AnimatePresence>
          {discardTop.length === 0 && (
            <p className="text-xs text-muted-foreground py-6">Défausse vide</p>
          )}
        </div>
      </div>

      {/* Talon (pioche) */}
      {isMyTurn && selectionValid && (
        <div className="flex justify-center">
          <button
            onClick={drawFromDeck}
            className="w-14 h-20 rounded-lg border-2 border-primary/50 bg-muted flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <span className="text-xl">🂠</span>
            <span className="text-[0.6rem]">Piocher</span>
          </button>
        </div>
      )}

      {/* Ma main */}
      <div className="space-y-3">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground text-center">
          Ta main ({myTotal} pts)
        </p>
        <div className="flex justify-center gap-2 flex-wrap">
          <AnimatePresence>
            {myHand.map((card, index) => (
              <motion.button
                key={card.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: selected.includes(index) ? -8 : 0 }}
                exit={{ opacity: 0, y: 20 }}
                whileTap={isMyTurn ? { scale: 0.95 } : {}}
                onClick={() => toggleCard(index)}
                disabled={!isMyTurn || isFinished}
                className={`w-14 h-20 rounded-xl border-2 flex items-center justify-center transition-colors ${
                  selected.includes(index)
                    ? 'bg-primary/20 border-primary text-primary'
                    : isMyTurn
                      ? 'bg-card border-border hover:border-primary/50 text-foreground'
                      : 'bg-card border-border text-muted-foreground'
                }`}
              >
                <CardFace card={card} size="sm" />
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {canYaniv && (
          <div className="flex justify-center">
            <Button onClick={onYaniv} variant="secondary" className="px-8">
              Annoncer Yaniv ! ({myTotal} pts)
            </Button>
          </div>
        )}
      </div>

      {/* Résumé de la manche précédente */}
      {summary && (
        <div className="rounded-xl border border-border bg-card/50 p-3 space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground text-center mb-2">
            {summary.assaf
              ? `Assaf ! ${summary.caller === me ? "l'adversaire" : 'toi'} contrait avec une main plus basse`
              : `Manche terminée — ${summary.caller === me ? 'tu as' : "l'adversaire a"} annoncé Yaniv`}
          </p>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Toi : {summary.points[me]} pt(s) pris</span>
            <span>Adv. : {summary.points[opponent]} pt(s) pris</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};
