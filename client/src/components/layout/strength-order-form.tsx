import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { THEMES } from "@/pages/strengths";

// Lawrence Yong's strength rankings
const INITIAL_RANKINGS = {
  'Learner': 1,
  'Futuristic': 2,
  'Strategic': 3,
  'Analytical': 4,
  'Ideation': 5,
  'Deliberative': 6,
  'Self-Assurance': 7,
  'Intellection': 8,
  'Input': 9,
  'Significance': 10,
  'Competition': 11,
  'Command': 12,
  'Focus': 13,
  'Individualization': 14,
  'Achiever': 15,
  'Responsibility': 16,
  'Activator': 17,
  'Belief': 18,
  'Relator': 19,
  'Maximizer': 20,
  'Arranger': 21,
  'Communication': 22,
  'Discipline': 23,
  'Restorative': 24,
  'Woo': 25,
  'Developer': 26,
  'Connectedness': 27,
  'Context': 28,
  'Adaptability': 29,
  'Positivity': 30,
  'Empathy': 31,
  'Harmony': 32,
  'Consistency': 33,
  'Includer': 34
};

export default function StrengthOrderForm() {
  const [open, setOpen] = useState(false);
  const [strengthsOrder, setStrengthsOrder] = useState<Record<string, number>>(INITIAL_RANKINGS);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStrengths = useMutation({
    mutationFn: async (data: { name: string, score: number }[]) => {
      return apiRequest("POST", "/api/strengths/bulk", data).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strengths"] });
      setOpen(false);
      toast({
        title: "Strengths updated",
        description: "Your strengths order has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    const orderedStrengths = Object.entries(strengthsOrder).map(([name, rank]) => ({
      name,
      score: rank,
    }));

    if (orderedStrengths.length !== 34) {
      toast({
        title: "Invalid input",
        description: "Please provide rankings for all 34 strengths.",
        variant: "destructive",
      });
      return;
    }

    updateStrengths.mutate(orderedStrengths);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Update Strengths Order</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Your Strengths Order</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {Object.entries(THEMES).map(([domain, themes]) => (
            <div key={domain}>
              <h3 className="font-semibold mb-2">{domain}</h3>
              {themes.map((theme) => (
                <div key={theme.name} className="mb-2">
                  <Label htmlFor={theme.name}>{theme.name}</Label>
                  <Input
                    id={theme.name}
                    type="number"
                    min="1"
                    max="34"
                    value={strengthsOrder[theme.name] || ''}
                    placeholder="Enter rank (1-34)"
                    onChange={(e) =>
                      setStrengthsOrder((prev) => ({
                        ...prev,
                        [theme.name]: parseInt(e.target.value),
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={updateStrengths.isPending}
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}