import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { BarChart3, Check, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
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

interface PollCardProps {
  poll: {
    id: string;
    question: string;
    options: string[];
    created_at: string;
    is_active: boolean;
  };
  votes: { option_index: number; user_id: string }[];
  comments: Comment[];
  onVote: () => void;
  onCommentAdded: () => void;
}

const PollCard = ({ poll, votes, comments, onVote, onCommentAdded }: PollCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const userVote = votes.find((v) => v.user_id === user?.id);
  const totalVotes = votes.length;

  const getVoteCount = (index: number) => votes.filter((v) => v.option_index === index).length;
  const getPercentage = (index: number) => (totalVotes > 0 ? Math.round((getVoteCount(index) / totalVotes) * 100) : 0);

  const handleVote = async (optionIndex: number) => {
    if (!user || userVote) return;

    const { error } = await supabase.from('poll_votes').insert({
      poll_id: poll.id,
      user_id: user.id,
      option_index: optionIndex,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to vote", variant: "destructive" });
    } else {
      onVote();
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    setIsSubmitting(true);
    const { error } = await supabase.from('comments').insert({
      content: newComment.trim(),
      poll_id: poll.id,
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
      className="glass-card p-6 hover:border-accent/30 transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-accent" />
          </div>
          <div>
            <span className="text-xs text-accent font-medium uppercase tracking-wider">Poll</span>
            <p className="text-sm text-muted-foreground">
              {format(new Date(poll.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        {poll.is_active && (
          <span className="px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-medium animate-pulse">
            Active
          </span>
        )}
      </div>

      {/* Question */}
      <h3 className="font-display font-semibold text-lg text-foreground mb-4">
        {poll.question}
      </h3>

      {/* Options */}
      <div className="space-y-3 mb-4">
        {poll.options.map((option, index) => {
          const percentage = getPercentage(index);
          const isSelected = userVote?.option_index === index;
          const hasVoted = !!userVote;

          return (
            <motion.button
              key={index}
              onClick={() => !hasVoted && handleVote(index)}
              disabled={hasVoted}
              className={`w-full relative overflow-hidden rounded-xl border transition-all duration-300 ${
                isSelected
                  ? 'border-accent bg-accent/10'
                  : hasVoted
                  ? 'border-border bg-secondary/30'
                  : 'border-border hover:border-accent/50 bg-secondary/30 hover:bg-secondary/50'
              }`}
              whileHover={!hasVoted ? { scale: 1.01 } : {}}
              whileTap={!hasVoted ? { scale: 0.99 } : {}}
            >
              {/* Progress bar */}
              {hasVoted && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`absolute inset-0 ${isSelected ? 'bg-accent/20' : 'bg-muted/50'}`}
                />
              )}

              <div className="relative z-10 flex items-center justify-between p-4">
                <span className="flex items-center gap-2 text-foreground">
                  {isSelected && <Check className="w-4 h-4 text-accent" />}
                  {option}
                </span>
                {hasVoted && (
                  <span className="text-sm font-medium text-muted-foreground">
                    {percentage}% ({getVoteCount(index)})
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center mb-4">
        {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
      </p>

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
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Post
              </Button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
              {comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-3 p-3 rounded-lg bg-secondary/30"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-accent/20 text-accent text-xs">
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

export default PollCard;
