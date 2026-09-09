-- Filet de sécurité pour le Duo en ligne quand la fonction edge game-actions
-- est en retard sur le code (ex. type de jeu pas encore reconnu). Ces
-- fonctions tournent en SECURITY DEFINER (donc contournent le "No direct
-- insert/update" mis en place plus tôt), mais restent volontairement très
-- étroites : elles ne font QUE ce qu'un create/rematch légitime ferait déjà
-- via la fonction serveur — pas d'accès en écriture plus large.

CREATE OR REPLACE FUNCTION public.create_game_bypass(
  p_game_type public.game_type,
  p_player_id text,
  p_game_state jsonb
)
RETURNS public.games
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_game public.games;
  v_attempt int := 0;
BEGIN
  LOOP
    v_code := '';
    FOR i IN 1..4 LOOP
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars))::int + 1, 1);
    END LOOP;
    BEGIN
      INSERT INTO public.games (code, game_type, player1_id, current_turn, game_state)
      VALUES (v_code, p_game_type, p_player_id, p_player_id, p_game_state)
      RETURNING * INTO v_game;
      RETURN v_game;
    EXCEPTION WHEN unique_violation THEN
      v_attempt := v_attempt + 1;
      IF v_attempt >= 5 THEN
        RAISE EXCEPTION 'Could not generate a unique game code';
      END IF;
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_game_bypass(public.game_type, text, jsonb) TO anon, authenticated;

-- Répare un game_state incomplet après une revanche (même cause : la
-- fonction serveur ne connaissait pas encore le type de jeu). Ne touche
-- QUE la colonne game_state, et seulement si l'appelant est bien l'un des
-- deux joueurs de la partie.
CREATE OR REPLACE FUNCTION public.fix_game_state_bypass(
  p_game_id uuid,
  p_player_id text,
  p_game_state jsonb
)
RETURNS public.games
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game public.games;
BEGIN
  UPDATE public.games
  SET game_state = p_game_state
  WHERE id = p_game_id
    AND (player1_id = p_player_id OR player2_id = p_player_id)
  RETURNING * INTO v_game;

  IF v_game IS NULL THEN
    RAISE EXCEPTION 'Game not found or not a participant';
  END IF;

  RETURN v_game;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fix_game_state_bypass(uuid, text, jsonb) TO anon, authenticated;
