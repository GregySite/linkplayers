import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Game } from '@/hooks/useGame';
import { Button } from '@/components/ui/button';
import {
  ChkobbaCard, ChkobbaState, SUIT_SYMBOLS, CHKOBBA_TARGET, isRedSuit,
  findCaptureOptions, capturableTableIndices, isValidCapture,
} from '@/lib/chkobbaUtils';

interface ChkobbaGameProps {
  game: Game;
  playerId: string;
  onPlay: (handIndex: number, selection: number[]) => void;
}

const CardFace = ({ card, size = 'md' }: { card: ChkobbaCard; size?: 'sm' | 'md' }) => (
  <div className={`flex flex-col items-center justify-center leading-none ${size === 'sm' ? 'text-xs' : 'text-sm'} ${isRedSuit(card.suit) ? 'text-destructive' : ''}`}>
    <span className={size === 'sm' ? 'text-base font-bold' : 'text-xl font-bold'}>{card.value}</span>
    <span className={size === 'sm' ? 'text-xs' : 'text-base'}>{SUIT_SYMBOLS[card.suit]}</span>
  </div>
);

/** Mini-carte utilisée pour l'historique du dernier coup. */
const MiniCard = ({ card }: { card: ChkobbaCard }) => (
  <div className={`w-8 h-11 rounded-md border border-border bg-card flex flex-col items-center justify-center leading-none ${isRedSuit(card.suit) ? 'text-destructive' : 'text-foreground'}`}>
    <span className="text-sm font-bold">{card.value}</span>
    <span className="text-xs">{SUIT_SYMBOLS[card.suit]}</span>
  </div>
);

export const ChkobbaGame = ({ game, playerId, onPlay }: ChkobbaGameProps) => {
  const state = game.game_state as unknown as ChkobbaState;
  const amPlayer1 = game.player1_id === playerId;
  const me = amPlayer1 ? 'player1' : 'player2';
  const opponent = amPlayer1 ? 'player2' : 'player1';
  const isMyTurn = game.current_turn === playerId && game.status === 'playing';
  const isFinished = game.status === 'finished' || !!game.winner;

  const [selectedHand, setSelectedHand] = useState<number | null>(null);
  const [selectedTable, setSelectedTable] = useState<number[]>([]);

  // Réinitialise la sélection dès que le plateau change
  useEffect(() => {
    setSelectedHand(null);
    setSelectedTable([]);
  }, [game.updated_at]);

  if (!state?.hands) {
    return <p className="text-muted-foreground">Distribution en cours...</p>;
  }

  const myHand = state.hands[me] || [];
  const table = state.table || [];
  const opponentHandCount = (state.hands[opponent] || []).length;
  const scores = state.matchScores || { player1: 0, player2: 0 };
  const myScore = scores[me];
  const opponentScore = scores[opponent];

  const selectedCard = selectedHand !== null ? myHand[selectedHand] : null;
  const options = selectedCard ? findCaptureOptions(table, selectedCard) : [];
  const highlighted = selectedCard ? capturableTableIndices(table, selectedCard) : [];
  const mustCapture = options.length > 0;
  const selectionValid = selectedCard
    ? mustCapture
      ? isValidCapture(table, selectedCard, selectedTable)
      : selectedTable.length === 0
    : false;

  const handleHandClick = (index: number) => {
    if (!isMyTurn || isFinished) return;
    setSelectedTable([]);
    setSelectedHand(prev => (prev === index ? null : index));
  };

  const handleTableClick = (index: number) => {
    if (!isMyTurn || isFinished || selectedHand === null || !mustCapture) return;
    if (!highlighted.includes(index)) return;
    setSelectedTable(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index],
    );
  };

  const handleConfirm = () => {
    if (selectedHand === null || !selectionValid) return;
    onPlay(selectedHand, mustCapture ? selectedTable : []);
    setSelectedHand(null);
    setSelectedTable([]);
  };

  const lastPlay = state.lastPlay;
  const summary = state.roundSummary;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto space-y-5">
      {/* Scores de partie */}
      <div className="flex items-center justify-between px-2">
        <div className={`text-center ${isMyTurn ? 'text-primary' : 'text-muted-foreground'}`}>
          <p className="text-xs uppercase tracking-wider">Toi</p>
          <p className="text-2xl font-bold">{myScore}</p>
        </div>
        <div className="text-center text-muted-foreground text-xs space-y-1">
          <p>Manche {state.round} · {CHKOBBA_TARGET} pts</p>
          <p>{state.deck.length} cartes au talon</p>
        </div>
        <div className={`text-center ${!isMyTurn && !isFinished ? 'text-primary' : 'text-muted-foreground'}`}>
          <p className="text-xs uppercase tracking-wider">Adversaire</p>
          <p className="text-2xl font-bold">{opponentScore}</p>
        </div>
      </div>

      {/* Statut */}
      <div className="text-center text-sm min-h-[1.5rem]">
        {isFinished ? (
          <p className="text-lg font-bold">
            {game.winner === playerId ? (
              <span className="text-primary">🎉 Victoire !</span>
            ) : game.winner ? (
              <span className="text-destructive">😔 Défaite...</span>
            ) : (
              <span className="text-muted-foreground">Égalité !</span>
            )}
          </p>
        ) : isMyTurn ? (
          <p className="text-primary font-medium">
            {selectedHand === null
              ? 'Choisis une carte de ta main'
              : mustCapture
                ? 'Sélectionne les cartes à ramasser'
                : 'Aucune capture possible — pose la carte'}
          </p>
        ) : (
          <p className="text-muted-foreground">Au tour de l'adversaire...</p>
        )}
      </div>

      {/* Main adverse (dos de cartes) */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: opponentHandCount }).map((_, i) => (
          <div key={i} className="w-10 h-14 rounded-lg bg-muted border-2 border-border flex items-center justify-center text-muted-foreground/30">
            ?
          </div>
        ))}
      </div>

      {/* Tapis */}
      <div className="rounded-2xl border border-border bg-card/50 p-3 min-h-[6.5rem]">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground mb-2 text-center">Tapis</p>
        <div className="flex flex-wrap justify-center gap-2">
          <AnimatePresence>
            {table.map((card, index) => {
              const isSelected = selectedTable.includes(index);
              const isHighlighted = highlighted.includes(index);
              return (
                <motion.button
                  key={card.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={isHighlighted ? { scale: 0.94 } : {}}
                  onClick={() => handleTableClick(index)}
                  className={`w-12 h-16 rounded-lg border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-primary/20 border-primary text-primary'
                      : isHighlighted
                        ? 'bg-card border-primary/50 text-foreground'
                        : 'bg-card border-border text-foreground'
                  }`}
                >
                  <CardFace card={card} />
                </motion.button>
              );
            })}
          </AnimatePresence>
          {table.length === 0 && (
            <p className="text-xs text-muted-foreground py-6">Tapis vide</p>
          )}
        </div>
      </div>

      {/* Dernier coup */}
      {lastPlay && !isFinished && (
        <p className="text-center text-xs text-muted-foreground">
          {lastPlay.player === me ? 'Tu as joué' : 'Adversaire a joué'}{' '}
          <span className="text-foreground font-medium">
            {lastPlay.card.value}{SUIT_SYMBOLS[lastPlay.card.suit]}
          </span>{' '}
          {lastPlay.captured.length > 0 ? `et ramassé ${lastPlay.captured.length} carte(s)` : 'et posé la carte'}
          {lastPlay.chkobba && <span className="text-primary font-bold"> · CHKOBBA !</span>}
        </p>
      )}

      {/* Ma main */}
      <div className="space-y-3">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground text-center">Ta main</p>
        <div className="flex justify-center gap-3">
          <AnimatePresence>
            {myHand.map((card, index) => (
              <motion.button
                key={card.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: selectedHand === index ? -8 : 0 }}
                exit={{ opacity: 0, y: 20 }}
                whileTap={isMyTurn ? { scale: 0.95 } : {}}
                onClick={() => handleHandClick(index)}
                disabled={!isMyTurn || isFinished}
                className={`w-16 h-24 rounded-xl border-2 flex items-center justify-center transition-colors ${
                  selectedHand === index
                    ? 'bg-primary/20 border-primary text-primary'
                    : isMyTurn
                      ? 'bg-card border-border hover:border-primary/50 text-foreground'
                      : 'bg-card border-border text-muted-foreground'
                }`}
              >
                <div className="flex flex-col items-center leading-none">
                  <span className="text-2xl font-bold">{card.value}</span>
                  <span className="text-xl">{SUIT_SYMBOLS[card.suit]}</span>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {isMyTurn && selectedHand !== null && (
          <div className="flex justify-center">
            <Button onClick={handleConfirm} disabled={!selectionValid} className="px-8">
              {mustCapture ? `Ramasser (${selectedTable.length})` : 'Poser la carte'}
            </Button>
          </div>
        )}
      </div>

      {/* Cartes ramassées */}
      <div className="flex justify-between text-xs text-muted-foreground px-2">
        <span>Ramassées : {(state.captured[me] || []).length} · Chkobbas : {state.chkobbas[me]}</span>
        <span>Adv. : {(state.captured[opponent] || []).length} · {state.chkobbas[opponent]}</span>
      </div>

      {/* Résumé de la manche précédente */}
      {summary && (
        <div className="rounded-xl border border-border bg-card/50 p-3 space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground text-center mb-2">
            Manche terminée — {summary.points[me]} pt(s) pour toi, {summary.points[opponent]} pour l'adversaire
          </p>
          {summary.details.map(d => (
            <div key={d.label} className="flex justify-between text-xs">
              <span className={d.winner === me ? 'text-primary font-medium' : 'text-muted-foreground'}>
                {amPlayer1 ? d.p1 : d.p2}
              </span>
              <span className="text-muted-foreground">{d.label}</span>
              <span className={d.winner === opponent ? 'text-primary font-medium' : 'text-muted-foreground'}>
                {amPlayer1 ? d.p2 : d.p1}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
