import { useState, useCallback } from 'react';
import { Game, GameType, GameStatus } from '@/hooks/useGame';
import { createInitialGameState } from '@/lib/initialGameState';

export const LOCAL_P1 = 'local1';
export const LOCAL_P2 = 'local2';

/** Jeux où chaque joueur a une information cachée : il faut masquer l'écran au changement de tour. */
const HIDDEN_INFO_GAMES: GameType[] = ['chkobba', 'yaniv', 'rami', 'belote', 'battleship', 'rps', 'pendu'];

export const needsPrivacyScreen = (gameType: GameType): boolean => HIDDEN_INFO_GAMES.includes(gameType);

/**
 * Comme useSoloGame, mais avec deux joueurs humains qui se passent le même téléphone.
 * `playerId` suit le tour courant : le composant de jeu croit donc toujours être
 * "le joueur dont c'est le tour", sans avoir besoin d'être modifié.
 */
export const useLocalGame = (gameType: GameType) => {
  const makeGame = (scores?: { player1: number; player2: number }): Game => ({
    id: 'local',
    code: 'LOCAL',
    game_type: gameType,
    status: 'playing' as GameStatus,
    player1_id: LOCAL_P1,
    player2_id: LOCAL_P2,
    current_turn: LOCAL_P1,
    winner: null,
    game_state: scores ? { ...createInitialGameState(gameType), scores } : createInitialGameState(gameType),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const [game, setGame] = useState<Game>(() => makeGame());

  const updateGameState = useCallback(async (
    newState: Record<string, unknown>,
    additionalUpdates?: Partial<Game>,
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
    if (game.winner === LOCAL_P1) newScores.player1 += 1;
    else if (game.winner === LOCAL_P2) newScores.player2 += 1;
    setGame(makeGame(newScores));
  }, [game, gameType]);

  return {
    game,
    loading: false,
    error: null,
    /** Le "joueur courant" est celui à qui c'est le tour : le plateau s'adapte tout seul. */
    playerId: game.current_turn || LOCAL_P1,
    updateGameState,
    resetGame,
    fetchGame: async () => game,
    voteRematch: async () => null,
    startRematch: async () => null,
  };
};
