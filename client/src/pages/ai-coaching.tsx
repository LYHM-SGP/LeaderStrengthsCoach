import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Search, BookOpen, Brain } from "lucide-react";
import type { SelectNote } from "@db/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CoachingAgent = "exploration" | "reflection" | "challenge";

const AGENT_CONFIG = {
  exploration: {
    icon: Search,
    label: "Exploration Coach",
    description: "Ask open-ended questions to promote self-discovery",
    placeholder: "Share what you'd like to explore...",
  },
  reflection: {
    icon: BookOpen,
    label: "Reflection Coach",
    description: "Summarize and build awareness through reflection",
    placeholder: "Share your thoughts for reflection...",
  },
  challenge: {
    icon: Brain,
    label: "Challenge Coach",
    description: "Use Socratic questioning to examine assumptions",
    placeholder: "Share your perspective for examination...",
  },
};

export default function AiCoaching() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [agent, setAgent] = useState<CoachingAgent>("exploration");

  const { data: conversations } = useQuery<SelectNote[]>({
    queryKey: ["/api/notes"],
  });

  const coachingMutation = useMutation({
    mutationFn: async ({ message, agent }: { message: string; agent: CoachingAgent }) => {
      const res = await fetch("/api/ai-coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, agent }),
      });
      if (!res.ok) throw new Error("Failed to get coaching response");
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      toast({
        title: "Response received",
        description: "Your AI coach has responded to your message.",
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
    coachingMutation.mutate({ message, agent });
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
                  <div className="flex items-center gap-4">
                    <Select
                      value={agent}
                      onValueChange={(value) => setAgent(value as CoachingAgent)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select coaching agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(AGENT_CONFIG) as [CoachingAgent, typeof AGENT_CONFIG[keyof typeof AGENT_CONFIG]][]).map(
                          ([key, config]) => {
                            const Icon = config.icon;
                            return (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  <div>
                                    <div className="font-medium">{config.label}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {config.description}
                                    </div>
                                  </div>
                                </div>
                              </SelectItem>
                            );
                          }
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={AGENT_CONFIG[agent].placeholder}
                    className="min-h-[100px]"
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
                <div className="space-y-4">
                  {conversations?.map((note) => (
                    <div key={note.id} className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {note.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(note.createdAt!).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}