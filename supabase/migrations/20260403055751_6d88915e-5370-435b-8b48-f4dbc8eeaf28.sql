
DROP POLICY IF EXISTS "Players can view their own games" ON public.games;

CREATE POLICY "Anyone can view games" ON public.games FOR SELECT USING (true);
CREATE POLICY "Anyone can insert games" ON public.games FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update games" ON public.games FOR UPDATE USING (true) WITH CHECK (true);
