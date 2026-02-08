import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface JoinGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (code: string) => void;
  loading?: boolean;
  error?: string | null;
}

export const JoinGameModal = ({ isOpen, onClose, onJoin, loading, error }: JoinGameModalProps) => {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 4) {
      onJoin(code.toUpperCase());
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
          >
            <div className="bg-card border border-border rounded-xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Rejoindre une partie
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label className="block text-sm text-muted-foreground mb-2">
                    Code de la partie
                  </label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
                    placeholder="ABCD"
                    className="text-center text-3xl font-display tracking-[0.5em] uppercase h-16 bg-muted border-border focus:border-primary"
                    maxLength={4}
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-destructive text-sm mb-4 text-center">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={code.length !== 4 || loading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6"
                >
                  {loading ? (
                    <span className="animate-pulse">Connexion...</span>
                  ) : (
                    <>
                      Rejoindre
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
