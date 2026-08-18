// Foot tactique — plateau en grille, chacun son tour : déplace tes joueurs (2 cases max chacun),
// puis passe ou tire (8 directions, ligne droite jusqu'à un joueur ou le bord). Un adversaire sur
// la trajectoire intercepte/bloque. Tir qui atteint exactement la cage adverse sans obstacle = but.

export type FootPlayer = 'player1' | 'player2';
export interface FootToken { id: string; row: number; col: number }
export interface BallPos { row: number; col: number }

export interface FootballState {
  players: Record<FootPlayer, FootToken[]>;
  ball: BallPos;
  scores: Record<FootPlayer, number>;
  turnsPlayed: number;
  movedThisTurn: Record<string, number>; // tokenId -> cases déjà utilisées ce tour
  lastAction: { type: 'move' | 'pass' | 'intercept' | 'shoot' | 'block' | 'goal' | 'kickoff'; player: FootPlayer } | null;
}

export const ROWS = 5;
export const COLS = 9;
export const GOAL_ROWS = [1, 2, 3];
export const MAX_MOVE_PER_TOKEN = 2;
export const TARGET_GOALS = 3;
export const MAX_TURNS = 60;

export const SHOOT_RANGE = 3; // colonnes max entre le porteur et la cage adverse pour pouvoir tirer

const HOME_COL: Record<FootPlayer, number> = { player1: 2, player2: 6 };
const opponentOf = (player: FootPlayer): FootPlayer => (player === 'player1' ? 'player2' : 'player1');

const createKickoff = (kickoffTeam: FootPlayer): { players: Record<FootPlayer, FootToken[]>; ball: BallPos } => {
  const other = opponentOf(kickoffTeam);
  const ownGoalCol: Record<FootPlayer, number> = { player1: 0, player2: COLS - 1 };
  const kickoffPlayers: FootToken[] = [
    { id: `${kickoffTeam}-0`, row: 2, col: 4 },
    { id: `${kickoffTeam}-1`, row: 0, col: HOME_COL[kickoffTeam] },
    { id: `${kickoffTeam}-2`, row: 4, col: HOME_COL[kickoffTeam] },
    { id: `${kickoffTeam}-gk`, row: 2, col: ownGoalCol[kickoffTeam] },
  ];
  const otherPlayers: FootToken[] = [
    { id: `${other}-0`, row: 2, col: HOME_COL[other] },
    { id: `${other}-1`, row: 0, col: HOME_COL[other] },
    { id: `${other}-2`, row: 4, col: HOME_COL[other] },
    { id: `${other}-gk`, row: 2, col: ownGoalCol[other] },
  ];
  return {
    players: { [kickoffTeam]: kickoffPlayers, [other]: otherPlayers } as Record<FootPlayer, FootToken[]>,
    ball: { row: 2, col: 4 },
  };
};

export const isGoalkeeper = (tokenId: string): boolean => tokenId.endsWith('-gk');

export const createFootballState = (): FootballState => ({
  ...createKickoff('player1'),
  scores: { player1: 0, player2: 0 },
  turnsPlayed: 0,
  movedThisTurn: {},
  lastAction: null,
});

const getTokenOwnerAt = (players: Record<FootPlayer, FootToken[]>, row: number, col: number): FootPlayer | null => {
  if (players.player1.some(t => t.row === row && t.col === col)) return 'player1';
  if (players.player2.some(t => t.row === row && t.col === col)) return 'player2';
  return null;
};

export const getCarrier = (state: FootballState): FootPlayer | null =>
  getTokenOwnerAt(state.players, state.ball.row, state.ball.col);

export const endTurn = (state: FootballState): FootballState => ({ ...state, movedThisTurn: {} });

export interface MoveResult { state: FootballState; ok: boolean }

export const moveToken = (
  state: FootballState,
  player: FootPlayer,
  tokenId: string,
  path: { row: number; col: number }[],
): MoveResult => {
  const token = state.players[player].find(t => t.id === tokenId);
  if (!token || path.length === 0) return { state, ok: false };

  const already = state.movedThisTurn[tokenId] || 0;
  if (already + path.length > MAX_MOVE_PER_TOKEN) return { state, ok: false };

  let cur = { row: token.row, col: token.col };
  for (const step of path) {
    const dr = step.row - cur.row;
    const dc = step.col - cur.col;
    if (Math.abs(dr) + Math.abs(dc) !== 1) return { state, ok: false };
    if (step.row < 0 || step.row >= ROWS || step.col < 0 || step.col >= COLS) return { state, ok: false };
    if (getTokenOwnerAt(state.players, step.row, step.col)) return { state, ok: false };
    cur = step;
  }

  const wasCarrier = state.ball.row === token.row && state.ball.col === token.col;
  const players = {
    ...state.players,
    [player]: state.players[player].map(t => (t.id === tokenId ? { ...t, row: cur.row, col: cur.col } : t)),
  };
  const ball = wasCarrier ? { row: cur.row, col: cur.col } : state.ball;
  const movedThisTurn = { ...state.movedThisTurn, [tokenId]: already + path.length };

  return {
    state: { ...state, players, ball, movedThisTurn, lastAction: { type: 'move', player } },
    ok: true,
  };
};

const DIRECTIONS: [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1],
];
export const DIRECTION_LABELS: Record<string, [number, number]> = {
  N: [-1, 0], S: [1, 0], O: [0, -1], E: [0, 1],
  NO: [-1, -1], NE: [-1, 1], SO: [1, -1], SE: [1, 1],
};

const traceLine = (state: FootballState, row: number, col: number, dr: number, dc: number) => {
  let r = row;
  let c = col;
  while (true) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return { row: r, col: c, hitPlayer: null as FootPlayer | null };
    const owner = getTokenOwnerAt(state.players, nr, nc);
    if (owner) return { row: nr, col: nc, hitPlayer: owner };
    r = nr; c = nc;
  }
};

export type BallActionResult =
  | { ok: true; state: FootballState; result: 'pass_completed' | 'intercepted' | 'out_of_play' }
  | { ok: false; state: FootballState };

export const playPass = (state: FootballState, player: FootPlayer, dr: number, dc: number): BallActionResult => {
  if (getCarrier(state) !== player) return { ok: false, state };
  const trace = traceLine(state, state.ball.row, state.ball.col, dr, dc);
  const ball = { row: trace.row, col: trace.col };
  const result = trace.hitPlayer === player ? 'pass_completed' : trace.hitPlayer ? 'intercepted' : 'out_of_play';
  return {
    ok: true,
    result,
    state: { ...state, ball, lastAction: { type: result === 'intercepted' ? 'intercept' : 'pass', player } },
  };
};

export type ShootResult =
  | { ok: true; state: FootballState; result: 'goal' | 'blocked' | 'miss' }
  | { ok: false; state: FootballState };

export const playShoot = (state: FootballState, player: FootPlayer, dr: number, dc: number): ShootResult => {
  if (getCarrier(state) !== player) return { ok: false, state };
  const opponentGoalCol = player === 'player1' ? COLS - 1 : 0;
  if (Math.abs(state.ball.col - opponentGoalCol) > SHOOT_RANGE) return { ok: false, state }; // trop loin pour tirer
  const trace = traceLine(state, state.ball.row, state.ball.col, dr, dc);

  if (trace.hitPlayer && trace.hitPlayer !== player) {
    return { ok: true, result: 'blocked', state: { ...state, ball: { row: trace.row, col: trace.col }, lastAction: { type: 'block', player } } };
  }
  if (!trace.hitPlayer && trace.col === opponentGoalCol && GOAL_ROWS.includes(trace.row)) {
    return { ok: true, result: 'goal', state: { ...state, lastAction: { type: 'goal', player } } };
  }
  return { ok: true, result: 'miss', state: { ...state, ball: { row: trace.row, col: trace.col }, lastAction: { type: 'shoot', player } } };
};

/** Réinitialise pour l'engagement suivant après un but ; le camp qui a encaissé engage. */
export const kickoffAfterGoal = (state: FootballState, scoringTeam: FootPlayer): FootballState => {
  const scores = { ...state.scores, [scoringTeam]: state.scores[scoringTeam] + 1 };
  const layout = createKickoff(opponentOf(scoringTeam));
  return { ...layout, scores, turnsPlayed: state.turnsPlayed, movedThisTurn: {}, lastAction: { type: 'kickoff', player: opponentOf(scoringTeam) } };
};

export const legalMoveCells = (state: FootballState, player: FootPlayer, tokenId: string): { row: number; col: number }[] => {
  const token = state.players[player].find(t => t.id === tokenId);
  if (!token) return [];
  const budget = MAX_MOVE_PER_TOKEN - (state.movedThisTurn[tokenId] || 0);
  if (budget <= 0) return [];

  const results: { row: number; col: number }[] = [];
  const seen = new Set<string>();
  const queue: { row: number; col: number; steps: number }[] = [{ row: token.row, col: token.col, steps: 0 }];
  seen.add(`${token.row},${token.col}`);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.steps >= budget) continue;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
      const nr = cur.row + dr;
      const nc = cur.col + dc;
      const key = `${nr},${nc}`;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || seen.has(key)) continue;
      if (getTokenOwnerAt(state.players, nr, nc)) continue;
      seen.add(key);
      results.push({ row: nr, col: nc });
      queue.push({ row: nr, col: nc, steps: cur.steps + 1 });
    }
  }
  return results;
};

// ---------------------------------------------------------------------------
// IA simple

export const bfsPathTo = (state: FootballState, from: { row: number; col: number }, to: { row: number; col: number }, maxSteps: number): { row: number; col: number }[] | null => {
  if (from.row === to.row && from.col === to.col) return [];
  const visited = new Set<string>([`${from.row},${from.col}`]);
  const queue: { row: number; col: number; path: { row: number; col: number }[] }[] = [{ ...from, path: [] }];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.path.length >= maxSteps) continue;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
      const nr = cur.row + dr;
      const nc = cur.col + dc;
      const key = `${nr},${nc}`;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || visited.has(key)) continue;
      if (getTokenOwnerAt(state.players, nr, nc)) continue;
      const path = [...cur.path, { row: nr, col: nc }];
      if (nr === to.row && nc === to.col) return path;
      visited.add(key);
      queue.push({ row: nr, col: nc, path });
    }
  }
  return null;
};

export interface FootballAIPlan {
  moves: { tokenId: string; path: { row: number; col: number }[] }[];
  ballAction: { type: 'pass' | 'shoot'; dr: number; dc: number } | null;
}

const bestReachableCellToward = (
  state: FootballState,
  player: FootPlayer,
  tokenId: string,
  target: { row: number; col: number },
): { row: number; col: number } | null => {
  const cells = legalMoveCells(state, player, tokenId);
  if (cells.length === 0) return null;
  let best = cells[0];
  let bestDist = Math.abs(best.row - target.row) + Math.abs(best.col - target.col);
  for (const cell of cells) {
    const dist = Math.abs(cell.row - target.row) + Math.abs(cell.col - target.col);
    if (dist < bestDist) { best = cell; bestDist = dist; }
  }
  return best;
};

export const footballAI = (state: FootballState, player: FootPlayer): FootballAIPlan => {
  const opponent = opponentOf(player);
  const carrier = getCarrier(state);
  const moves: FootballAIPlan['moves'] = [];
  const opponentGoalCol = player === 'player1' ? COLS - 1 : 0;
  const ownGoalCol = player === 'player1' ? 0 : COLS - 1;

  // Repositionne le gardien verticalement pour suivre le ballon, sans quitter sa colonne
  const keeper = state.players[player].find(t => isGoalkeeper(t.id));
  if (keeper && keeper.col === ownGoalCol) {
    const targetRow = Math.min(Math.max(state.ball.row, GOAL_ROWS[0]), GOAL_ROWS[GOAL_ROWS.length - 1]);
    if (targetRow !== keeper.row) {
      const dir = targetRow > keeper.row ? 1 : -1;
      const steps = Math.min(Math.abs(targetRow - keeper.row), MAX_MOVE_PER_TOKEN);
      const path: { row: number; col: number }[] = [];
      let r = keeper.row;
      let blocked = false;
      for (let i = 0; i < steps; i++) {
        r += dir;
        if (getTokenOwnerAt(state.players, r, ownGoalCol)) { blocked = true; break; }
        path.push({ row: r, col: ownGoalCol });
      }
      if (!blocked && path.length > 0) moves.push({ tokenId: keeper.id, path });
    }
  }

  if (carrier === player) {
    const carrierToken = state.players[player].find(t => t.row === state.ball.row && t.col === state.ball.col)!;

    // Tir si à portée, aligné avec la cage adverse et couloir dégagé
    const inRange = Math.abs(carrierToken.col - opponentGoalCol) <= SHOOT_RANGE;
    if (inRange && GOAL_ROWS.includes(carrierToken.row)) {
      const dc = player === 'player1' ? 1 : -1;
      const trace = traceLine(state, carrierToken.row, carrierToken.col, 0, dc);
      if (!trace.hitPlayer && trace.col === opponentGoalCol) {
        return { moves, ballAction: { type: 'shoot', dr: 0, dc } };
      }
    }

    // Sinon, tente une passe vers le coéquipier le plus avancé, dégagée
    const teammates = state.players[player].filter(t => t.id !== carrierToken.id && !isGoalkeeper(t.id));
    let bestPass: { dr: number; dc: number; advance: number } | null = null;
    for (const mate of teammates) {
      const dr0 = mate.row - carrierToken.row;
      const dc0 = mate.col - carrierToken.col;
      const steps = Math.max(Math.abs(dr0), Math.abs(dc0));
      if (steps === 0) continue;
      const isLine = dr0 === 0 || dc0 === 0 || Math.abs(dr0) === Math.abs(dc0);
      if (!isLine) continue;
      const dr = Math.sign(dr0);
      const dc = Math.sign(dc0);
      const trace = traceLine(state, carrierToken.row, carrierToken.col, dr, dc);
      if (trace.hitPlayer === player && trace.row === mate.row && trace.col === mate.col) {
        const advance = player === 'player1' ? mate.col - carrierToken.col : carrierToken.col - mate.col;
        if (advance > 0 && (!bestPass || advance > bestPass.advance)) bestPass = { dr, dc, advance };
      }
    }
    if (bestPass) return { moves, ballAction: { type: 'pass', dr: bestPass.dr, dc: bestPass.dc } };

    // Sinon, dribble vers la case atteignable la plus proche de la cage adverse
    const targetRow = GOAL_ROWS.includes(carrierToken.row) ? carrierToken.row : GOAL_ROWS[1];
    const dest = bestReachableCellToward(state, player, carrierToken.id, { row: targetRow, col: opponentGoalCol });
    if (dest) {
      const path = bfsPathTo(state, carrierToken, dest, MAX_MOVE_PER_TOKEN);
      if (path && path.length > 0) moves.push({ tokenId: carrierToken.id, path });
    }
    return { moves, ballAction: null };
  }

  // Pas de ballon : rapproche le joueur de champ le plus proche (hors gardien)
  const fieldTokens = state.players[player].filter(t => !isGoalkeeper(t.id));
  const sorted = [...fieldTokens].sort((a, b) =>
    (Math.abs(a.row - state.ball.row) + Math.abs(a.col - state.ball.col)) -
    (Math.abs(b.row - state.ball.row) + Math.abs(b.col - state.ball.col)));
  const closest = sorted[0];
  if (closest) {
    const dest = bestReachableCellToward(state, player, closest.id, state.ball);
    if (dest) {
      const path = bfsPathTo(state, closest, dest, MAX_MOVE_PER_TOKEN);
      if (path && path.length > 0) moves.push({ tokenId: closest.id, path });
    }
  }

  void opponent;
  return { moves, ballAction: null };
};
