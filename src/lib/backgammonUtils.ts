// Backgammon — plateau 24 points, dés, barre, sortie des pions.
// Représentation : points[i] > 0 = pions player1 (avance de 23 vers 0, sort par le bas),
//                  points[i] < 0 = pions player2 (avance de 0 vers 23, sort par le haut).
// Simplification assumée : chaque dé est joué indépendamment (pas d'optimisation stricte
// "utiliser les deux dés si une combinaison le permet") — un dé sans coup légal est
// simplement passé, ce qui reste conforme à l'esprit du jeu pour une version décontractée.

export type BackgammonPlayer = 'player1' | 'player2';

export interface BackgammonState {
  points: number[]; // 24 cases
  bar: Record<BackgammonPlayer, number>;
  off: Record<BackgammonPlayer, number>;
  dice: number[]; // dés restants à jouer ce tour
  diceRolled: boolean;
}

const HOME: Record<BackgammonPlayer, [number, number]> = { player1: [0, 5], player2: [18, 23] };
const opponentOf = (player: BackgammonPlayer): BackgammonPlayer => (player === 'player1' ? 'player2' : 'player1');
const dirOf = (player: BackgammonPlayer): number => (player === 'player1' ? -1 : 1);

export const createBackgammonState = (): BackgammonState => {
  const points = Array(24).fill(0);
  points[23] = 2; points[12] = 5; points[7] = 3; points[5] = 5; // player1
  points[0] = -2; points[11] = -5; points[16] = -3; points[18] = -5; // player2
  return { points, bar: { player1: 0, player2: 0 }, off: { player1: 0, player2: 0 }, dice: [], diceRolled: false };
};

export const rollDice = (state: BackgammonState): BackgammonState => {
  if (state.dice.length > 0) return state;
  const d1 = 1 + Math.floor(Math.random() * 6);
  const d2 = 1 + Math.floor(Math.random() * 6);
  const dice = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
  return { ...state, dice, diceRolled: true };
};

const isPointOpenFor = (points: number[], player: BackgammonPlayer, index: number): boolean => {
  const value = points[index];
  if (player === 'player1') return value >= 0 || value === -1;
  return value <= 0 || value === 1;
};

const allCheckersHome = (state: BackgammonState, player: BackgammonPlayer): boolean => {
  if (state.bar[player] > 0) return false;
  const [lo, hi] = HOME[player];
  for (let i = 0; i < 24; i++) {
    if (i < lo || i > hi) {
      const value = state.points[i];
      if ((player === 'player1' && value > 0) || (player === 'player2' && value < 0)) return false;
    }
  }
  return true;
};

export interface BackgammonMove { from: number; to: number | 'off' } // from = -1 signifie "depuis la barre"

export const legalMovesForDie = (state: BackgammonState, player: BackgammonPlayer, die: number): BackgammonMove[] => {
  const dir = dirOf(player);
  const moves: BackgammonMove[] = [];

  if (state.bar[player] > 0) {
    const entryIndex = player === 'player1' ? 24 - die : die - 1;
    if (isPointOpenFor(state.points, player, entryIndex)) moves.push({ from: -1, to: entryIndex });
    return moves; // tant qu'il y a une entrée à jouer, aucun autre coup n'est possible
  }

  const canBearOff = allCheckersHome(state, player);
  const [lo, hi] = HOME[player];

  for (let i = 0; i < 24; i++) {
    const value = state.points[i];
    const hasChecker = player === 'player1' ? value > 0 : value < 0;
    if (!hasChecker) continue;

    const dest = i + dir * die;
    if (dest >= 0 && dest <= 23) {
      if (isPointOpenFor(state.points, player, dest)) moves.push({ from: i, to: dest });
      continue;
    }

    if (!canBearOff) continue;
    const distance = player === 'player1' ? i + 1 : 24 - i;
    if (distance === die) {
      moves.push({ from: i, to: 'off' });
    } else if (die > distance) {
      // Autorisé seulement si c'est le pion le plus reculé de la zone
      const noFartherChecker = player === 'player1'
        ? !state.points.slice(lo, i).some(v => v > 0)
        : !state.points.slice(i + 1, hi + 1).some(v => v < 0);
      if (noFartherChecker) moves.push({ from: i, to: 'off' });
    }
  }

  return moves;
};

export const hasAnyLegalMove = (state: BackgammonState, player: BackgammonPlayer): boolean =>
  [...new Set(state.dice)].some(die => legalMovesForDie(state, player, die).length > 0);

export interface BackgammonMoveResult {
  state: BackgammonState;
  nextPlayer: BackgammonPlayer;
  finished: boolean;
  winner?: BackgammonPlayer;
  turnOver: boolean; // vrai si le tour passe (plus de dés jouables)
}

export const playBackgammonMove = (
  state: BackgammonState,
  player: BackgammonPlayer,
  from: number,
  die: number,
): BackgammonMoveResult => {
  const legal = legalMovesForDie(state, player, die);
  const move = legal.find(m => m.from === from);
  if (!move || !state.dice.includes(die)) {
    return { state, nextPlayer: player, finished: false, turnOver: false };
  }

  const points = [...state.points];
  const bar = { ...state.bar };
  const off = { ...state.off };
  const checkerSign = player === 'player1' ? 1 : -1; // signe d'appartenance dans points[] (≠ direction de déplacement)
  const opponent = opponentOf(player);

  if (from === -1) bar[player] -= 1;
  else points[from] -= checkerSign;

  if (move.to === 'off') {
    off[player] += 1;
  } else {
    if (points[move.to] === -checkerSign) { // blot adverse : capture
      points[move.to] = 0;
      bar[opponent] += 1;
    }
    points[move.to] += checkerSign;
  }

  const dice = [...state.dice];
  dice.splice(dice.indexOf(die), 1);

  let nextState: BackgammonState = { points, bar, off, dice, diceRolled: state.diceRolled };

  if (off[player] === 15) {
    return { state: nextState, nextPlayer: opponentOf(player), finished: true, winner: player, turnOver: true };
  }

  if (dice.length === 0 || !hasAnyLegalMove(nextState, player)) {
    nextState = { ...nextState, dice: [], diceRolled: false };
    return { state: nextState, nextPlayer: opponent, finished: false, turnOver: true };
  }

  return { state: nextState, nextPlayer: player, finished: false, turnOver: false };
};

// Passe le tour si, après avoir lancé les dés, aucun coup n'est jouable
export const skipIfNoMoves = (state: BackgammonState, player: BackgammonPlayer): BackgammonState | null => {
  if (state.dice.length > 0 && !hasAnyLegalMove(state, player)) {
    return { ...state, dice: [], diceRolled: false };
  }
  return null;
};

// ---------------------------------------------------------------------------
// IA simple : priorise les captures, puis la sortie des pions, puis le déplacement
// le plus avancé ; évite de laisser un pion seul exposé si une alternative existe.

export const backgammonAI = (state: BackgammonState, player: BackgammonPlayer, die: number): number | null => {
  const moves = legalMovesForDie(state, player, die);
  if (moves.length === 0) return null;

  const checkerSign = player === 'player1' ? 1 : -1;

  const scored = moves.map(m => {
    let score = 0;
    if (m.to === 'off') {
      score += 1000;
    } else {
      const before = state.points[m.to];
      if (before === -checkerSign) score += 400; // capture un pion isolé adverse
      const resultingStack = Math.abs(before === -checkerSign ? checkerSign : before + checkerSign);
      if (resultingStack >= 2) score += 60; // sécurise un point (2+ pions)
      else score -= 90; // laisse un pion isolé exposé
    }
    // Pénalise le fait de dégarnir un point sûr pour ne laisser qu'un pion seul derrière
    if (m.from !== -1 && Math.abs(state.points[m.from]) === 2) score -= 15;
    score += m.to === 'off' ? 0 : Math.abs(m.to - m.from) * 0.5; // légère préférence pour la progression
    return { m, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].m.from;
};
