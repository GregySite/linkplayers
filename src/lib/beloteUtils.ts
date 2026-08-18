// Belote à 2 (variante simplifiée) — 32 cartes, atout tiré au hasard à chaque donne,
// obligation de fournir/couper, belote-rebelote (Roi+Dame d'atout), dix de der.
// Structure calquée sur les autres lib/*Utils.ts du projet.

export type BeloteSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export interface BeloteCard { id: string; suit: BeloteSuit; rank: number } // 7,8,9,10,11(V),12(D),13(R),14(A)

export type BelotePlayer = 'player1' | 'player2';

export interface BeloteTrickCard { player: BelotePlayer; card: BeloteCard }

export interface BeloteState {
  hands: Record<BelotePlayer, BeloteCard[]>;
  trumpSuit: BeloteSuit;
  currentTrick: BeloteTrickCard[];
  roundPoints: Record<BelotePlayer, number>;
  beloteRebeloteAwardedTo: BelotePlayer | null;
  scores: Record<BelotePlayer, number>;
  round: number;
  roundSummary: { points: Record<BelotePlayer, number>; beloteRebelote: BelotePlayer | null } | null;
}

export const BELOTE_ELIMINATION = 501;

const SUIT_SYMBOLS: Record<BeloteSuit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
export { SUIT_SYMBOLS };
export const isRedSuit = (suit: BeloteSuit) => suit === 'hearts' || suit === 'diamonds';

export const rankLabel = (card: BeloteCard): string => {
  if (card.rank === 11) return 'V';
  if (card.rank === 12) return 'D';
  if (card.rank === 13) return 'R';
  if (card.rank === 14) return 'A';
  return String(card.rank);
};

// Ordre de force (du plus faible au plus fort)
const NORMAL_ORDER = [7, 8, 9, 11, 12, 13, 10, 14];
const TRUMP_ORDER = [7, 8, 12, 13, 10, 14, 9, 11];

const strength = (rank: number, isTrump: boolean): number =>
  (isTrump ? TRUMP_ORDER : NORMAL_ORDER).indexOf(rank);

export const cardPoints = (card: BeloteCard, trumpSuit: BeloteSuit): number => {
  const isTrump = card.suit === trumpSuit;
  if (isTrump) {
    return { 11: 20, 9: 14, 14: 11, 10: 10, 13: 4, 12: 3, 8: 0, 7: 0 }[card.rank] ?? 0;
  }
  return { 14: 11, 10: 10, 13: 4, 12: 3, 11: 2, 9: 0, 8: 0, 7: 0 }[card.rank] ?? 0;
};

const opponentOf = (player: BelotePlayer): BelotePlayer => (player === 'player1' ? 'player2' : 'player1');

const buildDeck = (): BeloteCard[] => {
  const suits: BeloteSuit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const deck: BeloteCard[] = [];
  for (const suit of suits) {
    for (const rank of [7, 8, 9, 10, 11, 12, 13, 14]) deck.push({ id: `${suit}-${rank}`, suit, rank });
  }
  return deck;
};

const shuffle = (cards: BeloteCard[]): BeloteCard[] => {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const createBeloteRound = (round: number, scores: Record<BelotePlayer, number>): BeloteState => {
  const deck = shuffle(buildDeck());
  const suits: BeloteSuit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const trumpSuit = suits[Math.floor(Math.random() * 4)];
  return {
    hands: { player1: deck.slice(0, 16), player2: deck.slice(16, 32) },
    trumpSuit,
    currentTrick: [],
    roundPoints: { player1: 0, player2: 0 },
    beloteRebeloteAwardedTo: null,
    scores,
    round,
    roundSummary: null,
  };
};

export const createBeloteState = (): BeloteState => createBeloteRound(1, { player1: 0, player2: 0 });

export const legalPlays = (hand: BeloteCard[], trumpSuit: BeloteSuit, ledSuit: BeloteSuit | null): number[] => {
  if (!ledSuit) return hand.map((_, i) => i);

  const sameSuit = hand.map((c, i) => ({ c, i })).filter(({ c }) => c.suit === ledSuit);
  if (sameSuit.length > 0) return sameSuit.map(({ i }) => i);

  const trumps = hand.map((c, i) => ({ c, i })).filter(({ c }) => c.suit === trumpSuit);
  if (trumps.length > 0) return trumps.map(({ i }) => i);

  return hand.map((_, i) => i);
};

const trickWinner = (led: BeloteTrickCard, second: BeloteTrickCard, trumpSuit: BeloteSuit): BelotePlayer => {
  if (led.card.suit === second.card.suit) {
    const isTrump = led.card.suit === trumpSuit;
    return strength(second.card.rank, isTrump) > strength(led.card.rank, isTrump) ? second.player : led.player;
  }
  return second.card.suit === trumpSuit ? second.player : led.player;
};

export interface BeloteTurnResult {
  state: BeloteState;
  nextPlayer: BelotePlayer;
  finished: boolean;
  winner?: BelotePlayer;
}

export const playBeloteCard = (state: BeloteState, player: BelotePlayer, handIndex: number): BeloteTurnResult => {
  // Le résumé de la manche précédente n'a de sens que pour un seul aller-retour d'état ;
  // on le nettoie dès qu'une nouvelle carte est jouée dans la manche suivante.
  const workingState = state.roundSummary ? { ...state, roundSummary: null } : state;

  const hand = workingState.hands[player];
  const ledSuit = workingState.currentTrick.length > 0 ? workingState.currentTrick[0].card.suit : null;
  const legal = legalPlays(hand, workingState.trumpSuit, ledSuit);
  if (!legal.includes(handIndex)) return { state: workingState, nextPlayer: player, finished: false };

  const card = hand[handIndex];
  const remainingHand = hand.filter((_, i) => i !== handIndex);

  // Belote-rebelote : Roi+Dame d'atout tenus par le même joueur
  let beloteRebeloteAwardedTo = workingState.beloteRebeloteAwardedTo;
  let bonusPoints = 0;
  if (
    card.suit === workingState.trumpSuit &&
    (card.rank === 12 || card.rank === 13) &&
    !beloteRebeloteAwardedTo &&
    remainingHand.some(c => c.suit === workingState.trumpSuit && (c.rank === 12 || c.rank === 13))
  ) {
    beloteRebeloteAwardedTo = player;
    bonusPoints = 20;
  }

  const hands = { ...workingState.hands, [player]: remainingHand };
  const currentTrick = [...workingState.currentTrick, { player, card }];
  const roundPoints = bonusPoints
    ? { ...workingState.roundPoints, [player]: workingState.roundPoints[player] + bonusPoints }
    : workingState.roundPoints;

  let nextState: BeloteState = { ...workingState, hands, currentTrick, roundPoints, beloteRebeloteAwardedTo };

  if (currentTrick.length === 1) {
    return { state: nextState, nextPlayer: opponentOf(player), finished: false };
  }

  // Pli complet : détermine le vainqueur, encaisse les points
  const [led, second] = currentTrick;
  const winner = trickWinner(led, second, workingState.trumpSuit);
  const trickValue = cardPoints(led.card, workingState.trumpSuit) + cardPoints(second.card, workingState.trumpSuit);

  const isLastTrick = hands.player1.length === 0 && hands.player2.length === 0;
  const dixDeDer = isLastTrick ? 10 : 0;

  nextState = {
    ...nextState,
    currentTrick: [],
    roundPoints: { ...nextState.roundPoints, [winner]: nextState.roundPoints[winner] + trickValue + dixDeDer },
  };

  if (!isLastTrick) {
    return { state: nextState, nextPlayer: winner, finished: false };
  }

  // Fin de la donne : cumule les scores, vérifie l'élimination
  const loser = opponentOf(winner);
  const roundSummary = {
    points: { ...nextState.roundPoints },
    beloteRebelote: nextState.beloteRebeloteAwardedTo,
  };
  const scores: Record<BelotePlayer, number> = {
    player1: workingState.scores.player1 + nextState.roundPoints.player1,
    player2: workingState.scores.player2 + nextState.roundPoints.player2,
  };

  if (scores[winner] >= BELOTE_ELIMINATION || scores[loser] >= BELOTE_ELIMINATION) {
    const finalWinner = scores.player1 === scores.player2 ? undefined : (scores.player1 > scores.player2 ? 'player1' : 'player2');
    return {
      state: { ...nextState, scores, roundSummary },
      nextPlayer: winner,
      finished: true,
      winner: finalWinner,
    };
  }

  const next = createBeloteRound(workingState.round + 1, scores);
  return {
    state: { ...next, roundSummary },
    nextPlayer: winner, // le vainqueur de la donne précédente entame la suivante
    finished: false,
  };
};

// ---------------------------------------------------------------------------
// IA simple

export const beloteAI = (state: BeloteState, player: BelotePlayer): number => {
  const hand = state.hands[player];
  const ledSuit = state.currentTrick.length > 0 ? state.currentTrick[0].card.suit : null;
  const legal = legalPlays(hand, state.trumpSuit, ledSuit);

  if (state.currentTrick.length === 0) {
    // Entame : joue la carte la moins forte hors atout si possible
    const nonTrump = legal.filter(i => hand[i].suit !== state.trumpSuit);
    const pool = nonTrump.length > 0 ? nonTrump : legal;
    return [...pool].sort((a, b) => cardPoints(hand[a], state.trumpSuit) - cardPoints(hand[b], state.trumpSuit))[0];
  }

  const led = state.currentTrick[0];
  const winningNow = legal.filter(i => {
    const fakeSecond = { player, card: hand[i] };
    return trickWinner(led, fakeSecond, state.trumpSuit) === player;
  });

  if (winningNow.length > 0) {
    // Gagne le pli avec la carte la plus faible suffisante
    return [...winningNow].sort((a, b) => strength(hand[a].rank, hand[a].suit === state.trumpSuit) - strength(hand[b].rank, hand[b].suit === state.trumpSuit))[0];
  }

  // Ne peut pas gagner : se défausse de la carte la moins coûteuse
  return [...legal].sort((a, b) => cardPoints(hand[a], state.trumpSuit) - cardPoints(hand[b], state.trumpSuit))[0];
};
