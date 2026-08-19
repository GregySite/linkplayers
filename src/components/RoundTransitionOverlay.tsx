import { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface RoundTransitionOverlayProps {
  open: boolean;
  title: string;
  onContinue: () => void;
  children: ReactNode;
}

/**
 * Bloque l'écran entre deux manches (résultat de la manche qui vient de se terminer),
 * pour que le passage à la manche suivante soit clair au lieu de s'enchaîner sans transition.
 */
export const RoundTransitionOverlay = ({ open, title, onContinue, children }: RoundTransitionOverlayProps) => (
  <Dialog open={open}>
    <DialogContent
      className="max-w-xs"
      onInteractOutside={(e) => e.preventDefault()}
      onEscapeKeyDown={(e) => e.preventDefault()}
      hideClose
    >
      <DialogHeader>
        <DialogTitle className="text-center">{title}</DialogTitle>
      </DialogHeader>
      <div className="py-2 space-y-3 text-center">
        {children}
      </div>
      <Button onClick={onContinue} className="w-full font-semibold">
        Manche suivante
      </Button>
    </DialogContent>
  </Dialog>
);
