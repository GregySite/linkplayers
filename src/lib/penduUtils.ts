// Normalize a word: remove accents and convert to uppercase
export const normalizeWord = (word: string): string => {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
};

export const PENDU_MAX_ERRORS = 6;

export const getPenduDisplay = (word: string, guessedLetters: string[]): string[] => {
  const normalized = normalizeWord(word);
  return normalized.split('').map(letter => {
    if (guessedLetters.includes(letter)) return letter;
    return '_';
  });
};

export const isPenduWon = (word: string, guessedLetters: string[]): boolean => {
  const normalized = normalizeWord(word);
  return normalized.split('').every(letter => guessedLetters.includes(letter));
};

export const isPenduLost = (word: string, guessedLetters: string[]): boolean => {
  const normalized = normalizeWord(word);
  const wrongGuesses = guessedLetters.filter(l => !normalized.includes(l));
  return wrongGuesses.length >= PENDU_MAX_ERRORS;
};

export const getWrongGuessCount = (word: string, guessedLetters: string[]): number => {
  const normalized = normalizeWord(word);
  return guessedLetters.filter(l => !normalized.includes(l)).length;
};

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
