import { useState, useCallback, useRef } from 'react';
import { Game, GameType, GameStatus } from '@/hooks/useGame';

/**
 * Hook that mimics useGame but runs entirely client-side for Solo mode.
 * The CPU is always "player2".
 */
export const useSoloGame = (gameType: GameType) => {
  const humanId = 'human';
  const cpuId = 'cpu';

  const getInitialState = (): Record<string, unknown> => {
    switch (gameType) {
      case 'morpion': return { board: Array(9).fill(null) };
      case 'connect4': return { board: Array(42).fill(null) };
      case 'rps': return { player1Choice: null, player2Choice: null, rounds: [], currentRound: 1, bestOf: 3 };
      case 'othello': {
        const board: (string | null)[] = Array(64).fill(null);
        board[27] = 'white'; board[28] = 'black'; board[35] = 'black'; board[36] = 'white';
        return { board, currentColor: 'black' };
      }
      case 'pendu': return { word: null, guessedLetters: [] };
      case 'dames': {
        const board: (string | null)[] = Array(100).fill(null);
        for (let row = 0; row < 4; row++) for (let col = 0; col < 10; col++) if ((row + col) % 2 === 1) board[row * 10 + col] = 'black';
        for (let row = 6; row < 10; row++) for (let col = 0; col < 10; col++) if ((row + col) % 2 === 1) board[row * 10 + col] = 'white';
        return { board, currentColor: 'white' };
      }
      case 'memory': {
        const emojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯'];
        const cards: unknown[] = [];
        emojis.forEach((emoji, idx) => {
          cards.push({ id: idx * 2, emoji, flipped: false, matched: false });
          cards.push({ id: idx * 2 + 1, emoji, flipped: false, matched: false });
        });
        for (let i = cards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        return { cards, flippedIndices: [], memoryScores: { player1: 0, player2: 0 } };
      }
      case 'battleship': return {
        player1Grid: [], player2Grid: [],
        player1Ships: [], player2Ships: [],
        player1Ready: false, player2Ready: false,
        phase: 'placement',
      };
      default: return {};
    }
  };

  const [game, setGame] = useState<Game>({
    id: 'solo',
    code: 'SOLO',
    game_type: gameType,
    status: 'playing' as GameStatus,
    player1_id: humanId,
    player2_id: cpuId,
    current_turn: humanId,
    winner: null,
    game_state: getInitialState(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const updateGameState = useCallback(async (
    newState: Record<string, unknown>,
    additionalUpdates?: Partial<Game>
  ) => {
    setGame(prev => ({
      ...prev,
      game_state: newState,
      ...(additionalUpdates || {}),
      updated_at: new Date().toISOString(),
    }));
    return game;
  }, [game]);

  const resetGame = useCallback(() => {
    const currentScores = (game.game_state as Record<string, unknown>).scores as { player1: number; player2: number } | undefined;
    const newScores = currentScores ? { ...currentScores } : { player1: 0, player2: 0 };
    
    if (game.winner === humanId) newScores.player1 += 1;
    else if (game.winner === cpuId) newScores.player2 += 1;

    setGame({
      id: 'solo',
      code: 'SOLO',
      game_type: gameType,
      status: 'playing',
      player1_id: humanId,
      player2_id: cpuId,
      current_turn: humanId,
      winner: null,
      game_state: { ...getInitialState(), scores: newScores },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }, [game, gameType]);

  return {
    game,
    loading: false,
    error: null,
    playerId: humanId,
    updateGameState,
    resetGame,
    // Stubs for compatibility
    fetchGame: async () => game,
    voteRematch: async () => null,
    startRematch: async () => null,
  };
};
