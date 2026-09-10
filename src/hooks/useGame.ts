import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ensurePlayerSession } from '@/lib/anonAuth';


export type GameType = 'morpion' | 'battleship' | 'connect4' | 'rps' | 'othello' | 'pendu' | 'dames' | 'memory' | 'chkobba' | 'yaniv' | 'rami' | 'awale' | 'belote' | 'backgammon' | 'football' | 'gorillas' | 'blackjack' | 'quoridor';
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
const invokeGameAction = async (action: string, playerId: string, params: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.functions.invoke('game-actions', {
    body: { action, player_id: playerId, ...params },
  });

  if (error) {
    console.error(`game-actions/${action} invoke error:`, error);
    // Quand la fonction répond avec un statut non-2xx, le client Supabase
    // masque le vrai message derrière "Edge Function returned a non-2xx
    // status code" — le message réel renvoyé par la fonction (ex. "Invalid
    // game type") est dans le corps de la réponse, accessible via
    // error.context (l'objet Response brut de l'appel fetch sous-jacent).
    let detail = error.message || 'Request failed';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.error) detail = body.error;
      }
    } catch {
      // Corps non-JSON ou déjà consommé : on garde le message générique.
    }
    return { data: null, error: detail };
  }

  // The edge function returns { data: ... } or { error: ... }
  if (data?.error) {
    return { data: null, error: data.error };
  }

  return { data: data?.data || null, error: null };
};


export const useGame = (gameCode?: string) => {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Identité vérifiée : identifiant de la session anonyme, pas un UUID
  // fabriqué par le navigateur.
  const [playerId, setPlayerId] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    ensurePlayerSession().then((id) => {
      if (!cancelled && id) setPlayerId(id);
    });
    return () => { cancelled = true; };
  }, []);

  // fetchGame reads directly (RLS now restricts to participants only)
  // Les rafraîchissements (realtime / polling) sont silencieux : pas d'écran de chargement,
  // ce qui évite les "sauts" de la page pendant la partie.
  const hasLoadedRef = useRef(false);
  const fetchGame = useCallback(async (code: string, quietNotFound = false) => {
    const silent = hasLoadedRef.current;
    if (!silent) setLoading(true);
    setError(null);
    // La lecture est restreinte aux deux joueurs de la partie (RLS).
    await ensurePlayerSession();
    const { data, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (fetchError) {
      if (!silent) { setError('Erreur lors de la récupération de la partie'); setLoading(false); }
      return null;
    }
    if (!data) {
      if (!silent && !quietNotFound) { setError('Partie non trouvée'); setLoading(false); }
      return null;
    }
    hasLoadedRef.current = true;
    setGame(data as Game);
    setLoading(false);
    return data as Game;
  }, []);

  // All write operations go through the edge function (player identity from JWT)
  const createGame = useCallback(async (gameType: GameType): Promise<Game | null> => {
    if (!playerId) return null;
    setLoading(true);
    setError(null);

    const { data, error: actionError } = await invokeGameAction('create', playerId, { game_type: gameType });

    if (actionError) {
      setError(`Erreur lors de la création de la partie : ${actionError}`);
      setLoading(false);
      return null;
    }
    setGame(data as Game);
    setLoading(false);
    return data as Game;
  }, [playerId]);

  const joinGame = useCallback(async (code: string): Promise<Game | null> => {
    if (!playerId) return null;
    setLoading(true);
    setError(null);

    const { data, error: actionError } = await invokeGameAction('join', playerId, { code: code.toUpperCase() });

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

    const { data, error: actionError } = await invokeGameAction('update_state', playerId, {
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

    const { data, error: actionError } = await invokeGameAction('vote_rematch', playerId, {
      game_id: game.id,
      want_rematch: wantRematch,
    });

    if (actionError) { setError('Erreur lors du vote'); return null; }
    setGame(data as Game);
    return data as Game;
  }, [game]);

  const startRematch = useCallback(async (): Promise<Game | null> => {
    if (!game) return null;

    const { data, error: actionError } = await invokeGameAction('start_rematch', playerId, {
      game_id: game.id,
    });

    if (actionError) { setError('Erreur lors de la création de la revanche'); return null; }

    const result = data as Game;
    setGame(result);
    return result;
  }, [game, playerId]);

  // Subscribe to realtime updates with reconnection + polling fallback
  useEffect(() => {
    if (!gameCode) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let disposed = false;
    let realtimeHealthy = false;

    // Polling fallback: fetches every 3s when realtime is unhealthy
    const startPolling = () => {
      if (pollInterval || disposed) return;
      console.log('[Game] Starting polling fallback');
      pollInterval = setInterval(() => {
        if (!disposed) fetchGame(gameCode);
      }, 3000);
    };

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const connect = () => {
      if (disposed) return;

      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }

      realtimeHealthy = false;

      channel = supabase
        .channel(`game-${gameCode}-${Date.now()}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'games',
          filter: `code=eq.${gameCode.toUpperCase()}`,
        }, (payload) => {
          if (!disposed) setGame(payload.new as Game);
        })
        .subscribe((status, err) => {
          if (disposed) return;
          if (status === 'SUBSCRIBED') {
            realtimeHealthy = true;
            stopPolling();
            // Fetch once to sync after reconnect
            fetchGame(gameCode);
          } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            console.warn(`Realtime channel ${status}, reconnecting in 2s...`, err);
            realtimeHealthy = false;
            startPolling();
            fetchGame(gameCode);
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(connect, 2000);
          }
        });

      // Safety net: if not subscribed after 5s, start polling
      setTimeout(() => {
        if (!disposed && !realtimeHealthy) {
          startPolling();
        }
      }, 5000);
    };

    connect();

    return () => {
      disposed = true;
      stopPolling();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (channel) supabase.removeChannel(channel);
    };
  }, [gameCode, fetchGame]);

  // Fetch game on mount
  useEffect(() => {
    if (gameCode) fetchGame(gameCode);
  }, [gameCode, fetchGame]);

  return { game, loading, error, playerId, createGame, joinGame, updateGameState, fetchGame, voteRematch, startRematch };
};
