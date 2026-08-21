import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Game } from '@/hooks/useGame';
import { Button } from '@/components/ui/button';
import { RoundTransitionOverlay } from '@/components/RoundTransitionOverlay';
import {
  YanivCard, YanivState, SUIT_SYMBOLS, rankLabel, isRedSuit,
  isValidDiscard, canCallYaniv, handPoints, YANIV_ELIMINATION, canSlap,
} from '@/lib/yanivUtils';

interface YanivGameProps {
  game: Game;
  playerId: string;
  onPlay: (discardIndices: number[], draw: { from: 'deck' } | { from: 'discard'; cardId: string }) => void;
  onYaniv: () => void;
  onSlap: () => void;
  onSkipSlap: () => void;
}

const CardFace = ({ card, size = 'md' }: { card: YanivCard; size?: 'sm' | 'md' }) => (
  <div className={`flex flex-col items-center justify-center leading-none ${size === 'sm' ? 'text-xs' : 'text-sm'} ${card.suit !== 'joker' && isRedSuit(card.suit) ? 'text-destructive' : ''}`}>
    <span className={size === 'sm' ? 'text-base font-bold' : 'text-xl font-bold'}>{rankLabel(card)}</span>
    <span className={size === 'sm' ? 'text-xs' : 'text-base'}>{SUIT_SYMBOLS[card.suit]}</span>
  </div>
);

const SLAP_WINDOW_MS = 3000;

export const YanivGame = ({ game, playerId, onPlay, onYaniv, onSlap, onSkipSlap }: YanivGameProps) => {
  const state = game.game_state as unknown as YanivState;
  const amPlayer1 = game.player1_id === playerId;
  const me = amPlayer1 ? 'player1' : 'player2';
  const opponent = amPlayer1 ? 'player2' : 'player1';
  const isMyTurn = game.current_turn === playerId && game.status === 'playing';
  const isFinished = game.status === 'finished' || !!game.winner;

  const [selected, setSelected] = useState<number[]>([]);
  const [ackedRound, setAckedRound] = useState<number | null>(null);
  const [slapMsLeft, setSlapMsLeft] = useState(SLAP_WINDOW_MS);

  // Calculé avant le retour anticipé pour que les Hooks restent dans un ordre stable
  const pendingSlap = isMyTurn && !isFinished && !!state?.hands && canSlap(state, me);

  // Réinitialise la sélection dès que le plateau change
  useEffect(() => {
    setSelected([]);
  }, [game.updated_at]);

  // Compte à rebours "réflexe" pour le slap : passé le délai, l'occasion est perdue
  const onSkipSlapRef = useRef(onSkipSlap);
  useEffect(() => { onSkipSlapRef.current = onSkipSlap; }, [onSkipSlap]);

  useEffect(() => {
    if (!pendingSlap) { setSlapMsLeft(SLAP_WINDOW_MS); return; }
    const start = Date.now();
    const interval = setInterval(() => {
      const remaining = Math.max(0, SLAP_WINDOW_MS - (Date.now() - start));
      setSlapMsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onSkipSlapRef.current();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [pendingSlap]);

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
  const canYaniv = isMyTurn && !isFinished && !pendingSlap && selected.length === 0 && canCallYaniv(myHand);

  const toggleCard = (index: number) => {
    if (!isMyTurn || isFinished || pendingSlap) return;
    setSelected(prev => (prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]));
  };

  const drawFromDeck = () => {
    if (!selectionValid || pendingSlap) return;
    onPlay(selected, { from: 'deck' });
    setSelected([]);
  };

  const drawFromDiscard = (cardId: string) => {
    if (!selectionValid || pendingSlap) return;
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

      {/* Statut — hauteur fixe sur 2 lignes pour que la main ne bouge jamais */}
      <div className="text-center text-sm h-10 flex items-center justify-center px-2">
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
        ) : pendingSlap ? (
          <p className="text-primary font-medium">
            Même valeur que ta défausse — slape vite !
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

      {/* Slap : superposition centrée sur l'écran, impossible à rater */}
      {pendingSlap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm px-6">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-xs rounded-2xl border-2 border-primary bg-card p-5 space-y-4 text-center shadow-2xl"
          >
            <p className="text-2xl font-bold text-primary">👋 SLAP !</p>
            <p className="text-sm text-muted-foreground">
              Tu as pioché la même valeur que ta défausse — repose-la vite !
            </p>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-[width] duration-100 ease-linear"
                style={{ width: `${(slapMsLeft / SLAP_WINDOW_MS) * 100}%` }}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={onSlap} size="lg" className="flex-1 font-bold text-base">
                Slaper !
              </Button>
              <Button onClick={onSkipSlap} size="lg" variant="outline" className="flex-1">
                Passer
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Main adverse — hauteur fixe et sans repli, sinon le nombre de cartes
          changerait la hauteur et décalerait tout le reste */}
      <div className="h-12 flex justify-center items-center gap-1.5 overflow-hidden">
        {Array.from({ length: opponentHandCount }).map((_, i) => (
          <div key={i} className="w-8 h-12 shrink-0 rounded-lg bg-muted border-2 border-border flex items-center justify-center text-muted-foreground/30">
            ?
          </div>
        ))}
      </div>

      {/* Défausse */}
      <div className="rounded-2xl border border-border bg-card/50 p-3 h-[7.5rem]">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-2 text-center h-4 truncate">
          Défausse {isMyTurn && selectionValid ? '— tape pour reprendre' : ''}
        </p>
        <div className="flex justify-center gap-2">
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
                  className={`w-12 h-16 shrink-0 rounded-lg border-2 flex items-center justify-center transition-colors ${
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
            <p className="text-xs text-muted-foreground py-5">Défausse vide</p>
          )}
        </div>
      </div>

      {/* Talon (pioche) — toujours affiché pour éviter que la main ne saute */}
      <div className="flex justify-center">
        <button
          onClick={drawFromDeck}
          disabled={!isMyTurn || !selectionValid || pendingSlap}
          className={`w-14 h-20 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-colors ${
            isMyTurn && selectionValid
              ? 'border-primary/50 bg-muted text-muted-foreground hover:border-primary hover:text-primary'
              : 'border-border bg-muted/40 text-muted-foreground/40'
          }`}
        >
          <span className="text-xl">🂠</span>
          <span className="text-[0.6rem]">Piocher</span>
        </button>
      </div>

      {/* Ma main */}
      <div className="space-y-3">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground text-center">
          Ta main ({myTotal} pts)
        </p>
        {/* Hauteur fixe : la main varie de 3 à 7+ cartes, sans quoi elle se replierait
            sur deux rangées et ferait bouger tout le bloc */}
        <div className="h-24 flex justify-center items-center gap-1.5 overflow-x-auto">
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
                className={`w-14 h-20 shrink-0 rounded-xl border-2 flex items-center justify-center transition-colors ${
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

        <div className="h-10 flex justify-center items-center">
          {canYaniv && (
            <Button onClick={onYaniv} variant="secondary" className="px-8">
              Annoncer Yaniv ! ({myTotal} pts)
            </Button>
          )}
        </div>
      </div>

      {/* Transition entre les manches — bloque l'écran tant que non acquittée */}
      <RoundTransitionOverlay
        open={!!summary && state.round !== ackedRound}
        title={summary?.assaf ? 'Assaf !' : 'Manche terminée !'}
        onContinue={() => setAckedRound(state.round)}
      >
        {summary && (
          <>
            <p className="text-sm text-foreground">
              {summary.assaf
                ? `${summary.caller === me ? "L'adversaire" : 'Tu'} contrait avec une main plus basse`
                : `${summary.caller === me ? 'Tu as' : "L'adversaire a"} annoncé Yaniv`}
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
