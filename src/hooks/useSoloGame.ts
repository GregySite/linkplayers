import { useState, useCallback, useRef } from 'react';
import { Game, GameType, GameStatus } from '@/hooks/useGame';
import { createInitialGameState } from '@/lib/initialGameState';
import { GAMES_WITH_OWN_SCORE } from '@/hooks/useLocalGame';

/**
 * Hook that mimics useGame but runs entirely client-side for Solo mode.
 * The CPU is always "player2".
 */
export const useSoloGame = (gameType: GameType) => {
  const humanId = 'human';
  const cpuId = 'cpu';

  const getInitialState = (): Record<string, unknown> => createInitialGameState(gameType);

  // For pendu, human is player2 (guesser) and CPU is player1 (word chooser)
  const isPendu = gameType === 'pendu';
  const p1 = isPendu ? cpuId : humanId;
  const p2 = isPendu ? humanId : cpuId;

  const [game, setGame] = useState<Game>({
    id: 'solo',
    code: 'SOLO',
    game_type: gameType,
    status: 'playing' as GameStatus,
    player1_id: p1,
    player2_id: p2,
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
    // Pour les jeux qui tiennent eux-mêmes le score de la partie (manches, buts,
    // points...), « Rejouer » doit repartir de zéro, sinon le comptage s'emballe.
    const ownScore = GAMES_WITH_OWN_SCORE.includes(gameType);
    const newScores = ownScore
      ? { player1: 0, player2: 0 }
      : (currentScores ? { ...currentScores } : { player1: 0, player2: 0 });

    if (!ownScore) {
      if (game.winner === humanId) newScores.player1 += 1;
      else if (game.winner === cpuId) newScores.player2 += 1;
    }

    setGame({
      id: 'solo',
      code: 'SOLO',
      game_type: gameType,
      status: 'playing',
      player1_id: p1,
      player2_id: p2,
      current_turn: humanId,
      winner: null,
      game_state: ownScore ? getInitialState() : { ...getInitialState(), scores: newScores },
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
