import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Bot, User, Plus, Trash2 } from "lucide-react";
import type { SelectNote } from "@db/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConversationGroup {
  id: string;
  title: string;
  date: string;
  notes: SelectNote[];
}

export default function AiCoaching() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const [previousInteractionId, setPreviousInteractionId] = useState<number | null>(null);

  const { data: notes } = useQuery<SelectNote[]>({
    queryKey: ["/api/notes"],
    refetchInterval: 1000,
  });

  const coachingMutation = useMutation({
    mutationFn: async (message: string) => {
      setPendingMessage(message); // Set pending message immediately
      const res = await fetch("/api/ai-coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          conversationId: activeConversationId,
          previousInteractionId
        }),
      });
      if (!res.ok) {
        setPendingMessage(null); // Clear pending message on error
        const error = await res.text();
        throw new Error(error || "Failed to get coaching response");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setMessage("");
      setPendingMessage(null); // Clear pending message on success
      setPreviousInteractionId(data.note.id);
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    },
    onError: (error: Error) => {
      setPendingMessage(null); // Clear pending message on error
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notes/clear", {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to clear coaching history");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({
        title: "History Cleared",
        description: "Your coaching conversation history has been cleared.",
      });
      setActiveConversationId(null);
      setPreviousInteractionId(null);
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

    // If there's no active conversation, create a new one with today's date as ID
    if (!activeConversationId) {
      const today = new Date();
      const dateId = today.toISOString().split('T')[0]; // Use YYYY-MM-DD as conversation ID
      setActiveConversationId(dateId);
    }

    coachingMutation.mutate(message);
  };

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

      return Object.entries(emojiMap).find(([key]) =>
        action.toLowerCase().includes(key.toLowerCase())
      )?.[1] || '🤖';
    });
  };

  const conversations = React.useMemo(() => {
    if (!notes) return [];

    const groups: Record<string, SelectNote[]> = {};
    notes.forEach(note => {
      // Group by date for conversation ID
      const noteDate = new Date(note.createdAt!);
      const dateKey = noteDate.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(note);
    });

    return Object.entries(groups).map(([id, notes]) => {
      const date = new Date(id);
      return {
        id,
        title: `Coaching Session ${date.toLocaleDateString()}`,
        date: date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        notes: notes.sort((a, b) =>
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        )
      };
    }).sort((a, b) => b.id.localeCompare(a.id)); // Sort by date descending
  }, [notes]);

  const startNewConversation = () => {
    const today = new Date();
    const dateId = today.toISOString().split('T')[0];
    setActiveConversationId(dateId);
    textareaRef.current?.focus();
    toast({
      title: "New Conversation Started",
      description: "What would you like to discuss?",
    });
  };

  // Find the active conversation
  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Set the most recent conversation as active by default
  useEffect(() => {
    if (conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">AI Coaching Assistant</h1>
            <div className="flex gap-2">
              <Button
                onClick={startNewConversation}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                New Conversation
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Clear History
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Coaching History</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will permanently delete all your coaching conversations.
                      This cannot be undone. Are you sure you want to continue?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => clearHistoryMutation.mutate()}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {clearHistoryMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Clearing...
                        </>
                      ) : (
                        "Clear History"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-6">
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Conversations</h2>
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <Button
                    key={conversation.id}
                    variant={conversation.id === activeConversationId ? "secondary" : "ghost"}
                    className="w-full justify-start text-left"
                    onClick={() => setActiveConversationId(conversation.id)}
                  >
                    <div>
                      <div className="font-medium">{conversation.title}</div>
                      <div className="text-xs text-muted-foreground">{conversation.date}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <div className="col-span-3">
              <Card className="h-[calc(100vh-8rem)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-6 w-6 text-primary" />
                    {activeConversation?.title || "New Coaching Session"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col h-[calc(100%-5rem)]">
                  <div className="flex-1 overflow-y-auto mb-4">
                    <div className="space-y-6">
                      {activeConversation?.notes.length === 0 && !pendingMessage ? (
                        <p className="text-center text-muted-foreground py-8">
                          Start by sending a message above.
                        </p>
                      ) : (
                        <div className="space-y-6">
                          {/* Show pending message immediately if exists */}
                          {pendingMessage && (
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <User className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <div className="bg-muted/50 rounded-lg p-4">
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {pendingMessage}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Show coach thinking state */}
                          {coachingMutation.isPending && (
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

                          {/* Show conversation history */}
                          {[...(activeConversation?.notes || [])]
                            .reverse()
                            .map((note) => {
                              const { question, answer } = formatMessage(note.content);
                              return (
                                <div key={note.id} className="space-y-4">
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

                                  {question && (
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
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="mt-auto">
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
                      className="w-full gap-2 mt-2"
                    >
                      {coachingMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Coach is thinking...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}