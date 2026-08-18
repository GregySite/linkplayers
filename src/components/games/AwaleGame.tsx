import { motion } from 'framer-motion';
import { Game } from '@/hooks/useGame';
import { AwaleState, legalMoves } from '@/lib/awaleUtils';

interface AwaleGameProps {
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
    className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-colors ${
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

export const AwaleGame = ({ game, playerId, onPlay }: AwaleGameProps) => {
  const state = game.game_state as unknown as AwaleState;
  const amPlayer1 = game.player1_id === playerId;
  const me = amPlayer1 ? 'player1' : 'player2';
  const opponent = amPlayer1 ? 'player2' : 'player1';
  const isMyTurn = game.current_turn === playerId && game.status === 'playing';
  const isFinished = game.status === 'finished' || !!game.winner;

  if (!state?.pits) {
    return <p className="text-muted-foreground">Préparation du plateau...</p>;
  }

  // Ordre circulaire d'affichage : ma rangée en bas (gauche→droite), l'adverse en haut (sens inverse)
  const bottomOrder = amPlayer1 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11];
  const topOrder = amPlayer1 ? [11, 10, 9, 8, 7, 6] : [5, 4, 3, 2, 1, 0];

  const legal = isMyTurn ? legalMoves(state, me) : [];
  const lastMove = state.lastMove;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto space-y-5">
      {/* Scores */}
      <div className="flex items-center justify-between px-2">
        <div className={`text-center ${isMyTurn ? 'text-primary' : 'text-muted-foreground'}`}>
          <p className="text-xs uppercase tracking-wider">Toi</p>
          <p className="text-2xl font-bold">{state.scores[me]}</p>
        </div>
        <div className="text-center text-muted-foreground text-xs">
          <p>Majorité à 25 graines</p>
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
          <p className="text-primary font-medium">Choisis une de tes cases pour semer</p>
        ) : (
          <p className="text-muted-foreground">Au tour de l'adversaire...</p>
        )}
      </div>

      {/* Plateau */}
      <div className="rounded-2xl border border-border bg-card/50 p-4 space-y-3">
        <div className="flex justify-center gap-2">
          {topOrder.map(i => (
            <Pit
              key={i}
              seeds={state.pits[i]}
              playable={false}
              highlighted={lastMove?.captured.includes(i) ?? false}
              onClick={() => {}}
            />
          ))}
        </div>
        <div className="flex justify-center gap-2">
          {bottomOrder.map(i => (
            <Pit
              key={i}
              seeds={state.pits[i]}
              playable={legal.includes(i)}
              highlighted={lastMove?.from === i}
              onClick={() => onPlay(i)}
            />
          ))}
        </div>
      </div>

      {lastMove && lastMove.captured.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {lastMove.player === me ? 'Tu as' : "L'adversaire a"} capturé {lastMove.captured.length > 1 ? 'plusieurs cases' : 'une case'} au dernier coup
        </p>
      )}
    </motion.div>
  );
};
