import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Bot } from 'lucide-react';
import { GameType, GameStatus } from '@/hooks/useGame';
import { useSoloGame } from '@/hooks/useSoloGame';
import { MorpionGame } from '@/components/games/MorpionGame';
import { Connect4Game } from '@/components/games/Connect4Game';
import { RPSGame } from '@/components/games/RPSGame';
import { OthelloGame } from '@/components/games/OthelloGame';
import { PenduGame } from '@/components/games/PenduGame';
import { DamesGame } from '@/components/games/DamesGame';
import { MemoryGame } from '@/components/games/MemoryGame';
import { ChkobbaGame } from '@/components/games/ChkobbaGame';
import { YanivGame } from '@/components/games/YanivGame';
import { RamiGame } from '@/components/games/RamiGame';
import { AwaleGame } from '@/components/games/AwaleGame';
import { BeloteGame } from '@/components/games/BeloteGame';
import { BackgammonGame } from '@/components/games/BackgammonGame';
import { BattleshipGame } from '@/components/games/BattleshipGame';
import { Button } from '@/components/ui/button';
import {
  BattleshipCell, checkMorpionWinner, isMorpionDraw,
  checkConnect4Winner, isConnect4Draw, getDropRow,
  determineRPSWinner, RPSChoice, RPSRound,
  OthelloCell, applyOthelloMove, getValidOthelloMoves, isOthelloGameOver, countOthelloPieces,
  checkAllShipsSunk,
} from '@/lib/gameUtils';
import { isPenduWon, isPenduLost, normalizeWord, PENDU_MAX_ERRORS } from '@/lib/penduUtils';
import { DamesMove, applyDamesMove, isDamesGameOver } from '@/lib/damesUtils';
import { MemoryCard, isMemoryGameOver } from '@/lib/memoryUtils';
import { ChkobbaState, playChkobbaCard, chkobbaAI } from '@/lib/chkobbaUtils';
import { YanivState, playYanivMove, callYaniv, yanivAI } from '@/lib/yanivUtils';
import {
  RamiState, drawCard as ramiDraw, layMeld as ramiLayMeld, addToMeld as ramiAddToMeld,
  discardCard as ramiDiscard, checkCleanWin as ramiCheckCleanWin, ramiAI, handIndicesForIds,
} from '@/lib/ramiUtils';
import { AwaleState, playAwaleMove, awaleAI } from '@/lib/awaleUtils';
import { BeloteState, playBeloteCard, beloteAI } from '@/lib/beloteUtils';
import {
  BackgammonState, rollDice as bgRollDice, playBackgammonMove, backgammonAI,
  skipIfNoMoves as bgSkipIfNoMoves,
} from '@/lib/backgammonUtils';
import {
  morpionAI, connect4AI, rpsAI, othelloAI, damesAI,
  penduAIPickWord, penduAIGuess, battleshipAIShoot, battleshipAIPlaceShips,
  MemoryAI,
} from '@/lib/soloAI';

const GAME_TITLES: Record<string, string> = {
  morpion: 'Morpion', battleship: 'Bataille Navale', connect4: 'Puissance 4',
  rps: 'Pierre-Papier-Ciseaux', othello: 'Othello', pendu: 'Pendu',
  dames: 'Dames', memory: 'Memory', chkobba: 'Chkobba', yaniv: 'Yaniv', rami: 'Rami', awale: 'Awalé', belote: 'Belote', backgammon: 'Backgammon',
};

const SoloGamePage = () => {
  const { gameType } = useParams<{ gameType: string }>();
  const navigate = useNavigate();
  const { game, playerId, updateGameState, resetGame } = useSoloGame(gameType as GameType);
  const memoryAIRef = useRef(new MemoryAI());
  const [cpuThinking, setCpuThinking] = useState(false);

  const amPlayer1 = true;
  const gameState = game.game_state as Record<string, unknown>;
  const scores = (gameState.scores as { player1: number; player2: number }) || { player1: 0, player2: 0 };
  const gameTitle = GAME_TITLES[game.game_type] || game.game_type;

  // Helper to schedule CPU move with delay
  const scheduleCPU = useCallback((fn: () => void, delay = 800) => {
    setCpuThinking(true);
    setTimeout(() => {
      fn();
      setCpuThinking(false);
    }, delay);
  }, []);

  // ==================== MORPION ====================
  const handleMorpionMove = async (index: number) => {
    const board = [...((gameState.board as (string | null)[]) || Array(9).fill(null))];
    board[index] = 'X';

    if (checkMorpionWinner(board) || isMorpionDraw(board)) {
      const winner = checkMorpionWinner(board);
      await updateGameState({ ...gameState, board }, winner ? { status: 'finished' as any, winner: winner === 'X' ? 'human' : 'cpu' } : { status: 'finished' as any });
      return;
    }

    await updateGameState({ ...gameState, board }, { current_turn: 'cpu' });

    scheduleCPU(async () => {
      const aiIdx = morpionAI(board);
      const newBoard = [...board]; newBoard[aiIdx] = 'O';
      const aiWinner = checkMorpionWinner(newBoard);
      if (aiWinner || isMorpionDraw(newBoard)) {
        await updateGameState({ ...gameState, board: newBoard }, { status: 'finished' as any, winner: aiWinner === 'O' ? 'cpu' : aiWinner === 'X' ? 'human' : null });
      } else {
        await updateGameState({ ...gameState, board: newBoard }, { current_turn: 'human' });
      }
    });
  };

  // ==================== CONNECT4 ====================
  const handleConnect4Move = async (col: number) => {
    const board = [...((gameState.board as (string | null)[]) || Array(42).fill(null))];
    const row = getDropRow(board, col);
    if (row === -1) return;
    board[row * 7 + col] = 'red';

    if (checkConnect4Winner(board) || isConnect4Draw(board)) {
      const w = checkConnect4Winner(board);
      await updateGameState({ ...gameState, board }, { status: 'finished' as any, winner: w === 'red' ? 'human' : w === 'yellow' ? 'cpu' : null });
      return;
    }

    await updateGameState({ ...gameState, board }, { current_turn: 'cpu' });

    scheduleCPU(async () => {
      const aiCol = connect4AI(board);
      const aiRow = getDropRow(board, aiCol);
      if (aiRow === -1) return;
      board[aiRow * 7 + aiCol] = 'yellow';
      const w = checkConnect4Winner(board);
      if (w || isConnect4Draw(board)) {
        await updateGameState({ ...gameState, board }, { status: 'finished' as any, winner: w === 'yellow' ? 'cpu' : w === 'red' ? 'human' : null });
      } else {
        await updateGameState({ ...gameState, board }, { current_turn: 'human' });
      }
    });
  };

  // ==================== RPS ====================
  const handleRPSChoice = async (choice: RPSChoice) => {
    const cpuChoice = rpsAI();
    const roundResult = determineRPSWinner(choice, cpuChoice);
    const rounds = [...((gameState.rounds as RPSRound[]) || []), { player1Choice: choice, player2Choice: cpuChoice, winner: roundResult }];

    await updateGameState({
      ...gameState,
      player1Choice: choice, player2Choice: cpuChoice,
      rounds, currentRound: (gameState.currentRound as number || 1) + 1,
    });

    setTimeout(async () => {
      const bestOf = (gameState.bestOf as number) || 3;
      const winsNeeded = Math.ceil(bestOf / 2);
      const p1Wins = rounds.filter(r => r.winner === 'player1').length;
      const p2Wins = rounds.filter(r => r.winner === 'player2').length;

      if (p1Wins >= winsNeeded || p2Wins >= winsNeeded) {
        const winner = p1Wins >= winsNeeded ? 'human' : 'cpu';
        await updateGameState({ ...gameState, rounds, player1Choice: null, player2Choice: null, currentRound: (gameState.currentRound as number || 1) + 1 }, { status: 'finished' as any, winner });
      } else {
        await updateGameState({ ...gameState, rounds, player1Choice: null, player2Choice: null, currentRound: (gameState.currentRound as number || 1) + 1 });
      }
    }, 2500);
  };

  // ==================== OTHELLO ====================
  const handleOthelloMove = async (pos: number) => {
    const board = (gameState.board as OthelloCell[]);
    const newBoard = applyOthelloMove(board, pos, 'black');

    const opponentMoves = getValidOthelloMoves(newBoard, 'white');
    if (opponentMoves.length === 0) {
      const myMoves = getValidOthelloMoves(newBoard, 'black');
      if (myMoves.length === 0) {
        const pieces = countOthelloPieces(newBoard);
        const winner = pieces.black > pieces.white ? 'human' : pieces.white > pieces.black ? 'cpu' : null;
        await updateGameState({ ...gameState, board: newBoard, currentColor: null }, { status: 'finished' as any, winner });
        return;
      }
      await updateGameState({ ...gameState, board: newBoard, currentColor: 'black' }, { current_turn: 'human' });
      return;
    }

    await updateGameState({ ...gameState, board: newBoard, currentColor: 'white' }, { current_turn: 'cpu' });

    scheduleCPU(async () => {
      const aiPos = othelloAI(newBoard, 'white');
      if (aiPos === -1) {
        await updateGameState({ ...gameState, board: newBoard, currentColor: 'black' }, { current_turn: 'human' });
        return;
      }
      const aiBoard = applyOthelloMove(newBoard, aiPos, 'white');
      const humanMoves = getValidOthelloMoves(aiBoard, 'black');

      if (humanMoves.length === 0 && getValidOthelloMoves(aiBoard, 'white').length === 0) {
        const pieces = countOthelloPieces(aiBoard);
        const winner = pieces.black > pieces.white ? 'human' : pieces.white > pieces.black ? 'cpu' : null;
        await updateGameState({ ...gameState, board: aiBoard, currentColor: null }, { status: 'finished' as any, winner });
      } else if (humanMoves.length === 0) {
        // Human can't move, CPU goes again — but for simplicity, just skip
        await updateGameState({ ...gameState, board: aiBoard, currentColor: 'white' }, { current_turn: 'cpu' });
      } else {
        await updateGameState({ ...gameState, board: aiBoard, currentColor: 'black' }, { current_turn: 'human' });
      }
    });
  };

  // ==================== PENDU ====================
  // In solo mode, CPU picks the word, human guesses
  useEffect(() => {
    if (game.game_type === 'pendu' && !gameState.word && game.status === 'playing') {
      const word = penduAIPickWord();
      updateGameState({ ...gameState, word }, { current_turn: 'human' });
    }
  }, [game.game_type, gameState.word, game.status]);

  const handlePenduGuess = async (letter: string) => {
    const word = gameState.word as string;
    const guessedLetters = [...((gameState.guessedLetters as string[]) || []), letter];
    const normalized = normalizeWord(word);
    const won = normalized.split('').every(l => guessedLetters.includes(l));
    const errors = guessedLetters.filter(l => !normalized.includes(l)).length;
    const lost = errors >= PENDU_MAX_ERRORS;

    if (won) {
      await updateGameState({ ...gameState, guessedLetters }, { status: 'finished' as any, winner: 'human' });
    } else if (lost) {
      await updateGameState({ ...gameState, guessedLetters }, { status: 'finished' as any, winner: 'cpu' });
    } else {
      await updateGameState({ ...gameState, guessedLetters });
    }
  };

  // ==================== DAMES ====================
  const handleDamesMove = async (move: DamesMove) => {
    const board = gameState.board as import('@/lib/damesUtils').DamesPiece[];
    const newBoard = applyDamesMove(board, move);

    if (isDamesGameOver(newBoard, 'black')) {
      await updateGameState({ ...gameState, board: newBoard, currentColor: 'black' }, { status: 'finished' as any, winner: 'human' });
      return;
    }

    await updateGameState({ ...gameState, board: newBoard, currentColor: 'black' }, { current_turn: 'cpu' });

    scheduleCPU(async () => {
      const aiMove = damesAI(newBoard, 'black');
      if (!aiMove) {
        await updateGameState({ ...gameState, board: newBoard, currentColor: 'black' }, { status: 'finished' as any, winner: 'human' });
        return;
      }
      const aiBoard = applyDamesMove(newBoard, aiMove);
      if (isDamesGameOver(aiBoard, 'white')) {
        await updateGameState({ ...gameState, board: aiBoard, currentColor: 'white' }, { status: 'finished' as any, winner: 'cpu' });
      } else {
        await updateGameState({ ...gameState, board: aiBoard, currentColor: 'white' }, { current_turn: 'human' });
      }
    }, 1000);
  };

  // ==================== MEMORY ====================
  const handleMemoryFlip = async (cardIndex: number) => {
    const cards = [...(gameState.cards as MemoryCard[])];
    const flippedIndices = [...((gameState.flippedIndices as number[]) || [])];
    const memoryScores = { ...((gameState.memoryScores as { player1: number; player2: number }) || { player1: 0, player2: 0 }) };
    const ai = memoryAIRef.current;

    if (flippedIndices.length === 0) {
      cards[cardIndex] = { ...cards[cardIndex], flipped: true };
      ai.observe(cardIndex, cards[cardIndex].emoji);
      await updateGameState({ ...gameState, cards, flippedIndices: [cardIndex] });
    } else if (flippedIndices.length === 1) {
      const firstIdx = flippedIndices[0];
      cards[cardIndex] = { ...cards[cardIndex], flipped: true };
      ai.observe(cardIndex, cards[cardIndex].emoji);

      if (cards[firstIdx].emoji === cards[cardIndex].emoji) {
        cards[firstIdx] = { ...cards[firstIdx], matched: true };
        cards[cardIndex] = { ...cards[cardIndex], matched: true };
        memoryScores.player1 += 1;

        if (cards.every(c => c.matched)) {
          const winner = memoryScores.player1 > memoryScores.player2 ? 'human' : memoryScores.player2 > memoryScores.player1 ? 'cpu' : null;
          await updateGameState({ ...gameState, cards, flippedIndices: [], memoryScores }, { status: 'finished' as any, winner });
        } else {
          await updateGameState({ ...gameState, cards, flippedIndices: [], memoryScores });
        }
      } else {
        await updateGameState({ ...gameState, cards, flippedIndices: [firstIdx, cardIndex] });

        setTimeout(async () => {
          const resetCards = [...cards];
          resetCards[firstIdx] = { ...resetCards[firstIdx], flipped: false };
          resetCards[cardIndex] = { ...resetCards[cardIndex], flipped: false };

          await updateGameState({ ...gameState, cards: resetCards, flippedIndices: [], memoryScores }, { current_turn: 'cpu' });

          // CPU turn
          scheduleCPU(async () => {
            const cpuCards = [...resetCards];
            const [a, b] = ai.pickTwo(cpuCards);
            cpuCards[a] = { ...cpuCards[a], flipped: true };
            ai.observe(a, cpuCards[a].emoji);
            cpuCards[b] = { ...cpuCards[b], flipped: true };
            ai.observe(b, cpuCards[b].emoji);

            const cpuScores = { ...memoryScores };

            if (cpuCards[a].emoji === cpuCards[b].emoji) {
              cpuCards[a] = { ...cpuCards[a], matched: true };
              cpuCards[b] = { ...cpuCards[b], matched: true };
              cpuScores.player2 += 1;

              if (cpuCards.every(c => c.matched)) {
                const winner = cpuScores.player1 > cpuScores.player2 ? 'human' : cpuScores.player2 > cpuScores.player1 ? 'cpu' : null;
                await updateGameState({ ...gameState, cards: cpuCards, flippedIndices: [], memoryScores: cpuScores }, { status: 'finished' as any, winner });
              } else {
                // CPU matched — gets another turn, but for simplicity give back to human
                await updateGameState({ ...gameState, cards: cpuCards, flippedIndices: [], memoryScores: cpuScores }, { current_turn: 'human' });
              }
            } else {
              await updateGameState({ ...gameState, cards: cpuCards, flippedIndices: [a, b], memoryScores: cpuScores });
              setTimeout(async () => {
                cpuCards[a] = { ...cpuCards[a], flipped: false };
                cpuCards[b] = { ...cpuCards[b], flipped: false };
                await updateGameState({ ...gameState, cards: cpuCards, flippedIndices: [], memoryScores: cpuScores }, { current_turn: 'human' });
              }, 1500);
            }
          }, 1000);
        }, 1500);
      }
    }
  };

  // ==================== BATTLESHIP ====================
  // Auto-place CPU ships when human is ready
  useEffect(() => {
    if (game.game_type === 'battleship' && gameState.player1Ready && !gameState.player2Ready) {
      const cpuGrid = battleshipAIPlaceShips();
      updateGameState({ ...gameState, player2Grid: cpuGrid, player2Ready: true, phase: 'playing' }, { current_turn: 'human' });
    }
  }, [game.game_type, gameState.player1Ready, gameState.player2Ready]);

  const handleBattleshipPlaceShips = async (grid: BattleshipCell[][]) => {
    await updateGameState({ ...gameState, player1Grid: grid, player1Ready: true });
  };

  const handleBattleshipShoot = async (row: number, col: number) => {
    const state = gameState as { player1Grid: BattleshipCell[][]; player2Grid: BattleshipCell[][] };
    const newGrid = state.player2Grid.map(r => r.map(c => ({ ...c })));
    newGrid[row][col].hit = true;

    if (checkAllShipsSunk(newGrid)) {
      await updateGameState({ ...gameState, player2Grid: newGrid }, { status: 'finished' as any, winner: 'human' });
      return;
    }

    await updateGameState({ ...gameState, player2Grid: newGrid }, { current_turn: 'cpu' });

    scheduleCPU(async () => {
      const p1Grid = state.player1Grid.map(r => r.map(c => ({ ...c })));
      const [ar, ac] = battleshipAIShoot(p1Grid);
      p1Grid[ar][ac].hit = true;

      if (checkAllShipsSunk(p1Grid)) {
        await updateGameState({ ...gameState, player1Grid: p1Grid, player2Grid: newGrid }, { status: 'finished' as any, winner: 'cpu' });
      } else {
        await updateGameState({ ...gameState, player1Grid: p1Grid, player2Grid: newGrid }, { current_turn: 'human' });
      }
    });
  };

  // ==================== CHKOBBA ====================
  const handleChkobbaPlay = async (handIndex: number, selection: number[]) => {
    const state = gameState as unknown as ChkobbaState;
    const result = playChkobbaCard(state, 'player1', handIndex, selection);

    if (result.finished) {
      await updateGameState(result.state as unknown as Record<string, unknown>, {
        status: 'finished' as GameStatus, winner: result.winner === 'player1' ? 'human' : 'cpu',
      });
      return;
    }

    if (result.nextPlayer === 'player1') {
      await updateGameState(result.state as unknown as Record<string, unknown>, { current_turn: 'human' });
      return;
    }

    await updateGameState(result.state as unknown as Record<string, unknown>, { current_turn: 'cpu' });

    // Le CPU peut enchaîner plusieurs coups (si le joueur passe son tour n'arrive pas ici,
    // mais après une nouvelle donne c'est possible que ce soit encore à lui)
    const playCpu = (current: ChkobbaState) => {
      scheduleCPU(async () => {
        const move = chkobbaAI(current, 'player2');
        if (!move) {
          await updateGameState(current as unknown as Record<string, unknown>, { current_turn: 'human' });
          return;
        }
        const cpuResult = playChkobbaCard(current, 'player2', move.handIndex, move.selection);
        if (cpuResult.finished) {
          await updateGameState(cpuResult.state as unknown as Record<string, unknown>, {
            status: 'finished' as GameStatus, winner: cpuResult.winner === 'player1' ? 'human' : 'cpu',
          });
        } else if (cpuResult.nextPlayer === 'player2') {
          await updateGameState(cpuResult.state as unknown as Record<string, unknown>, { current_turn: 'cpu' });
          playCpu(cpuResult.state);
        } else {
          await updateGameState(cpuResult.state as unknown as Record<string, unknown>, { current_turn: 'human' });
        }
      }, 1000);
    };
    playCpu(result.state);
  };

  // ==================== YANIV ====================
  const playYanivCpuTurn = (current: YanivState) => {
    scheduleCPU(async () => {
      const move = yanivAI(current, 'player2');

      if (move.type === 'yaniv') {
        const result = callYaniv(current, 'player2');
        if (result.finished) {
          await updateGameState(result.state as unknown as Record<string, unknown>, {
            status: 'finished' as GameStatus, winner: result.winner === 'player1' ? 'human' : 'cpu',
          });
          return;
        }
        const nextTurn = result.nextPlayer === 'player1' ? 'human' : 'cpu';
        await updateGameState(result.state as unknown as Record<string, unknown>, { current_turn: nextTurn });
        if (nextTurn === 'cpu') playYanivCpuTurn(result.state);
        return;
      }

      const result = playYanivMove(current, 'player2', move.discardIndices!, move.draw!);
      const nextTurn = result.nextPlayer === 'player1' ? 'human' : 'cpu';
      await updateGameState(result.state as unknown as Record<string, unknown>, { current_turn: nextTurn });
      if (nextTurn === 'cpu') playYanivCpuTurn(result.state);
    }, 1000);
  };

  const handleYanivPlay = async (
    discardIndices: number[],
    draw: { from: 'deck' } | { from: 'discard'; cardId: string },
  ) => {
    const state = gameState as unknown as YanivState;
    const result = playYanivMove(state, 'player1', discardIndices, draw);

    if (result.nextPlayer === 'player1') {
      await updateGameState(result.state as unknown as Record<string, unknown>, { current_turn: 'human' });
      return;
    }

    await updateGameState(result.state as unknown as Record<string, unknown>, { current_turn: 'cpu' });
    playYanivCpuTurn(result.state);
  };

  const handleYanivCall = async () => {
    const state = gameState as unknown as YanivState;
    const result = callYaniv(state, 'player1');

    if (result.finished) {
      await updateGameState(result.state as unknown as Record<string, unknown>, {
        status: 'finished' as GameStatus, winner: result.winner === 'player1' ? 'human' : 'cpu',
      });
      return;
    }

    const nextTurn = result.nextPlayer === 'player1' ? 'human' : 'cpu';
    await updateGameState(result.state as unknown as Record<string, unknown>, { current_turn: nextTurn });
    if (nextTurn === 'cpu') playYanivCpuTurn(result.state);
  };

  // ==================== RAMI ====================
  const playRamiCpuTurn = (current: RamiState) => {
    scheduleCPU(async () => {
      const move = ramiAI(current, 'player2');
      let state = ramiDraw(current, 'player2', move.draw.from);

      for (const ids of move.meldCardIds) {
        const idx = handIndicesForIds(state.hands.player2, ids);
        if (idx.length === ids.length) {
          const r = ramiLayMeld(state, 'player2', idx);
          if (r.ok) state = r.state;
        }
      }
      for (const add of move.additions) {
        const idx = handIndicesForIds(state.hands.player2, [add.cardId])[0];
        if (idx !== undefined) {
          const r = ramiAddToMeld(state, 'player2', idx, add.meldId);
          if (r.ok) state = r.state;
        }
      }

      const clean = ramiCheckCleanWin(state, 'player2');
      if (clean) {
        state = clean.state;
        if (clean.finished) {
          await updateGameState(state as unknown as Record<string, unknown>, {
            status: 'finished' as GameStatus, winner: clean.winner === 'player1' ? 'human' : 'cpu',
          });
          return;
        }
        const nextTurn = clean.nextPlayer === 'player1' ? 'human' : 'cpu';
        await updateGameState(state as unknown as Record<string, unknown>, { current_turn: nextTurn });
        if (nextTurn === 'cpu') playRamiCpuTurn(state);
        return;
      }

      const discardIdx = handIndicesForIds(state.hands.player2, [move.discardCardId])[0] ?? 0;
      const result = ramiDiscard(state, 'player2', discardIdx);
      state = result.state;
      if (result.finished) {
        await updateGameState(state as unknown as Record<string, unknown>, {
          status: 'finished' as GameStatus, winner: result.winner === 'player1' ? 'human' : 'cpu',
        });
        return;
      }
      const nextTurn = result.nextPlayer === 'player1' ? 'human' : 'cpu';
      await updateGameState(state as unknown as Record<string, unknown>, { current_turn: nextTurn });
      if (nextTurn === 'cpu') playRamiCpuTurn(state);
    }, 1000);
  };

  const handleRamiDraw = async (from: 'deck' | 'discard') => {
    const state = gameState as unknown as RamiState;
    const next = ramiDraw(state, 'player1', from);
    await updateGameState(next as unknown as Record<string, unknown>, {});
  };

  const handleRamiLayMeld = async (handIndices: number[]) => {
    const state = gameState as unknown as RamiState;
    const { state: laid, ok } = ramiLayMeld(state, 'player1', handIndices);
    if (!ok) return;

    const clean = ramiCheckCleanWin(laid, 'player1');
    if (clean) {
      if (clean.finished) {
        await updateGameState(clean.state as unknown as Record<string, unknown>, { status: 'finished' as GameStatus, winner: 'human' });
        return;
      }
      const nextTurn = clean.nextPlayer === 'player1' ? 'human' : 'cpu';
      await updateGameState(clean.state as unknown as Record<string, unknown>, { current_turn: nextTurn });
      if (nextTurn === 'cpu') playRamiCpuTurn(clean.state);
      return;
    }

    await updateGameState(laid as unknown as Record<string, unknown>, {});
  };

  const handleRamiAdd = async (handIndex: number, meldId: string) => {
    const state = gameState as unknown as RamiState;
    const { state: added, ok } = ramiAddToMeld(state, 'player1', handIndex, meldId);
    if (!ok) return;

    const clean = ramiCheckCleanWin(added, 'player1');
    if (clean) {
      if (clean.finished) {
        await updateGameState(clean.state as unknown as Record<string, unknown>, { status: 'finished' as GameStatus, winner: 'human' });
        return;
      }
      const nextTurn = clean.nextPlayer === 'player1' ? 'human' : 'cpu';
      await updateGameState(clean.state as unknown as Record<string, unknown>, { current_turn: nextTurn });
      if (nextTurn === 'cpu') playRamiCpuTurn(clean.state);
      return;
    }

    await updateGameState(added as unknown as Record<string, unknown>, {});
  };

  const handleRamiDiscard = async (handIndex: number) => {
    const state = gameState as unknown as RamiState;
    const result = ramiDiscard(state, 'player1', handIndex);

    if (result.finished) {
      await updateGameState(result.state as unknown as Record<string, unknown>, { status: 'finished' as GameStatus, winner: 'human' });
      return;
    }
    const nextTurn = result.nextPlayer === 'player1' ? 'human' : 'cpu';
    await updateGameState(result.state as unknown as Record<string, unknown>, { current_turn: nextTurn });
    if (nextTurn === 'cpu') playRamiCpuTurn(result.state);
  };

  // ==================== AWALÉ ====================
  const playAwaleCpuTurn = (current: AwaleState) => {
    scheduleCPU(async () => {
      const move = awaleAI(current, 'player2');
      if (move === -1) return; // ne devrait pas arriver, sécurité

      const result = playAwaleMove(current, 'player2', move);

      if (result.finished) {
        await updateGameState(result.state as unknown as Record<string, unknown>, {
          status: 'finished' as GameStatus,
          winner: result.winner ? (result.winner === 'player1' ? 'human' : 'cpu') : null,
        });
        return;
      }

      const nextTurn = result.nextPlayer === 'player1' ? 'human' : 'cpu';
      await updateGameState(result.state as unknown as Record<string, unknown>, { current_turn: nextTurn });
      if (nextTurn === 'cpu') playAwaleCpuTurn(result.state);
    }, 1000);
  };

  const handleAwalePlay = async (pitIndex: number) => {
    const state = gameState as unknown as AwaleState;
    const result = playAwaleMove(state, 'player1', pitIndex);

    if (result.finished) {
      await updateGameState(result.state as unknown as Record<string, unknown>, {
        status: 'finished' as GameStatus,
        winner: result.winner ? (result.winner === 'player1' ? 'human' : 'cpu') : null,
      });
      return;
    }

    const nextTurn = result.nextPlayer === 'player1' ? 'human' : 'cpu';
    await updateGameState(result.state as unknown as Record<string, unknown>, { current_turn: nextTurn });
    if (nextTurn === 'cpu') playAwaleCpuTurn(result.state);
  };

  // ==================== BELOTE ====================
  const playBeloteCpuTurn = (current: BeloteState) => {
    scheduleCPU(async () => {
      const move = beloteAI(current, 'player2');
      const result = playBeloteCard(current, 'player2', move);

      if (result.finished) {
        await updateGameState(result.state as unknown as Record<string, unknown>, {
          status: 'finished' as GameStatus,
          winner: result.winner ? (result.winner === 'player1' ? 'human' : 'cpu') : null,
        });
        return;
      }

      const nextTurn = result.nextPlayer === 'player1' ? 'human' : 'cpu';
      await updateGameState(result.state as unknown as Record<string, unknown>, { current_turn: nextTurn });
      if (nextTurn === 'cpu') playBeloteCpuTurn(result.state);
    }, 1000);
  };

  const handleBelotePlay = async (handIndex: number) => {
    const state = gameState as unknown as BeloteState;
    const result = playBeloteCard(state, 'player1', handIndex);

    if (result.finished) {
      await updateGameState(result.state as unknown as Record<string, unknown>, {
        status: 'finished' as GameStatus,
        winner: result.winner ? (result.winner === 'player1' ? 'human' : 'cpu') : null,
      });
      return;
    }

    const nextTurn = result.nextPlayer === 'player1' ? 'human' : 'cpu';
    await updateGameState(result.state as unknown as Record<string, unknown>, { current_turn: nextTurn });
    if (nextTurn === 'cpu') playBeloteCpuTurn(result.state);
  };

  // ==================== BACKGAMMON ====================
  const playBackgammonCpuTurn = (current: BackgammonState) => {
    scheduleCPU(async () => {
      let state = bgRollDice(current);
      const skip = bgSkipIfNoMoves(state, 'player2');
      if (skip) {
        await updateGameState(skip as unknown as Record<string, unknown>, { current_turn: 'human' });
        return;
      }

      const dieValues = [...new Set(state.dice)];
      for (const die of dieValues) {
        while (state.dice.includes(die)) {
          const from = backgammonAI(state, 'player2', die);
          if (from === null) break;
          const result = playBackgammonMove(state, 'player2', from, die);
          state = result.state;
          if (result.finished) {
            await updateGameState(state as unknown as Record<string, unknown>, { status: 'finished' as GameStatus, winner: 'cpu' });
            return;
          }
          if (result.turnOver) {
            await updateGameState(state as unknown as Record<string, unknown>, { current_turn: 'human' });
            return;
          }
        }
      }
      // Filet de sécurité : si des dés restent injouables, on passe la main
      await updateGameState({ ...state, dice: [], diceRolled: false } as unknown as Record<string, unknown>, { current_turn: 'human' });
    }, 1000);
  };

  const handleBackgammonRoll = async () => {
    const state = gameState as unknown as BackgammonState;
    const rolled = bgRollDice(state);
    const skip = bgSkipIfNoMoves(rolled, 'player1');
    if (skip) {
      await updateGameState(skip as unknown as Record<string, unknown>, { current_turn: 'cpu' });
      playBackgammonCpuTurn(skip);
      return;
    }
    await updateGameState(rolled as unknown as Record<string, unknown>, {});
  };

  const handleBackgammonMove = async (from: number, die: number) => {
    const state = gameState as unknown as BackgammonState;
    const result = playBackgammonMove(state, 'player1', from, die);

    if (result.finished) {
      await updateGameState(result.state as unknown as Record<string, unknown>, { status: 'finished' as GameStatus, winner: 'human' });
      return;
    }

    if (result.turnOver) {
      await updateGameState(result.state as unknown as Record<string, unknown>, { current_turn: 'cpu' });
      playBackgammonCpuTurn(result.state);
    } else {
      await updateGameState(result.state as unknown as Record<string, unknown>, {});
    }
  };

  // ==================== GAME OVER ====================
  const isFinished = game.status === 'finished' || !!game.winner;

  const getWinnerMessage = () => {
    if (!isFinished) return null;
    if (game.winner === 'human') return '🎉 Tu as gagné !';
    if (game.winner === 'cpu') return '🤖 L\'ordi a gagné !';
    return '🤝 Match nul !';
  };

  // ==================== RENDER ====================
  const renderGame = () => {
    switch (game.game_type) {
      case 'morpion': return <MorpionGame game={game} playerId={playerId} onMove={handleMorpionMove} />;
      case 'connect4': return <Connect4Game game={game} playerId={playerId} onMove={handleConnect4Move} />;
      case 'rps': return <RPSGame game={game} playerId={playerId} onChoice={handleRPSChoice} />;
      case 'othello': return <OthelloGame game={game} playerId={playerId} onMove={handleOthelloMove} />;
      case 'pendu': return <PenduGame game={game} playerId={playerId} onMove={handlePenduGuess} onSetWord={() => {}} />;
      case 'dames': return <DamesGame game={game} playerId={playerId} onMove={handleDamesMove} />;
      case 'chkobba': return <ChkobbaGame game={game} playerId={playerId} onPlay={handleChkobbaPlay} />;
      case 'yaniv': return <YanivGame game={game} playerId={playerId} onPlay={handleYanivPlay} onYaniv={handleYanivCall} />;
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
      case 'awale': return <AwaleGame game={game} playerId={playerId} onPlay={handleAwalePlay} />;
      case 'belote': return <BeloteGame game={game} playerId={playerId} onPlay={handleBelotePlay} />;
      case 'backgammon': return <BackgammonGame game={game} playerId={playerId} onRoll={handleBackgammonRoll} onMove={handleBackgammonMove} />;
      case 'memory': return <MemoryGame game={game} playerId={playerId} onFlip={handleMemoryFlip} />;
      case 'battleship': return <BattleshipGame game={game} playerId={playerId} onPlaceShips={handleBattleshipPlaceShips} onShoot={handleBattleshipShoot} />;
      default: return <p className="text-muted-foreground">Jeu non supporté</p>;
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
          <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            {gameTitle}
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
              <Bot className="w-3 h-3" /> Solo
            </span>
          </h1>
          <div className="flex items-center gap-4">
            {(scores.player1 > 0 || scores.player2 > 0) && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-primary font-bold">{scores.player1}</span>
                <span className="text-muted-foreground">-</span>
                <span className="text-muted-foreground">{scores.player2}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
          {cpuThinking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
              <div className="flex items-center gap-2 text-muted-foreground text-sm bg-muted px-4 py-2 rounded-full">
                <Bot className="w-4 h-4 animate-pulse" />
                L'ordi réfléchit...
              </div>
            </motion.div>
          )}
          <div className="flex justify-center">{renderGame()}</div>
          {isFinished && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
              <p className="text-2xl font-display font-bold text-foreground">{getWinnerMessage()}</p>
              <Button onClick={resetGame} size="lg" className="font-semibold">
                🔄 Rejouer
              </Button>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default SoloGamePage;
