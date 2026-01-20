import { motion } from 'framer-motion';
import { GameType } from '@/hooks/useGame';

interface GameCardProps {
  type: GameType;
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export const GameCard = ({ type, title, description, icon, onClick }: GameCardProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -5 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className="relative cursor-pointer group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors duration-300">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-display text-xl font-semibold text-foreground mb-1">
              {title}
            </h3>
            <p className="text-muted-foreground text-sm">
              {description}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
