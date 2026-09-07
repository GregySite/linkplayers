-- Ajoute le Quoridor à l'enum game_type.
ALTER TYPE public.game_type ADD VALUE IF NOT EXISTS 'quoridor';
