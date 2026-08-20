import { Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PassPhoneScreenProps {
  playerLabel: string;
  onReady: () => void;
}

/**
 * Écran opaque affiché entre deux tours en mode local, pour que le joueur suivant
 * puisse prendre le téléphone sans voir le jeu de l'autre.
 */
export const PassPhoneScreen = ({ playerLabel, onReady }: PassPhoneScreenProps) => (
  <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-6 px-6">
    <Smartphone className="w-16 h-16 text-primary" />
    <div className="text-center space-y-2">
      <h2 className="font-display text-2xl font-bold text-foreground">
        Passe le téléphone à {playerLabel}
      </h2>
      <p className="text-sm text-muted-foreground">
        Ne regarde pas l'écran tant que ce n'est pas ton tour !
      </p>
    </div>
    <Button size="lg" onClick={onReady} className="font-semibold px-10">
      Je suis {playerLabel} — c'est parti
    </Button>
  </div>
);
