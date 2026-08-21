import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Game } from '@/hooks/useGame';
import { Button } from '@/components/ui/button';
import { RoundTransitionOverlay, useLatchedRoundSummary } from '@/components/RoundTransitionOverlay';
import {
  RamiCard, RamiState, SUIT_SYMBOLS, rankLabel, isRedSuit,
  isValidMeld, handPoints, RAMI_ELIMINATION,
} from '@/lib/ramiUtils';

interface RamiGameProps {
  game: Game;
  playerId: string;
  onDraw: (from: 'deck' | 'discard') => void;
  onLayMeld: (handIndices: number[]) => void;
  onAddToMeld: (handIndex: number, meldId: string) => void;
  onDiscard: (handIndex: number) => void;
}

const CardFace = ({ card, size = 'md' }: { card: RamiCard; size?: 'sm' | 'md' }) => (
  <div className={`flex flex-col items-center justify-center leading-none ${size === 'sm' ? 'text-xs' : 'text-sm'} ${card.suit !== 'joker' && isRedSuit(card.suit) ? 'text-destructive' : ''}`}>
    <span className={size === 'sm' ? 'text-base font-bold' : 'text-xl font-bold'}>{rankLabel(card)}</span>
    <span className={size === 'sm' ? 'text-xs' : 'text-base'}>{SUIT_SYMBOLS[card.suit]}</span>
  </div>
);

export const RamiGame = ({ game, playerId, onDraw, onLayMeld, onAddToMeld, onDiscard }: RamiGameProps) => {
  const state = game.game_state as unknown as RamiState;
  const amPlayer1 = game.player1_id === playerId;
  const me = amPlayer1 ? 'player1' : 'player2';
  const opponent = amPlayer1 ? 'player2' : 'player1';
  const isMyTurn = game.current_turn === playerId && game.status === 'playing';
  const isFinished = game.status === 'finished' || !!game.winner;

  const [selected, setSelected] = useState<number[]>([]);
  const [selectedMeld, setSelectedMeld] = useState<string | null>(null);
  const { open: showRoundEnd, summary, acknowledge } = useLatchedRoundSummary(state?.roundSummary, state?.round ?? 0);

  useEffect(() => {
    setSelected([]);
    setSelectedMeld(null);
  }, [game.updated_at]);

  if (!state?.hands) {
    return <p className="text-muted-foreground">Distribution en cours...</p>;
  }

  const myHand = state.hands[me] || [];
  const opponentHandCount = (state.hands[opponent] || []).length;
  const scores = state.scores || { player1: 0, player2: 0 };
  const hasDrawn = state.hasDrawn;
  const topDiscard = state.discardPile?.[state.discardPile.length - 1];

  const selectedCards = selected.map(i => myHand[i]).filter(Boolean);
  const canLayMeld = isMyTurn && hasDrawn && selectedCards.length >= 3 && isValidMeld(selectedCards);
  const canAdd = isMyTurn && hasDrawn && selected.length === 1 && !!selectedMeld;
  const canDiscard = isMyTurn && hasDrawn && selected.length === 1 && !selectedMeld;

  const toggleCard = (index: number) => {
    if (!isMyTurn || isFinished || !hasDrawn) return;
    setSelectedMeld(null);
    setSelected(prev => (prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]));
  };

  const toggleMeld = (meldId: string) => {
    if (!isMyTurn || isFinished || !hasDrawn || selected.length !== 1) return;
    setSelectedMeld(prev => (prev === meldId ? null : meldId));
  };


  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto space-y-4">
      {/* Scores */}
      <div className="flex items-center justify-between px-2">
        <div className={`text-center ${isMyTurn ? 'text-primary' : 'text-muted-foreground'}`}>
          <p className="text-xs uppercase tracking-wider">Toi</p>
          <p className="text-2xl font-bold">{scores[me]}</p>
        </div>
        <div className="text-center text-muted-foreground text-xs space-y-1">
          <p>Manche {state.round} · élim. à {RAMI_ELIMINATION}</p>
          <p>{state.deck.length} cartes au talon</p>
        </div>
        <div className={`text-center ${!isMyTurn && !isFinished ? 'text-primary' : 'text-muted-foreground'}`}>
          <p className="text-xs uppercase tracking-wider">Adversaire</p>
          <p className="text-2xl font-bold">{scores[opponent]}</p>
        </div>
      </div>

      {/* Statut */}
      <div className="text-center text-sm min-h-[1.5rem]">
        {isFinished ? (
          <p className="text-lg font-bold">
            {game.winner === playerId ? <span className="text-primary">🎉 Victoire !</span>
              : game.winner ? <span className="text-destructive">😔 Défaite...</span>
              : <span className="text-muted-foreground">Égalité !</span>}
          </p>
        ) : isMyTurn ? (
          <p className="text-primary font-medium">
            {!hasDrawn
              ? 'Pioche au talon, ou reprends la carte de la défausse'
              : canLayMeld ? 'Combinaison valide — pose-la sur la table'
              : canAdd ? 'Ajouter cette carte à la combinaison sélectionnée'
              : selected.length === 1 ? 'Défausse cette carte pour finir ton tour'
              : 'Choisis un brelan/une suite à poser, ou une carte à défausser'}
          </p>
        ) : (
          <p className="text-muted-foreground">Au tour de l'adversaire...</p>
        )}
      </div>

      {/* Main adverse */}
      <div className="flex justify-center gap-1 flex-wrap">
        {Array.from({ length: opponentHandCount }).map((_, i) => (
          <div key={i} className="w-6 h-9 rounded-md bg-muted border border-border flex items-center justify-center text-muted-foreground/30 text-[0.6rem]">?</div>
        ))}
      </div>

      {/* Table : combinaisons posées */}
      <div className="rounded-2xl border border-border bg-card/50 p-3 min-h-[4rem] space-y-2">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground text-center">
          Table {canAdd === false && selected.length === 1 && hasDrawn ? '— tape une combinaison pour y ajouter ta carte' : ''}
        </p>
        {state.melds.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">Aucune combinaison posée</p>
        ) : (
          <div className="flex flex-wrap gap-2 justify-center">
            {state.melds.map(meld => (
              <button
                key={meld.id}
                onClick={() => toggleMeld(meld.id)}
                disabled={!isMyTurn || !hasDrawn || selected.length !== 1}
                className={`flex gap-0.5 p-1.5 rounded-lg border-2 transition-colors ${
                  selectedMeld === meld.id ? 'border-primary bg-primary/10' : 'border-border bg-card'
                }`}
              >
                {meld.cards.map(card => (
                  <div key={card.id} className="w-8 h-11 rounded border border-border/60 bg-background flex items-center justify-center">
                    <CardFace card={card} size="sm" />
                  </div>
                ))}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pioche + défausse */}
      <div className="flex justify-center items-center gap-4">
        {!hasDrawn && isMyTurn ? (
          <button onClick={() => onDraw('deck')} className="w-14 h-20 rounded-lg border-2 border-primary/50 bg-muted flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
            <span className="text-xl">🂠</span>
            <span className="text-[0.6rem]">Talon</span>
          </button>
        ) : (
          <div className="w-14 h-20 rounded-lg border-2 border-border bg-muted flex items-center justify-center text-muted-foreground text-xl">🂠</div>
        )}

        <button
          onClick={() => !hasDrawn && isMyTurn && onDraw('discard')}
          disabled={!isMyTurn || hasDrawn || !topDiscard}
          className={`w-14 h-20 rounded-lg border-2 flex items-center justify-center transition-colors ${
            !hasDrawn && isMyTurn && topDiscard ? 'bg-card border-primary hover:bg-primary/10' : 'bg-card border-border'
          }`}
        >
          {topDiscard ? <CardFace card={topDiscard} /> : <span className="text-xs text-muted-foreground">vide</span>}
        </button>
      </div>

      {/* Ma main */}
      <div className="space-y-3">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground text-center">
          Ta main ({handPoints(myHand)} pts si non posée)
        </p>
        <div className="flex justify-center gap-1.5 flex-wrap">
          <AnimatePresence>
            {myHand.map((card, index) => (
              <motion.button
                key={card.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: selected.includes(index) ? -8 : 0 }}
                exit={{ opacity: 0, y: 20 }}
                whileTap={isMyTurn && hasDrawn ? { scale: 0.95 } : {}}
                onClick={() => toggleCard(index)}
                disabled={!isMyTurn || isFinished || !hasDrawn}
                className={`w-11 h-16 rounded-lg border-2 flex items-center justify-center transition-colors ${
                  selected.includes(index)
                    ? 'bg-primary/20 border-primary text-primary'
                    : isMyTurn && hasDrawn
                      ? 'bg-card border-border hover:border-primary/50 text-foreground'
                      : 'bg-card border-border text-muted-foreground'
                }`}
              >
                <CardFace card={card} size="sm" />
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex justify-center gap-2">
          {canLayMeld && (
            <Button onClick={() => { onLayMeld(selected); setSelected([]); }} variant="secondary">
              Poser la combinaison
            </Button>
          )}
          {canAdd && selectedMeld && (
            <Button onClick={() => { onAddToMeld(selected[0], selectedMeld); setSelected([]); setSelectedMeld(null); }} variant="secondary">
              Ajouter à la combinaison
            </Button>
          )}
          {canDiscard && (
            <Button onClick={() => { onDiscard(selected[0]); setSelected([]); }} variant="outline">
              Défausser
            </Button>
          )}
        </div>
      </div>

      <RoundTransitionOverlay
        open={showRoundEnd}
        title="Manche terminée !"
        onContinue={acknowledge}
      >
        {summary && (
          <>
            <p className="text-sm text-foreground">
              {summary.winner === me ? 'Tu as terminé la manche' : "L'adversaire a terminé la manche"}
              {summary.wentOutClean ? ' — Rami ! (bonus)' : ''}
            </p>
            <div className="flex justify-between text-sm text-muted-foreground px-2">
              <span>Toi : +{summary.points[me]} pt(s)</span>
              <span>Adv. : +{summary.points[opponent]} pt(s)</span>
            </div>
          </>
        )}
      </RoundTransitionOverlay>
    </motion.div>
  );
};
