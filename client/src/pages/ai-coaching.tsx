import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Bot, User } from "lucide-react";
import type { SelectNote } from "@db/schema";

export default function AiCoaching() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
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

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">AI Coaching Assistant</h1>

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
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
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
                  <div className="space-y-6">
                    {conversations.map((note) => {
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
                                  {new Date(note.createdAt!).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Loading state for pending response */}
                          {coachingMutation.isPending && note === conversations[0] && !answer && (
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
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}