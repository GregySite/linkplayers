import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface RoundTransitionOverlayProps {
  open: boolean;
  title: string;
  onContinue: () => void;
  children: ReactNode;
}

const AUTO_CLOSE_MS = 5000;
const TICK_MS = 50;

/**
 * Retient le résumé de manche au moment où il apparaît, et le garde affiché
 * jusqu'à ce que le joueur l'ait vu. Indispensable car le résumé est effacé de
 * l'état dès le coup suivant : en solo, l'IA joue ~1 s plus tard et ferait
 * disparaître la fenêtre avant la fin du décompte.
 */
export function useLatchedRoundSummary<T>(summary: T | null | undefined, round: number) {
  const [latched, setLatched] = useState<{ summary: T; round: number } | null>(null);
  const [ackedRound, setAckedRound] = useState<number | null>(null);

  useEffect(() => {
    if (summary) setLatched(prev => (prev?.round === round ? prev : { summary, round }));
  }, [summary, round]);

  const open = !!latched && latched.round !== ackedRound;

  const acknowledge = useCallback(() => {
    setLatched(prev => {
      if (prev) setAckedRound(prev.round);
      return prev;
    });
  }, []);

  return { open, summary: latched?.summary ?? null, acknowledge };
}

/**
 * Affiche le résultat de la manche qui vient de se terminer, puis enchaîne
 * automatiquement au bout de 5 secondes. Rester appuyé sur la fenêtre met le
 * décompte en pause (le temps de lire), le relâchement le reprend.
 */
export const RoundTransitionOverlay = ({ open, title, onContinue, children }: RoundTransitionOverlayProps) => {
  const [msLeft, setMsLeft] = useState(AUTO_CLOSE_MS);
  const [paused, setPaused] = useState(false);

  // Évite de relancer le minuteur à chaque rendu du parent (onContinue n'est pas mémoïsé)
  const onContinueRef = useRef(onContinue);
  useEffect(() => { onContinueRef.current = onContinue; }, [onContinue]);

  // Réarme le décompte à chaque ouverture
  useEffect(() => {
    if (open) {
      setMsLeft(AUTO_CLOSE_MS);
      setPaused(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || paused) return;
    const id = setInterval(() => {
      setMsLeft(prev => {
        const next = prev - TICK_MS;
        if (next <= 0) {
          clearInterval(id);
          onContinueRef.current();
          return 0;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [open, paused]);

  const pause = () => setPaused(true);
  const resume = () => setPaused(false);

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-xs select-none"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDown={pause}
        onPointerUp={resume}
        onPointerLeave={resume}
        onPointerCancel={resume}
        hideClose
      >
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-3 text-center">
          {children}
        </div>

        <div className="space-y-2">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full bg-primary ${paused ? '' : 'transition-[width] duration-75 ease-linear'}`}
              style={{ width: `${(msLeft / AUTO_CLOSE_MS) * 100}%` }}
            />
          </div>
          <p className="text-[0.7rem] text-center text-muted-foreground h-4">
            {paused ? 'En pause — relâche pour continuer' : 'Reste appuyé pour lire tranquillement'}
          </p>
          <Button onClick={() => onContinueRef.current()} className="w-full font-semibold">
            Manche suivante
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
