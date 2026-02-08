import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Game } from '@/hooks/useGame';
import { MemoryCard } from '@/lib/memoryUtils';

interface MemoryGameProps {
  game: Game;
  playerId: string;
  onFlip: (cardIndex: number) => void;
}

export const MemoryGame = ({ game, playerId, onFlip }: MemoryGameProps) => {
  const gameState = game.game_state as Record<string, unknown>;
  const cards = (gameState.cards as MemoryCard[]) || [];
  const flippedIndices = (gameState.flippedIndices as number[]) || [];
  const scores = (gameState.memoryScores as { player1: number; player2: number }) || { player1: 0, player2: 0 };
  const amPlayer1 = game.player1_id === playerId;
  const isMyTurn = game.current_turn === playerId && game.status === 'playing';
  const isFinished = game.status === 'finished';
  const isRevealing = flippedIndices.length === 2;

  const myScore = amPlayer1 ? scores.player1 : scores.player2;
  const opponentScore = amPlayer1 ? scores.player2 : scores.player1;
  const totalMatched = cards.filter(c => c.matched).length;

  const handleCardClick = (index: number) => {
    if (!isMyTurn || isFinished || isRevealing) return;
    if (cards[index].matched || cards[index].flipped) return;
    if (flippedIndices.includes(index)) return;
    onFlip(index);
  };

  // Grid: 4 columns × 5 rows for 20 cards
  const gridCols = cards.length > 20 ? 6 : cards.length > 12 ? 5 : 4;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto space-y-6">
      {/* Scores */}
      <div className="flex justify-between items-center px-2">
        <div className={`text-center ${isMyTurn ? 'text-primary' : 'text-muted-foreground'}`}>
          <p className="text-xs uppercase tracking-wider">Toi</p>
          <p className="text-2xl font-bold">{myScore}</p>
        </div>
        <div className="text-center text-muted-foreground text-xs">
          {totalMatched}/{cards.length} cartes
        </div>
        <div className={`text-center ${!isMyTurn && !isFinished ? 'text-primary' : 'text-muted-foreground'}`}>
          <p className="text-xs uppercase tracking-wider">Adversaire</p>
          <p className="text-2xl font-bold">{opponentScore}</p>
        </div>
      </div>

      {/* Status */}
      <div className="text-center text-sm">
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
        ) : isMyTurn ? (
          <p className="text-primary font-medium">
            {flippedIndices.length === 0 ? 'Retourne une première carte' :
             flippedIndices.length === 1 ? 'Retourne une deuxième carte' : 'Vérification...'}
          </p>
        ) : (
          <p className="text-muted-foreground">Adversaire joue...</p>
        )}
      </div>

      {/* Card grid */}
      <div
        className="grid gap-2 justify-center mx-auto"
        style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`, maxWidth: `${gridCols * 4.5}rem` }}
      >
        {cards.map((card, index) => {
          const isFlipped = card.flipped || card.matched || flippedIndices.includes(index);
          const isMatched = card.matched;
          
          return (
            <motion.div
              key={card.id}
              whileHover={isMyTurn && !isFlipped && !isRevealing ? { scale: 1.05 } : {}}
              whileTap={isMyTurn && !isFlipped && !isRevealing ? { scale: 0.95 } : {}}
              onClick={() => handleCardClick(index)}
              className={`aspect-square rounded-xl flex items-center justify-center text-2xl sm:text-3xl cursor-pointer transition-all duration-300 ${
                isMatched
                  ? 'bg-primary/20 border-2 border-primary/30'
                  : isFlipped
                  ? 'bg-card border-2 border-primary/50'
                  : isMyTurn && !isRevealing
                  ? 'bg-muted border-2 border-border hover:border-primary/50'
                  : 'bg-muted border-2 border-border'
              }`}
            >
              <AnimatePresence mode="wait">
                {isFlipped ? (
                  <motion.span
                    key="emoji"
                    initial={{ rotateY: 90 }}
                    animate={{ rotateY: 0 }}
                    exit={{ rotateY: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    {card.emoji}
                  </motion.span>
                ) : (
                  <motion.span
                    key="back"
                    initial={{ rotateY: 90 }}
                    animate={{ rotateY: 0 }}
                    exit={{ rotateY: 90 }}
                    transition={{ duration: 0.2 }}
                    className="text-muted-foreground/30 text-lg"
                  >
                    ?
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
