import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ScheduleCard from '@/components/feed/ScheduleCard';
import PollCard from '@/components/feed/PollCard';
import ChatPanel from '@/components/chat/ChatPanel';
import AdminPanel from '@/components/admin/AdminPanel';
import BottomNav from '@/components/navigation/BottomNav';
import ProfilePanel from '@/components/profile/ProfilePanel';

interface Schedule {
  id: string;
  game_type: string;
  match_date: string;
  match_time: string;
  match_day: string;
  description: string | null;
  location: string | null;
  created_at: string;
}

interface Poll {
  id: string;
  question: string;
  options: string[];
  created_at: string;
  is_active: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  schedule_id: string | null;
  poll_id: string | null;
  profiles: { username: string };
}

interface Vote {
  poll_id: string;
  option_index: number;
  user_id: string;
}

type FeedItem = { type: 'schedule'; data: Schedule } | { type: 'poll'; data: Poll };
type Tab = 'home' | 'chat' | 'profile' | 'commands';

const Dashboard = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const { profile, isAdmin } = useAuth();

  useEffect(() => {
    fetchData();

    const commentsChannel = supabase
      .channel('comments-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, () => {
        fetchComments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchSchedules(), fetchPolls(), fetchComments(), fetchVotes()]);
  };

  const fetchSchedules = async () => {
    const { data } = await supabase
      .from('schedules')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setSchedules(data);
  };

  const fetchPolls = async () => {
    const { data } = await supabase
      .from('polls')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) {
      setPolls(data.map(p => ({ ...p, options: p.options as string[] })));
    }
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (data) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const commentsWithProfiles = data.map(c => ({
        ...c,
        profiles: profileMap.get(c.user_id) || { username: 'Unknown' }
      }));
      setComments(commentsWithProfiles as Comment[]);
    }
  };

  const fetchVotes = async () => {
    const { data } = await supabase.from('poll_votes').select('poll_id, option_index, user_id');
    if (data) setVotes(data);
  };

  const feedItems: FeedItem[] = [
    ...schedules.map((s) => ({ type: 'schedule' as const, data: s })),
    ...polls.map((p) => ({ type: 'poll' as const, data: p })),
  ].sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime());

  const getScheduleComments = (scheduleId: string) =>
    comments.filter((c) => c.schedule_id === scheduleId);

  const getPollComments = (pollId: string) =>
    comments.filter((c) => c.poll_id === pollId);

  const getPollVotes = (pollId: string) =>
    votes.filter((v) => v.poll_id === pollId);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex-shrink-0 border-b border-border bg-background/80 backdrop-blur-xl"
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center pulse-glow">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-display font-bold neon-text">Match Schedule</h1>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden pb-24">
        {activeTab === 'home' && (
          <div className="h-full overflow-y-auto">
            <div className="container mx-auto px-4 py-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-3">
                  <span className="neon-text">Feed</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Latest updates
                  </span>
                </h2>
              </motion.div>

              {feedItems.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-12 text-center"
                >
                  <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-display font-semibold mb-2">No Updates Yet</h3>
                  <p className="text-muted-foreground">
                    {isAdmin ? "Create your first schedule or poll!" : "Check back soon for match updates!"}
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-6">
                  {feedItems.map((item, index) => (
                    <motion.div
                      key={item.data.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {item.type === 'schedule' ? (
                        <ScheduleCard
                          schedule={item.data}
                          comments={getScheduleComments(item.data.id)}
                          onCommentAdded={fetchComments}
                        />
                      ) : (
                        <PollCard
                          poll={item.data}
                          votes={getPollVotes(item.data.id)}
                          comments={getPollComments(item.data.id)}
                          onVote={fetchVotes}
                          onCommentAdded={fetchComments}
                        />
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="h-full">
            <ChatPanel isFullScreen onBack={() => setActiveTab('home')} />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="h-full overflow-y-auto">
            <ProfilePanel />
          </div>
        )}

        {activeTab === 'commands' && isAdmin && (
          <div className="h-full overflow-y-auto">
            <div className="container mx-auto px-4 py-6">
              <AdminPanel isOpen={true} onClose={() => setActiveTab('home')} onDataChanged={fetchData} />
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default Dashboard;