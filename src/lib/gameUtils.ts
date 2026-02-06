// Generate a random 4-character code (letters and numbers)
export const generateGameCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars like 0, O, 1, I
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Generate a unique player ID for this session
export const getOrCreatePlayerId = (): string => {
  const storageKey = 'duo_games_player_id';
  let playerId = localStorage.getItem(storageKey);
  if (!playerId) {
    playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, playerId);
  }
  return playerId;
};

// ==================== MORPION ====================

export const checkMorpionWinner = (board: (string | null)[]): string | null => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
};

export const isMorpionDraw = (board: (string | null)[]): boolean => {
  return board.every(cell => cell !== null) && !checkMorpionWinner(board);
};

// ==================== BATTLESHIP ====================

export interface BattleshipCell {
  hasShip: boolean;
  hit: boolean;
}

export interface BattleshipState {
  player1Grid: BattleshipCell[][];
  player2Grid: BattleshipCell[][];
  player1Ships: number[][];
  player2Ships: number[][];
  player1Ready: boolean;
  player2Ready: boolean;
  phase: 'placement' | 'playing' | 'finished';
}

export const createEmptyGrid = (): BattleshipCell[][] => {
  return Array(10).fill(null).map(() =>
    Array(10).fill(null).map(() => ({ hasShip: false, hit: false }))
  );
};

export const SHIPS = [
  { name: 'Porte-avions', size: 5 },
  { name: 'Croiseur', size: 4 },
  { name: 'Destroyer', size: 3 },
  { name: 'Sous-marin', size: 3 },
  { name: 'Patrouilleur', size: 2 },
];

export const canPlaceShip = (
  grid: BattleshipCell[][],
  row: number,
  col: number,
  size: number,
  horizontal: boolean
): boolean => {
  for (let i = 0; i < size; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    if (r >= 10 || c >= 10 || grid[r][c].hasShip) {
      return false;
    }
  }
  return true;
};

export const checkAllShipsSunk = (grid: BattleshipCell[][]): boolean => {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (grid[r][c].hasShip && !grid[r][c].hit) {
        return false;
      }
    }
  }
  return true;
};

// ==================== CONNECT 4 ====================

const CONNECT4_ROWS = 6;
const CONNECT4_COLS = 7;

export const createConnect4Board = (): (string | null)[] => {
  return Array(CONNECT4_ROWS * CONNECT4_COLS).fill(null);
};

// Find the lowest empty row in a column
export const getDropRow = (board: (string | null)[], col: number): number => {
  for (let row = CONNECT4_ROWS - 1; row >= 0; row--) {
    if (!board[row * CONNECT4_COLS + col]) {
      return row;
    }
  }
  return -1; // Column is full
};

export const checkConnect4Winner = (board: (string | null)[]): string | null => {
  // Check horizontal
  for (let r = 0; r < CONNECT4_ROWS; r++) {
    for (let c = 0; c <= CONNECT4_COLS - 4; c++) {
      const idx = r * CONNECT4_COLS + c;
      const cell = board[idx];
      if (cell && cell === board[idx + 1] && cell === board[idx + 2] && cell === board[idx + 3]) {
        return cell;
      }
    }
  }
  // Check vertical
  for (let r = 0; r <= CONNECT4_ROWS - 4; r++) {
    for (let c = 0; c < CONNECT4_COLS; c++) {
      const idx = r * CONNECT4_COLS + c;
      const cell = board[idx];
      if (cell && cell === board[idx + CONNECT4_COLS] && cell === board[idx + 2 * CONNECT4_COLS] && cell === board[idx + 3 * CONNECT4_COLS]) {
        return cell;
      }
    }
  }
  // Check diagonal down-right
  for (let r = 0; r <= CONNECT4_ROWS - 4; r++) {
    for (let c = 0; c <= CONNECT4_COLS - 4; c++) {
      const idx = r * CONNECT4_COLS + c;
      const cell = board[idx];
      if (cell && cell === board[idx + CONNECT4_COLS + 1] && cell === board[idx + 2 * (CONNECT4_COLS + 1)] && cell === board[idx + 3 * (CONNECT4_COLS + 1)]) {
        return cell;
      }
    }
  }
  // Check diagonal down-left
  for (let r = 0; r <= CONNECT4_ROWS - 4; r++) {
    for (let c = 3; c < CONNECT4_COLS; c++) {
      const idx = r * CONNECT4_COLS + c;
      const cell = board[idx];
      if (cell && cell === board[idx + CONNECT4_COLS - 1] && cell === board[idx + 2 * (CONNECT4_COLS - 1)] && cell === board[idx + 3 * (CONNECT4_COLS - 1)]) {
        return cell;
      }
    }
  }
  return null;
};

export const isConnect4Draw = (board: (string | null)[]): boolean => {
  return board.every(cell => cell !== null) && !checkConnect4Winner(board);
};

// ==================== RPS (Pierre-Papier-Ciseaux) ====================

export type RPSChoice = 'rock' | 'paper' | 'scissors';

export interface RPSRound {
  player1Choice: RPSChoice;
  player2Choice: RPSChoice;
  winner: 'player1' | 'player2' | 'draw';
}

export const determineRPSWinner = (p1: RPSChoice, p2: RPSChoice): 'player1' | 'player2' | 'draw' => {
  if (p1 === p2) return 'draw';
  if (
    (p1 === 'rock' && p2 === 'scissors') ||
    (p1 === 'paper' && p2 === 'rock') ||
    (p1 === 'scissors' && p2 === 'paper')
  ) {
    return 'player1';
  }
  return 'player2';
};

export const getRPSLabel = (choice: RPSChoice): string => {
  switch (choice) {
    case 'rock': return '🪨 Pierre';
    case 'paper': return '📄 Papier';
    case 'scissors': return '✂️ Ciseaux';
  }
};

export const getRPSEmoji = (choice: RPSChoice): string => {
  switch (choice) {
    case 'rock': return '🪨';
    case 'paper': return '📄';
    case 'scissors': return '✂️';
  }
};

// ==================== OTHELLO ====================

export type OthelloCell = 'black' | 'white' | null;

export const createOthelloBoard = (): OthelloCell[] => {
  const board: OthelloCell[] = Array(64).fill(null);
  // Initial 4 pieces in center
  board[27] = 'white'; // d4
  board[28] = 'black'; // e4
  board[35] = 'black'; // d5
  board[36] = 'white'; // e5
  return board;
};

const OTHELLO_DIRECTIONS = [
  -9, -8, -7,
  -1,      1,
   7,  8,  9,
];

export const getValidOthelloMoves = (board: OthelloCell[], currentColor: OthelloCell): number[] => {
  if (!currentColor) return [];
  const opponent = currentColor === 'black' ? 'white' : 'black';
  const validMoves: number[] = [];

  for (let i = 0; i < 64; i++) {
    if (board[i] !== null) continue;
    const row = Math.floor(i / 8);
    const col = i % 8;

    for (const dir of OTHELLO_DIRECTIONS) {
      let r = row + Math.floor(dir / 8 + (dir > 0 ? 0.5 : -0.5));
      let c = col + (dir % 8 || (dir > 0 ? 0 : 0));
      
      // Simpler approach: use explicit dr, dc
      const dr = dir === -9 || dir === -8 || dir === -7 ? -1 : dir === 7 || dir === 8 || dir === 9 ? 1 : 0;
      const dc = dir === -9 || dir === -1 || dir === 7 ? -1 : dir === -7 || dir === 1 || dir === 9 ? 1 : 0;
      
      let cr = row + dr;
      let cc = col + dc;
      let foundOpponent = false;

      while (cr >= 0 && cr < 8 && cc >= 0 && cc < 8) {
        const idx = cr * 8 + cc;
        if (board[idx] === opponent) {
          foundOpponent = true;
        } else if (board[idx] === currentColor) {
          if (foundOpponent) {
            validMoves.push(i);
          }
          break;
        } else {
          break;
        }
        cr += dr;
        cc += dc;
      }
      if (validMoves.includes(i)) break;
    }
  }
  return validMoves;
};

export const applyOthelloMove = (board: OthelloCell[], pos: number, color: OthelloCell): OthelloCell[] => {
  if (!color) return board;
  const newBoard = [...board];
  newBoard[pos] = color;
  const opponent = color === 'black' ? 'white' : 'black';
  const row = Math.floor(pos / 8);
  const col = pos % 8;

  for (const dir of OTHELLO_DIRECTIONS) {
    const dr = dir === -9 || dir === -8 || dir === -7 ? -1 : dir === 7 || dir === 8 || dir === 9 ? 1 : 0;
    const dc = dir === -9 || dir === -1 || dir === 7 ? -1 : dir === -7 || dir === 1 || dir === 9 ? 1 : 0;

    const toFlip: number[] = [];
    let cr = row + dr;
    let cc = col + dc;

    while (cr >= 0 && cr < 8 && cc >= 0 && cc < 8) {
      const idx = cr * 8 + cc;
      if (newBoard[idx] === opponent) {
        toFlip.push(idx);
      } else if (newBoard[idx] === color) {
        // Flip all opponent pieces in this direction
        for (const f of toFlip) {
          newBoard[f] = color;
        }
        break;
      } else {
        break;
      }
      cr += dr;
      cc += dc;
    }
  }
  return newBoard;
};

export const countOthelloPieces = (board: OthelloCell[]): { black: number; white: number } => {
  let black = 0, white = 0;
  for (const cell of board) {
    if (cell === 'black') black++;
    if (cell === 'white') white++;
  }
  return { black, white };
};

export const isOthelloGameOver = (board: OthelloCell[]): boolean => {
  return getValidOthelloMoves(board, 'black').length === 0 && getValidOthelloMoves(board, 'white').length === 0;
};
