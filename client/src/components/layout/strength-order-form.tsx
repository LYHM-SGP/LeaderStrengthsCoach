import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { UploadCloud } from "lucide-react";
import * as XLSX from 'xlsx';

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

// Map from "Theme X" to strength name
const strengthNamesByRank = Object.entries(INITIAL_RANKINGS)
  .sort((a, b) => a[1] - b[1])
  .map(([name]) => name);

export default function StrengthOrderForm() {
  const [open, setOpen] = useState(false);
  const [strengthsOrder, setStrengthsOrder] = useState<Record<string, number>>(INITIAL_RANKINGS);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm();

  // Debug effect to monitor state changes
  useEffect(() => {
    if (open) {
      console.log('Current strengths order:', strengthsOrder);
    }
  }, [strengthsOrder, open]);

  const updateStrengths = useMutation({
    mutationFn: (data: any) => {
      return apiRequest("POST", "/api/strengths/bulk", data).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strengths"] });
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const newRankings: Record<string, number> = {};

      if (file.name.endsWith(".xlsx")) {
        // Handle Excel file
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];

            // Process each row looking for Theme numbers
            rows.forEach((row) => {
              row.forEach((cell) => {
                if (typeof cell === "string") {
                  const themeMatch = cell.match(/Theme (\d+)/i);
                  if (themeMatch) {
                    const rank = parseInt(themeMatch[1]);
                    if (rank >= 1 && rank <= 34) {
                      const strengthName = strengthNamesByRank[rank - 1];
                      if (strengthName) {
                        newRankings[strengthName] = rank;
                      }
                    }
                  }
                }
              });
            });

            if (Object.keys(newRankings).length > 0) {
              setStrengthsOrder((prev) => {
                console.log("Updating strengths order:", newRankings);
                return { ...newRankings };
              });
              toast({
                title: "File processed",
                description: "Strength rankings have been updated from the Excel file.",
              });
            } else {
              throw new Error("No valid rankings found in the Excel file");
            }
          } catch (error) {
            console.error("Excel processing error:", error);
            toast({
              title: "Excel processing failed",
              description: error instanceof Error ? error.message : "Please check the Excel file format",
              variant: "destructive",
            });
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        // Handle text file
        const text = await file.text();
        const lines = text.split("\n");

        lines.forEach((line) => {
          const match = line.match(/Theme (\d+)/i);
          if (match) {
            const rank = parseInt(match[1]);
            if (rank >= 1 && rank <= 34) {
              const strengthName = strengthNamesByRank[rank - 1];
              if (strengthName) {
                newRankings[strengthName] = rank;
              }
            }
          }
        });

        if (Object.keys(newRankings).length > 0) {
          setStrengthsOrder((prev) => {
            console.log("Updating strengths order:", newRankings);
            return { ...newRankings };
          });
          toast({
            title: "File processed",
            description: "Strength rankings have been updated from the file.",
          });
        } else {
          throw new Error("No valid rankings found in file");
        }
      }
    } catch (error) {
      console.error("File processing error:", error);
      toast({
        title: "File processing failed",
        description: error instanceof Error ? error.message : "Please check the file format",
        variant: "destructive",
      });
    }
  };

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

        <div className="mb-6 p-4 border rounded-lg bg-secondary/20">
          <Label htmlFor="file-upload" className="block mb-2">Upload Rankings File</Label>
          <div className="flex items-center gap-2">
            <Input
              id="file-upload"
              type="file"
              accept=".txt,.csv,.xlsx"
              onChange={handleFileUpload}
              className="flex-1"
            />
            <Button variant="outline" size="icon">
              <UploadCloud className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Upload a file containing "Theme X" rankings to auto-populate the form
          </p>
        </div>

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
                    value={strengthsOrder[theme.name] || ""}
                    placeholder="Enter rank (1-34)"
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value, 10); 
                      if (!isNaN(newValue)) { 
                        setStrengthsOrder((prev) => ({
                          ...prev,
                          [theme.name]: newValue,
                        }));
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={updateStrengths.isPending}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}