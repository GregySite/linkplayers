import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Game } from '@/hooks/useGame';
import { supabase } from '@/integrations/supabase/client';
import {
  ALPHABET, getPenduDisplay, getWrongGuessCount, isPenduWon, isPenduLost, PENDU_MAX_ERRORS, normalizeWord,
} from '@/lib/penduUtils';

interface PenduGameProps {
  game: Game;
  playerId: string;
  onMove: (letter: string) => void;
  onSetWord: (word: string) => void;
}

// Hangman SVG drawing
const HangmanDrawing = ({ errors }: { errors: number }) => {
  const parts = [
    // Head
    <circle key="head" cx="200" cy="80" r="20" stroke="currentColor" strokeWidth="3" fill="none" />,
    // Body
    <line key="body" x1="200" y1="100" x2="200" y2="160" stroke="currentColor" strokeWidth="3" />,
    // Left arm
    <line key="larm" x1="200" y1="120" x2="170" y2="145" stroke="currentColor" strokeWidth="3" />,
    // Right arm
    <line key="rarm" x1="200" y1="120" x2="230" y2="145" stroke="currentColor" strokeWidth="3" />,
    // Left leg
    <line key="lleg" x1="200" y1="160" x2="175" y2="195" stroke="currentColor" strokeWidth="3" />,
    // Right leg
    <line key="rleg" x1="200" y1="160" x2="225" y2="195" stroke="currentColor" strokeWidth="3" />,
  ];

  return (
    <svg viewBox="0 0 300 220" className="w-48 h-36 text-foreground">
      {/* Gallows */}
      <line x1="60" y1="210" x2="160" y2="210" stroke="currentColor" strokeWidth="3" />
      <line x1="110" y1="210" x2="110" y2="30" stroke="currentColor" strokeWidth="3" />
      <line x1="110" y1="30" x2="200" y2="30" stroke="currentColor" strokeWidth="3" />
      <line x1="200" y1="30" x2="200" y2="60" stroke="currentColor" strokeWidth="3" />
      {/* Body parts based on errors */}
      {parts.slice(0, errors)}
    </svg>
  );
};

export const PenduGame = ({ game, playerId, onMove, onSetWord }: PenduGameProps) => {
  const [wordInput, setWordInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const gameState = game.game_state as Record<string, unknown>;
  const word = gameState.word as string | null;
  const guessedLetters = (gameState.guessedLetters as string[]) || [];
  const amPlayer1 = game.player1_id === playerId;
  const isChooser = amPlayer1; // Player 1 chooses the word
  const isGuesser = !amPlayer1; // Player 2 guesses

  // Phase: waiting for word
  if (!word && game.status === 'playing') {
    if (isChooser) {
      const handleSubmitWord = async () => {
        const clean = wordInput.trim().toUpperCase();
        if (clean.length < 3) {
          setValidationError('Le mot doit contenir au moins 3 lettres.');
          return;
        }

        setValidating(true);
        setValidationError(null);

        try {
          const { data, error } = await supabase.functions.invoke('validate-word', {
            body: { word: clean },
          });

          if (error) {
            setValidationError('Erreur de validation. Réessaie.');
            setValidating(false);
            return;
          }

          if (!data.valid) {
            setValidationError(data.reason || 'Mot non reconnu.');
            setValidating(false);
            return;
          }

          onSetWord(clean);
        } catch {
          setValidationError('Erreur réseau. Réessaie.');
        } finally {
          setValidating(false);
        }
      };

      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto space-y-6 text-center">
          <h2 className="text-xl font-bold text-foreground">Choisis un mot</h2>
          <p className="text-muted-foreground text-sm">Ton adversaire devra le deviner lettre par lettre.</p>
          <div className="space-y-3">
            <input
              type="text"
              value={wordInput}
              onChange={(e) => {
                setWordInput(e.target.value.replace(/[^a-zA-ZàâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ]/g, ''));
                setValidationError(null);
              }}
              placeholder="Tape ton mot ici..."
              className="w-full text-center text-2xl font-bold tracking-widest bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={20}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitWord()}
            />
            {validationError && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-destructive text-sm">
                {validationError}
              </motion.p>
            )}
            <button
              onClick={handleSubmitWord}
              disabled={validating || wordInput.length < 3}
              className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {validating ? 'Vérification...' : 'Valider le mot'}
            </button>
          </div>
        </motion.div>
      );
    }

    // Guesser waiting
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto" />
        <p className="text-muted-foreground">Ton adversaire choisit un mot...</p>
      </motion.div>
    );
  }

  if (!word) return null;

  const display = getPenduDisplay(word, guessedLetters);
  const errors = getWrongGuessCount(word, guessedLetters);
  const won = isPenduWon(word, guessedLetters);
  const lost = isPenduLost(word, guessedLetters);
  const isMyTurn = game.current_turn === playerId;
  const gameOver = won || lost;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-lg mx-auto space-y-6">
      {/* Hangman drawing */}
      <div className="flex justify-center">
        <HangmanDrawing errors={errors} />
      </div>

      {/* Errors counter */}
      <div className="text-center text-sm text-muted-foreground">
        {errors} / {PENDU_MAX_ERRORS} erreurs
      </div>

      {/* Word display */}
      <div className="flex justify-center gap-2 flex-wrap">
        {display.map((letter, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            className={`w-10 h-12 flex items-center justify-center border-b-2 text-2xl font-bold ${
              letter === '_' ? 'border-muted-foreground' : 'border-primary text-foreground'
            }`}
          >
            {letter === '_' ? '' : letter}
          </motion.div>
        ))}
      </div>

      {/* Game over messages */}
      {gameOver && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-2">
          {won && (
            <p className="text-xl font-bold text-primary">
              {isGuesser ? '🎉 Bravo, tu as trouvé !' : '😅 Il a trouvé ton mot !'}
            </p>
          )}
          {lost && (
            <p className="text-xl font-bold text-destructive">
              {isGuesser ? '💀 Perdu !' : '🎉 Il n\'a pas trouvé !'}
            </p>
          )}
          <p className="text-muted-foreground">
            Le mot était : <span className="font-bold text-foreground">{word}</span>
          </p>
        </motion.div>
      )}

      {/* Status */}
      {!gameOver && (
        <div className="text-center text-sm">
          {isChooser ? (
            <p className="text-muted-foreground">Ton adversaire devine ton mot...</p>
          ) : isMyTurn ? (
            <p className="text-primary font-medium">À toi de deviner une lettre !</p>
          ) : (
            <p className="text-muted-foreground">Attends ton tour...</p>
          )}
        </div>
      )}

      {/* Keyboard (only for guesser) */}
      {isGuesser && !gameOver && (
        <div className="flex flex-wrap justify-center gap-1.5 max-w-sm mx-auto">
          {ALPHABET.map((letter) => {
            const guessed = guessedLetters.includes(letter);
            const normalized = normalizeWord(word);
            const isCorrect = guessed && normalized.includes(letter);
            const isWrong = guessed && !normalized.includes(letter);
            
            return (
              <motion.button
                key={letter}
                whileHover={!guessed && isMyTurn ? { scale: 1.1 } : {}}
                whileTap={!guessed && isMyTurn ? { scale: 0.9 } : {}}
                onClick={() => !guessed && isMyTurn && onMove(letter)}
                disabled={guessed || !isMyTurn}
                className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                  isCorrect
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : isWrong
                    ? 'bg-destructive/20 text-destructive/60 border border-destructive/20'
                    : !isMyTurn
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-card border border-border text-foreground hover:border-primary/50 cursor-pointer'
                }`}
              >
                {letter}
              </motion.button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
