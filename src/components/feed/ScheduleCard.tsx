import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, MessageCircle, Gamepad2, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles: { username: string };
}

interface ScheduleCardProps {
  schedule: {
    id: string;
    game_type: string;
    match_date: string;
    match_time: string;
    match_day: string;
    description: string | null;
    location: string | null;
    created_at: string;
  };
  comments: Comment[];
  onCommentAdded: () => void;
}

const gameIcons: Record<string, typeof Trophy> = {
  football: Trophy,
  cricket: Gamepad2,
  default: Trophy,
};

const ScheduleCard = ({ schedule, comments, onCommentAdded }: ScheduleCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const GameIcon = gameIcons[schedule.game_type.toLowerCase()] || gameIcons.default;

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    setIsSubmitting(true);
    const { error } = await supabase.from('comments').insert({
      content: newComment.trim(),
      schedule_id: schedule.id,
      user_id: user.id,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to add comment", variant: "destructive" });
    } else {
      setNewComment('');
      onCommentAdded();
    }
    setIsSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 hover:border-primary/30 transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <GameIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-foreground capitalize">
              {schedule.game_type}
            </h3>
            <p className="text-sm text-muted-foreground">{schedule.match_day}</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
          Upcoming
        </span>
      </div>

      {/* Details */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Calendar className="w-4 h-4 text-accent" />
          <span className="text-sm">{format(new Date(schedule.match_date), 'MMMM d, yyyy')}</span>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Clock className="w-4 h-4 text-accent" />
          <span className="text-sm">{schedule.match_time}</span>
        </div>
        {schedule.location && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <MapPin className="w-4 h-4 text-accent" />
            <span className="text-sm">{schedule.location}</span>
          </div>
        )}
      </div>

      {schedule.description && (
        <p className="text-sm text-muted-foreground mb-4 p-3 rounded-lg bg-secondary/50">
          {schedule.description}
        </p>
      )}

      {/* Comments Section */}
      <div className="border-t border-border pt-4">
        <Button
          variant="ghost"
          onClick={() => setShowComments(!showComments)}
          className="w-full justify-between text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            {comments.length} Comments
          </span>
          {showComments ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 space-y-4"
          >
            {/* Comment Input */}
            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="bg-secondary/50 border-border"
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <Button
                onClick={handleAddComment}
                disabled={isSubmitting || !newComment.trim()}
                size="sm"
                className="bg-primary hover:bg-primary/90"
              >
                Post
              </Button>
            </div>

            {/* Comments List */}
            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
              {comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-3 p-3 rounded-lg bg-secondary/30"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {comment.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {comment.profiles?.username || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{comment.content}</p>
                  </div>
                </motion.div>
              ))}
              {comments.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No comments yet. Be the first!
                </p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default ScheduleCard;
