
-- Add new game types to the enum
ALTER TYPE public.game_type ADD VALUE IF NOT EXISTS 'pendu';
ALTER TYPE public.game_type ADD VALUE IF NOT EXISTS 'dames';
ALTER TYPE public.game_type ADD VALUE IF NOT EXISTS 'memory';
