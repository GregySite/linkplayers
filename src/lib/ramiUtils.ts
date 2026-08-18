// Rami classique simplifié (1v1) — sans ajout de cartes aux combinaisons déjà posées (v1).
// Structure calquée sur yanivUtils.ts pour rester cohérent avec le reste du site.

export type RamiSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'joker';
export interface RamiCard { id: string; suit: RamiSuit; rank: number } // rank 1-13, joker = 0

export type RamiPlayer = 'player1' | 'player2';

export interface RamiMeld { id: string; owner: RamiPlayer; cards: RamiCard[] }

export interface RamiRoundSummary {
  winner: RamiPlayer;
  wentOutClean: boolean; // "Rami" : est sorti sans avoir eu besoin de défausser
  points: Record<RamiPlayer, number>; // points encaissés par chaque joueur ce round
}

export interface RamiState {
  deck: RamiCard[];
  discardPile: RamiCard[];
  hands: Record<RamiPlayer, RamiCard[]>;
  melds: RamiMeld[];
  scores: Record<RamiPlayer, number>;
  round: number;
  hasDrawn: boolean;
  lastDrawFrom: 'deck' | 'discard' | null;
  roundSummary: RamiRoundSummary | null;
}

export const SUIT_SYMBOLS: Record<RamiSuit, string> = {
  spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣', joker: '★',
};

export const RAMI_ELIMINATION = 151;
export const RAMI_HAND_SIZE = 13;

export const isRedSuit = (suit: RamiSuit) => suit === 'hearts' || suit === 'diamonds';

export const rankLabel = (card: RamiCard): string => {
  if (card.suit === 'joker') return 'JK';
  if (card.rank === 1) return 'A';
  if (card.rank === 11) return 'J';
  if (card.rank === 12) return 'Q';
  if (card.rank === 13) return 'K';
  return String(card.rank);
};

const cardPoints = (card: RamiCard): number => {
  if (card.suit === 'joker') return 25;
  if (card.rank === 1) return 1;
  if (card.rank >= 11) return 10;
  return card.rank;
};

export const handPoints = (hand: RamiCard[]): number => hand.reduce((sum, c) => sum + cardPoints(c), 0);

const buildDeck = (): RamiCard[] => {
  const suits: RamiSuit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const deck: RamiCard[] = [];
  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) deck.push({ id: `${suit}-${rank}`, suit, rank });
  }
  deck.push({ id: 'joker-1', suit: 'joker', rank: 0 });
  deck.push({ id: 'joker-2', suit: 'joker', rank: 0 });
  return deck;
};

const shuffle = (cards: RamiCard[]): RamiCard[] => {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const createRamiRound = (round: number, scores: Record<RamiPlayer, number>): RamiState => {
  const deck = shuffle(buildDeck());
  const player1 = deck.splice(0, RAMI_HAND_SIZE);
  const player2 = deck.splice(0, RAMI_HAND_SIZE);
  const firstDiscard = deck.splice(0, 1);
  return {
    deck,
    discardPile: firstDiscard,
    hands: { player1, player2 },
    melds: [],
    scores,
    round,
    hasDrawn: false,
    lastDrawFrom: null,
    roundSummary: null,
  };
};

export const createRamiState = (): RamiState => createRamiRound(1, { player1: 0, player2: 0 });

const opponentOf = (player: RamiPlayer): RamiPlayer => (player === 'player1' ? 'player2' : 'player1');

// ---------------------------------------------------------------------------
// Validation des combinaisons (brelan / suite), jokers = joker universel

export const isValidMeld = (cards: RamiCard[]): boolean => {
  if (cards.length < 3) return false;
  const jokers = cards.filter(c => c.suit === 'joker');
  const normal = cards.filter(c => c.suit !== 'joker');
  if (normal.length === 0) return false; // pas que des jokers

  const ranks = new Set(normal.map(c => c.rank));
  const suits = new Set(normal.map(c => c.suit));

  // Brelan/carré : même rang, couleurs toutes différentes, 3 à 4 cartes max
  if (ranks.size === 1) {
    return suits.size === normal.length && cards.length <= 4;
  }

  // Suite : même couleur, rangs consécutifs (jokers comblent les trous), pas de doublon de rang
  if (suits.size === 1 && ranks.size === normal.length) {
    const sorted = [...ranks].sort((a, b) => a - b);
    const span = sorted[sorted.length - 1] - sorted[0] + 1;
    const gaps = span - normal.length;
    return span <= 13 && gaps <= jokers.length && gaps >= 0;
  }

  return false;
};

// ---------------------------------------------------------------------------
// Actions

export const drawCard = (
  state: RamiState,
  player: RamiPlayer,
  from: 'deck' | 'discard',
): RamiState => {
  if (state.hasDrawn) return state; // déjà pioché ce tour

  const deck = [...state.deck];
  const discardPile = [...state.discardPile];
  let drawn: RamiCard;

  if (from === 'deck') {
    if (deck.length === 0) return state;
    drawn = deck.pop()!;
  } else {
    if (discardPile.length === 0) return state;
    drawn = discardPile.pop()!;
  }

  const hands = { ...state.hands, [player]: [...state.hands[player], drawn] };

  return { ...state, deck, discardPile, hands, hasDrawn: true, lastDrawFrom: from };
};

export const layMeld = (
  state: RamiState,
  player: RamiPlayer,
  handIndices: number[],
): { state: RamiState; ok: boolean } => {
  const hand = state.hands[player];
  const cards = handIndices.map(i => hand[i]).filter(Boolean);
  if (!state.hasDrawn || !isValidMeld(cards)) return { state, ok: false };

  const remaining = hand.filter((_, i) => !handIndices.includes(i));
  const meld: RamiMeld = { id: `meld-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, owner: player, cards };

  const nextState: RamiState = {
    ...state,
    hands: { ...state.hands, [player]: remaining },
    melds: [...state.melds, meld],
  };

  return { state: nextState, ok: true };
};

export interface RamiTurnResult {
  state: RamiState;
  nextPlayer: RamiPlayer;
  finished: boolean;
  winner?: RamiPlayer;
}

export const discardCard = (
  state: RamiState,
  player: RamiPlayer,
  handIndex: number,
): RamiTurnResult => {
  const hand = state.hands[player];
  const card = hand[handIndex];
  if (!state.hasDrawn || !card) {
    return { state, nextPlayer: player, finished: false };
  }

  const remainingHand = hand.filter((_, i) => i !== handIndex);
  const nextState: RamiState = {
    ...state,
    hands: { ...state.hands, [player]: remainingHand },
    discardPile: [...state.discardPile, card],
    hasDrawn: false,
    lastDrawFrom: null,
  };

  return finalizeIfRoundOver(nextState, player, false);
};

// Sortie "Rami" : le joueur pose ses dernières cartes et termine avec une main vide sans défausser.
export const checkCleanWin = (state: RamiState, player: RamiPlayer): RamiTurnResult | null => {
  if (state.hands[player].length !== 0) return null;
  return finalizeIfRoundOver({ ...state, hasDrawn: false }, player, true);
};

const finalizeIfRoundOver = (
  state: RamiState,
  actingPlayer: RamiPlayer,
  wentOutClean: boolean,
): RamiTurnResult => {
  if (state.hands[actingPlayer].length === 0) {
    const loser = opponentOf(actingPlayer);
    const penalty = handPoints(state.hands[loser]) + (wentOutClean ? 25 : 0);
    const scores = { ...state.scores, [loser]: state.scores[loser] + penalty };
    const summary: RamiRoundSummary = {
      winner: actingPlayer,
      wentOutClean,
      points: { [actingPlayer]: 0, [loser]: penalty } as Record<RamiPlayer, number>,
    };

    if (scores[loser] >= RAMI_ELIMINATION) {
      return {
        state: { ...state, scores, roundSummary: summary },
        nextPlayer: actingPlayer,
        finished: true,
        winner: actingPlayer,
      };
    }

    const nextRound = createRamiRound(state.round + 1, scores);
    return {
      state: { ...nextRound, roundSummary: summary },
      nextPlayer: actingPlayer, // le perdant de la manche entame la suivante
      finished: false,
    };
  }

  return { state, nextPlayer: opponentOf(actingPlayer), finished: false };
};

// Ré-approvisionne le talon si la pioche est vide (garde la dernière carte de la défausse)
export const reshuffleIfNeeded = (state: RamiState): RamiState => {
  if (state.deck.length > 0 || state.discardPile.length <= 1) return state;
  const top = state.discardPile[state.discardPile.length - 1];
  const rest = state.discardPile.slice(0, -1);
  return { ...state, deck: shuffle(rest), discardPile: [top] };
};

export const addToMeld = (
  state: RamiState,
  player: RamiPlayer,
  handIndex: number,
  meldId: string,
): { state: RamiState; ok: boolean } => {
  if (!state.hasDrawn) return { state, ok: false };
  const hand = state.hands[player];
  const card = hand[handIndex];
  const meldIdx = state.melds.findIndex(m => m.id === meldId);
  if (!card || meldIdx === -1) return { state, ok: false };

  const meld = state.melds[meldIdx];
  const newCards = [...meld.cards, card];
  if (!isValidMeld(newCards)) return { state, ok: false };

  const melds = [...state.melds];
  melds[meldIdx] = { ...meld, cards: newCards };
  const hands = { ...state.hands, [player]: hand.filter((_, i) => i !== handIndex) };

  return { state: { ...state, melds, hands }, ok: true };
};

// ---------------------------------------------------------------------------
// IA simple

const findBestMelds = (hand: RamiCard[]): number[][] => {
  // Recherche gloutonne de combinaisons valides (brelans puis suites), sans réutiliser une carte.
  const used = new Set<number>();
  const melds: number[][] = [];
  const byRank = new Map<number, number[]>();
  const bySuit = new Map<RamiSuit, number[]>();

  hand.forEach((c, i) => {
    if (c.suit === 'joker') return;
    if (!byRank.has(c.rank)) byRank.set(c.rank, []);
    byRank.get(c.rank)!.push(i);
    if (!bySuit.has(c.suit)) bySuit.set(c.suit, []);
    bySuit.get(c.suit)!.push(i);
  });

  // Brelans
  for (const indices of byRank.values()) {
    const free = indices.filter(i => !used.has(i));
    if (free.length >= 3) {
      free.forEach(i => used.add(i));
      melds.push(free.slice(0, 4));
    }
  }

  // Suites
  for (const [suit, indices] of bySuit.entries()) {
    const free = indices.filter(i => !used.has(i)).sort((a, b) => hand[a].rank - hand[b].rank);
    let run: number[] = [];
    for (let k = 0; k < free.length; k++) {
      if (run.length === 0 || hand[free[k]].rank === hand[run[run.length - 1]].rank + 1) {
        run.push(free[k]);
      } else {
        if (run.length >= 3) { melds.push([...run]); run.forEach(i => used.add(i)); }
        run = [free[k]];
      }
    }
    if (run.length >= 3) { melds.push([...run]); run.forEach(i => used.add(i)); }
    void suit;
  }

  return melds;
};

export interface RamiAIMove {
  draw: { from: 'deck' } | { from: 'discard' };
  meldCardIds: string[][]; // groupes de cartes (par id) à poser, dans l'ordre
  additions: { cardId: string; meldId: string }[]; // cartes isolées à ajouter à des combinaisons déjà sur la table
  discardCardId: string;
}

export const handIndicesForIds = (hand: RamiCard[], ids: string[]): number[] =>
  ids.map(id => hand.findIndex(c => c.id === id)).filter(i => i !== -1);

export const ramiAI = (state: RamiState, player: RamiPlayer): RamiAIMove => {
  const hand = state.hands[player];
  const topDiscard = state.discardPile[state.discardPile.length - 1];

  const wouldComplete = topDiscard ? findBestMelds([...hand, topDiscard]).some(m => m.length >= 3) : false;
  // À défaut de compléter une combinaison, pioche en défausse si ça améliore la main
  // (remplace une carte à forte valeur de points par une carte plus légère).
  const worstInHand = [...hand].sort((a, b) => cardPoints(b) - cardPoints(a))[0];
  const wouldImprove = topDiscard && worstInHand ? cardPoints(topDiscard) < cardPoints(worstInHand) - 3 : false;

  const draw: RamiAIMove['draw'] = topDiscard && (wouldComplete || wouldImprove) ? { from: 'discard' } : { from: 'deck' };

  const simulatedHand = draw.from === 'discard' ? [...hand, topDiscard] : hand;
  const melds = findBestMelds(simulatedHand);
  const meldCardIds = melds.map(group => group.map(i => simulatedHand[i].id));

  const meldedIndices = new Set(melds.flat());
  let leftovers = simulatedHand
    .map((c, i) => ({ i, c }))
    .filter(({ i }) => !meldedIndices.has(i));

  // Essaie de caser les cartes restantes dans une combinaison déjà posée sur la table (existante avant ce tour)
  const additions: { cardId: string; meldId: string }[] = [];
  const stillLeftover: typeof leftovers = [];
  for (const item of leftovers) {
    const match = state.melds.find(m => isValidMeld([...m.cards, item.c]));
    if (match) additions.push({ cardId: item.c.id, meldId: match.id });
    else stillLeftover.push(item);
  }
  leftovers = stillLeftover;

  leftovers.sort((a, b) => cardPoints(b.c) - cardPoints(a.c));
  const discardCardId = leftovers.length > 0 ? leftovers[0].c.id : simulatedHand[simulatedHand.length - 1].id;

  return { draw, meldCardIds, additions, discardCardId };
};
