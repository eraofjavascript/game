import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, UserPlus, Calendar, BarChart3, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

const AdminPanel = ({ isOpen, onClose, onDataChanged }: AdminPanelProps) => {
  const [activeTab, setActiveTab] = useState('schedule');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Schedule form
  const [schedule, setSchedule] = useState({
    game_type: 'football',
    match_date: '',
    match_time: '',
    match_day: '',
    description: '',
    location: '',
  });

  // Poll form
  const [poll, setPoll] = useState({
    question: '',
    options: ['', ''],
  });

  // User form
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
  });

  const handleCreateSchedule = async () => {
    if (!schedule.game_type || !schedule.match_date || !schedule.match_time || !schedule.match_day) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.from('schedules').insert({
      ...schedule,
      created_by: user?.id,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Schedule created!" });
      setSchedule({ game_type: 'football', match_date: '', match_time: '', match_day: '', description: '', location: '' });
      onDataChanged();
    }
    setIsLoading(false);
  };

  const handleCreatePoll = async () => {
    const validOptions = poll.options.filter((o) => o.trim());
    if (!poll.question || validOptions.length < 2) {
      toast({ title: "Error", description: "Please provide a question and at least 2 options", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.from('polls').insert({
      question: poll.question,
      options: validOptions,
      created_by: user?.id,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Poll created!" });
      setPoll({ question: '', options: ['', ''] });
      onDataChanged();
    }
    setIsLoading(false);
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }

    if (newUser.password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    
    // Convert username to email format for Supabase auth
    const email = `${newUser.username.toLowerCase().trim()}@matchschedule.local`;
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: newUser.password,
      options: {
        data: { username: newUser.username },
        emailRedirectTo: window.location.origin,
      },
    });

    if (authError) {
      toast({ title: "Error", description: authError.message, variant: "destructive" });
      setIsLoading(false);
      return;
    }

    if (authData.user) {
      // Add member role
      await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role: 'member',
      });

      toast({ 
        title: "User Created!", 
        description: `Username: ${newUser.username}\nPassword: ${newUser.password}`,
      });
      setNewUser({ username: '', password: '' });
    }
    setIsLoading(false);
  };

  const addPollOption = () => {
    if (poll.options.length < 6) {
      setPoll({ ...poll, options: [...poll.options, ''] });
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const updated = [...poll.options];
    updated[index] = value;
    setPoll({ ...poll, options: updated });
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <h2 className="text-2xl font-display font-bold neon-text mb-6">Commands</h2>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-6 bg-secondary">
          <TabsTrigger value="schedule" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="poll" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <BarChart3 className="w-4 h-4 mr-2" />
            Poll
          </TabsTrigger>
          <TabsTrigger value="user" className="data-[state=active]:bg-neon-purple data-[state=active]:text-foreground">
            <UserPlus className="w-4 h-4 mr-2" />
            User
          </TabsTrigger>
        </TabsList>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Game Type</Label>
              <Select value={schedule.game_type} onValueChange={(v) => setSchedule({ ...schedule, game_type: v })}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="football">Football</SelectItem>
                  <SelectItem value="cricket">Cricket</SelectItem>
                  <SelectItem value="basketball">Basketball</SelectItem>
                  <SelectItem value="tennis">Tennis</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Day</Label>
              <Select value={schedule.match_day} onValueChange={(v) => setSchedule({ ...schedule, match_day: v })}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={schedule.match_date}
                onChange={(e) => setSchedule({ ...schedule, match_date: e.target.value })}
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={schedule.match_time}
                onChange={(e) => setSchedule({ ...schedule, match_time: e.target.value })}
                className="bg-secondary/50"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Location (Optional)</Label>
            <Input
              value={schedule.location}
              onChange={(e) => setSchedule({ ...schedule, location: e.target.value })}
              placeholder="Match location"
              className="bg-secondary/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              value={schedule.description}
              onChange={(e) => setSchedule({ ...schedule, description: e.target.value })}
              placeholder="Additional details..."
              className="bg-secondary/50"
            />
          </div>
          <Button onClick={handleCreateSchedule} disabled={isLoading} className="w-full bg-primary hover:bg-primary/90">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Create Schedule
          </Button>
        </TabsContent>

        {/* Poll Tab */}
        <TabsContent value="poll" className="space-y-4">
          <div className="space-y-2">
            <Label>Question</Label>
            <Input
              value={poll.question}
              onChange={(e) => setPoll({ ...poll, question: e.target.value })}
              placeholder="What would you like to ask?"
              className="bg-secondary/50"
            />
          </div>
          <div className="space-y-3">
            <Label>Options</Label>
            {poll.options.map((option, index) => (
              <Input
                key={index}
                value={option}
                onChange={(e) => updatePollOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                className="bg-secondary/50"
              />
            ))}
            {poll.options.length < 6 && (
              <Button variant="outline" onClick={addPollOption} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            )}
          </div>
          <Button onClick={handleCreatePoll} disabled={isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Create Poll
          </Button>
        </TabsContent>

        {/* User Tab */}
        <TabsContent value="user" className="space-y-4">
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20 mb-4">
            <p className="text-sm text-accent">
              Create new member accounts. Share the username and password with your team members.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              placeholder="Enter username"
              className="bg-secondary/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="text"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="Create a password (min 6 characters)"
              className="bg-secondary/50"
            />
          </div>
          <Button onClick={handleCreateUser} disabled={isLoading} className="w-full bg-neon-purple hover:bg-neon-purple/90">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
            Create Member
          </Button>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default AdminPanel;