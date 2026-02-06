import { motion } from 'framer-motion';
import { Game } from '@/hooks/useGame';
import { OthelloCell, getValidOthelloMoves, countOthelloPieces, isOthelloGameOver } from '@/lib/gameUtils';

interface OthelloGameProps {
  game: Game;
  playerId: string;
  onMove: (pos: number) => void;
}

export const OthelloGame = ({ game, playerId, onMove }: OthelloGameProps) => {
  const gameState = game.game_state as { board: OthelloCell[]; currentColor: OthelloCell };
  const board = gameState.board || Array(64).fill(null);
  const currentColor = gameState.currentColor || 'black';
  const amPlayer1 = game.player1_id === playerId;
  const myColor: OthelloCell = amPlayer1 ? 'black' : 'white';
  const isMyTurn = game.current_turn === playerId;
  const validMoves = isMyTurn ? getValidOthelloMoves(board, myColor) : [];
  const pieces = countOthelloPieces(board);
  const gameOver = isOthelloGameOver(board);

  const getStatusMessage = () => {
    if (game.status === 'waiting') return '⏳ En attente de l\'adversaire...';
    if (gameOver) {
      const myPieces = amPlayer1 ? pieces.black : pieces.white;
      const opPieces = amPlayer1 ? pieces.white : pieces.black;
      if (myPieces > opPieces) return '🎉 Tu as gagné !';
      if (myPieces < opPieces) return '😢 Tu as perdu...';
      return '🤝 Match nul !';
    }
    if (isMyTurn) {
      if (validMoves.length === 0) return '⚠️ Aucun coup possible, tour passé...';
      return `🎯 C'est ton tour (${myColor === 'black' ? '⚫' : '⚪'})`;
    }
    return '⏳ Tour de l\'adversaire...';
  };

  const handleCellClick = (pos: number) => {
    if (!isMyTurn || !validMoves.includes(pos) || gameOver || game.status !== 'playing') return;
    onMove(pos);
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

      {/* Piece counter */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full bg-foreground ${amPlayer1 ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`} />
          <span className="font-bold text-foreground">{pieces.black}</span>
        </div>
        <span className="text-muted-foreground">vs</span>
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full bg-card border-2 border-foreground ${!amPlayer1 ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`} />
          <span className="font-bold text-foreground">{pieces.white}</span>
        </div>
      </div>

      {/* Board */}
      <div className="bg-green-800 rounded-xl p-2 sm:p-3">
        <div className="grid grid-cols-8 gap-0.5 sm:gap-1">
          {board.map((cell, idx) => {
            const isValid = validMoves.includes(idx);
            return (
              <motion.div
                key={idx}
                onClick={() => handleCellClick(idx)}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-sm flex items-center justify-center transition-all ${
                  isValid
                    ? 'bg-green-600 cursor-pointer hover:bg-green-500'
                    : 'bg-green-700'
                }`}
                whileHover={isValid ? { scale: 1.1 } : {}}
                whileTap={isValid ? { scale: 0.9 } : {}}
              >
                {cell && (
                  <motion.div
                    initial={{ scale: 0, rotateY: 180 }}
                    animate={{ scale: 1, rotateY: 0 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${
                      cell === 'black'
                        ? 'bg-foreground shadow-md'
                        : 'bg-card border-2 border-foreground/20 shadow-md'
                    }`}
                  />
                )}
                {isValid && !cell && (
                  <div className="w-3 h-3 rounded-full bg-green-400/50" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-foreground" />
          <span>{amPlayer1 ? 'Toi' : 'Adversaire'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-card border-2 border-foreground" />
          <span>{!amPlayer1 ? 'Toi' : 'Adversaire'}</span>
        </div>
      </div>
    </div>
  );
};
