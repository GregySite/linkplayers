/**
 * Solo mode AI logic for all game types.
 * Each function takes the current game state and returns the AI's move.
 */

import { GameType } from '@/hooks/useGame';
import {
  checkMorpionWinner, isMorpionDraw,
  getDropRow, checkConnect4Winner,
  RPSChoice,
  OthelloCell, getValidOthelloMoves, applyOthelloMove,
} from '@/lib/gameUtils';
import { DamesPiece, getAllMoves, applyDamesMove, DamesMove } from '@/lib/damesUtils';

// ==================== MORPION AI ====================

export function morpionAI(board: (string | null)[]): number {
  // Try to win
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      const test = [...board]; test[i] = 'O';
      if (checkMorpionWinner(test) === 'O') return i;
    }
  }
  // Block opponent
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      const test = [...board]; test[i] = 'X';
      if (checkMorpionWinner(test) === 'X') return i;
    }
  }

  // 30% chance of a random move (makes AI less predictable)
  const empty = board.map((c, i) => c === null ? i : -1).filter(i => i !== -1);
  if (Math.random() < 0.3 && empty.length > 0) {
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // Smart play: center, corners, edges — but shuffle within tiers
  const shuffle = <T,>(arr: T[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const tiers = [[4], shuffle([0, 2, 6, 8]), shuffle([1, 3, 5, 7])];
  for (const tier of tiers) {
    for (const i of tier) {
      if (!board[i]) return i;
    }
  }
  return board.findIndex(c => c === null);
}

// ==================== CONNECT4 AI ====================

export function connect4AI(board: (string | null)[]): number {
  // Try to win
  for (let col = 0; col < 7; col++) {
    const row = getDropRow(board, col);
    if (row === -1) continue;
    const test = [...board]; test[row * 7 + col] = 'yellow';
    if (checkConnect4Winner(test) === 'yellow') return col;
  }
  // Block opponent
  for (let col = 0; col < 7; col++) {
    const row = getDropRow(board, col);
    if (row === -1) continue;
    const test = [...board]; test[row * 7 + col] = 'red';
    if (checkConnect4Winner(test) === 'red') return col;
  }
  // Prefer center columns
  const preferred = [3, 2, 4, 1, 5, 0, 6];
  for (const col of preferred) {
    if (getDropRow(board, col) !== -1) return col;
  }
  return 0;
}

// ==================== RPS AI ====================

export function rpsAI(): RPSChoice {
  const choices: RPSChoice[] = ['rock', 'paper', 'scissors'];
  return choices[Math.floor(Math.random() * 3)];
}

// ==================== OTHELLO AI ====================

export function othelloAI(board: OthelloCell[], color: OthelloCell): number {
  const moves = getValidOthelloMoves(board, color);
  if (moves.length === 0) return -1;
  
  // Prefer corners > edges > other
  const corners = [0, 7, 56, 63];
  const edges = moves.filter(m => {
    const r = Math.floor(m / 8), c = m % 8;
    return r === 0 || r === 7 || c === 0 || c === 7;
  });

  for (const c of corners) {
    if (moves.includes(c)) return c;
  }
  if (edges.length > 0) return edges[0];

  // Pick move that flips the most
  let bestMove = moves[0];
  let bestFlips = 0;
  for (const move of moves) {
    const newBoard = applyOthelloMove(board, move, color);
    const flips = newBoard.filter((c, i) => c === color && board[i] !== color).length;
    if (flips > bestFlips) { bestFlips = flips; bestMove = move; }
  }
  return bestMove;
}

// ==================== DAMES AI ====================

export function damesAI(board: DamesPiece[], color: 'white' | 'black'): DamesMove | null {
  const moves = getAllMoves(board, color);
  if (moves.length === 0) return null;

  // Prefer captures (longer chains first)
  const captures = moves.filter(m => m.captures && m.captures.length > 0);
  if (captures.length > 0) {
    captures.sort((a, b) => (b.captures?.length || 0) - (a.captures?.length || 0));
    return captures[0];
  }

  // Random move
  return moves[Math.floor(Math.random() * moves.length)];
}

// ==================== MEMORY AI ====================

// Simple memory AI: remembers seen cards and tries to match
export class MemoryAI {
  private memory: Map<string, number[]> = new Map();

  reset() {
    this.memory.clear();
  }

  observe(index: number, emoji: string) {
    const indices = this.memory.get(emoji) || [];
    if (!indices.includes(index)) {
      indices.push(index);
      this.memory.set(emoji, indices);
    }
  }

  pickTwo(cards: { emoji: string; matched: boolean; flipped: boolean }[]): [number, number] {
    // Check if we know a matching pair
    for (const [emoji, indices] of this.memory.entries()) {
      const available = indices.filter(i => !cards[i].matched);
      if (available.length >= 2) {
        return [available[0], available[1]];
      }
    }

    // Pick random unmatched cards
    const unmatched = cards
      .map((c, i) => ({ ...c, i }))
      .filter(c => !c.matched);

    const first = unmatched[Math.floor(Math.random() * unmatched.length)];
    let second = unmatched.filter(c => c.i !== first.i)[Math.floor(Math.random() * (unmatched.length - 1))];
    if (!second) second = unmatched.find(c => c.i !== first.i)!;
    
    return [first.i, second.i];
  }
}

// ==================== BATTLESHIP AI ====================

export function battleshipAIShoot(grid: { hasShip: boolean; hit: boolean }[][]): [number, number] {
  // Find unhit cells adjacent to hits (hunt mode)
  const hits: [number, number][] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (grid[r][c].hit && grid[r][c].hasShip) hits.push([r, c]);
    }
  }

  for (const [hr, hc] of hits) {
    const neighbors: [number, number][] = [[hr-1,hc],[hr+1,hc],[hr,hc-1],[hr,hc+1]];
    for (const [nr, nc] of neighbors) {
      if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10 && !grid[nr][nc].hit) {
        return [nr, nc];
      }
    }
  }

  // Random unhit cell (checkerboard pattern for efficiency)
  const candidates: [number, number][] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (!grid[r][c].hit && (r + c) % 2 === 0) candidates.push([r, c]);
    }
  }
  if (candidates.length === 0) {
    // Fill in remaining
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (!grid[r][c].hit) candidates.push([r, c]);
      }
    }
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

// AI places ships randomly
export function battleshipAIPlaceShips(): { hasShip: boolean; hit: boolean }[][] {
  const grid: { hasShip: boolean; hit: boolean }[][] = Array(10).fill(null).map(() =>
    Array(10).fill(null).map(() => ({ hasShip: false, hit: false }))
  );
  const sizes = [5, 4, 3, 3, 2];

  for (const size of sizes) {
    let placed = false;
    while (!placed) {
      const horizontal = Math.random() > 0.5;
      const row = Math.floor(Math.random() * (horizontal ? 10 : 10 - size));
      const col = Math.floor(Math.random() * (horizontal ? 10 - size : 10));
      
      let canPlace = true;
      for (let i = 0; i < size; i++) {
        const r = horizontal ? row : row + i;
        const c = horizontal ? col + i : col;
        if (grid[r][c].hasShip) { canPlace = false; break; }
      }
      
      if (canPlace) {
        for (let i = 0; i < size; i++) {
          const r = horizontal ? row : row + i;
          const c = horizontal ? col + i : col;
          grid[r][c].hasShip = true;
        }
        placed = true;
      }
    }
  }
  return grid;
}

// ==================== PENDU AI ====================

const PENDU_WORDS = [
  'CHOCOLAT', 'PAPILLON', 'MAISON', 'SOLEIL', 'JARDIN', 'MUSIQUE',
  'BONHEUR', 'FROMAGE', 'FENETRE', 'CHATEAU', 'MONTAGNE', 'RIVIERE',
  'CUISINE', 'LUMIERE', 'BALEINE', 'TORTUE', 'GIRAFE', 'ELEPHANT',
  'REQUIN', 'DAUPHIN', 'VOITURE', 'BATEAU', 'VOYAGE', 'ETOILE',
  'NUAGE', 'FLEUR', 'ORANGE', 'FRAISE', 'CERISE', 'POMME',
];

export function penduAIPickWord(): string {
  return PENDU_WORDS[Math.floor(Math.random() * PENDU_WORDS.length)];
}

// AI guesses a letter based on French frequency
export function penduAIGuess(guessedLetters: string[]): string {
  const frequency = 'ESAINTRULODCMPGBVHFQYJXZKW'.split('');
  for (const letter of frequency) {
    if (!guessedLetters.includes(letter)) return letter;
  }
  return 'A';
}
