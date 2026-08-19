import { HelpCircle } from 'lucide-react';
import { GameType } from '@/hooks/useGame';
import { GAME_RULES } from '@/lib/gameRules';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '@/components/ui/drawer';

interface GameRulesDrawerProps {
  gameType: GameType;
  gameTitle: string;
  /** Bouton "?" compact (en-tête de partie) ou bouton texte complet (menu principal) */
  variant?: 'icon' | 'full';
}

export const GameRulesDrawer = ({ gameType, gameTitle, variant = 'icon' }: GameRulesDrawerProps) => {
  const rules = GAME_RULES[gameType];
  if (!rules) return null;

  return (
    <Drawer>
      <DrawerTrigger asChild>
        {variant === 'icon' ? (
          <button
            className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Comment jouer ?"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        ) : (
          <Button variant="outline" size="sm" className="text-xs">
            <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
            Comment jouer ?
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{gameTitle} — Règles</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-2 space-y-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Objectif</p>
            <p className="text-foreground">{rules.objective}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Comment jouer</p>
            <ul className="space-y-1.5">
              {rules.rules.map((r, i) => (
                <li key={i} className="flex gap-2 text-foreground">
                  <span className="text-primary shrink-0">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Victoire</p>
            <p className="text-foreground">{rules.winCondition}</p>
          </div>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="ghost">Fermer</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
