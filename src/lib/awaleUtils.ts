// Awalé (Oware) — jeu de plateau traditionnel africain, 12 cases (2 rangées de 6) + graines.
// Structure calquée sur les autres lib/*Utils.ts du projet.

export type AwalePlayer = 'player1' | 'player2';

export interface AwaleState {
  pits: number[]; // 12 cases : 0-5 = rangée player1, 6-11 = rangée player2
  scores: Record<AwalePlayer, number>;
  lastMove: { player: AwalePlayer; from: number; captured: number[] } | null;
}

const ROW: Record<AwalePlayer, number[]> = {
  player1: [0, 1, 2, 3, 4, 5],
  player2: [6, 7, 8, 9, 10, 11],
};

const opponentOf = (player: AwalePlayer): AwalePlayer => (player === 'player1' ? 'player2' : 'player1');

export const createAwaleState = (): AwaleState => ({
  pits: Array(12).fill(4),
  scores: { player1: 0, player2: 0 },
  lastMove: null,
});

// Simule un semis (sans muter l'état) : retourne les pits résultants + la dernière case semée
const simulateSow = (pits: number[], pitIndex: number): { pits: number[]; lastIdx: number } => {
  const next = [...pits];
  let seeds = next[pitIndex];
  next[pitIndex] = 0;
  let idx = pitIndex;
  while (seeds > 0) {
    idx = (idx + 1) % 12;
    if (idx === pitIndex) continue; // on ne resème pas dans la case de départ
    next[idx]++;
    seeds--;
  }
  return { pits: next, lastIdx: idx };
};

const wouldFeedOpponent = (pits: number[], pitIndex: number, opponent: AwalePlayer): boolean => {
  const { pits: after } = simulateSow(pits, pitIndex);
  return ROW[opponent].some(i => after[i] > pits[i]);
};

export const legalMoves = (state: AwaleState, player: AwalePlayer): number[] => {
  const opponent = opponentOf(player);
  const myRow = ROW[player];
  const opponentEmpty = ROW[opponent].every(i => state.pits[i] === 0);

  let moves = myRow.filter(i => state.pits[i] > 0);
  if (opponentEmpty) {
    const feeding = moves.filter(i => wouldFeedOpponent(state.pits, i, opponent));
    if (feeding.length > 0) moves = feeding;
  }
  return moves;
};

export interface AwaleMoveResult {
  state: AwaleState;
  nextPlayer: AwalePlayer;
  finished: boolean;
  winner?: AwalePlayer; // undefined = égalité
}

export const playAwaleMove = (state: AwaleState, player: AwalePlayer, pitIndex: number): AwaleMoveResult => {
  const legal = legalMoves(state, player);
  if (!legal.includes(pitIndex)) {
    return { state, nextPlayer: player, finished: false };
  }

  const { pits: sown, lastIdx } = simulateSow(state.pits, pitIndex);
  const pits = [...sown];
  const opponent = opponentOf(player);

  // Capture en chaîne vers l'arrière, tant qu'on reste dans les cases adverses avec 2 ou 3 graines
  let captureIdx = lastIdx;
  const capturedPits: number[] = [];
  let capturedTotal = 0;
  while (ROW[opponent].includes(captureIdx) && (pits[captureIdx] === 2 || pits[captureIdx] === 3)) {
    capturedTotal += pits[captureIdx];
    capturedPits.push(captureIdx);
    pits[captureIdx] = 0;
    captureIdx = captureIdx === 0 ? 11 : captureIdx - 1;
  }

  const scores: Record<AwalePlayer, number> = {
    ...state.scores,
    [player]: state.scores[player] + capturedTotal,
  };

  const lastMove = { player, from: pitIndex, captured: capturedPits };
  let nextState: AwaleState = { pits, scores, lastMove };

  // Victoire à la majorité (48 graines au total)
  if (scores[player] > 24) {
    return { state: nextState, nextPlayer: opponent, finished: true, winner: player };
  }

  // Si la rangée adverse est vide après ce coup, la partie s'arrête :
  // le joueur qui vient de jouer récupère toutes les graines restantes de son côté.
  const opponentEmptyNow = ROW[opponent].every(i => nextState.pits[i] === 0);
  if (opponentEmptyNow) {
    const remaining = ROW[player].reduce((sum, i) => sum + nextState.pits[i], 0);
    const finalPits = [...nextState.pits];
    ROW[player].forEach(i => { finalPits[i] = 0; });
    const finalScores = { ...nextState.scores, [player]: nextState.scores[player] + remaining };
    nextState = { ...nextState, pits: finalPits, scores: finalScores };

    const winner = finalScores.player1 === finalScores.player2
      ? undefined
      : finalScores.player1 > finalScores.player2 ? 'player1' : 'player2';
    return { state: nextState, nextPlayer: opponent, finished: true, winner };
  }

  // Si l'adversaire n'a aucun coup légal possible (rare, cas résiduel), la partie s'arrête aussi.
  if (legalMoves(nextState, opponent).length === 0) {
    const remaining = ROW[opponent].reduce((sum, i) => sum + nextState.pits[i], 0);
    const finalPits = [...nextState.pits];
    ROW[opponent].forEach(i => { finalPits[i] = 0; });
    const finalScores = { ...nextState.scores, [opponent]: nextState.scores[opponent] + remaining };
    const finalState = { ...nextState, pits: finalPits, scores: finalScores };

    const winner = finalScores.player1 === finalScores.player2
      ? undefined
      : finalScores.player1 > finalScores.player2 ? 'player1' : 'player2';
    return { state: finalState, nextPlayer: player, finished: true, winner };
  }

  return { state: nextState, nextPlayer: opponent, finished: false };
};

// ---------------------------------------------------------------------------
// IA simple : privilégie les captures, puis évite de laisser une case à 1 ou 2
// graines exposée à une capture adverse immédiate, sinon coup aléatoire.

export const awaleAI = (state: AwaleState, player: AwalePlayer): number => {
  const moves = legalMoves(state, player);
  if (moves.length === 0) return -1;

  let best = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {
    const result = playAwaleMove(state, player, move);
    const gained = result.state.scores[player] - state.scores[player];
    const opponent = opponentOf(player);

    // Pénalise les coups qui offrent une capture facile à l'adversaire au tour suivant
    let exposure = 0;
    if (!result.finished) {
      const opponentMoves = legalMoves(result.state, opponent);
      for (const oMove of opponentMoves) {
        const oResult = playAwaleMove(result.state, opponent, oMove);
        exposure = Math.max(exposure, oResult.state.scores[opponent] - result.state.scores[opponent]);
      }
    }

    const score = gained * 3 - exposure;
    if (score > bestScore) { bestScore = score; best = move; }
  }

  return best;
};
