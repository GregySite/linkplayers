import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CodeDisplayProps {
  code: string;
}

export const CodeDisplay = ({ code }: CodeDisplayProps) => {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Utilise le domaine réellement servi, pour que le lien reste valable
  // quel que soit l'hébergement (preview Lovable, domaine perso...).
  const gameUrl = `${window.location.origin}/game/${code}`;

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(gameUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const share = async () => {
    const shareData = {
      title: 'Rejoins ma partie !',
      text: `Rejoins-moi sur linkplayers avec le code ${code} :`,
      url: gameUrl,
    };

    // navigator.share ouvre le menu de partage natif (WhatsApp, SMS...).
    // Absent sur la plupart des navigateurs de bureau : on retombe sur la copie.
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // L'utilisateur a annulé le partage : on ne fait rien de plus.
        return;
      }
    }
    await copyLink();
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

      <div className="mt-4 flex justify-center">
        <Button onClick={share} size="lg" className="font-semibold px-8">
          <Share2 className="w-5 h-5 mr-2" />
          Partager l'invitation
        </Button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <span className="text-xs text-muted-foreground break-all">{gameUrl}</span>
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
