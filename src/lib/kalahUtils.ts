// Kalah — variante occidentale du mancala, plus simple à comprendre que l'Awalé traditionnel :
// chaque joueur a un réservoir ("store"), capture immédiate en tombant sur une case vide de son
// côté, et on rejoue si la dernière graine tombe dans son propre réservoir.
//
// Plateau à 14 cases : 0-5 = trous du joueur 1, 6 = réservoir joueur 1,
//                       7-12 = trous du joueur 2, 13 = réservoir joueur 2.

export type KalahPlayer = 'player1' | 'player2';

export interface KalahState {
  pits: number[]; // 14 cases
  lastMove: { player: KalahPlayer; from: number; captured: number[]; extraTurn: boolean } | null;
}

const P1_PITS = [0, 1, 2, 3, 4, 5];
const P1_STORE = 6;
const P2_PITS = [7, 8, 9, 10, 11, 12];
const P2_STORE = 13;

const opponentOf = (player: KalahPlayer): KalahPlayer => (player === 'player1' ? 'player2' : 'player1');
const pitsOf = (player: KalahPlayer) => (player === 'player1' ? P1_PITS : P2_PITS);
const storeOf = (player: KalahPlayer) => (player === 'player1' ? P1_STORE : P2_STORE);
const opponentStoreOf = (player: KalahPlayer) => (player === 'player1' ? P2_STORE : P1_STORE);
/** Case en face, de l'autre côté du plateau (utilisée pour la capture). */
const oppositePit = (index: number): number => 12 - index;

export { P1_PITS, P1_STORE, P2_PITS, P2_STORE };

export const createKalahState = (): KalahState => {
  const pits = Array(14).fill(4);
  pits[P1_STORE] = 0;
  pits[P2_STORE] = 0;
  return { pits, lastMove: null };
};

export const legalMoves = (state: KalahState, player: KalahPlayer): number[] =>
  pitsOf(player).filter(i => state.pits[i] > 0);

export interface KalahMoveResult {
  state: KalahState;
  nextPlayer: KalahPlayer;
  finished: boolean;
  winner?: KalahPlayer; // undefined = égalité
}

const finalizeIfRowEmpty = (pits: number[]): number[] => {
  const p1Empty = P1_PITS.every(i => pits[i] === 0);
  const p2Empty = P2_PITS.every(i => pits[i] === 0);
  if (!p1Empty && !p2Empty) return pits;

  const result = [...pits];
  if (p1Empty) {
    for (const i of P2_PITS) { result[P2_STORE] += result[i]; result[i] = 0; }
  } else {
    for (const i of P1_PITS) { result[P1_STORE] += result[i]; result[i] = 0; }
  }
  return result;
};

export const playKalahMove = (state: KalahState, player: KalahPlayer, pitIndex: number): KalahMoveResult => {
  const legal = legalMoves(state, player);
  if (!legal.includes(pitIndex)) {
    return { state, nextPlayer: player, finished: false };
  }

  const pits = [...state.pits];
  let seeds = pits[pitIndex];
  pits[pitIndex] = 0;
  const skip = opponentStoreOf(player);

  let idx = pitIndex;
  while (seeds > 0) {
    idx = (idx + 1) % 14;
    if (idx === skip) continue;
    pits[idx]++;
    seeds--;
  }

  const myStore = storeOf(player);
  const extraTurn = idx === myStore;
  const capturedPits: number[] = [];

  if (!extraTurn && pitsOf(player).includes(idx) && pits[idx] === 1) {
    const opposite = oppositePit(idx);
    if (pits[opposite] > 0) {
      pits[myStore] += pits[idx] + pits[opposite];
      capturedPits.push(idx, opposite);
      pits[idx] = 0;
      pits[opposite] = 0;
    }
  }

  const finalPits = finalizeIfRowEmpty(pits);
  const lastMove = { player, from: pitIndex, captured: capturedPits, extraTurn };
  const nextState: KalahState = { pits: finalPits, lastMove };

  const rowsCleared = finalPits !== pits; // finalizeIfRowEmpty a agi => partie terminée
  if (rowsCleared) {
    const winner = finalPits[P1_STORE] === finalPits[P2_STORE]
      ? undefined
      : finalPits[P1_STORE] > finalPits[P2_STORE] ? 'player1' : 'player2';
    return { state: nextState, nextPlayer: opponentOf(player), finished: true, winner };
  }

  return { state: nextState, nextPlayer: extraTurn ? player : opponentOf(player), finished: false };
};

// ---------------------------------------------------------------------------
// IA simple : priorise un coup qui rejoue, puis une capture maximale, sinon meilleur score

export const kalahAI = (state: KalahState, player: KalahPlayer): number => {
  const moves = legalMoves(state, player);
  if (moves.length === 0) return -1;

  let best = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {
    const result = playKalahMove(state, player, move);
    const myStore = storeOf(player);
    const gained = result.state.pits[myStore] - state.pits[myStore];
    const extraTurnBonus = result.nextPlayer === player && !result.finished ? 15 : 0;
    const score = gained * 4 + extraTurnBonus;
    if (score > bestScore) { bestScore = score; best = move; }
  }

  return best;
};
