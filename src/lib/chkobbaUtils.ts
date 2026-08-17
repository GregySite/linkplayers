// ==================== CHKOBBA (règles tunisiennes classiques) ====================

export type ChkobbaSuit = 'denari' | 'coppe' | 'spade' | 'bastoni';
export type ChkobbaPlayer = 'player1' | 'player2';

export interface ChkobbaCard {
  id: string;
  suit: ChkobbaSuit;
  value: number; // 1..10
}

export const CHKOBBA_TARGET = 11;

export const SUIT_LABELS: Record<ChkobbaSuit, string> = {
  denari: 'Carreau',
  coppe: 'Cœur',
  spade: 'Pique',
  bastoni: 'Trèfle',
};

export const SUIT_SYMBOLS: Record<ChkobbaSuit, string> = {
  denari: '♦',
  coppe: '♥',
  spade: '♠',
  bastoni: '♣',
};

/** Rouge pour cœur et carreau, couleur de texte standard sinon. */
export const isRedSuit = (suit: ChkobbaSuit) => suit === 'denari' || suit === 'coppe';

export interface ChkobbaRoundSummary {
  points: { player1: number; player2: number };
  details: {
    label: string;
    winner: ChkobbaPlayer | null;
    p1: string;
    p2: string;
  }[];
}

export interface ChkobbaState {
  deck: ChkobbaCard[];
  table: ChkobbaCard[];
  hands: { player1: ChkobbaCard[]; player2: ChkobbaCard[] };
  captured: { player1: ChkobbaCard[]; player2: ChkobbaCard[] };
  chkobbas: { player1: number; player2: number };
  lastCapturer: ChkobbaPlayer | null;
  matchScores: { player1: number; player2: number };
  round: number;
  lastPlay: {
    player: ChkobbaPlayer;
    card: ChkobbaCard;
    captured: ChkobbaCard[];
    chkobba: boolean;
  } | null;
  roundSummary: ChkobbaRoundSummary | null;
  [key: string]: unknown;
}

// ==================== DECK ====================

export function createChkobbaDeck(): ChkobbaCard[] {
  const suits: ChkobbaSuit[] = ['denari', 'coppe', 'spade', 'bastoni'];
  const deck: ChkobbaCard[] = [];
  for (const suit of suits) {
    for (let value = 1; value <= 10; value++) {
      deck.push({ id: `${suit}-${value}`, suit, value });
    }
  }
  return deck;
}

export function shuffleCards<T>(cards: T[]): T[] {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Nouvelle donne : 3 cartes par joueur, 4 au tapis. */
export function dealChkobbaRound(
  round: number,
  matchScores: { player1: number; player2: number },
): ChkobbaState {
  const deck = shuffleCards(createChkobbaDeck());
  const table = deck.splice(0, 4);
  const p1 = deck.splice(0, 3);
  const p2 = deck.splice(0, 3);

  return {
    deck,
    table,
    hands: { player1: p1, player2: p2 },
    captured: { player1: [], player2: [] },
    chkobbas: { player1: 0, player2: 0 },
    lastCapturer: null,
    matchScores,
    round,
    lastPlay: null,
    roundSummary: null,
  };
}

export function createChkobbaState(): ChkobbaState {
  return dealChkobbaRound(1, { player1: 0, player2: 0 });
}

/** Le joueur qui commence la manche (alterne à chaque manche). */
export function chkobbaStarter(round: number): ChkobbaPlayer {
  return round % 2 === 1 ? 'player1' : 'player2';
}

// ==================== CAPTURES ====================

/**
 * Toutes les captures possibles pour une carte donnée, sous forme d'indices du tapis.
 * Règle standard : si une carte de même valeur est présente, la capture unitaire est obligatoire.
 */
export function findCaptureOptions(table: ChkobbaCard[], card: ChkobbaCard): number[][] {
  const singles: number[][] = [];
  table.forEach((c, i) => {
    if (c.value === card.value) singles.push([i]);
  });
  if (singles.length > 0) return singles;

  const results: number[][] = [];
  const n = table.length;
  const walk = (start: number, sum: number, acc: number[]) => {
    if (sum === card.value) {
      if (acc.length >= 2) results.push([...acc]);
      return;
    }
    if (sum > card.value || start >= n) return;
    for (let i = start; i < n; i++) {
      acc.push(i);
      walk(i + 1, sum + table[i].value, acc);
      acc.pop();
    }
  };
  walk(0, 0, []);
  return results;
}

/** Indices du tapis impliqués dans au moins une capture possible. */
export function capturableTableIndices(table: ChkobbaCard[], card: ChkobbaCard): number[] {
  const set = new Set<number>();
  for (const option of findCaptureOptions(table, card)) {
    for (const i of option) set.add(i);
  }
  return [...set];
}

export function isValidCapture(
  table: ChkobbaCard[],
  card: ChkobbaCard,
  selection: number[],
): boolean {
  const options = findCaptureOptions(table, card);
  const key = [...selection].sort((a, b) => a - b).join(',');
  return options.some(o => [...o].sort((a, b) => a - b).join(',') === key);
}

// ==================== SCORE DE MANCHE ====================

const isSevenOfDenari = (c: ChkobbaCard) => c.suit === 'denari' && c.value === 7;

export function computeRoundSummary(state: ChkobbaState): ChkobbaRoundSummary {
  const p1 = state.captured.player1;
  const p2 = state.captured.player2;

  const cards1 = p1.length;
  const cards2 = p2.length;
  const den1 = p1.filter(c => c.suit === 'denari').length;
  const den2 = p2.filter(c => c.suit === 'denari').length;
  const sev1 = p1.filter(c => c.value === 7).length;
  const sev2 = p2.filter(c => c.value === 7).length;
  const six1 = p1.filter(c => c.value === 6).length;
  const six2 = p2.filter(c => c.value === 6).length;
  const karta1 = p1.some(isSevenOfDenari);

  const points = { player1: state.chkobbas.player1, player2: state.chkobbas.player2 };
  const details: ChkobbaRoundSummary['details'] = [];

  const add = (label: string, v1: number, v2: number, fmt = (v: number) => `${v}`) => {
    let winner: ChkobbaPlayer | null = null;
    if (v1 > v2) { points.player1 += 1; winner = 'player1'; }
    else if (v2 > v1) { points.player2 += 1; winner = 'player2'; }
    details.push({ label, winner, p1: fmt(v1), p2: fmt(v2) });
  };

  // 1. Barmila : le plus de 7 (égalité départagée par le nombre de 6)
  if (sev1 === sev2) {
    add('Barmila (7, départage aux 6)', six1, six2, v => `${sev1} · ${v}×6`);
  } else {
    add('Barmila (nombre de 7)', sev1, sev2);
  }

  // 2. Le 7 de carreau
  points[karta1 ? 'player1' : 'player2'] += 1;
  details.push({
    label: 'Sept de carreau ♦',
    winner: karta1 ? 'player1' : 'player2',
    p1: karta1 ? '✓' : '—',
    p2: karta1 ? '—' : '✓',
  });

  // 3. Le plus de cartes, 4. le plus de carreaux
  add('Karta (nombre de cartes)', cards1, cards2);
  add('Dineri (carreaux ♦)', den1, den2);

  details.push({
    label: 'Chkobbas',
    winner: state.chkobbas.player1 === state.chkobbas.player2
      ? null
      : state.chkobbas.player1 > state.chkobbas.player2 ? 'player1' : 'player2',
    p1: `+${state.chkobbas.player1}`,
    p2: `+${state.chkobbas.player2}`,
  });

  return { points, details };
}

// ==================== JOUER UNE CARTE ====================

export interface ChkobbaPlayResult {
  state: ChkobbaState;
  nextPlayer: ChkobbaPlayer;
  /** Défini uniquement si la partie (11 points) est terminée. */
  winner: ChkobbaPlayer | null;
  finished: boolean;
}

const opponentOf = (p: ChkobbaPlayer): ChkobbaPlayer => (p === 'player1' ? 'player2' : 'player1');

/**
 * Applique un coup complet : capture ou dépose, réapprovisionnement des mains,
 * fin de manche (ramassage du tapis + comptage) et fin de partie à 11 points.
 */
export function playChkobbaCard(
  prev: ChkobbaState,
  player: ChkobbaPlayer,
  handIndex: number,
  selection: number[],
): ChkobbaPlayResult {
  const state: ChkobbaState = {
    ...prev,
    deck: [...prev.deck],
    table: [...prev.table],
    hands: { player1: [...prev.hands.player1], player2: [...prev.hands.player2] },
    captured: { player1: [...prev.captured.player1], player2: [...prev.captured.player2] },
    chkobbas: { ...prev.chkobbas },
    matchScores: { ...prev.matchScores },
    roundSummary: null,
  };

  const card = state.hands[player][handIndex];
  if (!card) {
    return { state: prev, nextPlayer: player, winner: null, finished: false };
  }
  state.hands[player].splice(handIndex, 1);

  let capturedCards: ChkobbaCard[] = [];
  if (selection.length > 0 && isValidCapture(prev.table, card, selection)) {
    const sorted = [...selection].sort((a, b) => b - a);
    for (const i of sorted) capturedCards.unshift(state.table.splice(i, 1)[0]);
    state.captured[player].push(card, ...capturedCards);
    state.lastCapturer = player;
  } else {
    capturedCards = [];
    state.table.push(card);
  }

  const handsEmpty = state.hands.player1.length === 0 && state.hands.player2.length === 0;
  const isVeryLastCard = handsEmpty && state.deck.length === 0;
  const chkobba = capturedCards.length > 0 && state.table.length === 0 && !isVeryLastCard;
  if (chkobba) state.chkobbas[player] += 1;

  state.lastPlay = { player, card, captured: capturedCards, chkobba };

  const nextPlayer = opponentOf(player);

  if (handsEmpty) {
    if (state.deck.length >= 6) {
      // Nouvelle distribution dans la même manche
      state.hands.player1 = state.deck.splice(0, 3);
      state.hands.player2 = state.deck.splice(0, 3);
    } else {
      // Fin de manche : le dernier capteur ramasse le tapis
      if (state.table.length > 0 && state.lastCapturer) {
        state.captured[state.lastCapturer].push(...state.table);
        state.table = [];
      }

      const summary = computeRoundSummary(state);
      const matchScores = {
        player1: state.matchScores.player1 + summary.points.player1,
        player2: state.matchScores.player2 + summary.points.player2,
      };

      const p1Won = matchScores.player1 >= CHKOBBA_TARGET && matchScores.player1 > matchScores.player2;
      const p2Won = matchScores.player2 >= CHKOBBA_TARGET && matchScores.player2 > matchScores.player1;

      if (p1Won || p2Won) {
        return {
          state: { ...state, matchScores, roundSummary: summary },
          nextPlayer,
          winner: p1Won ? 'player1' : 'player2',
          finished: true,
        };
      }

      // Manche suivante
      const nextRound = state.round + 1;
      const dealt = dealChkobbaRound(nextRound, matchScores);
      return {
        state: { ...dealt, roundSummary: summary, lastPlay: state.lastPlay },
        nextPlayer: chkobbaStarter(nextRound),
        winner: null,
        finished: false,
      };
    }
  }

  return { state, nextPlayer, winner: null, finished: false };
}

// ==================== IA SOLO ====================

const cardWeight = (c: ChkobbaCard) =>
  (isSevenOfDenari(c) ? 12 : 0) +
  (c.value === 7 ? 5 : 0) +
  (c.suit === 'denari' ? 3 : 0) +
  1;

export function chkobbaAI(
  state: ChkobbaState,
  player: ChkobbaPlayer,
): { handIndex: number; selection: number[] } | null {
  const hand = state.hands[player];
  if (hand.length === 0) return null;

  let best: { handIndex: number; selection: number[]; score: number } | null = null;

  hand.forEach((card, handIndex) => {
    const options = findCaptureOptions(state.table, card);
    for (const selection of options) {
      const taken = selection.map(i => state.table[i]);
      let score = taken.reduce((s, c) => s + cardWeight(c), 0) + cardWeight(card);
      // Bonus chkobba : le tapis serait vidé
      if (selection.length === state.table.length) score += 20;
      if (!best || score > best.score) best = { handIndex, selection, score };
    }
  });

  if (best) return { handIndex: best.handIndex, selection: best.selection };

  // Aucune capture : défausser la carte la moins précieuse, en évitant d'offrir une capture facile
  let worstIndex = 0;
  let worstScore = Infinity;
  hand.forEach((card, i) => {
    const score = cardWeight(card) * 10 + card.value;
    if (score < worstScore) { worstScore = score; worstIndex = i; }
  });
  return { handIndex: worstIndex, selection: [] };
}
