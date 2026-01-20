-- Create enum for game types
CREATE TYPE public.game_type AS ENUM ('morpion', 'battleship');

-- Create enum for game status
CREATE TYPE public.game_status AS ENUM ('waiting', 'playing', 'finished');

-- Create games table
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(4) NOT NULL UNIQUE,
  game_type game_type NOT NULL,
  status game_status NOT NULL DEFAULT 'waiting',
  player1_id TEXT,
  player2_id TEXT,
  current_turn TEXT,
  winner TEXT,
  game_state JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Public access for games (no auth needed for casual gaming)
CREATE POLICY "Anyone can create games"
ON public.games FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view games"
ON public.games FOR SELECT
USING (true);

CREATE POLICY "Anyone can update games"
ON public.games FOR UPDATE
USING (true);

-- Enable realtime for games table
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_games_updated_at
BEFORE UPDATE ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index on code for faster lookups
CREATE INDEX idx_games_code ON public.games(code);