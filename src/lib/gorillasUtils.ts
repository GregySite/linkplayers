// Gorillas — hommage à QBasic Gorillas (1991) : deux gorilles au sommet de gratte-ciels
// se lancent des bananes en indiquant angle + puissance, avec gravité et vent. Premier
// à toucher l'autre gagne la manche.

export type GorillaPlayer = 'player1' | 'player2';

export interface Building { x: number; width: number; height: number; shade: number }
export interface GorillaPos { x: number; y: number; buildingIndex: number }

export interface GorillaState {
  buildings: Building[];
  gorillas: Record<GorillaPlayer, GorillaPos>;
  wind: number; // vent horizontal, -1 à 1 (0 = pas de vent)
  scores: Record<GorillaPlayer, number>;
  round: number;
  lastShot: {
    player: GorillaPlayer;
    angle: number;
    velocity: number;
    trajectory: { x: number; y: number }[];
    result: 'hit' | 'building' | 'miss' | 'ground';
    sunHit: boolean;
  } | null;
}

export const FIELD_WIDTH = 100;
export const FIELD_HEIGHT = 56;
export const GRAVITY = 0.26;
export const MAX_VELOCITY = 45;
/** Échelle vitesse→déplacement, calibrée pour qu'un tir à puissance max reste dans l'écran. */
const VELOCITY_SCALE = 0.11;
export const TARGET_WINS = 3;
export const GORILLA_HIT_RADIUS = 2.6;
export const SUN_POS = { x: FIELD_WIDTH / 2, y: 8, radius: 4 };

const opponentOf = (player: GorillaPlayer): GorillaPlayer => (player === 'player1' ? 'player2' : 'player1');

const NUM_BUILDINGS = 8;

const buildCityscape = (): Building[] => {
  const buildings: Building[] = [];
  const w = FIELD_WIDTH / NUM_BUILDINGS;
  for (let i = 0; i < NUM_BUILDINGS; i++) {
    // Hauteurs variées mais jamais trop extrêmes, pour garder des tirs jouables
    const height = 14 + Math.random() * 26;
    buildings.push({ x: i * w, width: w, height, shade: Math.random() });
  }
  return buildings;
};

const placeGorilla = (buildings: Building[], buildingIndex: number): GorillaPos => {
  const b = buildings[buildingIndex];
  return { x: b.x + b.width / 2, y: FIELD_HEIGHT - b.height, buildingIndex };
};

export const createGorillaState = (): GorillaState => {
  const buildings = buildCityscape();
  return {
    buildings,
    gorillas: {
      player1: placeGorilla(buildings, 1),
      player2: placeGorilla(buildings, NUM_BUILDINGS - 2),
    },
    wind: Math.round((Math.random() * 2 - 1) * 10) / 10,
    scores: { player1: 0, player2: 0 },
    round: 1,
    lastShot: null,
  };
};

const buildingTopAt = (buildings: Building[], x: number): number | null => {
  const b = buildings.find(bd => x >= bd.x && x < bd.x + bd.width);
  return b ? FIELD_HEIGHT - b.height : null;
};

export interface ThrowResult {
  state: GorillaState;
  result: 'hit' | 'building' | 'miss' | 'ground';
  winner: GorillaPlayer | null; // camp gagnant si un gorille est touché
}

export const throwBanana = (
  state: GorillaState,
  player: GorillaPlayer,
  angleDeg: number,
  velocity: number,
): ThrowResult => {
  const opponent = opponentOf(player);
  const shooter = state.gorillas[player];
  const target = state.gorillas[opponent];

  const dir = player === 'player1' ? 1 : -1;
  const angleRad = (Math.max(0, Math.min(90, angleDeg)) * Math.PI) / 180;
  const speed = Math.max(1, Math.min(MAX_VELOCITY, velocity));

  let x = shooter.x;
  let y = shooter.y - 2.5; // point de lâcher, au-dessus de la tête
  let vx = Math.cos(angleRad) * speed * dir * VELOCITY_SCALE;
  let vy = -Math.sin(angleRad) * speed * VELOCITY_SCALE;

  const trajectory: { x: number; y: number }[] = [{ x, y }];
  let result: ThrowResult['result'] = 'miss';
  let sunHit = false;
  let hitGorilla: GorillaPlayer | null = null;

  const startBuildingIndex = shooter.buildingIndex;

  for (let step = 0; step < 2000; step++) {
    vx += state.wind * 0.01;
    vy += GRAVITY;
    x += vx;
    y += vy;
    trajectory.push({ x, y });

    // Soleil : réaction cosmétique, n'arrête pas la trajectoire
    if (!sunHit && Math.hypot(x - SUN_POS.x, y - SUN_POS.y) < SUN_POS.radius) {
      sunHit = true;
    }

    // Touche le gorille adverse ?
    if (Math.hypot(x - target.x, y - target.y) < GORILLA_HIT_RADIUS) {
      result = 'hit';
      hitGorilla = opponent;
      break;
    }

    // Sort du terrain
    if (x < 0 || x > FIELD_WIDTH) { result = 'miss'; break; }
    if (y > FIELD_HEIGHT) { result = 'ground'; break; }
    if (y < -15) { result = 'miss'; break; }

    // Touche un immeuble (pas le sien au tout début du lancer)
    const top = buildingTopAt(state.buildings, x);
    if (top !== null && y >= top) {
      const currentBuildingIndex = state.buildings.findIndex(b => x >= b.x && x < b.x + b.width);
      if (!(step < 4 && currentBuildingIndex === startBuildingIndex)) {
        result = 'building';
        break;
      }
    }
  }

  const lastShot: GorillaState['lastShot'] = { player, angle: angleDeg, velocity, trajectory, result, sunHit };

  if (hitGorilla) {
    const scores = { ...state.scores, [player]: state.scores[player] + 1 };
    if (scores[player] >= TARGET_WINS) {
      return { state: { ...state, scores, lastShot }, result, winner: player };
    }
    // Nouvelle manche : nouvelle ville, nouveau vent
    const buildings = buildCityscape();
    const nextState: GorillaState = {
      buildings,
      gorillas: {
        player1: placeGorilla(buildings, 1),
        player2: placeGorilla(buildings, NUM_BUILDINGS - 2),
      },
      wind: Math.round((Math.random() * 2 - 1) * 10) / 10,
      scores,
      round: state.round + 1,
      lastShot,
    };
    return { state: nextState, result, winner: null };
  }

  return { state: { ...state, lastShot }, result, winner: null };
};

// ---------------------------------------------------------------------------
// IA : cherche un bon tir par balayage, avec imprécision volontaire pour ne pas
// rejouer exactement le même coup à chaque fois (et laisser sa chance au joueur).

export const gorillaAI = (state: GorillaState, player: GorillaPlayer): { angle: number; velocity: number } => {
  const opponent = opponentOf(player);
  const target = state.gorillas[opponent];

  const candidates: { angle: number; velocity: number; dist: number }[] = [];

  for (let angle = 20; angle <= 75; angle += 5) {
    for (let velocity = 12; velocity <= MAX_VELOCITY; velocity += 3) {
      const attempt = throwBanana(state, player, angle, velocity);
      const traj = attempt.state.lastShot?.trajectory ?? [];
      let minDist = Infinity;
      for (const p of traj) {
        const d = Math.hypot(p.x - target.x, p.y - target.y);
        if (d < minDist) minDist = d;
      }
      candidates.push({ angle, velocity, dist: attempt.result === 'hit' ? 0 : minDist });
    }
  }

  candidates.sort((a, b) => a.dist - b.dist);
  // Pioche parmi les meilleurs tirs plutôt que systématiquement le tout meilleur,
  // pour varier les trajectoires d'une manche à l'autre.
  const pool = candidates.slice(0, 6);
  const pick = pool[Math.floor(Math.random() * pool.length)] ?? candidates[0];

  // Petite erreur de visée : rend l'IA battable et ses tirs moins robotiques
  const angleJitter = (Math.random() * 2 - 1) * 4;
  const velocityJitter = (Math.random() * 2 - 1) * 2.5;

  return {
    angle: Math.max(5, Math.min(85, Math.round(pick.angle + angleJitter))),
    velocity: Math.max(5, Math.min(MAX_VELOCITY, Math.round(pick.velocity + velocityJitter))),
  };
};
