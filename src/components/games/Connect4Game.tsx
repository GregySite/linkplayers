import { useState } from 'react';
import { motion } from 'framer-motion';
import { Game } from '@/hooks/useGame';
import { checkConnect4Winner, isConnect4Draw, getDropRow } from '@/lib/gameUtils';

interface Connect4GameProps {
  game: Game;
  playerId: string;
  onMove: (col: number) => void;
}

const ROWS = 6;
const COLS = 7;

export const Connect4Game = ({ game, playerId, onMove }: Connect4GameProps) => {
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const board = (game.game_state as { board: (string | null)[] }).board || Array(ROWS * COLS).fill(null);
  const winner = checkConnect4Winner(board);
  const isDraw = isConnect4Draw(board);
  const isMyTurn = game.current_turn === playerId;
  const amPlayer1 = game.player1_id === playerId;
  const myColor = amPlayer1 ? 'red' : 'yellow';

  const getStatusMessage = () => {
    if (winner) {
      const winnerIsMe = (winner === 'red' && amPlayer1) || (winner === 'yellow' && !amPlayer1);
      return winnerIsMe ? '🎉 Tu as gagné !' : '😢 Tu as perdu...';
    }
    if (isDraw) return '🤝 Match nul !';
    if (game.status === 'waiting') return '⏳ En attente de l\'adversaire...';
    return isMyTurn ? '🎯 C\'est ton tour' : '⏳ Tour de l\'adversaire...';
  };

  const handleColumnClick = (col: number) => {
    if (winner || isDraw || !isMyTurn || game.status !== 'playing') return;
    const dropRow = getDropRow(board, col);
    if (dropRow === -1) return;
    onMove(col);
  };

  const previewRow = hoverCol !== null ? getDropRow(board, hoverCol) : -1;

  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xl font-display font-semibold text-foreground text-center"
      >
        {getStatusMessage()}
      </motion.div>

      <div className="bg-primary/20 rounded-2xl p-3 sm:p-4">
        {/* Column hover indicators */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {Array.from({ length: COLS }).map((_, col) => (
            <div
              key={col}
              className="flex justify-center"
              onMouseEnter={() => setHoverCol(col)}
              onMouseLeave={() => setHoverCol(null)}
              onClick={() => handleColumnClick(col)}
            >
              <div
                className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full transition-all duration-200 cursor-pointer ${
                  hoverCol === col && isMyTurn && game.status === 'playing' && getDropRow(board, col) !== -1
                    ? myColor === 'red' ? 'bg-destructive/50' : 'bg-yellow-400/50'
                    : 'bg-transparent'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Board */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 bg-primary/30 rounded-xl p-2">
          {Array.from({ length: ROWS }).map((_, row) =>
            Array.from({ length: COLS }).map((_, col) => {
              const idx = row * COLS + col;
              const cell = board[idx];
              const isPreview = hoverCol === col && row === previewRow && isMyTurn && !cell && game.status === 'playing';

              return (
                <motion.div
                  key={idx}
                  className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-card border-2 border-border flex items-center justify-center cursor-pointer"
                  onMouseEnter={() => setHoverCol(col)}
                  onMouseLeave={() => setHoverCol(null)}
                  onClick={() => handleColumnClick(col)}
                  whileHover={isMyTurn && !cell ? { scale: 1.05 } : {}}
                >
                  {cell && (
                    <motion.div
                      initial={{ y: -100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className={`w-full h-full rounded-full ${
                        cell === 'red'
                          ? 'bg-destructive shadow-lg shadow-destructive/30'
                          : 'bg-yellow-400 shadow-lg shadow-yellow-400/30'
                      }`}
                    />
                  )}
                  {isPreview && !cell && (
                    <div
                      className={`w-full h-full rounded-full opacity-30 ${
                        myColor === 'red' ? 'bg-destructive' : 'bg-yellow-400'
                      }`}
                    />
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex gap-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-full ${amPlayer1 ? 'bg-destructive' : 'bg-destructive/40'}`} />
          <span>{amPlayer1 ? 'Toi' : 'Adversaire'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-full ${!amPlayer1 ? 'bg-yellow-400' : 'bg-yellow-400/40'}`} />
          <span>{!amPlayer1 ? 'Toi' : 'Adversaire'}</span>
        </div>
      </div>
    </div>
  );
};
