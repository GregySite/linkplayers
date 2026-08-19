// ==================== YANIV ====================
// Yaniv à 7, Assaf +30, jokers & suites, élimination à 200 points.

export type YanivSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'joker';
export type YanivPlayer = 'player1' | 'player2';

export interface YanivCard {
  id: string;
  suit: YanivSuit;
  /** 1 = As, 11 = Valet, 12 = Dame, 13 = Roi, 0 = Joker */
  rank: number;
}

export const YANIV_CALL_MAX = 7;
export const ASSAF_PENALTY = 30;
export const YANIV_ELIMINATION = 200;

export const SUIT_SYMBOLS: Record<YanivSuit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  joker: '★',
};

export const isRedSuit = (suit: YanivSuit) => suit === 'hearts' || suit === 'diamonds';

export const rankLabel = (card: YanivCard): string => {
  if (card.suit === 'joker') return 'JOK';
  if (card.rank === 1) return 'A';
  if (card.rank === 11) return 'V';
  if (card.rank === 12) return 'D';
  if (card.rank === 13) return 'R';
  return `${card.rank}`;
};

/** Valeur en points : As = 1, figures = 10, joker = 0. */
export const cardPoints = (card: YanivCard): number => {
  if (card.suit === 'joker') return 0;
  return card.rank > 10 ? 10 : card.rank;
};

export const handPoints = (hand: YanivCard[]): number =>
  hand.reduce((s, c) => s + cardPoints(c), 0);

export interface YanivRoundSummary {
  caller: YanivPlayer;
  assaf: boolean;
  callerTotal: number;
  opponentTotal: number;
  points: { player1: number; player2: number };
}

export interface YanivState {
  deck: YanivCard[];
  /** Défausse complète, la dernière carte est au sommet. */
  discardPile: YanivCard[];
  /** Cartes défaussées au dernier coup, piochables par l'adversaire. */
  pickable: YanivCard[];
  hands: { player1: YanivCard[]; player2: YanivCard[] };
  scores: { player1: number; player2: number };
  round: number;
  lastPlay: {
    player: YanivPlayer;
    discarded: YanivCard[];
    drawn: 'deck' | 'discard';
    drawnCard: YanivCard | null;
  } | null;
  roundSummary: YanivRoundSummary | null;
  [key: string]: unknown;
}

// ==================== DECK ====================

export function createYanivDeck(): YanivCard[] {
  const suits: YanivSuit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const deck: YanivCard[] = [];
  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ id: `${suit}-${rank}`, suit, rank });
    }
  }
  deck.push({ id: 'joker-1', suit: 'joker', rank: 0 });
  deck.push({ id: 'joker-2', suit: 'joker', rank: 0 });
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

export function dealYanivRound(
  round: number,
  scores: { player1: number; player2: number },
): YanivState {
  const deck = shuffleCards(createYanivDeck());
  const p1 = deck.splice(0, 5);
  const p2 = deck.splice(0, 5);
  const first = deck.splice(0, 1);

  return {
    deck,
    discardPile: first,
    pickable: first,
    hands: { player1: p1, player2: p2 },
    scores,
    round,
    lastPlay: null,
    roundSummary: null,
  };
}

export function createYanivState(): YanivState {
  return dealYanivRound(1, { player1: 0, player2: 0 });
}

export function yanivStarter(round: number): YanivPlayer {
  return round % 2 === 1 ? 'player1' : 'player2';
}

// ==================== COMBINAISONS ====================

/** Vérifie qu'un ensemble de cartes forme une défausse valide. */
export function isValidDiscard(cards: YanivCard[]): boolean {
  if (cards.length === 0) return false;
  if (cards.length === 1) return true;

  const jokers = cards.filter(c => c.suit === 'joker');
  const rest = cards.filter(c => c.suit !== 'joker');

  // Brelan / carré (même rang)
  if (rest.length === 0) return true;
  if (rest.every(c => c.rank === rest[0].rank)) return true;

  // Suite : 3 cartes minimum, même couleur, rangs consécutifs (jokers = bouche-trous)
  if (cards.length < 3) return false;
  if (!rest.every(c => c.suit === rest[0].suit)) return false;

  const ranks = rest.map(c => c.rank).sort((a, b) => a - b);
  for (let i = 1; i < ranks.length; i++) if (ranks[i] === ranks[i - 1]) return false;

  const span = ranks[ranks.length - 1] - ranks[0] + 1;
  const holes = span - ranks.length;
  if (holes < 0 || holes > jokers.length) return false;
  // Les jokers restants prolongent la suite : la longueur totale doit rester cohérente
  return span + (jokers.length - holes) === cards.length;
}

/** Ordonne une défausse pour l'affichage (suite triée, sinon inchangée). */
export function sortDiscard(cards: YanivCard[]): YanivCard[] {
  const rest = cards.filter(c => c.suit !== 'joker');
  const sameRank = rest.length > 0 && rest.every(c => c.rank === rest[0].rank);
  if (cards.length < 3 || sameRank) return cards;
  return [...cards].sort((a, b) => a.rank - b.rank);
}

/**
 * Cartes récupérables par l'adversaire : toutes pour un brelan,
 * seulement les extrémités pour une suite.
 */
export function pickableFrom(cards: YanivCard[]): YanivCard[] {
  if (cards.length <= 1) return cards;
  const rest = cards.filter(c => c.suit !== 'joker');
  const sameRank = rest.length > 0 && rest.every(c => c.rank === rest[0].rank);
  if (sameRank) return cards;
  const sorted = sortDiscard(cards);
  return [sorted[0], sorted[sorted.length - 1]];
}

// ==================== COUPS ====================

export interface YanivPlayResult {
  state: YanivState;
  nextPlayer: YanivPlayer;
  winner: YanivPlayer | null;
  finished: boolean;
}

const opponentOf = (p: YanivPlayer): YanivPlayer => (p === 'player1' ? 'player2' : 'player1');

const cloneState = (prev: YanivState): YanivState => ({
  ...prev,
  deck: [...prev.deck],
  discardPile: [...prev.discardPile],
  pickable: [...prev.pickable],
  hands: { player1: [...prev.hands.player1], player2: [...prev.hands.player2] },
  scores: { ...prev.scores },
  roundSummary: null,
});

/** Défausse puis pioche (talon ou carte de la défausse précédente). */
export function playYanivMove(
  prev: YanivState,
  player: YanivPlayer,
  discardIndices: number[],
  draw: { from: 'deck' } | { from: 'discard'; cardId: string },
): YanivPlayResult {
  const state = cloneState(prev);
  const hand = state.hands[player];
  const cards = discardIndices.map(i => hand[i]).filter(Boolean);

  if (cards.length !== discardIndices.length || !isValidDiscard(cards)) {
    return { state: prev, nextPlayer: player, winner: null, finished: false };
  }

  let drawnCard: YanivCard | null = null;
  const previousPickable = state.pickable;

  // Retire les cartes défaussées de la main
  const remaining = hand.filter((_, i) => !discardIndices.includes(i));

  if (draw.from === 'discard') {
    const idx = previousPickable.findIndex(c => c.id === draw.cardId);
    if (idx === -1) {
      return { state: prev, nextPlayer: player, winner: null, finished: false };
    }
    drawnCard = previousPickable[idx];
    // Retire cette carte de la pile de défausse
    const pileIdx = state.discardPile.findIndex(c => c.id === drawnCard!.id);
    if (pileIdx !== -1) state.discardPile.splice(pileIdx, 1);
  } else {
    if (state.deck.length === 0) {
      // Recycle la défausse (hors dernières cartes jouées)
      const keep = state.discardPile.slice(-1);
      const recycled = state.discardPile.slice(0, -1);
      state.deck = shuffleCards(recycled);
      state.discardPile = keep;
    }
    drawnCard = state.deck.shift() || null;
  }

  const ordered = sortDiscard(cards);
  state.discardPile.push(...ordered);
  state.pickable = pickableFrom(ordered);
  state.hands[player] = drawnCard ? [...remaining, drawnCard] : remaining;
  state.lastPlay = { player, discarded: ordered, drawn: draw.from, drawnCard };

  return { state, nextPlayer: opponentOf(player), winner: null, finished: false };
}

export const canCallYaniv = (hand: YanivCard[]) => handPoints(hand) <= YANIV_CALL_MAX;

/** Slapdown : si la carte piochée au talon a la même valeur que celle qu'on vient de défausser,
 * on peut la reposer immédiatement sur la défausse, gratuitement (sans repiocher). */
export const canSlap = (state: YanivState, player: YanivPlayer): boolean => {
  const lp = state.lastPlay;
  if (!lp || lp.player !== player || lp.drawn !== 'deck' || !lp.drawnCard) return false;
  const topDiscard = state.discardPile[state.discardPile.length - 1];
  return !!topDiscard && topDiscard.id !== lp.drawnCard.id && topDiscard.rank === lp.drawnCard.rank;
};

export function playSlap(prev: YanivState, player: YanivPlayer): YanivPlayResult {
  if (!canSlap(prev, player)) return { state: prev, nextPlayer: player, winner: null, finished: false };
  const state = cloneState(prev);
  const card = state.lastPlay!.drawnCard!;
  state.hands[player] = state.hands[player].filter(c => c.id !== card.id);
  state.discardPile.push(card);
  state.pickable = pickableFrom([card]);
  state.lastPlay = { ...state.lastPlay!, drawn: 'deck', drawnCard: null };
  return { state, nextPlayer: opponentOf(player), winner: null, finished: false };
}

/** Annonce Yaniv : résout la manche, met à jour les scores et gère l'élimination. */
export function callYaniv(prev: YanivState, player: YanivPlayer): YanivPlayResult {
  const state = cloneState(prev);
  const other = opponentOf(player);
  const callerTotal = handPoints(state.hands[player]);
  const opponentTotal = handPoints(state.hands[other]);
  const assaf = opponentTotal <= callerTotal;

  const gained = { player1: 0, player2: 0 };
  if (assaf) {
    gained[player] = callerTotal + ASSAF_PENALTY;
    gained[other] = 0;
  } else {
    gained[player] = 0;
    gained[other] = opponentTotal;
  }

  const applyMilestone = (score: number) => {
    if (score === 100) return 50;
    if (score === 50) return 25;
    return score;
  };

  const scores = {
    player1: applyMilestone(state.scores.player1 + gained.player1),
    player2: applyMilestone(state.scores.player2 + gained.player2),
  };

  const summary: YanivRoundSummary = {
    caller: player,
    assaf,
    callerTotal,
    opponentTotal,
    points: gained,
  };

  const p1Out = scores.player1 >= YANIV_ELIMINATION;
  const p2Out = scores.player2 >= YANIV_ELIMINATION;

  if (p1Out || p2Out) {
    return {
      state: { ...state, scores, roundSummary: summary },
      nextPlayer: player,
      winner: p1Out && p2Out ? (scores.player1 <= scores.player2 ? 'player1' : 'player2') : p1Out ? 'player2' : 'player1',
      finished: true,
    };
  }

  const nextRound = state.round + 1;
  const dealt = dealYanivRound(nextRound, scores);
  return {
    state: { ...dealt, roundSummary: summary, lastPlay: state.lastPlay },
    nextPlayer: yanivStarter(nextRound),
    winner: null,
    finished: false,
  };
}

// ==================== IA SOLO ====================

/** Toutes les combinaisons défaussables d'une main. */
export function findDiscardOptions(hand: YanivCard[]): number[][] {
  const options: number[][] = [];
  hand.forEach((_, i) => options.push([i]));

  const n = hand.length;
  // Combinaisons de 2 à n cartes
  const walk = (start: number, acc: number[]) => {
    if (acc.length >= 2) {
      const cards = acc.map(i => hand[i]);
      if (isValidDiscard(cards)) options.push([...acc]);
    }
    for (let i = start; i < n; i++) {
      acc.push(i);
      walk(i + 1, acc);
      acc.pop();
    }
  };
  walk(0, []);
  return options;
}

export interface YanivAIMove {
  type: 'yaniv' | 'play';
  discardIndices?: number[];
  draw?: { from: 'deck' } | { from: 'discard'; cardId: string };
}

export function yanivAI(state: YanivState, player: YanivPlayer): YanivAIMove {
  const hand = state.hands[player];

  if (canCallYaniv(hand)) {
    // Un peu de variabilité : appelle presque toujours, sauf main un peu haute
    const total = handPoints(hand);
    if (total <= 3 || Math.random() < 0.8) return { type: 'yaniv' };
  }

  const options = findDiscardOptions(hand);
  let best = options[0];
  let bestValue = -1;
  for (const opt of options) {
    const value = opt.reduce((s, i) => s + cardPoints(hand[i]), 0) + opt.length * 0.5;
    if (value > bestValue) { bestValue = value; best = opt; }
  }

  // Pioche la défausse si une carte utile et peu chère est disponible
  const remaining = hand.filter((_, i) => !best.includes(i));
  let draw: YanivAIMove['draw'] = { from: 'deck' };
  let bestPick = Infinity;
  for (const c of state.pickable) {
    const points = cardPoints(c);
    const pairs = remaining.some(r => r.rank === c.rank && c.suit !== 'joker');
    const score = points - (pairs ? 6 : 0);
    if (score <= 3 && score < bestPick) { bestPick = score; draw = { from: 'discard', cardId: c.id }; }
  }

  return { type: 'play', discardIndices: best, draw };
}
