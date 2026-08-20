import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Users } from 'lucide-react';
import { useGame, GameStatus } from '@/hooks/useGame';
import { CodeDisplay } from '@/components/CodeDisplay';
import { MorpionGame } from '@/components/games/MorpionGame';
import { BattleshipGame } from '@/components/games/BattleshipGame';
import { Connect4Game } from '@/components/games/Connect4Game';
import { RPSGame } from '@/components/games/RPSGame';
import { OthelloGame } from '@/components/games/OthelloGame';
import { PenduGame } from '@/components/games/PenduGame';
import { DamesGame } from '@/components/games/DamesGame';
import { MemoryGame } from '@/components/games/MemoryGame';
import { ChkobbaGame } from '@/components/games/ChkobbaGame';
import { YanivGame } from '@/components/games/YanivGame';
import { RamiGame } from '@/components/games/RamiGame';
import { KalahGame } from '@/components/games/KalahGame';
import { BeloteGame } from '@/components/games/BeloteGame';
import { BackgammonGame } from '@/components/games/BackgammonGame';
import { SoccerStarsGame } from '@/components/games/SoccerStarsGame';
import { GorillasGame } from '@/components/games/GorillasGame';

import { RematchVote } from '@/components/games/RematchVote';
import { GameRulesDrawer } from '@/components/GameRulesDrawer';
import { Button } from '@/components/ui/button';
import {
  BattleshipCell, checkMorpionWinner, isMorpionDraw, checkAllShipsSunk,
  checkConnect4Winner, isConnect4Draw, getDropRow,
  determineRPSWinner, RPSChoice, RPSRound,
  OthelloCell, applyOthelloMove, getValidOthelloMoves, isOthelloGameOver, countOthelloPieces,
} from '@/lib/gameUtils';
import { isPenduWon, isPenduLost, normalizeWord, getWrongGuessCount, PENDU_MAX_ERRORS } from '@/lib/penduUtils';
import { DamesMove, applyDamesMove, isDamesGameOver, countDamesPieces } from '@/lib/damesUtils';
import { MemoryCard, isMemoryGameOver, checkMemoryMatch } from '@/lib/memoryUtils';
import { ChkobbaState, playChkobbaCard } from '@/lib/chkobbaUtils';
import { YanivState, playYanivMove, callYaniv, canSlap, playSlap } from '@/lib/yanivUtils';
import {
  RamiState, drawCard as ramiDraw, layMeld as ramiLayMeld, addToMeld as ramiAddToMeld,
  discardCard as ramiDiscard, checkCleanWin as ramiCheckCleanWin,
} from '@/lib/ramiUtils';
import { KalahState, playKalahMove } from '@/lib/kalahUtils';
import { BeloteState, playBeloteCard } from '@/lib/beloteUtils';
import { BackgammonState, rollDice as bgRollDice, playBackgammonMove, skipIfNoMoves as bgSkipIfNoMoves } from '@/lib/backgammonUtils';
import {
  SoccerStarsState, applyFlick, kickoffAfterGoal, FlickFrame,
} from '@/lib/soccerStarsUtils';
import { GorillaState, throwBanana } from '@/lib/gorillasUtils';

const GAME_TITLES: Record<string, string> = {
  morpion: 'Morpion',
  battleship: 'Bataille Navale',
  connect4: 'Puissance 4',
  rps: 'Pierre-Papier-Ciseaux',
  othello: 'Othello',
  pendu: 'Pendu',
  dames: 'Dames',
  memory: 'Memory',
  chkobba: 'Chkobba',
  yaniv: 'Yaniv',
  rami: 'Rami',
  awale: 'Kalah',
  belote: 'Belote',
  backgammon: 'Backgammon',
  football: 'Foot Stars',
  gorillas: 'Gorillas',
};

const GamePage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { game, loading, error, playerId, updateGameState, voteRematch, startRematch } = useGame(code);
  const rematchTriggered = useRef(false);
  const footballPendingRef = useRef<{ finalState: SoccerStarsState; goalScored: 'player1' | 'player2' | null; me: 'player1' | 'player2' } | null>(null);
  const [footballFrames, setFootballFrames] = useState<FlickFrame[] | null>(null);
  const gorillaPendingRef = useRef<{ finalState: GorillaState; winner: 'player1' | 'player2' | null; me: 'player1' | 'player2' } | null>(null);
  const [gorillaTrajectory, setGorillaTrajectory] = useState<{ x: number; y: number }[] | null>(null);

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

  if (loading && !game) {
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

    const p1Choice = amPlayer1 ? choice : (gameState.player1Choice as RPSChoice | null);
    const p2Choice = !amPlayer1 ? choice : (gameState.player2Choice as RPSChoice | null);

    if (p1Choice && p2Choice) {
      const roundResult = determineRPSWinner(p1Choice, p2Choice);
      const rounds = [...((gameState.rounds as RPSRound[]) || []), { player1Choice: p1Choice, player2Choice: p2Choice, winner: roundResult }];

      await updateGameState({
        ...gameState,
        player1Choice: choice === p1Choice ? choice : gameState.player1Choice,
        player2Choice: choice === p2Choice ? choice : gameState.player2Choice,
        [choiceKey]: choice,
        rounds,
        currentRound: (gameState.currentRound as number || 1) + 1,
      });

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

    const opponentMoves = getValidOthelloMoves(newBoard, opponentColor);
    let nextTurn = amPlayer1 ? game.player2_id : game.player1_id;
    let nextColor: OthelloCell = opponentColor;

    if (opponentMoves.length === 0) {
      const myMoves = getValidOthelloMoves(newBoard, myColor);
      if (myMoves.length === 0) {
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

  // ==================== PENDU HANDLERS ====================

  const handlePenduSetWord = async (word: string) => {
    // Player 1 sets the word, turn goes to player 2
    await updateGameState(
      { ...gameState, word },
      { current_turn: game.player2_id }
    );
  };

  const handlePenduGuess = async (letter: string) => {
    const word = gameState.word as string;
    const guessedLetters = [...((gameState.guessedLetters as string[]) || []), letter];
    const normalized = normalizeWord(word);

    // Check win/loss after this guess
    const won = normalized.split('').every(l => guessedLetters.includes(l));
    const errors = guessedLetters.filter(l => !normalized.includes(l)).length;
    const lost = errors >= PENDU_MAX_ERRORS;

    if (won) {
      await updateGameState(
        { ...gameState, guessedLetters },
        { status: 'finished' as any, winner: game.player2_id } // guesser wins
      );
    } else if (lost) {
      await updateGameState(
        { ...gameState, guessedLetters },
        { status: 'finished' as any, winner: game.player1_id } // chooser wins
      );
    } else {
      // Stay on player 2's turn (they keep guessing)
      await updateGameState({ ...gameState, guessedLetters });
    }
  };

  // ==================== DAMES HANDLER ====================

  const handleDamesMove = async (move: DamesMove) => {
    const board = (gameState.board as import('@/lib/damesUtils').DamesPiece[]);
    const newBoard = applyDamesMove(board, move);
    const myColor = amPlayer1 ? 'white' : 'black';
    const opponentColor = amPlayer1 ? 'black' : 'white';
    const nextTurn = amPlayer1 ? game.player2_id : game.player1_id;

    // Check if opponent can move
    if (isDamesGameOver(newBoard, opponentColor)) {
      // Current player wins
      await updateGameState(
        { ...gameState, board: newBoard, currentColor: opponentColor },
        { status: 'finished' as any, winner: playerId }
      );
    } else {
      await updateGameState(
        { ...gameState, board: newBoard, currentColor: opponentColor },
        { current_turn: nextTurn }
      );
    }
  };

  // ==================== MEMORY HANDLER ====================

  const handleMemoryFlip = async (cardIndex: number) => {
    const cards = [...(gameState.cards as MemoryCard[])];
    const flippedIndices = [...((gameState.flippedIndices as number[]) || [])];
    const memoryScores = { ...((gameState.memoryScores as { player1: number; player2: number }) || { player1: 0, player2: 0 }) };

    if (flippedIndices.length === 0) {
      // First card flip
      cards[cardIndex] = { ...cards[cardIndex], flipped: true };
      await updateGameState({ ...gameState, cards, flippedIndices: [cardIndex] });
    } else if (flippedIndices.length === 1) {
      // Second card flip
      const firstIdx = flippedIndices[0];
      cards[cardIndex] = { ...cards[cardIndex], flipped: true };

      if (cards[firstIdx].emoji === cards[cardIndex].emoji) {
        // Match found! Player keeps their turn and scores
        cards[firstIdx] = { ...cards[firstIdx], matched: true };
        cards[cardIndex] = { ...cards[cardIndex], matched: true };
        const scoreKey = amPlayer1 ? 'player1' : 'player2';
        memoryScores[scoreKey] += 1;

        // Check if game is over
        const allMatched = cards.every(c => c.matched);
        if (allMatched) {
          const winner = memoryScores.player1 > memoryScores.player2
            ? game.player1_id
            : memoryScores.player2 > memoryScores.player1
            ? game.player2_id
            : null;
          await updateGameState(
            { ...gameState, cards, flippedIndices: [], memoryScores },
            { status: 'finished' as any, winner }
          );
        } else {
          // Same player continues
          await updateGameState({ ...gameState, cards, flippedIndices: [], memoryScores });
        }
      } else {
        // No match - show both cards briefly, then flip back and switch turns
        await updateGameState({ ...gameState, cards, flippedIndices: [firstIdx, cardIndex] });

        // After delay, flip cards back and switch turns
        setTimeout(async () => {
          const resetCards = [...cards];
          resetCards[firstIdx] = { ...resetCards[firstIdx], flipped: false };
          resetCards[cardIndex] = { ...resetCards[cardIndex], flipped: false };
          const nextTurn = amPlayer1 ? game.player2_id : game.player1_id;
          await updateGameState(
            { ...gameState, cards: resetCards, flippedIndices: [], memoryScores },
            { current_turn: nextTurn }
          );
        }, 1500);
      }
    }
  };

  // ==================== CHKOBBA HANDLER ====================

  const handleChkobbaPlay = async (handIndex: number, selection: number[]) => {
    const state = gameState as unknown as ChkobbaState;
    const me = amPlayer1 ? 'player1' : 'player2';
    const result = playChkobbaCard(state, me, handIndex, selection);
    const nextTurn = result.nextPlayer === 'player1' ? game.player1_id : game.player2_id;

    if (result.finished) {
      const winner = result.winner === 'player1' ? game.player1_id : game.player2_id;
      await updateGameState(
        result.state as unknown as Record<string, unknown>,
        { status: 'finished' as GameStatus, winner }
      );
    } else {
      await updateGameState(
        result.state as unknown as Record<string, unknown>,
        { current_turn: nextTurn }
      );
    }
  };

  // ==================== YANIV HANDLERS ====================

  const handleYanivPlay = async (
    discardIndices: number[],
    draw: { from: 'deck' } | { from: 'discard'; cardId: string },
  ) => {
    const state = gameState as unknown as YanivState;
    const me = amPlayer1 ? 'player1' : 'player2';
    const result = playYanivMove(state, me, discardIndices, draw);

    if (canSlap(result.state, me)) {
      // On garde la main sur le joueur pour lui laisser la possibilité de slaper
      await updateGameState(result.state as unknown as Record<string, unknown>, {});
      return;
    }

    const nextTurn = result.nextPlayer === 'player1' ? game.player1_id : game.player2_id;
    await updateGameState(
      result.state as unknown as Record<string, unknown>,
      { current_turn: nextTurn }
    );
  };

  const handleYanivSlap = async () => {
    const state = gameState as unknown as YanivState;
    const me = amPlayer1 ? 'player1' : 'player2';
    const result = playSlap(state, me);
    const nextTurn = result.nextPlayer === 'player1' ? game.player1_id : game.player2_id;
    await updateGameState(result.state as unknown as Record<string, unknown>, { current_turn: nextTurn });
  };

  const handleYanivSkipSlap = async () => {
    const state = gameState as unknown as YanivState;
    const me = amPlayer1 ? 'player1' : 'player2';
    const nextTurn = me === 'player1' ? game.player2_id : game.player1_id;
    await updateGameState(state as unknown as Record<string, unknown>, { current_turn: nextTurn });
  };

  const handleYanivCall = async () => {
    const state = gameState as unknown as YanivState;
    const me = amPlayer1 ? 'player1' : 'player2';
    const result = callYaniv(state, me);
    const nextTurn = result.nextPlayer === 'player1' ? game.player1_id : game.player2_id;

    if (result.finished) {
      const winner = result.winner === 'player1' ? game.player1_id : game.player2_id;
      await updateGameState(
        result.state as unknown as Record<string, unknown>,
        { status: 'finished' as GameStatus, winner }
      );
    } else {
      await updateGameState(
        result.state as unknown as Record<string, unknown>,
        { current_turn: nextTurn }
      );
    }
  };

  // ==================== RAMI HANDLERS ====================

  const handleRamiDraw = async (from: 'deck' | 'discard') => {
    const state = gameState as unknown as RamiState;
    const me = amPlayer1 ? 'player1' : 'player2';
    const next = ramiDraw(state, me, from);
    await updateGameState(next as unknown as Record<string, unknown>, {});
  };

  const handleRamiLayMeld = async (handIndices: number[]) => {
    const state = gameState as unknown as RamiState;
    const me = amPlayer1 ? 'player1' : 'player2';
    const { state: laid, ok } = ramiLayMeld(state, me, handIndices);
    if (!ok) return;

    const clean = ramiCheckCleanWin(laid, me);
    if (clean) {
      const nextTurn = clean.nextPlayer === 'player1' ? game.player1_id : game.player2_id;
      if (clean.finished) {
        const winner = clean.winner === 'player1' ? game.player1_id : game.player2_id;
        await updateGameState(clean.state as unknown as Record<string, unknown>, { status: 'finished' as GameStatus, winner });
      } else {
        await updateGameState(clean.state as unknown as Record<string, unknown>, { current_turn: nextTurn });
      }
      return;
    }

    await updateGameState(laid as unknown as Record<string, unknown>, {});
  };

  const handleRamiAdd = async (handIndex: number, meldId: string) => {
    const state = gameState as unknown as RamiState;
    const me = amPlayer1 ? 'player1' : 'player2';
    const { state: added, ok } = ramiAddToMeld(state, me, handIndex, meldId);
    if (!ok) return;

    const clean = ramiCheckCleanWin(added, me);
    if (clean) {
      const nextTurn = clean.nextPlayer === 'player1' ? game.player1_id : game.player2_id;
      if (clean.finished) {
        const winner = clean.winner === 'player1' ? game.player1_id : game.player2_id;
        await updateGameState(clean.state as unknown as Record<string, unknown>, { status: 'finished' as GameStatus, winner });
      } else {
        await updateGameState(clean.state as unknown as Record<string, unknown>, { current_turn: nextTurn });
      }
      return;
    }

    await updateGameState(added as unknown as Record<string, unknown>, {});
  };

  const handleRamiDiscard = async (handIndex: number) => {
    const state = gameState as unknown as RamiState;
    const me = amPlayer1 ? 'player1' : 'player2';
    const result = ramiDiscard(state, me, handIndex);
    const nextTurn = result.nextPlayer === 'player1' ? game.player1_id : game.player2_id;

    if (result.finished) {
      const winner = result.winner === 'player1' ? game.player1_id : game.player2_id;
      await updateGameState(result.state as unknown as Record<string, unknown>, { status: 'finished' as GameStatus, winner });
    } else {
      await updateGameState(result.state as unknown as Record<string, unknown>, { current_turn: nextTurn });
    }
  };

  // ==================== KALAH HANDLERS ====================

  const handleKalahPlay = async (pitIndex: number) => {
    const state = gameState as unknown as KalahState;
    const me = amPlayer1 ? 'player1' : 'player2';
    const result = playKalahMove(state, me, pitIndex);
    const nextTurn = result.nextPlayer === 'player1' ? game.player1_id : game.player2_id;

    if (result.finished) {
      const winner = result.winner ? (result.winner === 'player1' ? game.player1_id : game.player2_id) : null;
      await updateGameState(
        result.state as unknown as Record<string, unknown>,
        { status: 'finished' as GameStatus, winner }
      );
    } else {
      await updateGameState(
        result.state as unknown as Record<string, unknown>,
        { current_turn: nextTurn }
      );
    }
  };

  // ==================== BELOTE HANDLERS ====================

  const handleBelotePlay = async (handIndex: number) => {
    const state = gameState as unknown as BeloteState;
    const me = amPlayer1 ? 'player1' : 'player2';
    const result = playBeloteCard(state, me, handIndex);
    const nextTurn = result.nextPlayer === 'player1' ? game.player1_id : game.player2_id;

    if (result.finished) {
      const winner = result.winner ? (result.winner === 'player1' ? game.player1_id : game.player2_id) : null;
      await updateGameState(
        result.state as unknown as Record<string, unknown>,
        { status: 'finished' as GameStatus, winner }
      );
    } else {
      await updateGameState(
        result.state as unknown as Record<string, unknown>,
        { current_turn: nextTurn }
      );
    }
  };

  // ==================== BACKGAMMON HANDLERS ====================

  const handleBackgammonRoll = async () => {
    const state = gameState as unknown as BackgammonState;
    const next = bgRollDice(state);
    const me = amPlayer1 ? 'player1' : 'player2';
    const skip = bgSkipIfNoMoves(next, me);
    if (skip) {
      const opponentTurn = amPlayer1 ? game.player2_id : game.player1_id;
      await updateGameState(skip as unknown as Record<string, unknown>, { current_turn: opponentTurn });
      return;
    }
    await updateGameState(next as unknown as Record<string, unknown>, {});
  };

  const handleBackgammonMove = async (from: number, die: number) => {
    const state = gameState as unknown as BackgammonState;
    const me = amPlayer1 ? 'player1' : 'player2';
    const result = playBackgammonMove(state, me, from, die);

    if (result.finished) {
      const winner = result.winner === 'player1' ? game.player1_id : game.player2_id;
      await updateGameState(result.state as unknown as Record<string, unknown>, { status: 'finished' as GameStatus, winner });
      return;
    }

    if (result.turnOver) {
      const nextTurn = result.nextPlayer === 'player1' ? game.player1_id : game.player2_id;
      await updateGameState(result.state as unknown as Record<string, unknown>, { current_turn: nextTurn });
    } else {
      await updateGameState(result.state as unknown as Record<string, unknown>, {});
    }
  };

  // ==================== FOOTBALL (SOCCER STARS) HANDLERS ====================

  const handleFootballFlick = (tokenId: string, vx: number, vy: number) => {
    const state = gameState as unknown as SoccerStarsState;
    const me = amPlayer1 ? 'player1' : 'player2';
    const result = applyFlick(state, me, tokenId, vx, vy);
    if (!result) return;
    footballPendingRef.current = { finalState: result.state, goalScored: result.goalScored, me };
    setFootballFrames(result.frames);
  };

  const handleFootballAnimationDone = async () => {
    setFootballFrames(null);
    const pending = footballPendingRef.current;
    footballPendingRef.current = null;
    if (!pending) return;
    const { finalState, goalScored, me } = pending;

    if (goalScored) {
      const afterGoal = kickoffAfterGoal(finalState, goalScored);
      if (afterGoal.scores[goalScored] >= 3) {
        const winner = goalScored === 'player1' ? game.player1_id : game.player2_id;
        await updateGameState(afterGoal as unknown as Record<string, unknown>, { status: 'finished' as GameStatus, winner });
        return;
      }
      const nextTurnPlayer = goalScored === 'player1' ? 'player2' : 'player1'; // qui encaisse engage
      const nextTurn = nextTurnPlayer === 'player1' ? game.player1_id : game.player2_id;
      await updateGameState(afterGoal as unknown as Record<string, unknown>, { current_turn: nextTurn });
      return;
    }

    const nextTurnPlayer = me === 'player1' ? 'player2' : 'player1';
    const nextTurn = nextTurnPlayer === 'player1' ? game.player1_id : game.player2_id;
    await updateGameState(finalState as unknown as Record<string, unknown>, { current_turn: nextTurn });
  };

  // ==================== GORILLAS HANDLERS ====================

  const handleGorillaThrow = (angle: number, velocity: number) => {
    const state = gameState as unknown as GorillaState;
    const me = amPlayer1 ? 'player1' : 'player2';
    const result = throwBanana(state, me, angle, velocity);
    gorillaPendingRef.current = { finalState: result.state, winner: result.winner, me };
    setGorillaTrajectory(result.state.lastShot?.trajectory ?? []);
  };

  const handleGorillaAnimationDone = async () => {
    setGorillaTrajectory(null);
    const pending = gorillaPendingRef.current;
    gorillaPendingRef.current = null;
    if (!pending) return;
    const { finalState, winner, me } = pending;

    if (winner) {
      const winnerId = winner === 'player1' ? game.player1_id : game.player2_id;
      await updateGameState(finalState as unknown as Record<string, unknown>, { status: 'finished' as GameStatus, winner: winnerId });
      return;
    }

    const nextTurnPlayer = me === 'player1' ? 'player2' : 'player1';
    const nextTurn = nextTurnPlayer === 'player1' ? game.player1_id : game.player2_id;
    await updateGameState(finalState as unknown as Record<string, unknown>, { current_turn: nextTurn });
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
    if (game.game_type === 'pendu') {
      const word = gameState.word as string | null;
      if (!word) return false;
      const guessedLetters = (gameState.guessedLetters as string[]) || [];
      return isPenduWon(word, guessedLetters) || isPenduLost(word, guessedLetters);
    }
    if (game.game_type === 'dames') {
      const board = (gameState.board as import('@/lib/damesUtils').DamesPiece[]) || [];
      const currentColor = (gameState.currentColor as 'white' | 'black') || 'white';
      return isDamesGameOver(board, currentColor);
    }
    if (game.game_type === 'memory') {
      const cards = (gameState.cards as MemoryCard[]) || [];
      return isMemoryGameOver(cards);
    }
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
      case 'pendu':
        return <PenduGame game={game} playerId={playerId} onMove={handlePenduGuess} onSetWord={handlePenduSetWord} />;
      case 'dames':
        return <DamesGame game={game} playerId={playerId} onMove={handleDamesMove} />;
      case 'chkobba':
        return <ChkobbaGame game={game} playerId={playerId} onPlay={handleChkobbaPlay} />;
      case 'yaniv':
        return (
          <YanivGame
            game={game}
            playerId={playerId}
            onPlay={handleYanivPlay}
            onYaniv={handleYanivCall}
            onSlap={handleYanivSlap}
            onSkipSlap={handleYanivSkipSlap}
          />
        );
      case 'rami':
        return (
          <RamiGame
            game={game}
            playerId={playerId}
            onDraw={handleRamiDraw}
            onLayMeld={handleRamiLayMeld}
            onAddToMeld={handleRamiAdd}
            onDiscard={handleRamiDiscard}
          />
        );
      case 'awale':
        return <KalahGame game={game} playerId={playerId} onPlay={handleKalahPlay} />;
      case 'belote':
        return <BeloteGame game={game} playerId={playerId} onPlay={handleBelotePlay} />;
      case 'backgammon':
        return <BackgammonGame game={game} playerId={playerId} onRoll={handleBackgammonRoll} onMove={handleBackgammonMove} />;
      case 'football':
        return (
          <SoccerStarsGame
            game={game}
            playerId={playerId}
            onFlick={handleFootballFlick}
            pendingFrames={footballFrames}
            onAnimationDone={handleFootballAnimationDone}
          />
        );
      case 'gorillas':
        return (
          <GorillasGame
            game={game}
            playerId={playerId}
            onThrow={handleGorillaThrow}
            pendingTrajectory={gorillaTrajectory}
            onAnimationDone={handleGorillaAnimationDone}
          />
        );
      case 'memory':
        return <MemoryGame game={game} playerId={playerId} onFlip={handleMemoryFlip} />;
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
          <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-1.5">
            {gameTitle}
            <GameRulesDrawer gameType={game.game_type} gameTitle={gameTitle} />
          </h1>
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
