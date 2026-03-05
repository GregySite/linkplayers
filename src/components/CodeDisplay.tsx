import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';

interface CodeDisplayProps {
  code: string;
}

export const CodeDisplay = ({ code }: CodeDisplayProps) => {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(`https://linkplayers.lovable.app/game/${code}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-muted rounded-xl p-6 text-center"
    >
      <p className="text-muted-foreground text-sm mb-3">
        Partage ce code ou ce lien avec ton adversaire
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
      <div className="mt-3 flex items-center justify-center gap-2">
        <a
          href={`https://linkplayers.lovable.app/game/${code}`}
          className="text-xs text-muted-foreground hover:text-primary transition-colors break-all"
        >
          https://linkplayers.lovable.app/game/{code}
        </a>
        <button
          onClick={copyLink}
          className="p-1 hover:bg-card rounded transition-colors flex-shrink-0"
          title="Copier le lien"
        >
          {linkCopied ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </motion.div>
  );
};
