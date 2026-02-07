import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ensureAnonymousAuth } from '@/lib/gameUtils';

export type GameType = 'morpion' | 'battleship' | 'connect4' | 'rps' | 'othello' | 'emoji_quiz';
export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface RematchState {
  player1WantsRematch: boolean | null;
  player2WantsRematch: boolean | null;
  scores: { player1: number; player2: number };
}

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

// Helper to invoke the game-actions edge function
// Auth is handled automatically via the Supabase client's JWT header
const invokeGameAction = async (action: string, params: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.functions.invoke('game-actions', {
    body: { action, ...params },
  });

  if (error) {
    console.error(`game-actions/${action} invoke error:`, error);
    return { data: null, error: error.message || 'Request failed' };
  }

  // The edge function returns { data: ... } or { error: ... }
  if (data?.error) {
    return { data: null, error: data.error };
  }

  return { data: data?.data || null, error: null };
};

export const useGame = (gameCode?: string) => {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  // Initialize anonymous auth session
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setPlayerId(session?.user?.id ?? null);
    });

    ensureAnonymousAuth()
      .then(id => {
        setPlayerId(id);
        if (!gameCode) setLoading(false);
      })
      .catch(() => {
        setError('Failed to initialize session');
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  // fetchGame reads directly (RLS now restricts to participants only)
  const fetchGame = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (fetchError) { setError('Erreur lors de la récupération de la partie'); setLoading(false); return null; }
    if (!data) { setError('Partie non trouvée'); setLoading(false); return null; }
    setGame(data as Game);
    setLoading(false);
    return data as Game;
  }, []);

  // All write operations go through the edge function (player identity from JWT)
  const createGame = useCallback(async (gameType: GameType): Promise<Game | null> => {
    if (!playerId) return null;
    setLoading(true);
    setError(null);

    const { data, error: actionError } = await invokeGameAction('create', { game_type: gameType });

    if (actionError) { setError('Erreur lors de la création de la partie'); setLoading(false); return null; }
    setGame(data as Game);
    setLoading(false);
    return data as Game;
  }, [playerId]);

  const joinGame = useCallback(async (code: string): Promise<Game | null> => {
    if (!playerId) return null;
    setLoading(true);
    setError(null);

    const { data, error: actionError } = await invokeGameAction('join', { code: code.toUpperCase() });

    if (actionError) {
      setError(actionError === 'Game not found' ? 'Code invalide - partie non trouvée' :
               actionError === 'Game is already full' ? 'Cette partie est déjà complète' :
               'Erreur lors de la connexion à la partie');
      setLoading(false);
      return null;
    }

    setGame(data as Game);
    setLoading(false);
    return data as Game;
  }, [playerId]);

  const updateGameState = useCallback(async (
    newState: Record<string, unknown>,
    additionalUpdates?: Partial<Game>
  ) => {
    if (!game) return null;

    const { data, error: actionError } = await invokeGameAction('update_state', {
      game_id: game.id,
      game_state: newState,
      additional_updates: additionalUpdates || {},
    });

    if (actionError) { setError('Erreur lors de la mise à jour'); return null; }
    setGame(data as Game);
    return data as Game;
  }, [game]);

  const voteRematch = useCallback(async (wantRematch: boolean) => {
    if (!game) return null;

    const { data, error: actionError } = await invokeGameAction('vote_rematch', {
      game_id: game.id,
      want_rematch: wantRematch,
    });

    if (actionError) { setError('Erreur lors du vote'); return null; }
    setGame(data as Game);
    return data as Game;
  }, [game]);

  const startRematch = useCallback(async (): Promise<Game | null> => {
    if (!game) return null;

    const { data, error: actionError } = await invokeGameAction('start_rematch', {
      game_id: game.id,
    });

    if (actionError) { setError('Erreur lors de la création de la revanche'); return null; }
    setGame(data as Game);
    return data as Game;
  }, [game]);

  // Subscribe to realtime updates (RLS ensures only participant games are visible)
  useEffect(() => {
    if (!gameCode) return;
    const channel = supabase
      .channel(`game-${gameCode}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'games',
        filter: `code=eq.${gameCode.toUpperCase()}`,
      }, (payload) => { setGame(payload.new as Game); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gameCode]);

  // Fetch game once auth is ready
  useEffect(() => {
    if (gameCode && playerId) fetchGame(gameCode);
  }, [gameCode, playerId, fetchGame]);

  return { game, loading, error, playerId: playerId || '', createGame, joinGame, updateGameState, fetchGame, voteRematch, startRematch };
};
