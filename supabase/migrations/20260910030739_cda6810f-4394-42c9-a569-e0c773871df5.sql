-- Les fonctions SECURITY DEFINER ne doivent plus être exécutables par les clients
-- (anon/authenticated) : toutes les écritures passent par l'edge function game-actions
-- qui utilise le rôle service_role et valide l'identité du joueur.
REVOKE EXECUTE ON FUNCTION public.create_game_bypass(public.game_type, text, jsonb) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fix_game_state_bypass(uuid, text, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_game_bypass(public.game_type, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.fix_game_state_bypass(uuid, text, jsonb) TO service_role;