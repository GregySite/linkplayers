// Memory card game utilities

export const MEMORY_EMOJIS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
  '🦄', '🐲', '🦋', '🐢',
];

export interface MemoryCard {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

export const createMemoryBoard = (pairCount: number = 10): MemoryCard[] => {
  const emojis = MEMORY_EMOJIS.slice(0, pairCount);
  const cards: MemoryCard[] = [];
  
  // Create pairs
  emojis.forEach((emoji, idx) => {
    cards.push({ id: idx * 2, emoji, flipped: false, matched: false });
    cards.push({ id: idx * 2 + 1, emoji, flipped: false, matched: false });
  });
  
  // Shuffle using Fisher-Yates
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  
  return cards;
};

export const checkMemoryMatch = (cards: MemoryCard[], idx1: number, idx2: number): boolean => {
  return cards[idx1].emoji === cards[idx2].emoji;
};

export const isMemoryGameOver = (cards: MemoryCard[]): boolean => {
  return cards.every(c => c.matched);
};
