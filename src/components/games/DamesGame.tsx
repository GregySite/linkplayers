import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Game } from '@/hooks/useGame';
import { DamesPiece, DamesMove, getAllMoves, countDamesPieces } from '@/lib/damesUtils';

interface DamesGameProps {
  game: Game;
  playerId: string;
  onMove: (move: DamesMove) => void;
}

const CELL_SIZE = 'w-8 h-8 sm:w-10 sm:h-10';

const PieceComponent = ({ piece, selected, onClick }: { piece: DamesPiece; selected: boolean; onClick: () => void }) => {
  if (!piece) return null;
  const isWhite = piece === 'white' || piece === 'whiteKing';
  const isKing = piece === 'whiteKing' || piece === 'blackKing';

  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full cursor-pointer border-2 flex items-center justify-center ${
        isWhite
          ? 'bg-gradient-to-b from-gray-100 to-gray-300 border-gray-400'
          : 'bg-gradient-to-b from-gray-700 to-gray-900 border-gray-600'
      } ${selected ? 'ring-2 ring-primary ring-offset-1 ring-offset-transparent' : ''}`}
    >
      {isKing && <span className="text-xs sm:text-sm">{isWhite ? '👑' : '♛'}</span>}
    </motion.div>
  );
};

export const DamesGame = ({ game, playerId, onMove }: DamesGameProps) => {
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);

  const gameState = game.game_state as Record<string, unknown>;
  const board = (gameState.board as DamesPiece[]) || [];
  const currentColor = (gameState.currentColor as 'white' | 'black') || 'white';
  const amPlayer1 = game.player1_id === playerId;
  const myColor: 'white' | 'black' = amPlayer1 ? 'white' : 'black';
  const isMyTurn = game.current_turn === playerId && game.status === 'playing';
  const isFinished = game.status === 'finished';

  const validMoves = useMemo(() => {
    if (!isMyTurn) return [];
    return getAllMoves(board, myColor);
  }, [board, myColor, isMyTurn]);

  const selectedMoves = useMemo(() => {
    if (selectedPiece === null) return [];
    return validMoves.filter(m => m.from === selectedPiece);
  }, [selectedPiece, validMoves]);

  const movablePieces = useMemo(() => {
    return new Set(validMoves.map(m => m.from));
  }, [validMoves]);

  const handleCellClick = (index: number) => {
    if (!isMyTurn || isFinished) return;

    const piece = board[index];

    // If clicking on own piece
    if (piece && ((myColor === 'white' && (piece === 'white' || piece === 'whiteKing')) ||
                  (myColor === 'black' && (piece === 'black' || piece === 'blackKing')))) {
      if (movablePieces.has(index)) {
        setSelectedPiece(index === selectedPiece ? null : index);
      }
      return;
    }

    // If a piece is selected, try to move
    if (selectedPiece !== null) {
      const move = selectedMoves.find(m => m.to === index);
      if (move) {
        onMove(move);
        setSelectedPiece(null);
      }
    }
  };

  const targetSquares = new Set(selectedMoves.map(m => m.to));
  const pieces = countDamesPieces(board);

  // Determine board orientation: white (player1) sees from bottom, black (player2) from top
  const rows = Array.from({ length: 10 }, (_, i) => i);
  const displayRows = amPlayer1 ? rows : [...rows].reverse();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Score display */}
      <div className="flex justify-center gap-8 text-sm">
        <div className={`flex items-center gap-2 ${myColor === 'white' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
          <div className="w-4 h-4 rounded-full bg-gradient-to-b from-gray-100 to-gray-300 border border-gray-400" />
          <span>{pieces.white} pions</span>
        </div>
        <div className={`flex items-center gap-2 ${myColor === 'black' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
          <div className="w-4 h-4 rounded-full bg-gradient-to-b from-gray-700 to-gray-900 border border-gray-600" />
          <span>{pieces.black} pions</span>
        </div>
      </div>

      {/* Status */}
      <div className="text-center text-sm">
        {isFinished ? (
          <p className="text-primary font-bold text-lg">
            {game.winner === playerId ? '🎉 Victoire !' : game.winner ? '😔 Défaite...' : 'Égalité !'}
          </p>
        ) : isMyTurn ? (
          <p className="text-primary font-medium">À ton tour ({myColor === 'white' ? 'Blancs' : 'Noirs'})</p>
        ) : (
          <p className="text-muted-foreground">Adversaire joue...</p>
        )}
      </div>

      {/* Board */}
      <div className="flex justify-center">
        <div className="border-2 border-border rounded-lg overflow-hidden shadow-xl">
          {displayRows.map(row => (
            <div key={row} className="flex">
              {Array.from({ length: 10 }, (_, col) => {
                const index = row * 10 + col;
                const isDark = (row + col) % 2 === 1;
                const piece = board[index];
                const isSelected = selectedPiece === index;
                const isTarget = targetSquares.has(index);
                const isMovable = movablePieces.has(index) && isMyTurn;

                return (
                  <div
                    key={col}
                    onClick={() => isDark && handleCellClick(index)}
                    className={`${CELL_SIZE} flex items-center justify-center relative ${
                      isDark
                        ? 'bg-emerald-800 hover:bg-emerald-700'
                        : 'bg-amber-100'
                    } ${isDark && isMyTurn ? 'cursor-pointer' : ''}`}
                  >
                    {isTarget && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-primary/50 animate-pulse" />
                      </div>
                    )}
                    {piece && (
                      <PieceComponent
                        piece={piece}
                        selected={isSelected}
                        onClick={() => handleCellClick(index)}
                      />
                    )}
                    {isMovable && !isSelected && !piece && null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {isMyTurn && validMoves.length > 0 && validMoves[0].captures.length > 0 && (
        <p className="text-center text-xs text-warning">⚠️ Prise obligatoire !</p>
      )}
    </motion.div>
  );
};
