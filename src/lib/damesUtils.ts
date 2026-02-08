// French Checkers (Dames) on 10x10 board
export type DamesPiece = 'white' | 'black' | 'whiteKing' | 'blackKing' | null;

export const createDamesBoard = (): DamesPiece[] => {
  const board: DamesPiece[] = Array(100).fill(null);
  // Place black pieces on rows 0-3 (dark squares)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 10; col++) {
      if ((row + col) % 2 === 1) {
        board[row * 10 + col] = 'black';
      }
    }
  }
  // Place white pieces on rows 6-9 (dark squares)
  for (let row = 6; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if ((row + col) % 2 === 1) {
        board[row * 10 + col] = 'white';
      }
    }
  }
  return board;
};

const isOwn = (piece: DamesPiece, color: 'white' | 'black'): boolean => {
  if (!piece) return false;
  if (color === 'white') return piece === 'white' || piece === 'whiteKing';
  return piece === 'black' || piece === 'blackKing';
};

const isOpponent = (piece: DamesPiece, color: 'white' | 'black'): boolean => {
  if (!piece) return false;
  return !isOwn(piece, color);
};

const isKing = (piece: DamesPiece): boolean => {
  return piece === 'whiteKing' || piece === 'blackKing';
};

export interface DamesMove {
  from: number;
  to: number;
  captures: number[]; // indices of captured pieces
  path: number[]; // full path for multi-captures
}

// Get all possible moves for a piece (including multi-captures)
const getPieceMoves = (board: DamesPiece[], pos: number, color: 'white' | 'black'): DamesMove[] => {
  const piece = board[pos];
  if (!piece || !isOwn(piece, color)) return [];
  
  const row = Math.floor(pos / 10);
  const col = pos % 10;
  const moves: DamesMove[] = [];
  const king = isKing(piece);
  
  // Capture moves (recursive for multi-captures)
  const captures = getCaptureMoves(board, pos, color, king, []);
  moves.push(...captures);
  
  // Simple moves (only if no captures available - captures are mandatory)
  if (captures.length === 0) {
    const dirs = king
      ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      : color === 'white'
        ? [[-1, -1], [-1, 1]] // white moves up
        : [[1, -1], [1, 1]]; // black moves down
    
    for (const [dr, dc] of dirs) {
      if (king) {
        // Kings can slide multiple squares
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < 10 && c >= 0 && c < 10) {
          const target = r * 10 + c;
          if (board[target] !== null) break;
          moves.push({ from: pos, to: target, captures: [], path: [pos, target] });
          r += dr;
          c += dc;
        }
      } else {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10) {
          const target = nr * 10 + nc;
          if (board[target] === null) {
            moves.push({ from: pos, to: target, captures: [], path: [pos, target] });
          }
        }
      }
    }
  }
  
  return moves;
};

const getCaptureMoves = (
  board: DamesPiece[],
  pos: number,
  color: 'white' | 'black',
  king: boolean,
  alreadyCaptured: number[]
): DamesMove[] => {
  const row = Math.floor(pos / 10);
  const col = pos % 10;
  const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const results: DamesMove[] = [];
  
  for (const [dr, dc] of dirs) {
    if (king) {
      // King captures: slide to find opponent, then land on any empty square after
      let r = row + dr;
      let c = col + dc;
      let capturedPos = -1;
      
      while (r >= 0 && r < 10 && c >= 0 && c < 10) {
        const idx = r * 10 + c;
        if (isOwn(board[idx], color)) break;
        if (isOpponent(board[idx], color)) {
          if (alreadyCaptured.includes(idx)) {
            r += dr;
            c += dc;
            continue;
          }
          if (capturedPos !== -1) break; // Can't jump over two opponents
          capturedPos = idx;
        } else if (capturedPos !== -1) {
          // Empty square after captured piece - valid landing
          const tempBoard = [...board];
          tempBoard[pos] = null;
          tempBoard[capturedPos] = null;
          tempBoard[idx] = board[pos];
          
          const newCaptured = [...alreadyCaptured, capturedPos];
          const further = getCaptureMoves(tempBoard, idx, color, true, newCaptured);
          
          if (further.length > 0) {
            for (const f of further) {
              results.push({
                from: pos,
                to: f.to,
                captures: [capturedPos, ...f.captures],
                path: [pos, idx, ...f.path.slice(1)],
              });
            }
          } else {
            results.push({
              from: pos,
              to: idx,
              captures: [capturedPos],
              path: [pos, idx],
            });
          }
        }
        r += dr;
        c += dc;
      }
    } else {
      // Regular piece captures
      const mr = row + dr;
      const mc = col + dc;
      const lr = row + 2 * dr;
      const lc = col + 2 * dc;
      
      if (lr >= 0 && lr < 10 && lc >= 0 && lc < 10) {
        const midIdx = mr * 10 + mc;
        const landIdx = lr * 10 + lc;
        
        if (
          isOpponent(board[midIdx], color) &&
          !alreadyCaptured.includes(midIdx) &&
          board[landIdx] === null
        ) {
          const tempBoard = [...board];
          tempBoard[pos] = null;
          tempBoard[midIdx] = null;
          tempBoard[landIdx] = board[pos];
          
          // Check for promotion
          if ((color === 'white' && lr === 0) || (color === 'black' && lr === 9)) {
            tempBoard[landIdx] = color === 'white' ? 'whiteKing' : 'blackKing';
          }
          
          const newCaptured = [...alreadyCaptured, midIdx];
          const isNowKing = isKing(tempBoard[landIdx]);
          const further = getCaptureMoves(tempBoard, landIdx, color, isNowKing, newCaptured);
          
          if (further.length > 0) {
            for (const f of further) {
              results.push({
                from: pos,
                to: f.to,
                captures: [midIdx, ...f.captures],
                path: [pos, landIdx, ...f.path.slice(1)],
              });
            }
          } else {
            results.push({
              from: pos,
              to: landIdx,
              captures: [midIdx],
              path: [pos, landIdx],
            });
          }
        }
      }
    }
  }
  
  return results;
};

// Get all valid moves for a color
export const getAllMoves = (board: DamesPiece[], color: 'white' | 'black'): DamesMove[] => {
  const allMoves: DamesMove[] = [];
  for (let i = 0; i < 100; i++) {
    if (isOwn(board[i], color)) {
      allMoves.push(...getPieceMoves(board, i, color));
    }
  }
  
  // If any captures exist, only capture moves are allowed (mandatory capture rule)
  const captures = allMoves.filter(m => m.captures.length > 0);
  if (captures.length > 0) {
    // Must take the longest capture sequence
    const maxCaptures = Math.max(...captures.map(c => c.captures.length));
    return captures.filter(c => c.captures.length === maxCaptures);
  }
  
  return allMoves;
};

// Apply a move to the board
export const applyDamesMove = (board: DamesPiece[], move: DamesMove): DamesPiece[] => {
  const newBoard = [...board];
  const piece = newBoard[move.from];
  newBoard[move.from] = null;
  
  // Remove captured pieces
  for (const cap of move.captures) {
    newBoard[cap] = null;
  }
  
  // Place piece (with possible promotion)
  const toRow = Math.floor(move.to / 10);
  if (piece === 'white' && toRow === 0) {
    newBoard[move.to] = 'whiteKing';
  } else if (piece === 'black' && toRow === 9) {
    newBoard[move.to] = 'blackKing';
  } else {
    newBoard[move.to] = piece;
  }
  
  return newBoard;
};

// Count pieces
export const countDamesPieces = (board: DamesPiece[]): { white: number; black: number } => {
  let white = 0, black = 0;
  for (const cell of board) {
    if (cell === 'white' || cell === 'whiteKing') white++;
    if (cell === 'black' || cell === 'blackKing') black++;
  }
  return { white, black };
};

// Check if game is over
export const isDamesGameOver = (board: DamesPiece[], currentColor: 'white' | 'black'): boolean => {
  return getAllMoves(board, currentColor).length === 0;
};
