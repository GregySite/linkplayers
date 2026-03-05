import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { LogIn, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { User as SupaUser } from '@supabase/supabase-js';

export const AuthButton = () => {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
    } catch (e) {
      console.error('Google sign-in error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Don't show anything for anonymous users — they look "not logged in"
  const isAnonymous = user?.is_anonymous;
  const isLoggedIn = user && !isAnonymous;

  if (isLoggedIn) {
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
  }

  return (
    <Button
      onClick={handleSignIn}
      disabled={loading}
      variant="outline"
      size="sm"
      className="border-border hover:border-primary/50"
    >
      <LogIn className="w-4 h-4 mr-2" />
      Connexion Google
    </Button>
  );
};
