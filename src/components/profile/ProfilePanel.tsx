import { motion } from 'framer-motion';
import { LogOut, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

const ProfilePanel = () => {
  const { profile, isAdmin, signOut } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col items-center justify-center p-6"
    >
      <div className="glass-card p-8 w-full max-w-sm text-center">
        <Avatar className="w-24 h-24 mx-auto mb-4">
          <AvatarFallback className="bg-primary/20 text-primary text-3xl font-display">
            {profile?.username?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        <h2 className="text-2xl font-display font-bold text-foreground mb-2">
          {profile?.username || 'User'}
        </h2>

        {isAdmin && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            Admin
          </div>
        )}

        <div className="space-y-4 mt-6">
          <div className="p-4 rounded-xl bg-secondary/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-xs text-muted-foreground">Username</p>
              <p className="font-medium text-foreground">{profile?.username}</p>
            </div>
          </div>

          <Button
            onClick={signOut}
            variant="outline"
            className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfilePanel;