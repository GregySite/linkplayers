// Blackjack à 2 joueurs contre un croupier commun (comme à une vraie table).
// Chaque manche : les deux joueurs jouent leur main (tirer/rester) l'un après
// l'autre, puis le croupier joue automatiquement (tire jusqu'à 17), et chaque
// joueur est comparé indépendamment au croupier. +1 point par victoire (ou
// blackjack), premier à BLACKJACK_TARGET points gagne le match.
// Structure calquée sur les autres lib/*Utils.ts du projet.

export type BlackjackSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export interface BlackjackCard { id: string; suit: BlackjackSuit; rank: number } // 1=As, 2-10, 11=V, 12=D, 13=R

export type BlackjackPlayer = 'player1' | 'player2';
export type BlackjackOutcome = 'win' | 'lose' | 'push' | 'blackjack';

export interface BlackjackRoundSummary {
  results: Record<BlackjackPlayer, BlackjackOutcome>;
  dealerHand: BlackjackCard[];
  dealerValue: number;
  playerValues: Record<BlackjackPlayer, number>;
}

export interface BlackjackState {
  deck: BlackjackCard[];
  hands: Record<BlackjackPlayer, BlackjackCard[]>;
  dealerHand: BlackjackCard[];
  standing: Record<BlackjackPlayer, boolean>;
  busted: Record<BlackjackPlayer, boolean>;
  turn: BlackjackPlayer;
  scores: Record<BlackjackPlayer, number>;
  round: number;
  roundSummary: BlackjackRoundSummary | null;
}

export const BLACKJACK_TARGET = 5;

const SUIT_SYMBOLS: Record<BlackjackSuit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
export { SUIT_SYMBOLS };
export const isRedSuit = (suit: BlackjackSuit) => suit === 'hearts' || suit === 'diamonds';

export const rankLabel = (card: BlackjackCard): string => {
  if (card.rank === 1) return 'A';
  if (card.rank === 11) return 'V';
  if (card.rank === 12) return 'D';
  if (card.rank === 13) return 'R';
  return String(card.rank);
};

const buildDeck = (): BlackjackCard[] => {
  const suits: BlackjackSuit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const deck: BlackjackCard[] = [];
  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) deck.push({ id: `${suit}-${rank}`, suit, rank });
  }
  return deck;
};

const shuffle = (cards: BlackjackCard[]): BlackjackCard[] => {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/** Valeur d'une main, as compté à 11 sauf si ça fait dépasser 21 (alors 1). */
export const handValue = (cards: BlackjackCard[]): number => {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 1) { aces++; total += 11; }
    else if (c.rank >= 11) total += 10;
    else total += c.rank;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
};

export const isBlackjackHand = (cards: BlackjackCard[]): boolean => cards.length === 2 && handValue(cards) === 21;

const createBlackjackRound = (round: number, scores: Record<BlackjackPlayer, number>): BlackjackState => {
  const deck = shuffle(buildDeck());
  const draw = () => deck.pop() as BlackjackCard;
  const hands: Record<BlackjackPlayer, BlackjackCard[]> = {
    player1: [draw(), draw()],
    player2: [draw(), draw()],
  };
  const dealerHand = [draw(), draw()];
  return {
    deck,
    hands,
    dealerHand,
    standing: { player1: false, player2: false },
    busted: { player1: false, player2: false },
    turn: 'player1',
    scores,
    round,
    roundSummary: null,
  };
};

export const createBlackjackState = (): BlackjackState => createBlackjackRound(1, { player1: 0, player2: 0 });

const nextActiveTurn = (state: BlackjackState): BlackjackPlayer | null => {
  if (!state.standing.player1 && !state.busted.player1) return 'player1';
  if (!state.standing.player2 && !state.busted.player2) return 'player2';
  return null;
};

export interface BlackjackTurnResult {
  state: BlackjackState;
  nextPlayer: BlackjackPlayer;
  finished: boolean;
  winner?: BlackjackPlayer;
}

const resolveRound = (state: BlackjackState): BlackjackTurnResult => {
  // Le croupier joue : tire jusqu'à 17 (inclus, il reste toujours sur 17+)
  let deck = [...state.deck];
  let dealerHand = [...state.dealerHand];
  while (handValue(dealerHand) < 17) {
    const card = deck.pop();
    if (!card) break;
    dealerHand = [...dealerHand, card];
  }
  const dealerValue = handValue(dealerHand);
  const dealerBusted = dealerValue > 21;
  const dealerBlackjack = isBlackjackHand(state.dealerHand); // sur les 2 cartes d'origine uniquement

  const results = {} as Record<BlackjackPlayer, BlackjackOutcome>;
  const playerValues = {} as Record<BlackjackPlayer, number>;
  const scores = { ...state.scores };

  (['player1', 'player2'] as BlackjackPlayer[]).forEach((p) => {
    const hand = state.hands[p];
    const value = handValue(hand);
    playerValues[p] = value;
    const playerBusted = state.busted[p] || value > 21;
    const playerBlackjack = isBlackjackHand(hand);

    let outcome: BlackjackOutcome;
    if (playerBusted) outcome = 'lose';
    else if (playerBlackjack && !dealerBlackjack) outcome = 'blackjack';
    else if (dealerBlackjack && !playerBlackjack) outcome = 'lose';
    else if (dealerBusted) outcome = 'win';
    else if (value > dealerValue) outcome = 'win';
    else if (value < dealerValue) outcome = 'lose';
    else outcome = 'push';

    results[p] = outcome;
    if (outcome === 'win' || outcome === 'blackjack') scores[p] += 1;
  });

  const roundSummary: BlackjackRoundSummary = { results, dealerHand, dealerValue, playerValues };

  if (scores.player1 >= BLACKJACK_TARGET || scores.player2 >= BLACKJACK_TARGET) {
    const winner = scores.player1 === scores.player2 ? undefined : (scores.player1 > scores.player2 ? 'player1' : 'player2');
    return {
      state: { ...state, deck, dealerHand, scores, roundSummary },
      nextPlayer: 'player1',
      finished: true,
      winner,
    };
  }

  const next = createBlackjackRound(state.round + 1, scores);
  return { state: { ...next, roundSummary }, nextPlayer: 'player1', finished: false };
};

export const playBlackjackAction = (
  state: BlackjackState,
  player: BlackjackPlayer,
  action: 'hit' | 'stand',
): BlackjackTurnResult => {
  // Le résumé de la manche précédente n'a de sens que pour un aller-retour ;
  // on le nettoie dès qu'une nouvelle action est jouée dans la manche suivante.
  const workingState = state.roundSummary ? { ...state, roundSummary: null } : state;

  if (workingState.turn !== player || workingState.standing[player] || workingState.busted[player]) {
    return { state: workingState, nextPlayer: workingState.turn, finished: false };
  }

  let deck = workingState.deck;
  let hands = workingState.hands;
  let standing = workingState.standing;
  let busted = workingState.busted;

  if (action === 'hit') {
    deck = [...workingState.deck];
    const card = deck.pop();
    if (card) {
      const newHand = [...workingState.hands[player], card];
      hands = { ...workingState.hands, [player]: newHand };
      if (handValue(newHand) > 21) {
        busted = { ...workingState.busted, [player]: true };
      }
    }
  } else {
    standing = { ...workingState.standing, [player]: true };
  }

  let nextState: BlackjackState = { ...workingState, deck, hands, standing, busted };

  const active = nextActiveTurn(nextState);
  if (active) {
    nextState = { ...nextState, turn: active };
    return { state: nextState, nextPlayer: active, finished: false };
  }

  return resolveRound(nextState);
};

// ---------------------------------------------------------------------------
// IA simple : stratégie de croupier, tire tant que < 17

export const blackjackAI = (state: BlackjackState, player: BlackjackPlayer): 'hit' | 'stand' => {
  return handValue(state.hands[player]) < 17 ? 'hit' : 'stand';
};
