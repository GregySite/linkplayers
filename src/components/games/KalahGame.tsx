import { motion } from 'framer-motion';
import { Game } from '@/hooks/useGame';
import { KalahState, legalMoves, P1_PITS, P1_STORE, P2_PITS, P2_STORE } from '@/lib/kalahUtils';

interface KalahGameProps {
  game: Game;
  playerId: string;
  onPlay: (pitIndex: number) => void;
}

const Pit = ({
  seeds, playable, highlighted, onClick,
}: { seeds: number; playable: boolean; highlighted: boolean; onClick: () => void }) => (
  <motion.button
    whileTap={playable ? { scale: 0.92 } : {}}
    onClick={onClick}
    disabled={!playable}
    className={`relative w-11 h-11 sm:w-14 sm:h-14 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-colors ${
      highlighted
        ? 'bg-primary/20 border-primary text-primary'
        : playable
          ? 'bg-card border-border hover:border-primary/50 text-foreground'
          : 'bg-muted/50 border-border/50 text-muted-foreground'
    }`}
  >
    {seeds}
  </motion.button>
);

const Store = ({ seeds, label, active }: { seeds: number; label: string; active: boolean }) => (
  <div className={`flex flex-col items-center justify-center gap-1 w-14 h-28 sm:w-16 sm:h-32 rounded-2xl border-2 ${
    active ? 'border-primary bg-primary/10' : 'border-border bg-card/50'
  }`}>
    <span className="text-2xl font-bold text-foreground">{seeds}</span>
    <span className="text-[0.6rem] text-muted-foreground uppercase tracking-wider">{label}</span>
  </div>
);

export const KalahGame = ({ game, playerId, onPlay }: KalahGameProps) => {
  const state = game.game_state as unknown as KalahState;
  const amPlayer1 = game.player1_id === playerId;
  const me = amPlayer1 ? 'player1' : 'player2';
  const opponent = amPlayer1 ? 'player2' : 'player1';
  const isMyTurn = game.current_turn === playerId && game.status === 'playing';
  const isFinished = game.status === 'finished' || !!game.winner;

  if (!state?.pits) {
    return <p className="text-muted-foreground">Préparation du plateau...</p>;
  }

  const myStore = me === 'player1' ? P1_STORE : P2_STORE;
  const opponentStore = me === 'player1' ? P2_STORE : P1_STORE;
  // Ma rangée en bas (gauche→droite), l'adverse en haut (sens inverse pour respecter le sens du semis)
  const myPits = me === 'player1' ? P1_PITS : P2_PITS;
  const opponentPitsReversed = [...(me === 'player1' ? P2_PITS : P1_PITS)].reverse();

  const legal = isMyTurn ? legalMoves(state, me) : [];
  const lastMove = state.lastMove;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto space-y-5">
      <div className="text-center text-xs text-muted-foreground">Premier à 25 graines dans son réservoir gagne</div>

      <div className="text-center text-sm min-h-[1.5rem]">
        {isFinished ? (
          <p className="text-lg font-bold">
            {game.winner === playerId ? <span className="text-primary">🎉 Victoire !</span>
              : game.winner ? <span className="text-destructive">😔 Défaite...</span>
              : <span className="text-muted-foreground">Égalité !</span>}
          </p>
        ) : isMyTurn ? (
          <p className="text-primary font-medium">
            {lastMove?.player === me && lastMove.extraTurn ? 'Tu rejoues ! Choisis un autre trou' : 'Choisis un de tes trous pour semer'}
          </p>
        ) : (
          <p className="text-muted-foreground">Au tour de l'adversaire...</p>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-3">
        <div className="flex items-center gap-2">
          <Store seeds={state.pits[opponentStore]} label="Adv." active={!isMyTurn && !isFinished} />
          <div className="flex-1 space-y-3">
            <div className="flex justify-center gap-1.5 sm:gap-2">
              {opponentPitsReversed.map(i => (
                <Pit key={i} seeds={state.pits[i]} playable={false} highlighted={lastMove?.captured.includes(i) ?? false} onClick={() => {}} />
              ))}
            </div>
            <div className="flex justify-center gap-1.5 sm:gap-2">
              {myPits.map(i => (
                <Pit
                  key={i}
                  seeds={state.pits[i]}
                  playable={legal.includes(i)}
                  highlighted={lastMove?.from === i || (lastMove?.captured.includes(i) ?? false)}
                  onClick={() => onPlay(i)}
                />
              ))}
            </div>
          </div>
          <Store seeds={state.pits[myStore]} label="Toi" active={isMyTurn && !isFinished} />
        </div>
      </div>

      {lastMove && lastMove.captured.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {lastMove.player === me ? 'Tu as' : "L'adversaire a"} capturé une case en tombant sur un trou vide !
        </p>
      )}
    </motion.div>
  );
};
