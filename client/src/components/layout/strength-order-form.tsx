import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertNoteSchema, type SelectNote } from "@db/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { THEMES } from "@/pages/strengths";
import { UploadCloud } from "lucide-react";
import * as XLSX from 'xlsx';

// Initial rankings object
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
            console.log("Processing Excel file...");
            const workbook = XLSX.read(data, { type: 'array' });
            console.log("Workbook loaded:", workbook.SheetNames);
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[];
            console.log("Excel rows:", rows);

            // Get the header row (row 3 in Excel, index 2 in array)
            const headerRow = rows[2];
            console.log("Header row:", headerRow);

            // Get the data row (row 4 in Excel, index 3 in array)
            const dataRow = rows[3];
            console.log("Data row:", dataRow);

            if (!headerRow || !dataRow) {
              throw new Error("Required rows not found in Excel file");
            }

            // Start from column 5 (index 4) where Theme columns begin
            for (let i = 4; i < headerRow.length; i++) {
              const headerCell = headerRow[i];
              if (typeof headerCell === 'string') {
                const match = headerCell.match(/Theme (\d+)/i);
                if (match) {
                  const themeNumber = parseInt(match[1]);
                  const strengthName = dataRow[i];

                  if (themeNumber >= 1 && themeNumber <= 34 && 
                      typeof strengthName === 'string' && 
                      INITIAL_RANKINGS.hasOwnProperty(strengthName)) {
                    newRankings[strengthName] = themeNumber;
                  }
                }
              }
            }

            if (Object.keys(newRankings).length > 0) {
              setStrengthsOrder((prev) => {
                console.log("Updating strengths order:", newRankings);
                return { ...prev, ...newRankings };
              });
              toast({
                title: "File processed",
                description: `Updated ${Object.keys(newRankings).length} strength rankings from the Excel file.`,
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
            const strengthName = lines[1]; // Get the strength name from the next line
            if (INITIAL_RANKINGS.hasOwnProperty(strengthName)) {
              newRankings[strengthName] = rank;
            }
          }
        });

        if (Object.keys(newRankings).length > 0) {
          setStrengthsOrder((prev) => {
            console.log("Updating strengths order:", newRankings);
            return { ...prev, ...newRankings };
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