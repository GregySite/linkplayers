DROP POLICY IF EXISTS "Anyone can view games" ON public.games;

CREATE POLICY "Participants can view their games"
ON public.games
FOR SELECT
TO authenticated
USING (
  player1_id = auth.uid()::text
  OR player2_id = auth.uid()::text
);

REVOKE SELECT ON public.games FROM anon;
GRANT SELECT ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;