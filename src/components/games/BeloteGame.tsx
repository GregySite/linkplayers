import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Game } from '@/hooks/useGame';
import { RoundTransitionOverlay, useLatchedRoundSummary } from '@/components/RoundTransitionOverlay';
import {
  BeloteCard, BeloteState, SUIT_SYMBOLS, rankLabel, isRedSuit,
  legalPlays, BELOTE_ELIMINATION,
} from '@/lib/beloteUtils';

interface BeloteGameProps {
  game: Game;
  playerId: string;
  onPlay: (handIndex: number) => void;
}

const CardFace = ({ card, size = 'md' }: { card: BeloteCard; size?: 'sm' | 'md' }) => (
  <div className={`flex flex-col items-center justify-center leading-none ${size === 'sm' ? 'text-xs' : 'text-sm'} ${isRedSuit(card.suit) ? 'text-destructive' : ''}`}>
    <span className={size === 'sm' ? 'text-base font-bold' : 'text-xl font-bold'}>{rankLabel(card)}</span>
    <span className={size === 'sm' ? 'text-xs' : 'text-base'}>{SUIT_SYMBOLS[card.suit]}</span>
  </div>
);

export const BeloteGame = ({ game, playerId, onPlay }: BeloteGameProps) => {
  const state = game.game_state as unknown as BeloteState;
  const amPlayer1 = game.player1_id === playerId;
  const me = amPlayer1 ? 'player1' : 'player2';
  const opponent = amPlayer1 ? 'player2' : 'player1';
  const isMyTurn = game.current_turn === playerId && game.status === 'playing';
  const isFinished = game.status === 'finished' || !!game.winner;
  const { open: showRoundEnd, summary, acknowledge } = useLatchedRoundSummary(state?.roundSummary, state?.round ?? 0);

  if (!state?.hands) {
    return <p className="text-muted-foreground">Distribution en cours...</p>;
  }

  const myHand = state.hands[me] || [];
  const opponentHandCount = (state.hands[opponent] || []).length;
  const ledSuit = state.currentTrick.length > 0 ? state.currentTrick[0].card.suit : null;
  const legal = isMyTurn ? legalPlays(myHand, state.trumpSuit, ledSuit) : [];

  const myTrickCard = state.currentTrick.find(t => t.player === me);
  const opponentTrickCard = state.currentTrick.find(t => t.player === opponent);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto space-y-4">
      {/* Scores */}
      <div className="flex items-center justify-between px-2">
        <div className={`text-center ${isMyTurn ? 'text-primary' : 'text-muted-foreground'}`}>
          <p className="text-xs uppercase tracking-wider">Toi</p>
          <p className="text-2xl font-bold">{state.scores[me]}</p>
        </div>
        <div className="text-center text-muted-foreground text-xs space-y-1">
          <p>Manche {state.round} · élim. à {BELOTE_ELIMINATION}</p>
          <p>Atout : <span className={isRedSuit(state.trumpSuit) ? 'text-destructive' : 'text-foreground'}>{SUIT_SYMBOLS[state.trumpSuit]}</span></p>
        </div>
        <div className={`text-center ${!isMyTurn && !isFinished ? 'text-primary' : 'text-muted-foreground'}`}>
          <p className="text-xs uppercase tracking-wider">Adversaire</p>
          <p className="text-2xl font-bold">{state.scores[opponent]}</p>
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
            {ledSuit ? 'Fournis à la couleur demandée, ou coupe si tu ne peux pas' : 'À toi d\'entamer le pli'}
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

      {/* Pli en cours */}
      <div className="rounded-2xl border border-border bg-card/50 p-4 min-h-[6rem] flex items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[0.6rem] text-muted-foreground uppercase">Adversaire</span>
          {opponentTrickCard ? (
            <div className="w-12 h-16 rounded-lg border-2 border-border bg-card flex items-center justify-center">
              <CardFace card={opponentTrickCard.card} />
            </div>
          ) : (
            <div className="w-12 h-16 rounded-lg border-2 border-dashed border-border/50" />
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[0.6rem] text-muted-foreground uppercase">Toi</span>
          {myTrickCard ? (
            <div className="w-12 h-16 rounded-lg border-2 border-border bg-card flex items-center justify-center">
              <CardFace card={myTrickCard.card} />
            </div>
          ) : (
            <div className="w-12 h-16 rounded-lg border-2 border-dashed border-border/50" />
          )}
        </div>
      </div>

      {/* Ma main */}
      <div className="space-y-3">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground text-center">Ta main</p>
        <div className="flex justify-center gap-1.5 flex-wrap">
          <AnimatePresence>
            {myHand.map((card, index) => {
              const playable = legal.includes(index);
              return (
                <motion.button
                  key={card.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  whileTap={playable ? { scale: 0.95, y: -8 } : {}}
                  onClick={() => playable && onPlay(index)}
                  disabled={!playable}
                  className={`w-11 h-16 rounded-lg border-2 flex items-center justify-center transition-colors ${
                    playable
                      ? 'bg-card border-primary/60 hover:border-primary text-foreground'
                      : 'bg-card border-border text-muted-foreground opacity-60'
                  }`}
                >
                  <CardFace card={card} size="sm" />
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <RoundTransitionOverlay
        open={showRoundEnd}
        title="Fin de manche !"
        onContinue={acknowledge}
      >
        {summary && (
          <>
            <p className="text-sm text-foreground">
              {summary.beloteRebelote ? 'Belote-Rebelote annoncée !' : 'Les plis sont comptés'}
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
