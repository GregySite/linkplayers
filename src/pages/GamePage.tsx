import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, RefreshCw } from 'lucide-react';
import { useGame } from '@/hooks/useGame';
import { CodeDisplay } from '@/components/CodeDisplay';
import { MorpionGame } from '@/components/games/MorpionGame';
import { BattleshipGame } from '@/components/games/BattleshipGame';
import { Button } from '@/components/ui/button';
import { BattleshipCell, createEmptyGrid } from '@/lib/gameUtils';

const GamePage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { game, loading, error, playerId, updateGameState, createGame } = useGame(code);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error || 'Partie non trouvée'}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  const handleMorpionMove = async (index: number) => {
    const board = [...((game.game_state as { board: (string | null)[] }).board || Array(9).fill(null))];
    const amPlayer1 = game.player1_id === playerId;
    board[index] = amPlayer1 ? 'X' : 'O';

    const nextTurn = amPlayer1 ? game.player2_id : game.player1_id;
    await updateGameState({ board }, { current_turn: nextTurn });
  };

  const handleBattleshipPlaceShips = async (grid: BattleshipCell[][]) => {
    const amPlayer1 = game.player1_id === playerId;
    const currentState = game.game_state as Record<string, unknown>;

    const newState = {
      ...currentState,
      [amPlayer1 ? 'player1Grid' : 'player2Grid']: grid,
      [amPlayer1 ? 'player1Ready' : 'player2Ready']: true,
    };

    const bothReady = amPlayer1 
      ? (newState.player2Ready && true)
      : (newState.player1Ready && true);

    if (bothReady) {
      newState.phase = 'playing';
    }

    await updateGameState(newState);
  };

  const handleBattleshipShoot = async (row: number, col: number) => {
    const amPlayer1 = game.player1_id === playerId;
    const currentState = game.game_state as {
      player1Grid: BattleshipCell[][];
      player2Grid: BattleshipCell[][];
    };

    const targetGrid = amPlayer1 ? 'player2Grid' : 'player1Grid';
    const newGrid = currentState[targetGrid].map(r => r.map(c => ({ ...c })));
    newGrid[row][col].hit = true;

    const nextTurn = amPlayer1 ? game.player2_id : game.player1_id;
    await updateGameState({
      ...currentState,
      [targetGrid]: newGrid,
    }, { current_turn: nextTurn });
  };

  const handlePlayAgain = async () => {
    const newGame = await createGame(game.game_type);
    if (newGame) {
      navigate(`/game/${newGame.code}`);
    }
  };

  const gameTitle = game.game_type === 'morpion' ? 'Morpion' : 'Bataille Navale';
  const isFinished = game.status === 'finished' || game.winner;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Accueil</span>
          </button>

          <h1 className="font-display text-xl font-bold text-foreground">{gameTitle}</h1>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{game.player2_id ? '2/2' : '1/2'}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          {game.status === 'waiting' && (
            <CodeDisplay code={game.code} />
          )}

          <div className="flex justify-center">
            {game.game_type === 'morpion' ? (
              <MorpionGame
                game={game}
                playerId={playerId}
                onMove={handleMorpionMove}
              />
            ) : (
              <BattleshipGame
                game={game}
                playerId={playerId}
                onPlaceShips={handleBattleshipPlaceShips}
                onShoot={handleBattleshipShoot}
              />
            )}
          </div>

          {isFinished && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-center"
            >
              <Button onClick={handlePlayAgain} className="bg-primary hover:bg-primary/90">
                <RefreshCw className="w-4 h-4 mr-2" />
                Nouvelle partie
              </Button>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default GamePage;
