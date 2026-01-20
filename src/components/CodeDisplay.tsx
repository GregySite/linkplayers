import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';

interface CodeDisplayProps {
  code: string;
}

export const CodeDisplay = ({ code }: CodeDisplayProps) => {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-muted rounded-xl p-6 text-center"
    >
      <p className="text-muted-foreground text-sm mb-3">
        Partage ce code avec ton adversaire
      </p>
      <div className="flex items-center justify-center gap-3">
        <div className="font-display text-4xl tracking-[0.3em] font-bold text-primary">
          {code}
        </div>
        <button
          onClick={copyCode}
          className="p-2 hover:bg-card rounded-lg transition-colors"
          title="Copier le code"
        >
          {copied ? (
            <Check className="w-5 h-5 text-success" />
          ) : (
            <Copy className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>
    </motion.div>
  );
};
