import { supabase } from '@/integrations/supabase/client';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const AuthButton = () => {
  const { user } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!user) return null;

  const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Joueur';
  const avatar = user.user_metadata?.avatar_url;

  return (
    <div className="flex items-center gap-2">
      {avatar ? (
        <img src={avatar} alt={name} className="w-7 h-7 rounded-full border border-border" />
      ) : (
        <User className="w-5 h-5 text-muted-foreground" />
      )}
      <span className="text-sm text-foreground font-medium hidden sm:inline max-w-[120px] truncate">
        {name}
      </span>
      <button
        onClick={handleSignOut}
        className="p-1.5 hover:bg-muted rounded-lg transition-colors"
        title="Se déconnecter"
      >
        <LogOut className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
};
