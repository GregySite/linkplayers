import { motion, AnimatePresence } from 'framer-motion';
import { Game } from '@/hooks/useGame';
import { RoundTransitionOverlay, useLatchedRoundSummary } from '@/components/RoundTransitionOverlay';
import {
  BlackjackCard, BlackjackState, SUIT_SYMBOLS, rankLabel, isRedSuit,
  handValue, BLACKJACK_TARGET,
} from '@/lib/blackjackUtils';
import { Button } from '@/components/ui/button';

interface BlackjackGameProps {
  game: Game;
  playerId: string;
  onAction: (action: 'hit' | 'stand') => void;
}

const OUTCOME_LABELS: Record<string, string> = {
  win: 'Gagné', lose: 'Perdu', push: 'Égalité', blackjack: 'Blackjack !',
};

const CardFace = ({ card, size = 'md', hidden = false }: { card?: BlackjackCard; size?: 'sm' | 'md'; hidden?: boolean }) => {
  const dims = size === 'sm' ? 'w-11 h-16' : 'w-12 h-16';
  if (hidden || !card) {
    return <div className={`${dims} rounded-lg border-2 border-border bg-primary/20 flex items-center justify-center text-primary/40 text-lg`}>🂠</div>;
  }
  return (
    <div className={`${dims} rounded-lg border-2 border-border bg-card flex flex-col items-center justify-center leading-none ${isRedSuit(card.suit) ? 'text-destructive' : 'text-foreground'}`}>
      <span className="text-base font-bold">{rankLabel(card)}</span>
      <span className="text-sm">{SUIT_SYMBOLS[card.suit]}</span>
    </div>
  );
};

export const BlackjackGame = ({ game, playerId, onAction }: BlackjackGameProps) => {
  const state = game.game_state as unknown as BlackjackState;
  const amPlayer1 = game.player1_id === playerId;
  const me = amPlayer1 ? 'player1' : 'player2';
  const opponent = amPlayer1 ? 'player2' : 'player1';
  const isFinished = game.status === 'finished' || !!game.winner;
  const { open: showRoundEnd, summary, acknowledge } = useLatchedRoundSummary(state?.roundSummary, state?.round ?? 0);

  if (!state?.hands) {
    return <p className="text-muted-foreground">Distribution en cours...</p>;
  }

  const myHand = state.hands[me] || [];
  const opponentHand = state.hands[opponent] || [];
  const myTurn = state.turn === me && !state.standing[me] && !state.busted[me] && !isFinished;
  const bothPlayersDone = (state.standing.player1 || state.busted.player1) && (state.standing.player2 || state.busted.player2);
  const revealDealer = bothPlayersDone || isFinished || !!state.roundSummary;

  const statusText = () => {
    if (isFinished) return null;
    if (myTurn) return 'À toi de jouer : tire une carte ou reste';
    if (state.busted[me]) return 'Tu as sauté — en attente...';
    if (state.standing[me]) return 'Tu restes — en attente de l\'adversaire...';
    return 'Au tour de l\'adversaire...';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto space-y-4">
      {/* Scores */}
      <div className="flex items-center justify-between px-2">
        <div className={`text-center ${myTurn ? 'text-primary' : 'text-muted-foreground'}`}>
          <p className="text-xs uppercase tracking-wider">Toi</p>
          <p className="text-2xl font-bold">{state.scores[me]}</p>
        </div>
        <div className="text-center text-muted-foreground text-xs">
          <p>Manche {state.round} · premier à {BLACKJACK_TARGET}</p>
        </div>
        <div className={`text-center ${!myTurn && !isFinished ? 'text-primary' : 'text-muted-foreground'}`}>
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
        ) : (
          <p className={myTurn ? 'text-primary font-medium' : 'text-muted-foreground'}>{statusText()}</p>
        )}
      </div>

      {/* Croupier */}
      <div className="rounded-2xl border border-border bg-card/50 p-3 space-y-2">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground text-center">
          Croupier {revealDealer ? `— ${handValue(state.dealerHand)}` : ''}
        </p>
        <div className="flex justify-center gap-1.5">
          {state.dealerHand.map((card, i) => (
            <CardFace key={card.id} card={card} hidden={i === 1 && !revealDealer} />
          ))}
        </div>
      </div>

      {/* Main adverse */}
      <div className="space-y-1">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground text-center">
          Adversaire {state.busted[opponent] ? '— sauté' : state.standing[opponent] ? `— ${handValue(opponentHand)}` : ''}
        </p>
        <div className="flex justify-center gap-1.5">
          {opponentHand.map((card) => (
            <CardFace key={card.id} card={card} size="sm" />
          ))}
        </div>
      </div>

      {/* Ma main */}
      <div className="space-y-2">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground text-center">
          Ta main — {handValue(myHand)}{state.busted[me] ? ' (sauté)' : ''}
        </p>
        <div className="flex justify-center gap-1.5 flex-wrap">
          <AnimatePresence>
            {myHand.map((card) => (
              <motion.div key={card.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <CardFace card={card} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Actions */}
      {myTurn && (
        <div className="flex gap-3 justify-center pt-2">
          <Button onClick={() => onAction('hit')} size="lg" className="flex-1 max-w-[9rem] font-semibold">
            Tirer
          </Button>
          <Button onClick={() => onAction('stand')} variant="outline" size="lg" className="flex-1 max-w-[9rem] border-primary/50 hover:bg-primary/10 hover:border-primary font-semibold">
            Rester
          </Button>
        </div>
      )}

      <RoundTransitionOverlay open={showRoundEnd} title="Fin de manche !" onContinue={acknowledge}>
        {summary && (
          <>
            <p className="text-sm text-foreground">Croupier : {summary.dealerValue}{summary.dealerValue > 21 ? ' (sauté)' : ''}</p>
            <div className="flex justify-between text-sm px-2">
              <span className={summary.results[me] === 'lose' ? 'text-destructive' : 'text-primary'}>
                Toi ({summary.playerValues[me]}) : {OUTCOME_LABELS[summary.results[me]]}
              </span>
              <span className={summary.results[opponent] === 'lose' ? 'text-destructive' : 'text-primary'}>
                Adv. ({summary.playerValues[opponent]}) : {OUTCOME_LABELS[summary.results[opponent]]}
              </span>
            </div>
          </>
        )}
      </RoundTransitionOverlay>
    </motion.div>
  );
};
