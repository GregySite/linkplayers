import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getOrCreatePlayerId, generateGameCode } from '@/lib/gameUtils';

export type GameType = 'morpion' | 'battleship';
export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface Game {
  id: string;
  code: string;
  game_type: GameType;
  status: GameStatus;
  player1_id: string | null;
  player2_id: string | null;
  current_turn: string | null;
  winner: string | null;
  game_state: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const useGame = (gameCode?: string) => {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerId = getOrCreatePlayerId();

  // Fetch game by code
  const fetchGame = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (fetchError) {
      setError('Erreur lors de la récupération de la partie');
      setLoading(false);
      return null;
    }

    if (!data) {
      setError('Partie non trouvée');
      setLoading(false);
      return null;
    }

    setGame(data as Game);
    setLoading(false);
    return data as Game;
  }, []);

  // Create a new game
  const createGame = useCallback(async (gameType: GameType): Promise<Game | null> => {
    setLoading(true);
    setError(null);

    const code = generateGameCode();
    const initialState = gameType === 'morpion' 
      ? { board: Array(9).fill(null) }
      : { 
          player1Grid: [],
          player2Grid: [],
          player1Ships: [],
          player2Ships: [],
          player1Ready: false,
          player2Ready: false,
          phase: 'placement'
        };

    const { data, error: createError } = await supabase
      .from('games')
      .insert({
        code,
        game_type: gameType,
        player1_id: playerId,
        current_turn: playerId,
        game_state: initialState,
      })
      .select()
      .single();

    if (createError) {
      setError('Erreur lors de la création de la partie');
      setLoading(false);
      return null;
    }

    setGame(data as Game);
    setLoading(false);
    return data as Game;
  }, [playerId]);

  // Join an existing game
  const joinGame = useCallback(async (code: string): Promise<Game | null> => {
    const existingGame = await fetchGame(code);
    if (!existingGame) return null;

    if (existingGame.player1_id === playerId) {
      return existingGame;
    }

    if (existingGame.player2_id && existingGame.player2_id !== playerId) {
      setError('Cette partie est déjà complète');
      return null;
    }

    if (!existingGame.player2_id) {
      const { data, error: updateError } = await supabase
        .from('games')
        .update({
          player2_id: playerId,
          status: 'playing' as GameStatus,
        })
        .eq('id', existingGame.id)
        .select()
        .single();

      if (updateError) {
        setError('Erreur lors de la connexion à la partie');
        return null;
      }

      setGame(data as Game);
      return data as Game;
    }

    return existingGame;
  }, [fetchGame, playerId]);

  // Update game state
  const updateGameState = useCallback(async (
    newState: Record<string, unknown>,
    additionalUpdates?: Partial<Game>
  ) => {
    if (!game) return null;

    const updatePayload: Record<string, unknown> = {
      game_state: newState,
      ...additionalUpdates,
    };

    const { data, error: updateError } = await supabase
      .from('games')
      .update(updatePayload)
      .eq('id', game.id)
      .select()
      .single();

    if (updateError) {
      setError('Erreur lors de la mise à jour');
      return null;
    }

    setGame(data as Game);
    return data as Game;
  }, [game]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!gameCode) return;

    const channel = supabase
      .channel(`game-${gameCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `code=eq.${gameCode.toUpperCase()}`,
        },
        (payload) => {
          setGame(payload.new as Game);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameCode]);

  // Initial fetch if gameCode is provided
  useEffect(() => {
    if (gameCode) {
      fetchGame(gameCode);
    }
  }, [gameCode, fetchGame]);

  return {
    game,
    loading,
    error,
    playerId,
    createGame,
    joinGame,
    updateGameState,
    fetchGame,
  };
};
