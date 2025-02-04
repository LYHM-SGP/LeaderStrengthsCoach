import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";
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
      toast({
        title: "Message sent",
        description: "Your AI coach will respond shortly.",
      });
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

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">AI Coaching Assistant</h1>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Chat with Your ICF PCC Certified AI Coach</CardTitle>
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
                        Getting response...
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
                          <div className="p-4 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium mb-2">You:</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {question}
                            </p>
                          </div>
                          {answer && (
                            <div className="p-4 rounded-lg border bg-card">
                              <p className="text-sm font-medium mb-2">AI Coach:</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {answer}
                              </p>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(note.createdAt!).toLocaleString()}
                          </p>
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