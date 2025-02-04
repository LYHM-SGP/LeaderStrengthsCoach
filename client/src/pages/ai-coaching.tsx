import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Bot, User, Plus } from "lucide-react";
import type { SelectNote } from "@db/schema";

interface ConversationGroup {
  date: string;
  notes: SelectNote[];
}

export default function AiCoaching() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { data: conversations, isLoading: isLoadingConversations } = useQuery<SelectNote[]>({
    queryKey: ["/api/notes"],
    refetchInterval: 1000, // Poll every second for new messages
  });

  const coachingMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch("/api/ai-coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to get coaching response");
      }
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    coachingMutation.mutate(message);
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatMessage = (content: string) => {
    const parts = content.split('\n\nA: ');
    return {
      question: parts[0]?.replace('Q: ', '').trim() || '',
      answer: parts[1]?.trim() || ''
    };
  };

  // Function to replace body language cues with emojis
  const formatResponse = (text: string) => {
    return text.replace(/\((.*?)\)/g, (_, action) => {
      const emojiMap: Record<string, string> = {
        'nodding thoughtfully': '🤔',
        'leaning forward': '👨‍💼',
        'smiling warmly': '😊',
        'making eye contact': '👀',
        'gesturing encouragingly': '👋',
        'tilting head': '🤨',
        'showing genuine interest': '🎯',
        'listening attentively': '👂',
      };

      // Find the closest matching emoji or use a default
      const emoji = Object.entries(emojiMap).find(([key]) => 
        action.toLowerCase().includes(key.toLowerCase())
      )?.[1] || '🤖';

      return emoji;
    });
  };

  // Group conversations by date
  const groupConversations = (notes: SelectNote[] = []): ConversationGroup[] => {
    const groups: Record<string, SelectNote[]> = {};

    notes.forEach(note => {
      const date = new Date(note.createdAt!).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(note);
    });

    return Object.entries(groups).map(([date, notes]) => ({
      date,
      notes: notes.sort((a, b) => 
        new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
      )
    })).sort((a, b) => 
      new Date(b.notes[0].createdAt!).getTime() - new Date(a.notes[0].createdAt!).getTime()
    );
  };

  // Start new conversation by clearing the message history
  const startNewConversation = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    textareaRef.current?.focus();
    toast({
      title: "New Conversation Started",
      description: "What would you like to discuss?",
    });
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">AI Coaching Assistant</h1>
            <Button 
              onClick={startNewConversation}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Conversation
            </Button>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-6 w-6 text-primary" />
                  Chat with Your ICF PCC Certified AI Coach
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Share your thoughts or ask questions about leveraging your strengths..."
                    className="min-h-[100px]"
                    disabled={coachingMutation.isPending}
                  />
                  <Button
                    type="submit"
                    disabled={coachingMutation.isPending || !message.trim()}
                    className="w-full"
                  >
                    {coachingMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Coach is thinking...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Coaching History</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingConversations ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : !conversations?.length ? (
                  <p className="text-center text-muted-foreground py-8">
                    No conversations yet. Start by sending a message above.
                  </p>
                ) : (
                  <div className="space-y-8">
                    {groupConversations(conversations).map((group) => (
                      <div key={group.date} className="space-y-6">
                        <h3 className="font-semibold text-lg border-b pb-2">
                          {group.date}
                        </h3>
                        <div className="space-y-6">
                          {group.notes.map((note) => {
                            const { question, answer } = formatMessage(note.content);
                            return (
                              <div key={note.id} className="space-y-4">
                                {/* User message */}
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                    <User className="h-5 w-5" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="bg-muted/50 rounded-lg p-4">
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {question}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Coach response */}
                                {answer && (
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                      <Bot className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="bg-primary/10 rounded-lg p-4">
                                        <p className="text-sm whitespace-pre-wrap">
                                          {formatResponse(answer)}
                                        </p>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(note.createdAt!).toLocaleTimeString()}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Loading state for pending response */}
                                {coachingMutation.isPending && note === group.notes[0] && !answer && (
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                      <Bot className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="bg-primary/10 rounded-lg p-4">
                                        <div className="flex items-center gap-2">
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          <p className="text-sm">Coach is thinking...</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}