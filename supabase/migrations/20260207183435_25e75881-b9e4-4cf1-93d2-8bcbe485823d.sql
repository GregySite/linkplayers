
-- Remove overly permissive INSERT and UPDATE policies
DROP POLICY IF EXISTS "Anyone can create games" ON public.games;
DROP POLICY IF EXISTS "Anyone can update games" ON public.games;

-- With RLS enabled and no INSERT/UPDATE policies, 
-- all direct inserts and updates from anon users are DENIED.
-- Only the service_role (used by edge functions) bypasses RLS.
-- The SELECT policy remains so users can still read game data.
