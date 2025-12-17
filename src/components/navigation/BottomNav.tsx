import { motion } from 'framer-motion';
import { Home, MessageCircle, User, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type Tab = 'home' | 'chat' | 'profile' | 'commands';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const { isAdmin } = useAuth();

  const tabs = [
    { id: 'home' as Tab, icon: Home, label: 'Home' },
    { id: 'chat' as Tab, icon: MessageCircle, label: 'Chat' },
    { id: 'profile' as Tab, icon: User, label: 'Profile' },
    ...(isAdmin ? [{ id: 'commands' as Tab, icon: Settings, label: 'Commands' }] : []),
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4"
    >
      <div className="flex items-center gap-2 p-2 rounded-2xl bg-card/90 backdrop-blur-xl border border-border shadow-2xl">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              whileTap={{ scale: 0.95 }}
              className={`relative flex flex-col items-center justify-center px-5 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-xl bg-primary"
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                />
              )}
              <tab.icon className={`w-5 h-5 relative z-10 ${isActive ? 'text-primary-foreground' : ''}`} />
              <span className={`text-xs mt-1 relative z-10 font-medium ${isActive ? 'text-primary-foreground' : ''}`}>
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default BottomNav;