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

// Check if there's a winner in morpion
export const checkMorpionWinner = (board: (string | null)[]): string | null => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6], // diagonals
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
};

// Check if morpion is a draw
export const isMorpionDraw = (board: (string | null)[]): boolean => {
  return board.every(cell => cell !== null) && !checkMorpionWinner(board);
};

// Battleship types and utilities
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
