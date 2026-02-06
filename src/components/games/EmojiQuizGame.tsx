import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Check, X, SkipForward } from 'lucide-react';
import { Game } from '@/hooks/useGame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EmojiQuizRound {
  emojis: string;
  answer: string;
  guess: string;
  correct: boolean | null;
  master: 'player1' | 'player2';
}

interface EmojiQuizGameProps {
  game: Game;
  playerId: string;
  onSendEmojis: (emojis: string, answer: string) => void;
  onGuess: (guess: string) => void;
  onJudge: (correct: boolean) => void;
  onSkip: () => void;
}

export const EmojiQuizGame = ({ game, playerId, onSendEmojis, onGuess, onJudge, onSkip }: EmojiQuizGameProps) => {
  const [emojiInput, setEmojiInput] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [guessInput, setGuessInput] = useState('');

  const gameState = game.game_state as {
    currentMaster: 'player1' | 'player2';
    emojis: string;
    answer: string;
    guess: string;
    rounds: EmojiQuizRound[];
    currentRound: number;
    judging: boolean;
  };

  const amPlayer1 = game.player1_id === playerId;
  const currentMaster = gameState.currentMaster || 'player1';
  const amMaster = (currentMaster === 'player1' && amPlayer1) || (currentMaster === 'player2' && !amPlayer1);
  const rounds = gameState.rounds || [];
  const emojis = gameState.emojis || '';
  const guess = gameState.guess || '';
  const judging = gameState.judging || false;

  const myScore = rounds.filter(r => {
    const wasGuesser = (r.master === 'player1' && !amPlayer1) || (r.master === 'player2' && amPlayer1);
    return wasGuesser && r.correct;
  }).length;
  const opponentScore = rounds.filter(r => {
    const wasGuesser = (r.master === 'player1' && amPlayer1) || (r.master === 'player2' && !amPlayer1);
    return wasGuesser && r.correct;
  }).length;

  const getStatusMessage = () => {
    if (game.status === 'waiting') return '⏳ En attente de l\'adversaire...';
    if (judging && amMaster) return '🧑‍⚖️ Juge la réponse de ton adversaire !';
    if (judging && !amMaster) return '⏳ En attente du jugement...';
    if (amMaster && !emojis) return '🎭 Envoie des emojis pour faire deviner !';
    if (amMaster && emojis) return '⏳ En attente de la réponse...';
    if (!amMaster && emojis && !guess) return '🤔 Devine ce que représentent les emojis !';
    if (!amMaster && !emojis) return '⏳ En attente des emojis...';
    return '🎭 Quiz Emoji !';
  };

  const handleSendEmojis = () => {
    if (emojiInput.trim() && answerInput.trim()) {
      onSendEmojis(emojiInput.trim(), answerInput.trim());
      setEmojiInput('');
      setAnswerInput('');
    }
  };

  const handleGuess = () => {
    if (guessInput.trim()) {
      onGuess(guessInput.trim());
      setGuessInput('');
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xl font-display font-semibold text-foreground text-center"
      >
        {getStatusMessage()}
      </motion.div>

      {/* Score */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{myScore}</div>
          <div className="text-xs text-muted-foreground">Toi</div>
        </div>
        <div className="text-muted-foreground text-sm">Manche {rounds.length + 1}</div>
        <div className="text-center">
          <div className="text-2xl font-bold text-secondary">{opponentScore}</div>
          <div className="text-xs text-muted-foreground">Adversaire</div>
        </div>
      </div>

      {/* Emoji display */}
      {emojis && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-5xl sm:text-6xl text-center p-6 bg-card rounded-2xl border border-border min-w-[200px]"
        >
          {emojis}
        </motion.div>
      )}

      {/* Master: emoji input */}
      {amMaster && !emojis && game.status === 'playing' && (
        <div className="w-full space-y-3">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Tes emojis (film, chanson, personnage...)</label>
            <Input
              value={emojiInput}
              onChange={(e) => setEmojiInput(e.target.value)}
              placeholder="🎬🦁👑"
              className="text-2xl text-center"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">La réponse (pas visible par l'adversaire)</label>
            <Input
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              placeholder="Le Roi Lion"
            />
          </div>
          <Button onClick={handleSendEmojis} disabled={!emojiInput.trim() || !answerInput.trim()} className="w-full">
            <Send className="w-4 h-4 mr-2" />
            Envoyer
          </Button>
        </div>
      )}

      {/* Guesser: guess input */}
      {!amMaster && emojis && !guess && !judging && game.status === 'playing' && (
        <div className="w-full space-y-3">
          <Input
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
            placeholder="Ta réponse..."
            onKeyDown={(e) => e.key === 'Enter' && handleGuess()}
          />
          <div className="flex gap-2">
            <Button onClick={handleGuess} disabled={!guessInput.trim()} className="flex-1">
              <Send className="w-4 h-4 mr-2" />
              Deviner
            </Button>
            <Button onClick={onSkip} variant="outline">
              <SkipForward className="w-4 h-4 mr-2" />
              Passer
            </Button>
          </div>
        </div>
      )}

      {/* Master: judge the answer */}
      {amMaster && judging && game.status === 'playing' && (
        <div className="w-full space-y-3 text-center">
          <div className="text-muted-foreground text-sm">L'adversaire a répondu :</div>
          <div className="text-xl font-bold text-foreground bg-card rounded-xl p-4 border border-border">
            {guess}
          </div>
          <div className="text-muted-foreground text-sm">La réponse était : <strong>{gameState.answer}</strong></div>
          <div className="flex gap-3">
            <Button onClick={() => onJudge(true)} className="flex-1 bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4 mr-2" />
              Correct !
            </Button>
            <Button onClick={() => onJudge(false)} variant="destructive" className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Incorrect
            </Button>
          </div>
        </div>
      )}

      {/* Round history */}
      {rounds.length > 0 && (
        <div className="w-full space-y-2">
          <div className="text-sm text-muted-foreground font-medium">Historique</div>
          {rounds.map((round, i) => (
            <div key={i} className={`flex items-center justify-between p-2 rounded-lg text-sm ${
              round.correct ? 'bg-green-500/10' : 'bg-destructive/10'
            }`}>
              <span>{round.emojis}</span>
              <span className="text-muted-foreground">{round.answer}</span>
              <span>{round.correct ? '✅' : '❌'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
