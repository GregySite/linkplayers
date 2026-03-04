import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Share2, MessageCircle, Send, Mail, Link } from 'lucide-react';

interface CodeDisplayProps {
  code: string;
}

export const CodeDisplay = ({ code }: CodeDisplayProps) => {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const gameUrl = `${window.location.origin}/?join=${code}`;
  const shareText = `Rejoins-moi pour une partie ! 🎮\nCode : ${code}\n${gameUrl}`;

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

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(gameUrl)}&text=${encodeURIComponent(`Rejoins-moi pour une partie ! 🎮 Code : ${code}`)}`, '_blank');
  };

  const shareSMS = () => {
    window.open(`sms:?body=${encodeURIComponent(shareText)}`, '_blank');
  };

  const shareEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent('Rejoins ma partie ! 🎮')}&body=${encodeURIComponent(shareText)}`, '_blank');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Rejoins ma partie ! 🎮', text: shareText, url: gameUrl });
      } catch {}
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-muted rounded-xl p-6 text-center space-y-4"
    >
      <p className="text-muted-foreground text-sm">
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
            <Check className="w-5 h-5 text-green-500" />
          ) : (
            <Copy className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 flex-wrap">
        <button
          onClick={shareWhatsApp}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp
        </button>
        <button
          onClick={shareTelegram}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0088cc] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Send className="w-4 h-4" />
          Telegram
        </button>
        <button
          onClick={shareSMS}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <MessageCircle className="w-4 h-4" />
          SMS
        </button>
        <button
          onClick={shareEmail}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Mail className="w-4 h-4" />
          Email
        </button>
        <button
          onClick={copyLink}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {linkCopied ? <Check className="w-4 h-4 text-green-500" /> : <Link className="w-4 h-4" />}
          {linkCopied ? 'Copié !' : 'Copier le lien'}
        </button>
        {typeof navigator.share === 'function' && (
          <button
            onClick={shareNative}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Share2 className="w-4 h-4" />
            Partager
          </button>
        )}
      </div>
    </motion.div>
  );
};
