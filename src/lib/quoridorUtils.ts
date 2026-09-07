// Quoridor : plateau 9x9, chaque joueur a 10 murs. Déplace ton pion vers la
// ligne adverse, ou pose un mur pour ralentir l'adversaire (sans jamais
// bloquer complètement un chemin). Structure calquée sur les autres
// lib/*Utils.ts du projet (createXState / playXMove / xAI).

export type QuoridorPlayer = 'player1' | 'player2';
export interface QuoridorPosition { row: number; col: number }
export type WallOrientation = 'h' | 'v';
export interface QuoridorWall { row: number; col: number; orientation: WallOrientation } // intersections 0..7

export interface QuoridorState {
  pawns: Record<QuoridorPlayer, QuoridorPosition>;
  wallsLeft: Record<QuoridorPlayer, number>;
  walls: QuoridorWall[];
  turn: QuoridorPlayer;
}

export const BOARD_SIZE = 9;
const WALLS_PER_PLAYER = 10;

const goalRow = (player: QuoridorPlayer) => (player === 'player1' ? 0 : BOARD_SIZE - 1);
const opponentOf = (player: QuoridorPlayer): QuoridorPlayer => (player === 'player1' ? 'player2' : 'player1');

export const createQuoridorState = (): QuoridorState => ({
  pawns: {
    player1: { row: BOARD_SIZE - 1, col: 4 },
    player2: { row: 0, col: 4 },
  },
  wallsLeft: { player1: WALLS_PER_PLAYER, player2: WALLS_PER_PLAYER },
  walls: [],
  turn: 'player1',
});

const inBounds = (r: number, c: number) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;

/** Un mur horizontal à l'intersection (r,c) bloque les arêtes verticales sous les colonnes c et c+1. */
const buildBlockedEdges = (walls: QuoridorWall[]) => {
  const blockedH: boolean[][] = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false)); // entre (r,c) et (r+1,c)
  const blockedV: boolean[][] = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false)); // entre (r,c) et (r,c+1)
  for (const w of walls) {
    if (w.orientation === 'h') {
      blockedH[w.row][w.col] = true;
      blockedH[w.row][w.col + 1] = true;
    } else {
      blockedV[w.row][w.col] = true;
      blockedV[w.row + 1][w.col] = true;
    }
  }
  return { blockedH, blockedV };
};

const canStep = (blockedH: boolean[][], blockedV: boolean[][], from: QuoridorPosition, to: QuoridorPosition): boolean => {
  if (!inBounds(to.row, to.col)) return false;
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  if (dr === 1 && dc === 0) return !blockedH[from.row][from.col];
  if (dr === -1 && dc === 0) return !blockedH[to.row][to.col];
  if (dc === 1 && dr === 0) return !blockedV[from.row][from.col];
  if (dc === -1 && dr === 0) return !blockedV[to.row][to.col];
  return false;
};

/** Coups légaux pour le pion de `player` (déplacement simple ou saut par-dessus l'adversaire). */
export const legalPawnMoves = (state: QuoridorState, player: QuoridorPlayer): QuoridorPosition[] => {
  const { blockedH, blockedV } = buildBlockedEdges(state.walls);
  const from = state.pawns[player];
  const opponent = state.pawns[opponentOf(player)];
  const directions = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
  const moves: QuoridorPosition[] = [];

  for (const { dr, dc } of directions) {
    const step1 = { row: from.row + dr, col: from.col + dc };
    if (!canStep(blockedH, blockedV, from, step1)) continue;

    const isOpponentThere = step1.row === opponent.row && step1.col === opponent.col;
    if (!isOpponentThere) {
      moves.push(step1);
      continue;
    }

    // Saut tout droit par-dessus l'adversaire
    const step2 = { row: step1.row + dr, col: step1.col + dc };
    if (canStep(blockedH, blockedV, step1, step2)) {
      moves.push(step2);
      continue;
    }

    // Saut diagonal si le saut tout droit est bloqué (mur ou bord)
    const perpendicular = dr === 0 ? [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }] : [{ dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
    for (const p of perpendicular) {
      const diag = { row: step1.row + p.dr, col: step1.col + p.dc };
      if (canStep(blockedH, blockedV, step1, diag)) moves.push(diag);
    }
  }

  return moves;
};

/** BFS : distance la plus courte du pion de `player` jusqu'à sa ligne d'arrivée (ignore l'adversaire). */
const shortestPathLength = (walls: QuoridorWall[], start: QuoridorPosition, player: QuoridorPlayer): number => {
  const { blockedH, blockedV } = buildBlockedEdges(walls);
  const target = goalRow(player);
  const visited = new Set<string>([`${start.row},${start.col}`]);
  let frontier: QuoridorPosition[] = [start];
  let dist = 0;
  while (frontier.length > 0) {
    if (frontier.some(p => p.row === target)) return dist;
    const next: QuoridorPosition[] = [];
    for (const pos of frontier) {
      const dirs = [{ row: pos.row - 1, col: pos.col }, { row: pos.row + 1, col: pos.col }, { row: pos.row, col: pos.col - 1 }, { row: pos.row, col: pos.col + 1 }];
      for (const to of dirs) {
        const key = `${to.row},${to.col}`;
        if (!visited.has(key) && canStep(blockedH, blockedV, pos, to)) {
          visited.add(key);
          next.push(to);
        }
      }
    }
    frontier = next;
    dist++;
  }
  return Infinity; // pas de chemin
};

const wallOverlaps = (walls: QuoridorWall[], wall: QuoridorWall): boolean => {
  for (const w of walls) {
    if (w.row === wall.row && w.col === wall.col) return true; // même intersection
    if (w.orientation === wall.orientation) {
      if (wall.orientation === 'h' && w.row === wall.row && Math.abs(w.col - wall.col) === 1) return true;
      if (wall.orientation === 'v' && w.col === wall.col && Math.abs(w.row - wall.row) === 1) return true;
    }
  }
  return false;
};

export const isValidWallPlacement = (state: QuoridorState, player: QuoridorPlayer, wall: QuoridorWall): boolean => {
  if (state.wallsLeft[player] <= 0) return false;
  if (wall.row < 0 || wall.row > BOARD_SIZE - 2 || wall.col < 0 || wall.col > BOARD_SIZE - 2) return false;
  if (wallOverlaps(state.walls, wall)) return false;
  const newWalls = [...state.walls, wall];
  // Un mur ne doit jamais couper complètement le chemin d'un des deux joueurs vers son but.
  if (shortestPathLength(newWalls, state.pawns.player1, 'player1') === Infinity) return false;
  if (shortestPathLength(newWalls, state.pawns.player2, 'player2') === Infinity) return false;
  return true;
};

export interface QuoridorTurnResult {
  state: QuoridorState;
  nextPlayer: QuoridorPlayer;
  finished: boolean;
  winner?: QuoridorPlayer;
}

export const playQuoridorMove = (state: QuoridorState, player: QuoridorPlayer, to: QuoridorPosition): QuoridorTurnResult => {
  if (state.turn !== player) return { state, nextPlayer: state.turn, finished: false };
  const legal = legalPawnMoves(state, player);
  if (!legal.some(m => m.row === to.row && m.col === to.col)) return { state, nextPlayer: state.turn, finished: false };

  const pawns = { ...state.pawns, [player]: to };
  const finished = to.row === goalRow(player);
  const nextState: QuoridorState = { ...state, pawns, turn: opponentOf(player) };

  if (finished) return { state: nextState, nextPlayer: opponentOf(player), finished: true, winner: player };
  return { state: nextState, nextPlayer: opponentOf(player), finished: false };
};

export const playQuoridorWall = (state: QuoridorState, player: QuoridorPlayer, wall: QuoridorWall): QuoridorTurnResult => {
  if (state.turn !== player) return { state, nextPlayer: state.turn, finished: false };
  if (!isValidWallPlacement(state, player, wall)) return { state, nextPlayer: state.turn, finished: false };

  const nextState: QuoridorState = {
    ...state,
    walls: [...state.walls, wall],
    wallsLeft: { ...state.wallsLeft, [player]: state.wallsLeft[player] - 1 },
    turn: opponentOf(player),
  };
  return { state: nextState, nextPlayer: opponentOf(player), finished: false };
};

// ---------------------------------------------------------------------------
// IA simple : avance sur le plus court chemin, pose parfois un mur si ça
// ralentit l'adversaire nettement plus que ça ne la ralentit elle-même.

export type QuoridorAIAction = { type: 'move'; to: QuoridorPosition } | { type: 'wall'; wall: QuoridorWall };

export const quoridorAI = (state: QuoridorState, player: QuoridorPlayer): QuoridorAIAction => {
  const opponent = opponentOf(player);
  const myDist = shortestPathLength(state.walls, state.pawns[player], player);
  const oppDist = shortestPathLength(state.walls, state.pawns[opponent], opponent);

  if (state.wallsLeft[player] > 0 && Math.random() < 0.35) {
    let best: { wall: QuoridorWall; gain: number } | null = null;
    for (let i = 0; i < 25; i++) {
      const wall: QuoridorWall = {
        row: Math.floor(Math.random() * (BOARD_SIZE - 1)),
        col: Math.floor(Math.random() * (BOARD_SIZE - 1)),
        orientation: Math.random() < 0.5 ? 'h' : 'v',
      };
      if (!isValidWallPlacement(state, player, wall)) continue;
      const newWalls = [...state.walls, wall];
      const newOppDist = shortestPathLength(newWalls, state.pawns[opponent], opponent);
      const newMyDist = shortestPathLength(newWalls, state.pawns[player], player);
      const gain = (newOppDist - oppDist) - (newMyDist - myDist);
      if (gain > 0 && (!best || gain > best.gain)) best = { wall, gain };
    }
    if (best) return { type: 'wall', wall: best.wall };
  }

  const moves = legalPawnMoves(state, player);
  let bestMove = moves[0];
  let bestDist = Infinity;
  for (const m of moves) {
    const d = shortestPathLength(state.walls, m, player);
    if (d < bestDist) { bestDist = d; bestMove = m; }
  }
  return { type: 'move', to: bestMove };
};
