import { supabase } from '@/integrations/supabase/client';

/**
 * Identification invisible : chaque visiteur reçoit une session anonyme
 * Supabase. L'identifiant du joueur est désormais l'ID vérifié de cette
 * session (auth.uid()), et non plus un UUID choisi par le navigateur.
 * Cela permet au serveur de vérifier réellement qui appelle, et à la base
 * de ne montrer une partie qu'à ses deux joueurs.
 */
let pending: Promise<string | null> | null = null;

export async function ensurePlayerSession(): Promise<string | null> {
  if (pending) return pending;

  pending = (async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user?.id) return sessionData.session.user.id;

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error('Anonymous sign-in failed:', error.message);
      pending = null;
      return null;
    }
    return data.user?.id ?? null;
  })();

  return pending;
}
