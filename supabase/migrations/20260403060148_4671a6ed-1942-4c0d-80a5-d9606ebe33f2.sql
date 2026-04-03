
-- Remove overly permissive INSERT/UPDATE policies
DROP POLICY IF EXISTS "Anyone can insert games" ON public.games;
DROP POLICY IF EXISTS "Anyone can update games" ON public.games;

-- Block direct client writes — only service role (edge function) can write
CREATE POLICY "No direct insert" ON public.games FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update" ON public.games FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "No direct delete" ON public.games FOR DELETE USING (false);
