import { motion, AnimatePresence } from 'framer-motion';
import { Game } from '@/hooks/useGame';
import { RPSChoice, RPSRound, determineRPSWinner, getRPSEmoji, getRPSLabel } from '@/lib/gameUtils';

interface RPSGameProps {
  game: Game;
  playerId: string;
  onChoice: (choice: RPSChoice) => void;
}

const choices: RPSChoice[] = ['rock', 'paper', 'scissors'];

export const RPSGame = ({ game, playerId, onChoice }: RPSGameProps) => {
  const gameState = game.game_state as {
    player1Choice: RPSChoice | null;
    player2Choice: RPSChoice | null;
    rounds: RPSRound[];
    currentRound: number;
    bestOf: number;
    revealing?: boolean;
  };

  const amPlayer1 = game.player1_id === playerId;
  const myChoice = amPlayer1 ? gameState.player1Choice : gameState.player2Choice;
  const opponentChoice = amPlayer1 ? gameState.player2Choice : gameState.player1Choice;
  const rounds = gameState.rounds || [];
  const bestOf = gameState.bestOf || 3;
  const winsNeeded = Math.ceil(bestOf / 2);

  const myWins = rounds.filter(r => 
    (amPlayer1 && r.winner === 'player1') || (!amPlayer1 && r.winner === 'player2')
  ).length;
  const opponentWins = rounds.filter(r => 
    (amPlayer1 && r.winner === 'player2') || (!amPlayer1 && r.winner === 'player1')
  ).length;

  const isMatchOver = myWins >= winsNeeded || opponentWins >= winsNeeded;
  const bothChosen = gameState.player1Choice !== null && gameState.player2Choice !== null;

  const getStatusMessage = () => {
    if (game.status === 'waiting') return '⏳ En attente de l\'adversaire...';
    if (isMatchOver) {
      return myWins > opponentWins ? '🎉 Tu as gagné le match !' : '😢 Tu as perdu le match...';
    }
    if (bothChosen) {
      const roundResult = determineRPSWinner(gameState.player1Choice!, gameState.player2Choice!);
      if (roundResult === 'draw') return '🤝 Égalité ! Manche suivante...';
      const iWon = (amPlayer1 && roundResult === 'player1') || (!amPlayer1 && roundResult === 'player2');
      return iWon ? '✅ Tu remportes cette manche !' : '❌ Manche perdue !';
    }
    if (myChoice) return '⏳ En attente du choix adverse...';
    return `🎯 Manche ${rounds.length + 1} — Fais ton choix !`;
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xl font-display font-semibold text-foreground text-center"
      >
        {getStatusMessage()}
      </motion.div>

      {/* Score */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{myWins}</div>
          <div className="text-xs text-muted-foreground">Toi</div>
        </div>
        <div className="text-muted-foreground font-mono text-lg">
          Best of {bestOf}
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-secondary">{opponentWins}</div>
          <div className="text-xs text-muted-foreground">Adversaire</div>
        </div>
      </div>

      {/* Reveal area */}
      {bothChosen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-8"
        >
          <div className="text-center">
            <motion.div
              initial={{ rotateY: 180 }}
              animate={{ rotateY: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-6xl"
            >
              {getRPSEmoji(amPlayer1 ? gameState.player1Choice! : gameState.player2Choice!)}
            </motion.div>
            <div className="text-sm text-muted-foreground mt-2">Toi</div>
          </div>
          <div className="text-2xl text-muted-foreground font-bold">VS</div>
          <div className="text-center">
            <motion.div
              initial={{ rotateY: 180 }}
              animate={{ rotateY: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="text-6xl"
            >
              {getRPSEmoji(amPlayer1 ? gameState.player2Choice! : gameState.player1Choice!)}
            </motion.div>
            <div className="text-sm text-muted-foreground mt-2">Adversaire</div>
          </div>
        </motion.div>
      )}

      {/* Choice buttons */}
      {!isMatchOver && !bothChosen && game.status === 'playing' && (
        <div className="flex gap-4">
          {choices.map((choice) => (
            <motion.button
              key={choice}
              whileHover={{ scale: 1.1, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => !myChoice && onChoice(choice)}
              disabled={!!myChoice}
              className={`flex flex-col items-center gap-2 p-4 sm:p-6 rounded-2xl border-2 transition-all ${
                myChoice === choice
                  ? 'border-primary bg-primary/10'
                  : myChoice
                    ? 'border-border opacity-40 cursor-not-allowed'
                    : 'border-border hover:border-primary/50 cursor-pointer bg-card hover:bg-primary/5'
              }`}
            >
              <span className="text-4xl sm:text-5xl">{getRPSEmoji(choice)}</span>
              <span className="text-sm font-medium text-foreground">{getRPSLabel(choice).split(' ')[1]}</span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Round history */}
      {rounds.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {rounds.map((round, i) => {
            const iWon = (amPlayer1 && round.winner === 'player1') || (!amPlayer1 && round.winner === 'player2');
            const isDraw = round.winner === 'draw';
            return (
              <div
                key={i}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isDraw ? 'bg-muted text-muted-foreground' : iWon ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'
                }`}
              >
                M{i + 1}: {getRPSEmoji(amPlayer1 ? round.player1Choice : round.player2Choice)} vs {getRPSEmoji(amPlayer1 ? round.player2Choice : round.player1Choice)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
