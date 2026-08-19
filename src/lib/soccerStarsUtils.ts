// Foot à la Soccer Stars — palets qu'on vise et qu'on tire (physique : rebonds, collisions).
// Terrain vertical (comme sur mobile) : chaque équipe défend son côté, 5 pions chacun + 1 ballon.
// Simulation déterministe à pas fixe, jouée jusqu'à l'arrêt complet avant de rendre la main.

export type SoccerPlayer = 'player1' | 'player2';
export interface SoccerToken { id: string; x: number; y: number; vx: number; vy: number }
export interface SoccerBall { x: number; y: number; vx: number; vy: number }

export interface SoccerStarsState {
  tokens: Record<SoccerPlayer, SoccerToken[]>;
  ball: SoccerBall;
  scores: Record<SoccerPlayer, number>;
  turnsPlayed: number;
  lastAction: { type: 'flick' | 'goal' | 'kickoff'; player: SoccerPlayer } | null;
}

// Terrain vertical, coordonnées normalisées
export const FIELD_WIDTH = 60;
export const FIELD_HEIGHT = 100;
export const GOAL_HALF_WIDTH = 11; // largeur de cage = 22 (sur 60 de large)
export const TOKEN_RADIUS = 3.6;
export const BALL_RADIUS = 2.4;

const FRICTION = 0.982;
const MIN_VELOCITY = 0.045;
const WALL_RESTITUTION = 0.78;
const TOKEN_RESTITUTION = 0.9;
export const MAX_FLICK_SPEED = 5.2;
const MAX_STEPS = 900; // garde-fou (~15s de simulation à pas fixe)

const opponentOf = (player: SoccerPlayer): SoccerPlayer => (player === 'player1' ? 'player2' : 'player1');

const goalCenterX = FIELD_WIDTH / 2;

const createFormation = (side: 'top' | 'bottom', prefix: string): SoccerToken[] => {
  const sign = side === 'top' ? 1 : -1; // top = proche de y=0, bottom = proche de y=FIELD_HEIGHT
  const baseY = side === 'top' ? 16 : FIELD_HEIGHT - 16;
  const midY = side === 'top' ? 30 : FIELD_HEIGHT - 30;
  void sign;
  return [
    { id: `${prefix}-gk`, x: goalCenterX, y: side === 'top' ? 8 : FIELD_HEIGHT - 8, vx: 0, vy: 0 },
    { id: `${prefix}-d1`, x: goalCenterX - 14, y: baseY, vx: 0, vy: 0 },
    { id: `${prefix}-d2`, x: goalCenterX + 14, y: baseY, vx: 0, vy: 0 },
    { id: `${prefix}-a1`, x: goalCenterX - 10, y: midY, vx: 0, vy: 0 },
    { id: `${prefix}-a2`, x: goalCenterX + 10, y: midY, vx: 0, vy: 0 },
  ];
};

export const createSoccerStarsState = (): SoccerStarsState => ({
  tokens: {
    player1: createFormation('bottom', 'player1'), // player1 défend le bas, attaque vers le haut (y=0)
    player2: createFormation('top', 'player2'),     // player2 défend le haut, attaque vers le bas (y=FIELD_HEIGHT)
  },
  ball: { x: goalCenterX, y: FIELD_HEIGHT / 2, vx: 0, vy: 0 },
  scores: { player1: 0, player2: 0 },
  turnsPlayed: 0,
  lastAction: null,
});

interface MovableObject { id: string; owner: 'ball' | SoccerPlayer; x: number; y: number; vx: number; vy: number; radius: number }

const collectObjects = (state: SoccerStarsState): MovableObject[] => [
  { id: 'ball', owner: 'ball', ...state.ball, radius: BALL_RADIUS },
  ...state.tokens.player1.map(t => ({ id: t.id, owner: 'player1' as const, x: t.x, y: t.y, vx: t.vx, vy: t.vy, radius: TOKEN_RADIUS })),
  ...state.tokens.player2.map(t => ({ id: t.id, owner: 'player2' as const, x: t.x, y: t.y, vx: t.vx, vy: t.vy, radius: TOKEN_RADIUS })),
];

const isMoving = (objs: MovableObject[]) => objs.some(o => Math.abs(o.vx) > MIN_VELOCITY || Math.abs(o.vy) > MIN_VELOCITY);

const stepOnce = (objs: MovableObject[]): { objs: MovableObject[]; goal: SoccerPlayer | null } => {
  let goal: SoccerPlayer | null = null;

  for (const o of objs) {
    o.x += o.vx;
    o.y += o.vy;
    o.vx *= FRICTION;
    o.vy *= FRICTION;
    if (Math.abs(o.vx) < MIN_VELOCITY) o.vx = 0;
    if (Math.abs(o.vy) < MIN_VELOCITY) o.vy = 0;

    // Murs latéraux
    if (o.x - o.radius < 0) { o.x = o.radius; o.vx = Math.abs(o.vx) * WALL_RESTITUTION; }
    if (o.x + o.radius > FIELD_WIDTH) { o.x = FIELD_WIDTH - o.radius; o.vx = -Math.abs(o.vx) * WALL_RESTITUTION; }

    const inGoalMouth = o.x > goalCenterX - GOAL_HALF_WIDTH && o.x < goalCenterX + GOAL_HALF_WIDTH;

    if (o.owner === 'ball' && inGoalMouth && o.y - o.radius < -o.radius * 1.5) {
      goal = 'player1'; // le ballon sort en haut => but pour celui qui attaque vers le haut (player1)
      continue;
    }
    if (o.owner === 'ball' && inGoalMouth && o.y + o.radius > FIELD_HEIGHT + o.radius * 1.5) {
      goal = 'player2';
      continue;
    }

    if (o.y - o.radius < 0) {
      if (!inGoalMouth || o.owner !== 'ball') { o.y = o.radius; o.vy = Math.abs(o.vy) * WALL_RESTITUTION; }
    }
    if (o.y + o.radius > FIELD_HEIGHT) {
      if (!inGoalMouth || o.owner !== 'ball') { o.y = FIELD_HEIGHT - o.radius; o.vy = -Math.abs(o.vy) * WALL_RESTITUTION; }
    }
  }

  // Collisions cercle-cercle (paires)
  for (let i = 0; i < objs.length; i++) {
    for (let j = i + 1; j < objs.length; j++) {
      const a = objs[i], b = objs[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      const minDist = a.radius + b.radius;
      if (dist < minDist) {
        const nx = dx / dist, ny = dy / dist;
        const overlap = (minDist - dist) / 2;
        a.x -= nx * overlap; a.y -= ny * overlap;
        b.x += nx * overlap; b.y += ny * overlap;

        const relVx = b.vx - a.vx, relVy = b.vy - a.vy;
        const relSpeed = relVx * nx + relVy * ny;
        if (relSpeed < 0) {
          const impulse = -relSpeed * TOKEN_RESTITUTION;
          a.vx -= impulse * nx * 0.5; a.vy -= impulse * ny * 0.5;
          b.vx += impulse * nx * 0.5; b.vy += impulse * ny * 0.5;
        }
      }
    }
  }

  return { objs, goal };
};

export interface FlickFrame { ball: { x: number; y: number }; tokens: Record<SoccerPlayer, { id: string; x: number; y: number }[]> }

export interface FlickResult {
  state: SoccerStarsState;
  goalScored: SoccerPlayer | null;
  frames: FlickFrame[]; // pour rejouer l'animation localement
}

const snapshot = (objs: MovableObject[]): FlickFrame => ({
  ball: { x: objs[0].x, y: objs[0].y },
  tokens: {
    player1: objs.filter(o => o.owner === 'player1').map(o => ({ id: o.id, x: o.x, y: o.y })),
    player2: objs.filter(o => o.owner === 'player2').map(o => ({ id: o.id, x: o.x, y: o.y })),
  },
});

/** Vitesse maximale d'un flick, en unités de terrain par pas de simulation. dx/dy = direction (sera normalisée), power 0-1. */
export const flickVelocity = (dx: number, dy: number, power: number): { vx: number; vy: number } => {
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const speed = Math.min(Math.max(power, 0), 1) * MAX_FLICK_SPEED;
  return { vx: (dx / len) * speed, vy: (dy / len) * speed };
};

export const applyFlick = (
  state: SoccerStarsState,
  player: SoccerPlayer,
  tokenId: string,
  vx: number,
  vy: number,
): FlickResult | null => {
  const token = state.tokens[player].find(t => t.id === tokenId);
  if (!token) return null;

  let objs = collectObjects(state);
  const target = objs.find(o => o.id === tokenId);
  if (!target) return null;
  target.vx = vx;
  target.vy = vy;

  const frames: FlickFrame[] = [snapshot(objs)];
  let goalScored: SoccerPlayer | null = null;

  for (let step = 0; step < MAX_STEPS; step++) {
    const result = stepOnce(objs);
    objs = result.objs;
    if (step % 2 === 0) frames.push(snapshot(objs));
    if (result.goal) { goalScored = result.goal; frames.push(snapshot(objs)); break; }
    if (!isMoving(objs)) break;
  }

  const nextTokens: Record<SoccerPlayer, SoccerToken[]> = {
    player1: objs.filter(o => o.owner === 'player1').map(o => ({ id: o.id, x: o.x, y: o.y, vx: 0, vy: 0 })),
    player2: objs.filter(o => o.owner === 'player2').map(o => ({ id: o.id, x: o.x, y: o.y, vx: 0, vy: 0 })),
  };
  const ballObj = objs[0];

  const nextState: SoccerStarsState = {
    ...state,
    tokens: nextTokens,
    ball: { x: ballObj.x, y: ballObj.y, vx: 0, vy: 0 },
    lastAction: { type: 'flick', player },
  };

  return { state: nextState, goalScored, frames };
};

/** Réinitialise pour l'engagement suivant après un but ; le camp qui a encaissé engage. */
export const kickoffAfterGoal = (state: SoccerStarsState, scoringTeam: SoccerPlayer): SoccerStarsState => {
  const scores = { ...state.scores, [scoringTeam]: state.scores[scoringTeam] + 1 };
  return {
    tokens: {
      player1: createFormation('bottom', 'player1'),
      player2: createFormation('top', 'player2'),
    },
    ball: { x: goalCenterX, y: FIELD_HEIGHT / 2, vx: 0, vy: 0 },
    scores,
    turnsPlayed: state.turnsPlayed,
    lastAction: { type: 'kickoff', player: opponentOf(scoringTeam) },
  };
};

// ---------------------------------------------------------------------------
// IA : vise le point de contact qui envoie le ballon vers la cage adverse

export const soccerAI = (state: SoccerStarsState, player: SoccerPlayer): { tokenId: string; vx: number; vy: number } => {
  const opponent = opponentOf(player);
  void opponent;
  const opponentGoalY = player === 'player1' ? 0 : FIELD_HEIGHT;

  const tokens = state.tokens[player];
  const sorted = [...tokens].sort((a, b) =>
    (Math.hypot(a.x - state.ball.x, a.y - state.ball.y)) - (Math.hypot(b.x - state.ball.x, b.y - state.ball.y)));
  const shooter = sorted[0];

  // Point "fantôme" : là où le pion doit toucher le ballon pour l'envoyer vers le centre de la cage adverse
  const toGoalX = goalCenterX - state.ball.x;
  const toGoalY = opponentGoalY - state.ball.y;
  const toGoalLen = Math.hypot(toGoalX, toGoalY) || 1;
  const contactX = state.ball.x - (toGoalX / toGoalLen) * (TOKEN_RADIUS + BALL_RADIUS);
  const contactY = state.ball.y - (toGoalY / toGoalLen) * (TOKEN_RADIUS + BALL_RADIUS);

  const dx = contactX - shooter.x;
  const dy = contactY - shooter.y;
  const dist = Math.hypot(dx, dy) || 1;

  // Puissance proportionnelle à la distance à parcourir, plafonnée
  const power = Math.min(0.55 + dist / 90, 1);
  const { vx, vy } = flickVelocity(dx, dy, power);

  return { tokenId: shooter.id, vx, vy };
};
