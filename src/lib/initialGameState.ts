import { GameType } from '@/hooks/useGame';
import { createChkobbaState } from '@/lib/chkobbaUtils';
import { createYanivState } from '@/lib/yanivUtils';
import { createRamiState } from '@/lib/ramiUtils';
import { createKalahState } from '@/lib/kalahUtils';
import { createBeloteState } from '@/lib/beloteUtils';
import { createBackgammonState } from '@/lib/backgammonUtils';
import { createSoccerStarsState } from '@/lib/soccerStarsUtils';
import { createGorillaState } from '@/lib/gorillasUtils';

/** État initial d'une partie, partagé par les modes solo et local (deux joueurs sur le même téléphone). */
export const createInitialGameState = (gameType: GameType): Record<string, unknown> => {
    switch (gameType) {
      case 'morpion': return { board: Array(9).fill(null) };
      case 'connect4': return { board: Array(42).fill(null) };
      case 'rps': return { player1Choice: null, player2Choice: null, rounds: [], currentRound: 1, bestOf: 3 };
      case 'othello': {
        const board: (string | null)[] = Array(64).fill(null);
        board[27] = 'white'; board[28] = 'black'; board[35] = 'black'; board[36] = 'white';
        return { board, currentColor: 'black' };
      }
      case 'chkobba': return createChkobbaState() as unknown as Record<string, unknown>;
      case 'yaniv': return createYanivState() as unknown as Record<string, unknown>;
      case 'rami': return createRamiState() as unknown as Record<string, unknown>;
      case 'awale': return createKalahState() as unknown as Record<string, unknown>;
      case 'belote': return createBeloteState() as unknown as Record<string, unknown>;
      case 'backgammon': return createBackgammonState() as unknown as Record<string, unknown>;
      case 'football': return createSoccerStarsState() as unknown as Record<string, unknown>;
      case 'gorillas': return createGorillaState() as unknown as Record<string, unknown>;
      case 'pendu': return { word: null, guessedLetters: [] };
      case 'dames': {
        const board: (string | null)[] = Array(100).fill(null);
        for (let row = 0; row < 4; row++) for (let col = 0; col < 10; col++) if ((row + col) % 2 === 1) board[row * 10 + col] = 'black';
        for (let row = 6; row < 10; row++) for (let col = 0; col < 10; col++) if ((row + col) % 2 === 1) board[row * 10 + col] = 'white';
        return { board, currentColor: 'white' };
      }
      case 'memory': {
        const emojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯'];
        const cards: unknown[] = [];
        emojis.forEach((emoji, idx) => {
          cards.push({ id: idx * 2, emoji, flipped: false, matched: false });
          cards.push({ id: idx * 2 + 1, emoji, flipped: false, matched: false });
        });
        for (let i = cards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        return { cards, flippedIndices: [], memoryScores: { player1: 0, player2: 0 } };
      }
      case 'battleship': return {
        player1Grid: [], player2Grid: [],
        player1Ships: [], player2Ships: [],
        player1Ready: false, player2Ready: false,
        phase: 'placement',
      };
      default: return {};
    }
};
