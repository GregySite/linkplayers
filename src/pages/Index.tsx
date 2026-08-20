import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Grid3X3, Ship, Users, Zap, Circle, Hand, Disc, PenLine, Crown, Layers, Bot, Spade, Diamond, Club, CircleDot, Heart, Dice5, Goal } from 'lucide-react';
import { JoinGameModal } from '@/components/JoinGameModal';
import { GorillaIcon } from '@/components/GorillaIcon';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { GameRulesDrawer } from '@/components/GameRulesDrawer';
import { useGame, GameType } from '@/hooks/useGame';

const GAMES: { type: GameType; title: string; description: string; icon: React.ReactNode }[] = [
  { type: 'morpion', title: 'Morpion', description: 'Le classique des classiques. Aligne 3 symboles pour gagner !', icon: <Grid3X3 className="w-6 h-6" /> },
  { type: 'battleship', title: 'Bataille Navale', description: 'Place tes navires et coule la flotte adverse !', icon: <Ship className="w-6 h-6" /> },
  { type: 'connect4', title: 'Puissance 4', description: 'Fais tomber tes jetons et aligne-en 4 pour gagner !', icon: <Circle className="w-6 h-6" /> },
  { type: 'rps', title: 'Pierre-Papier-Ciseaux', description: 'Best of 3 — choisis ta main et bats ton adversaire !', icon: <Hand className="w-6 h-6" /> },
  { type: 'othello', title: 'Othello', description: 'Encadre les pions adverses pour les capturer. Stratégie pure !', icon: <Disc className="w-6 h-6" /> },
  { type: 'pendu', title: 'Pendu', description: 'Choisis un mot et fais deviner ton adversaire lettre par lettre !', icon: <PenLine className="w-6 h-6" /> },
  { type: 'dames', title: 'Dames', description: 'Le jeu de dames classique sur plateau 10×10. Capture les pions adverses !', icon: <Crown className="w-6 h-6" /> },
  { type: 'chkobba', title: 'Chkobba', description: 'Le jeu de cartes tunisien. Ramasse les cartes du tapis et vise 11 points !', icon: <Spade className="w-6 h-6" /> },
  { type: 'memory', title: 'Memory', description: 'Retourne les cartes et trouve les paires avant ton adversaire !', icon: <Layers className="w-6 h-6" /> },
  { type: 'yaniv', title: 'Yaniv', description: 'Défausse tes cartes, annonce Yaniv à 7 points ou moins... mais gare à l\'Assaf !', icon: <Diamond className="w-6 h-6" /> },
  { type: 'rami', title: 'Rami', description: 'Forme des brelans et des suites, pose tes combinaisons et vide ta main avant l\'adversaire !', icon: <Club className="w-6 h-6" /> },
  { type: 'awale', title: 'Kalah', description: 'Jeu de plateau simple et rapide. Sème tes graines, tombe sur une case vide pour capturer en face !', icon: <CircleDot className="w-6 h-6" /> },
  { type: 'belote', title: 'Belote', description: 'Le classique des cartes françaises. Atout, plis, belote-rebelote et dix de der !', icon: <Heart className="w-6 h-6" /> },
  { type: 'backgammon', title: 'Backgammon', description: 'Le grand classique du plateau et des dés. Rentre tes pions à la maison avant l\'adversaire !', icon: <Dice5 className="w-6 h-6" /> },
  { type: 'football', title: 'Foot Stars', description: 'Vise et tire tes pions comme au air-hockey pour envoyer le ballon au fond des filets ! Premier à 3 buts gagne.', icon: <Goal className="w-6 h-6" /> },
  { type: 'gorillas', title: 'Gorillas', description: 'Deux gorilles sur des gratte-ciels se lancent des bananes ! Indique l\'angle et la puissance pour toucher l\'adversaire.', icon: <GorillaIcon className="w-6 h-6" /> },
];

const Index = () => {
  const navigate = useNavigate();
  const { createGame, joinGame, loading, error } = useGame();
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<typeof GAMES[number] | null>(null);

  const handleCreateGame = async (type: GameType) => {
    const game = await createGame(type);
    if (game) navigate(`/game/${game.code}`);
  };

  const handleJoinGame = async (code: string) => {
    const game = await joinGame(code);
    if (game) { setJoinModalOpen(false); navigate(`/game/${game.code}`); }
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 py-16 relative">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-12">
            <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Jeux en duo</span>
            </motion.div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-4">
              Joue avec tes{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">amis</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Des jeux classiques en temps réel. Crée une partie, partage le code, et c'est parti !
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex justify-center mb-12">
            <Button onClick={() => setJoinModalOpen(true)} variant="outline" size="lg" className="border-primary/50 hover:bg-primary/10 hover:border-primary text-foreground font-semibold px-8">
              <Users className="w-5 h-5 mr-2" />
              Rejoindre une partie
            </Button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="max-w-2xl mx-auto">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-4 text-center font-medium">Choisir un jeu</h2>
            <div className="grid grid-cols-3 gap-2">
              {GAMES.map((g) => (
                <motion.button
                  key={g.type}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedGame(g)}
                  className="flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-colors text-center"
                >
                  <div className="text-primary">{g.icon}</div>
                  <span className="text-xs font-medium text-foreground leading-tight">{g.title}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <footer className="border-t border-border mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Créé avec ❤️ pour jouer entre amis</p>
        </div>
      </footer>

      <JoinGameModal isOpen={joinModalOpen} onClose={() => setJoinModalOpen(false)} onJoin={handleJoinGame} loading={loading} error={error} />

      <Drawer open={!!selectedGame} onOpenChange={(open) => !open && setSelectedGame(null)}>
        <DrawerContent>
          {selectedGame && (
            <>
              <DrawerHeader>
                <div className="flex justify-center mb-2 text-primary">{selectedGame.icon}</div>
                <DrawerTitle className="text-center">{selectedGame.title}</DrawerTitle>
                <DrawerDescription className="text-center">{selectedGame.description}</DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <div className="flex justify-center">
                  <GameRulesDrawer gameType={selectedGame.type} gameTitle={selectedGame.title} variant="full" />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => { setSelectedGame(null); handleCreateGame(selectedGame.type); }}
                    size="lg"
                    className="flex-1 font-semibold"
                  >
                    <Users className="w-5 h-5 mr-2" />
                    Duo
                  </Button>
                  <Button
                    onClick={() => { setSelectedGame(null); navigate(`/solo/${selectedGame.type}`); }}
                    variant="outline"
                    size="lg"
                    className="flex-1 border-primary/50 hover:bg-primary/10 hover:border-primary font-semibold"
                  >
                    <Bot className="w-5 h-5 mr-2" />
                    Solo
                  </Button>
                </div>
                <DrawerClose asChild>
                  <Button variant="ghost">Annuler</Button>
                </DrawerClose>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Index;
