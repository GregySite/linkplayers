// Foot tactique v2 — inspiré de Diaballik (jeu de stratégie abstrait) : le porteur du ballon
// NE PEUT PAS se déplacer (comme au handball), il doit obligatoirement passer pour avancer.
// Ça élimine le dribble en boucle infinie et force un vrai jeu de position/passes.
//
// Chaque tour : jusqu'à 3 actions, dans l'ordre de ton choix — 2 déplacements d'une case
// (orthogonaux, jamais le porteur du ballon) + 1 action ballon (passe, tir, ou tacle si tu es
// adjacent au porteur adverse). Le tacle permet de reprendre activement le ballon.

export type FootPlayer = 'player1' | 'player2';
export interface FootToken { id: string; row: number; col: number }
export interface BallPos { row: number; col: number }

export interface FootballState {
  players: Record<FootPlayer, FootToken[]>;
  ball: BallPos;
  scores: Record<FootPlayer, number>;
  turnsPlayed: number;
  movesUsed: number; // 0-2 déplacements déjà faits ce tour
  ballActionUsed: boolean; // passe/tir/tacle déjà fait ce tour (1 max)
  tackleCooldown: FootPlayer | null; // ce camp ne peut pas tacler ce tour (vient de se faire tacler)
  lastAction: { type: 'move' | 'pass' | 'intercept' | 'shoot' | 'block' | 'goal' | 'tackle' | 'kickoff'; player: FootPlayer } | null;
}

export const ROWS = 5;
export const COLS = 9;
export const GOAL_ROWS = [1, 2, 3];
export const MAX_MOVES_PER_TURN = 2;
export const SHOOT_RANGE = 3;
export const TARGET_GOALS = 3;
export const MAX_TURNS = 80;

const HOME_COL: Record<FootPlayer, number> = { player1: 2, player2: 6 };
const opponentOf = (player: FootPlayer): FootPlayer => (player === 'player1' ? 'player2' : 'player1');

const createKickoff = (kickoffTeam: FootPlayer): { players: Record<FootPlayer, FootToken[]>; ball: BallPos } => {
  const other = opponentOf(kickoffTeam);
  const ownGoalCol: Record<FootPlayer, number> = { player1: 0, player2: COLS - 1 };
  const forwardDir = kickoffTeam === 'player1' ? 1 : -1;
  const wingCol = 4 + forwardDir * 2; // diagonale exactement alignée avec le centre, orientée vers l'avant
  const kickoffPlayers: FootToken[] = [
    { id: `${kickoffTeam}-0`, row: 2, col: 4 },
    { id: `${kickoffTeam}-1`, row: 0, col: wingCol },
    { id: `${kickoffTeam}-2`, row: 4, col: wingCol },
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
  movesUsed: 0,
  ballActionUsed: false,
  tackleCooldown: null,
  lastAction: null,
});

const getTokenOwnerAt = (players: Record<FootPlayer, FootToken[]>, row: number, col: number): FootPlayer | null => {
  if (players.player1.some(t => t.row === row && t.col === col)) return 'player1';
  if (players.player2.some(t => t.row === row && t.col === col)) return 'player2';
  return null;
};

export const getCarrier = (state: FootballState): FootPlayer | null =>
  getTokenOwnerAt(state.players, state.ball.row, state.ball.col);

export const isBallCarrier = (state: FootballState, token: FootToken): boolean =>
  token.row === state.ball.row && token.col === state.ball.col;

/** Prêt pour le tour suivant : remet à zéro le compteur d'actions (appelé quand le tour change).
 * Si le joueur qui termine son tour sortait d'une protection anti-tacle, elle est levée. */
export const endTurn = (state: FootballState, actingPlayer: FootPlayer): FootballState => ({
  ...state,
  movesUsed: 0,
  ballActionUsed: false,
  tackleCooldown: state.tackleCooldown === actingPlayer ? null : state.tackleCooldown,
});

export interface MoveResult { state: FootballState; ok: boolean }

/** Déplacement d'UNE case, horizontal ou vertical uniquement (le porteur du ballon ne peut pas bouger). */
export const moveToken = (state: FootballState, player: FootPlayer, tokenId: string, dr: number, dc: number): MoveResult => {
  if (state.movesUsed >= MAX_MOVES_PER_TURN) return { state, ok: false };
  if (Math.abs(dr) + Math.abs(dc) !== 1) return { state, ok: false }; // un seul pas, orthogonal

  const token = state.players[player].find(t => t.id === tokenId);
  if (!token) return { state, ok: false };
  if (isBallCarrier(state, token)) return { state, ok: false }; // le porteur du ballon est figé

  const nr = token.row + dr;
  const nc = token.col + dc;
  if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return { state, ok: false };
  if (getTokenOwnerAt(state.players, nr, nc)) return { state, ok: false };

  const players = {
    ...state.players,
    [player]: state.players[player].map(t => (t.id === tokenId ? { ...t, row: nr, col: nc } : t)),
  };

  return {
    state: { ...state, players, movesUsed: state.movesUsed + 1, lastAction: { type: 'move', player } },
    ok: true,
  };
};

export const legalMoveDirections = (state: FootballState, player: FootPlayer, tokenId: string): { dr: number; dc: number }[] => {
  if (state.movesUsed >= MAX_MOVES_PER_TURN) return [];
  const token = state.players[player].find(t => t.id === tokenId);
  if (!token || isBallCarrier(state, token)) return [];

  const dirs: { dr: number; dc: number }[] = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
    const nr = token.row + dr;
    const nc = token.col + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
    if (getTokenOwnerAt(state.players, nr, nc)) continue;
    dirs.push({ dr, dc });
  }
  return dirs;
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
  if (state.ballActionUsed || getCarrier(state) !== player) return { ok: false, state };
  const trace = traceLine(state, state.ball.row, state.ball.col, dr, dc);
  const ball = { row: trace.row, col: trace.col };
  const result = trace.hitPlayer === player ? 'pass_completed' : trace.hitPlayer ? 'intercepted' : 'out_of_play';
  return {
    ok: true,
    result,
    state: { ...state, ball, ballActionUsed: true, lastAction: { type: result === 'intercepted' ? 'intercept' : 'pass', player } },
  };
};

export type ShootResult =
  | { ok: true; state: FootballState; result: 'goal' | 'blocked' | 'miss' }
  | { ok: false; state: FootballState };

export const playShoot = (state: FootballState, player: FootPlayer, dr: number, dc: number): ShootResult => {
  if (state.ballActionUsed || getCarrier(state) !== player) return { ok: false, state };
  const opponentGoalCol = player === 'player1' ? COLS - 1 : 0;
  if (Math.abs(state.ball.col - opponentGoalCol) > SHOOT_RANGE) return { ok: false, state };

  const trace = traceLine(state, state.ball.row, state.ball.col, dr, dc);

  if (trace.hitPlayer && trace.hitPlayer !== player) {
    return { ok: true, result: 'blocked', state: { ...state, ball: { row: trace.row, col: trace.col }, ballActionUsed: true, lastAction: { type: 'block', player } } };
  }
  if (!trace.hitPlayer && trace.col === opponentGoalCol && GOAL_ROWS.includes(trace.row)) {
    return { ok: true, result: 'goal', state: { ...state, ballActionUsed: true, lastAction: { type: 'goal', player } } };
  }
  return { ok: true, result: 'miss', state: { ...state, ball: { row: trace.row, col: trace.col }, ballActionUsed: true, lastAction: { type: 'shoot', player } } };
};

/** Un défenseur adjacent (8 directions) au porteur adverse peut lui reprendre le ballon,
 * sauf s'il vient tout juste de se le faire tacler (protection d'un tour). */
export const tacklableToken = (state: FootballState, player: FootPlayer): FootToken | null => {
  if (state.tackleCooldown === player) return null;
  const carrier = getCarrier(state);
  if (carrier !== opponentOf(player)) return null;
  const adjacent = state.players[player].find(t =>
    Math.max(Math.abs(t.row - state.ball.row), Math.abs(t.col - state.ball.col)) === 1
  );
  return adjacent ?? null;
};

export const playTackle = (state: FootballState, player: FootPlayer): MoveResult => {
  if (state.ballActionUsed) return { state, ok: false };
  const tackler = tacklableToken(state, player);
  if (!tackler) return { state, ok: false };
  return {
    ok: true,
    state: {
      ...state,
      ball: { row: tackler.row, col: tackler.col },
      ballActionUsed: true,
      tackleCooldown: opponentOf(player),
      lastAction: { type: 'tackle', player },
    },
  };
};

/** Réinitialise pour l'engagement suivant après un but ; le camp qui a encaissé engage. */
export const kickoffAfterGoal = (state: FootballState, scoringTeam: FootPlayer): FootballState => {
  const scores = { ...state.scores, [scoringTeam]: state.scores[scoringTeam] + 1 };
  const layout = createKickoff(opponentOf(scoringTeam));
  return {
    ...layout, scores, turnsPlayed: state.turnsPlayed, movesUsed: 0, ballActionUsed: false, tackleCooldown: null,
    lastAction: { type: 'kickoff', player: opponentOf(scoringTeam) },
  };
};

// ---------------------------------------------------------------------------
// IA — planification pas-à-pas : simule localement chaque action avant de choisir
// la suivante, pour enchaîner intelligemment déplacements + passe/tir/tacle.

export interface FootballAIPlan {
  moves: { tokenId: string; dr: number; dc: number }[];
  ballAction: { type: 'pass' | 'shoot' | 'tackle'; dr?: number; dc?: number } | null;
}

const findForwardPass = (state: FootballState, player: FootPlayer, carrierToken: FootToken) => {
  const teammates = state.players[player].filter(t => t.id !== carrierToken.id);
  let best: { dr: number; dc: number; advance: number } | null = null;
  for (const mate of teammates) {
    const dr0 = mate.row - carrierToken.row;
    const dc0 = mate.col - carrierToken.col;
    if (dr0 === 0 && dc0 === 0) continue;
    const isLine = dr0 === 0 || dc0 === 0 || Math.abs(dr0) === Math.abs(dc0);
    if (!isLine) continue;
    const dr = Math.sign(dr0);
    const dc = Math.sign(dc0);
    const trace = traceLine(state, carrierToken.row, carrierToken.col, dr, dc);
    if (trace.hitPlayer === player && trace.row === mate.row && trace.col === mate.col) {
      const advance = player === 'player1' ? mate.col - carrierToken.col : carrierToken.col - mate.col;
      if (advance > 0 && (!best || advance > best.advance)) best = { dr, dc, advance };
    }
  }
  return best;
};

/** Choisit le meilleur déplacement d'une case, tous pions confondus, selon la situation. */
const pickBestSingleMove = (state: FootballState, player: FootPlayer): { tokenId: string; dr: number; dc: number } | null => {
  const opponentGoalCol = player === 'player1' ? COLS - 1 : 0;
  const ownGoalCol = player === 'player1' ? 0 : COLS - 1;
  const carrier = getCarrier(state);
  const iHaveBall = carrier === player;

  const candidates = state.players[player].filter(t => !isBallCarrier(state, t));
  let best: { tokenId: string; dr: number; dc: number; score: number } | null = null;

  for (const token of candidates) {
    const isKeeper = isGoalkeeper(token.id);
    for (const dir of legalMoveDirections(state, player, token.id)) {
      const nr = token.row + dir.dr;
      const nc = token.col + dir.dc;

      if (isKeeper && nc !== ownGoalCol) continue; // le gardien reste sur sa ligne

      const simulated: FootballState = {
        ...state,
        players: { ...state.players, [player]: state.players[player].map(t => (t.id === token.id ? { ...t, row: nr, col: nc } : t)) },
      };

      let score = 0;
      if (iHaveBall && !isKeeper) {
        const carrierToken = simulated.players[player].find(t => isBallCarrier(simulated, t))!;
        const pass = findForwardPass(simulated, player, carrierToken);
        if (pass) score += 50 + pass.advance;
        score += player === 'player1' ? nc * 0.5 : (COLS - 1 - nc) * 0.5;
        score -= Math.abs(nr - GOAL_ROWS[1]) * 0.2;
      } else if (isKeeper) {
        const targetRow = Math.min(Math.max(state.ball.row, GOAL_ROWS[0]), GOAL_ROWS[GOAL_ROWS.length - 1]);
        score -= Math.abs(nr - targetRow);
      } else {
        score -= (Math.abs(nr - state.ball.row) + Math.abs(nc - state.ball.col));
        if (Math.max(Math.abs(nr - state.ball.row), Math.abs(nc - state.ball.col)) === 1) score += 10; // future tacle possible
      }

      if (!best || score > best.score) best = { tokenId: token.id, dr: dir.dr, dc: dir.dc, score };
    }
  }

  return best;
};

export const footballAI = (state: FootballState, player: FootPlayer): FootballAIPlan => {
  let local = state;
  const moves: FootballAIPlan['moves'] = [];
  let ballAction: FootballAIPlan['ballAction'] = null;
  const opponentGoalCol = player === 'player1' ? COLS - 1 : 0;

  for (let slot = 0; slot < MAX_MOVES_PER_TURN + 1; slot++) {
    if (!ballAction) {
      if (tacklableToken(local, player)) {
        ballAction = { type: 'tackle' };
        const r = playTackle(local, player);
        if (r.ok) local = r.state;
        continue;
      }
      if (getCarrier(local) === player) {
        const carrierToken = local.players[player].find(t => isBallCarrier(local, t))!;
        const inRange = Math.abs(carrierToken.col - opponentGoalCol) <= SHOOT_RANGE;
        if (inRange && GOAL_ROWS.includes(carrierToken.row)) {
          const dc = player === 'player1' ? 1 : -1;
          const trace = traceLine(local, carrierToken.row, carrierToken.col, 0, dc);
          if (!trace.hitPlayer && trace.col === opponentGoalCol) {
            ballAction = { type: 'shoot', dr: 0, dc };
            const r = playShoot(local, player, 0, dc);
            if (r.ok) local = r.state;
            continue;
          }
        }
        const pass = findForwardPass(local, player, carrierToken);
        if (pass) {
          ballAction = { type: 'pass', dr: pass.dr, dc: pass.dc };
          const r = playPass(local, player, pass.dr, pass.dc);
          if (r.ok) local = r.state;
          continue;
        }
      }
    }

    if (moves.length >= MAX_MOVES_PER_TURN) break;
    const move = pickBestSingleMove(local, player);
    if (!move) break;
    moves.push({ tokenId: move.tokenId, dr: move.dr, dc: move.dc });
    const r = moveToken(local, player, move.tokenId, move.dr, move.dc);
    if (r.ok) local = r.state;
  }

  return { moves, ballAction };
};
