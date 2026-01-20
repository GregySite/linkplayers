import { motion } from 'framer-motion';
import { Game } from '@/hooks/useGame';
import { checkMorpionWinner, isMorpionDraw } from '@/lib/gameUtils';
import { X, Circle } from 'lucide-react';

interface MorpionGameProps {
  game: Game;
  playerId: string;
  onMove: (index: number) => void;
}

export const MorpionGame = ({ game, playerId, onMove }: MorpionGameProps) => {
  const board = (game.game_state as { board: (string | null)[] }).board || Array(9).fill(null);
  const winner = checkMorpionWinner(board);
  const isDraw = isMorpionDraw(board);
  const isMyTurn = game.current_turn === playerId;
  const amPlayer1 = game.player1_id === playerId;
  const mySymbol = amPlayer1 ? 'X' : 'O';
  
  const getStatusMessage = () => {
    if (winner) {
      const winnerIsMe = (winner === 'X' && amPlayer1) || (winner === 'O' && !amPlayer1);
      return winnerIsMe ? '🎉 Tu as gagné !' : '😢 Tu as perdu...';
    }
    if (isDraw) return '🤝 Match nul !';
    if (game.status === 'waiting') return '⏳ En attente de l\'adversaire...';
    return isMyTurn ? `🎯 C'est ton tour (${mySymbol})` : '⏳ Tour de l\'adversaire...';
  };

  const handleCellClick = (index: number) => {
    if (board[index] || winner || isDraw || !isMyTurn || game.status !== 'playing') return;
    onMove(index);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xl font-display font-semibold text-foreground text-center"
      >
        {getStatusMessage()}
      </motion.div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {board.map((cell, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={!cell && isMyTurn && game.status === 'playing' ? { scale: 1.05 } : {}}
            whileTap={!cell && isMyTurn && game.status === 'playing' ? { scale: 0.95 } : {}}
            onClick={() => handleCellClick(index)}
            disabled={!!cell || !!winner || isDraw || !isMyTurn || game.status !== 'playing'}
            className={`
              w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center
              transition-all duration-200 border-2
              ${cell 
                ? 'bg-muted border-border' 
                : isMyTurn && game.status === 'playing'
                  ? 'bg-muted hover:bg-primary/10 border-border hover:border-primary cursor-pointer'
                  : 'bg-muted border-border cursor-not-allowed opacity-70'
              }
            `}
          >
            {cell === 'X' && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <X className="w-10 h-10 sm:w-12 sm:h-12 text-primary stroke-[3]" />
              </motion.div>
            )}
            {cell === 'O' && (
              <motion.div
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <Circle className="w-10 h-10 sm:w-12 sm:h-12 text-secondary stroke-[3]" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      <div className="flex gap-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <X className={`w-5 h-5 ${amPlayer1 ? 'text-primary' : 'text-muted-foreground'}`} />
          <span>{amPlayer1 ? 'Toi' : 'Adversaire'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Circle className={`w-5 h-5 ${!amPlayer1 ? 'text-secondary' : 'text-muted-foreground'}`} />
          <span>{!amPlayer1 ? 'Toi' : 'Adversaire'}</span>
        </div>
      </div>
    </div>
  );
};
