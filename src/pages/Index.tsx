import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Grid3X3, Ship, Users, Zap, Circle, Hand, Disc, PenLine, Crown, Layers } from 'lucide-react';
import { GameCard } from '@/components/GameCard';
import { JoinGameModal } from '@/components/JoinGameModal';
import { Button } from '@/components/ui/button';
import { useGame, GameType } from '@/hooks/useGame';

const GAMES: { type: GameType; title: string; description: string; icon: React.ReactNode }[] = [
  { type: 'morpion', title: 'Morpion', description: 'Le classique des classiques. Aligne 3 symboles pour gagner !', icon: <Grid3X3 className="w-6 h-6" /> },
  { type: 'battleship', title: 'Bataille Navale', description: 'Place tes navires et coule la flotte adverse !', icon: <Ship className="w-6 h-6" /> },
  { type: 'connect4', title: 'Puissance 4', description: 'Fais tomber tes jetons et aligne-en 4 pour gagner !', icon: <Circle className="w-6 h-6" /> },
  { type: 'rps', title: 'Pierre-Papier-Ciseaux', description: 'Best of 3 — choisis ta main et bats ton adversaire !', icon: <Hand className="w-6 h-6" /> },
  { type: 'othello', title: 'Othello', description: 'Encadre les pions adverses pour les capturer. Stratégie pure !', icon: <Disc className="w-6 h-6" /> },
  { type: 'pendu', title: 'Pendu', description: 'Choisis un mot et fais deviner ton adversaire lettre par lettre !', icon: <PenLine className="w-6 h-6" /> },
  { type: 'dames', title: 'Dames', description: 'Le jeu de dames classique sur plateau 10×10. Capture les pions adverses !', icon: <Crown className="w-6 h-6" /> },
  { type: 'memory', title: 'Memory', description: 'Retourne les cartes et trouve les paires avant ton adversaire !', icon: <Layers className="w-6 h-6" /> },
];

const Index = () => {
  const navigate = useNavigate();
  const { createGame, joinGame, loading, error } = useGame();
  const [joinModalOpen, setJoinModalOpen] = useState(false);

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
            <div className="grid gap-4">
              {GAMES.map((g) => (
                <GameCard key={g.type} type={g.type} title={g.title} description={g.description} icon={g.icon} onClick={() => handleCreateGame(g.type)} />
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
    </div>
  );
};

export default Index;
