
-- Drop the overly permissive SELECT policy that exposes all game data
DROP POLICY IF EXISTS "Anyone can view games" ON public.games;

-- Create restrictive SELECT policy: only game participants can view their games
-- Uses auth.uid() from anonymous auth sessions
CREATE POLICY "Players can view their own games"
ON public.games FOR SELECT
USING (
  player1_id = auth.uid()::text 
  OR player2_id = auth.uid()::text
);
