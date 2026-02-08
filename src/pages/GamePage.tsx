import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Users } from 'lucide-react';
import { useGame } from '@/hooks/useGame';
import { CodeDisplay } from '@/components/CodeDisplay';
import { MorpionGame } from '@/components/games/MorpionGame';
import { BattleshipGame } from '@/components/games/BattleshipGame';
import { Connect4Game } from '@/components/games/Connect4Game';
import { RPSGame } from '@/components/games/RPSGame';
import { OthelloGame } from '@/components/games/OthelloGame';

import { RematchVote } from '@/components/games/RematchVote';
import { Button } from '@/components/ui/button';
import {
  BattleshipCell, checkMorpionWinner, isMorpionDraw, checkAllShipsSunk,
  checkConnect4Winner, isConnect4Draw, getDropRow,
  determineRPSWinner, RPSChoice, RPSRound,
  OthelloCell, applyOthelloMove, getValidOthelloMoves, isOthelloGameOver, countOthelloPieces,
} from '@/lib/gameUtils';

const GAME_TITLES: Record<string, string> = {
  morpion: 'Morpion',
  battleship: 'Bataille Navale',
  connect4: 'Puissance 4',
  rps: 'Pierre-Papier-Ciseaux',
  othello: 'Othello',
  
};

const GamePage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { game, loading, error, playerId, updateGameState, voteRematch, startRematch } = useGame(code);
  const rematchTriggered = useRef(false);

  // Check if both players want rematch — only player1 triggers
  useEffect(() => {
    if (!game) return;
    const gameState = game.game_state as Record<string, unknown>;
    const p1 = gameState.player1WantsRematch as boolean | null;
    const p2 = gameState.player2WantsRematch as boolean | null;

    if (p1 === true && p2 === true && game.player1_id === playerId && !rematchTriggered.current) {
      rematchTriggered.current = true;
      startRematch().then(() => { rematchTriggered.current = false; });
    }
  }, [game, startRematch, playerId]);

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
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour à l'accueil
        </Button>
      </div>
    );
  }

  const amPlayer1 = game.player1_id === playerId;
  const gameState = game.game_state as Record<string, unknown>;

  // ==================== HANDLERS ====================

  const handleMorpionMove = async (index: number) => {
    const board = [...((gameState as { board: (string | null)[] }).board || Array(9).fill(null))];
    board[index] = amPlayer1 ? 'X' : 'O';
    const nextTurn = amPlayer1 ? game.player2_id : game.player1_id;
    await updateGameState({ ...gameState, board }, { current_turn: nextTurn });
  };

  const handleBattleshipPlaceShips = async (grid: BattleshipCell[][]) => {
    const newState = {
      ...gameState,
      [amPlayer1 ? 'player1Grid' : 'player2Grid']: grid,
      [amPlayer1 ? 'player1Ready' : 'player2Ready']: true,
    };
    const bothReady = amPlayer1 ? (newState.player2Ready && true) : (newState.player1Ready && true);
    if (bothReady) newState.phase = 'playing';
    await updateGameState(newState as Record<string, unknown>);
  };

  const handleBattleshipShoot = async (row: number, col: number) => {
    const currentState = gameState as { player1Grid: BattleshipCell[][]; player2Grid: BattleshipCell[][] };
    const targetGrid = amPlayer1 ? 'player2Grid' : 'player1Grid';
    const newGrid = currentState[targetGrid].map(r => r.map(c => ({ ...c })));
    newGrid[row][col].hit = true;
    const nextTurn = amPlayer1 ? game.player2_id : game.player1_id;
    await updateGameState({ ...currentState, [targetGrid]: newGrid }, { current_turn: nextTurn });
  };

  const handleConnect4Move = async (col: number) => {
    const board = [...((gameState as { board: (string | null)[] }).board || Array(42).fill(null))];
    const row = getDropRow(board, col);
    if (row === -1) return;
    board[row * 7 + col] = amPlayer1 ? 'red' : 'yellow';
    const nextTurn = amPlayer1 ? game.player2_id : game.player1_id;
    await updateGameState({ ...gameState, board }, { current_turn: nextTurn });
  };

  const handleRPSChoice = async (choice: RPSChoice) => {
    const choiceKey = amPlayer1 ? 'player1Choice' : 'player2Choice';
    const newState = { ...gameState, [choiceKey]: choice };

    // Check if both have chosen
    const p1Choice = amPlayer1 ? choice : (gameState.player1Choice as RPSChoice | null);
    const p2Choice = !amPlayer1 ? choice : (gameState.player2Choice as RPSChoice | null);

    if (p1Choice && p2Choice) {
      const roundResult = determineRPSWinner(p1Choice, p2Choice);
      const rounds = [...((gameState.rounds as RPSRound[]) || []), { player1Choice: p1Choice, player2Choice: p2Choice, winner: roundResult }];

      // After a short delay the state resets for next round
      await updateGameState({
        ...gameState,
        player1Choice: choice === p1Choice ? choice : gameState.player1Choice,
        player2Choice: choice === p2Choice ? choice : gameState.player2Choice,
        [choiceKey]: choice,
        rounds,
        currentRound: (gameState.currentRound as number || 1) + 1,
      });

      // Reset choices after 2 seconds for next round
      setTimeout(async () => {
        const bestOf = (gameState.bestOf as number) || 3;
        const winsNeeded = Math.ceil(bestOf / 2);
        const p1Wins = rounds.filter(r => r.winner === 'player1').length;
        const p2Wins = rounds.filter(r => r.winner === 'player2').length;

        if (p1Wins >= winsNeeded || p2Wins >= winsNeeded) {
          const winner = p1Wins >= winsNeeded ? game.player1_id : game.player2_id;
          await updateGameState({
            ...gameState, rounds, player1Choice: null, player2Choice: null,
            currentRound: (gameState.currentRound as number || 1) + 1,
          }, { status: 'finished' as any, winner });
        } else {
          await updateGameState({
            ...gameState, rounds, player1Choice: null, player2Choice: null,
            currentRound: (gameState.currentRound as number || 1) + 1,
          });
        }
      }, 2500);
    } else {
      await updateGameState(newState as Record<string, unknown>);
    }
  };

  const handleOthelloMove = async (pos: number) => {
    const board = (gameState as { board: OthelloCell[] }).board;
    const myColor: OthelloCell = amPlayer1 ? 'black' : 'white';
    const opponentColor: OthelloCell = amPlayer1 ? 'white' : 'black';
    const newBoard = applyOthelloMove(board, pos, myColor);

    // Check if opponent can play, otherwise skip to current player again
    const opponentMoves = getValidOthelloMoves(newBoard, opponentColor);
    let nextTurn = amPlayer1 ? game.player2_id : game.player1_id;
    let nextColor: OthelloCell = opponentColor;

    if (opponentMoves.length === 0) {
      const myMoves = getValidOthelloMoves(newBoard, myColor);
      if (myMoves.length === 0) {
        // Game over
        const pieces = countOthelloPieces(newBoard);
        const winner = pieces.black > pieces.white ? game.player1_id : pieces.white > pieces.black ? game.player2_id : null;
        await updateGameState({ ...gameState, board: newBoard, currentColor: null }, { status: 'finished' as any, winner });
        return;
      }
      nextTurn = amPlayer1 ? game.player1_id : game.player2_id;
      nextColor = myColor;
    }

    await updateGameState({ ...gameState, board: newBoard, currentColor: nextColor }, { current_turn: nextTurn });
  };


  // ==================== GAME OVER CHECK ====================

  const isGameFinished = () => {
    if (game.status === 'finished' || game.winner) return true;

    if (game.game_type === 'morpion') {
      const board = (gameState as { board: (string | null)[] }).board || [];
      return !!checkMorpionWinner(board) || isMorpionDraw(board);
    }
    if (game.game_type === 'battleship') {
      const bs = gameState as { player1Grid?: BattleshipCell[][]; player2Grid?: BattleshipCell[][]; phase?: string };
      if (bs.phase !== 'playing') return false;
      if (bs.player1Grid && checkAllShipsSunk(bs.player1Grid)) return true;
      if (bs.player2Grid && checkAllShipsSunk(bs.player2Grid)) return true;
    }
    if (game.game_type === 'connect4') {
      const board = (gameState as { board: (string | null)[] }).board || [];
      return !!checkConnect4Winner(board) || isConnect4Draw(board);
    }
    if (game.game_type === 'othello') {
      const board = (gameState as { board: OthelloCell[] }).board || [];
      return isOthelloGameOver(board);
    }
    // RPS and emoji_quiz are finished via status field
    return false;
  };

  const myVote = amPlayer1
    ? (gameState.player1WantsRematch as boolean | null) ?? null
    : (gameState.player2WantsRematch as boolean | null) ?? null;
  const opponentVote = amPlayer1
    ? (gameState.player2WantsRematch as boolean | null) ?? null
    : (gameState.player1WantsRematch as boolean | null) ?? null;
  const scores = (gameState.scores as { player1: number; player2: number }) || { player1: 0, player2: 0 };
  const gameTitle = GAME_TITLES[game.game_type] || game.game_type;
  const isFinished = isGameFinished();

  // ==================== RENDER ====================

  const renderGame = () => {
    switch (game.game_type) {
      case 'morpion':
        return <MorpionGame game={game} playerId={playerId} onMove={handleMorpionMove} />;
      case 'battleship':
        return <BattleshipGame game={game} playerId={playerId} onPlaceShips={handleBattleshipPlaceShips} onShoot={handleBattleshipShoot} />;
      case 'connect4':
        return <Connect4Game game={game} playerId={playerId} onMove={handleConnect4Move} />;
      case 'rps':
        return <RPSGame game={game} playerId={playerId} onChoice={handleRPSChoice} />;
      case 'othello':
        return <OthelloGame game={game} playerId={playerId} onMove={handleOthelloMove} />;
      default:
        return <p className="text-muted-foreground">Jeu non supporté</p>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Accueil</span>
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">{gameTitle}</h1>
          <div className="flex items-center gap-4">
            {(scores.player1 > 0 || scores.player2 > 0) && (
              <div className="flex items-center gap-2 text-sm">
                <span className={amPlayer1 ? 'text-primary font-bold' : 'text-muted-foreground'}>
                  {amPlayer1 ? scores.player1 : scores.player2}
                </span>
                <span className="text-muted-foreground">-</span>
                <span className={!amPlayer1 ? 'text-primary font-bold' : 'text-muted-foreground'}>
                  {amPlayer1 ? scores.player2 : scores.player1}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{game.player2_id ? '2/2' : '1/2'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
          {game.status === 'waiting' && <CodeDisplay code={game.code} />}
          <div className="flex justify-center">{renderGame()}</div>
          {isFinished && game.player2_id && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center">
              <RematchVote myVote={myVote} opponentVote={opponentVote} onVote={(v) => voteRematch(v)} scores={scores} amPlayer1={amPlayer1} />
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default GamePage;
