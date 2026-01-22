import { motion } from 'framer-motion';
import { RefreshCw, Check, X, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RematchVoteProps {
  myVote: boolean | null;
  opponentVote: boolean | null;
  onVote: (wantRematch: boolean) => void;
  scores: { player1: number; player2: number };
  amPlayer1: boolean;
}

export const RematchVote = ({ myVote, opponentVote, onVote, scores, amPlayer1 }: RematchVoteProps) => {
  const myScore = amPlayer1 ? scores.player1 : scores.player2;
  const opponentScore = amPlayer1 ? scores.player2 : scores.player1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 p-6 bg-card rounded-xl border border-border"
    >
      {/* Scores */}
      <div className="flex items-center gap-8">
        <div className="flex flex-col items-center">
          <span className="text-sm text-muted-foreground">Toi</span>
          <span className="text-2xl font-bold text-primary">{myScore}</span>
        </div>
        <Trophy className="w-6 h-6 text-yellow-500" />
        <div className="flex flex-col items-center">
          <span className="text-sm text-muted-foreground">Adversaire</span>
          <span className="text-2xl font-bold text-secondary">{opponentScore}</span>
        </div>
      </div>

      {/* Vote status */}
      {myVote === null ? (
        <>
          <p className="text-foreground font-medium">Revanche ?</p>
          <div className="flex gap-4">
            <Button
              onClick={() => onVote(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Check className="w-4 h-4 mr-2" />
              Oui !
            </Button>
            <Button
              onClick={() => onVote(false)}
              variant="outline"
            >
              <X className="w-4 h-4 mr-2" />
              Non
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2">
          {myVote ? (
            <>
              <div className="flex items-center gap-2 text-success">
                <Check className="w-5 h-5" />
                <span>Tu veux une revanche</span>
              </div>
              {opponentVote === null && (
                <p className="text-muted-foreground animate-pulse">
                  En attente de l'adversaire...
                </p>
              )}
              {opponentVote === false && (
                <p className="text-muted-foreground">
                  L'adversaire a refusé la revanche
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <X className="w-5 h-5" />
              <span>Tu as refusé la revanche</span>
            </div>
          )}
        </div>
      )}

      {/* Opponent vote indicator */}
      {myVote !== null && opponentVote !== null && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Adversaire:</span>
          {opponentVote ? (
            <span className="text-success flex items-center gap-1">
              <Check className="w-4 h-4" /> Veut rejouer
            </span>
          ) : (
            <span className="text-destructive flex items-center gap-1">
              <X className="w-4 h-4" /> Refuse
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};
