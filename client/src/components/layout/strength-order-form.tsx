import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertNoteSchema } from "@db/schema";
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
import { UploadCloud, Loader2 } from "lucide-react";
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
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm();

  const updateStrengths = useMutation({
    mutationFn: (data: any) => {
      return apiRequest("POST", "/api/strengths/bulk", data).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strengths"] });
      setOpen(false); // Close dialog on success
      toast({
        title: "Strengths updated",
        description: "Your strengths order has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update strengths",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);

      if (file.name.endsWith(".pdf")) {
        // Create FormData and send to server
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload-strength-rankings', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to process PDF file');
        }

        const data = await response.json();
        if (!data.rankings || !Array.isArray(data.rankings) || data.rankings.length === 0) {
          throw new Error('No valid rankings found in PDF');
        }

        // Update strengths order from rankings
        const newRankings: Record<string, number> = {};
        data.rankings.forEach(({ rank, name }: { rank: number; name: string }) => {
          if (INITIAL_RANKINGS.hasOwnProperty(name)) {
            newRankings[name] = rank;
          }
        });

        if (Object.keys(newRankings).length > 0) {
          setStrengthsOrder(prev => ({ ...prev, ...newRankings }));
          toast({
            title: "PDF processed",
            description: `Updated ${Object.keys(newRankings).length} strength rankings from the PDF file.`,
          });
        } else {
          throw new Error('No valid strength rankings found in the PDF');
        }
      } else if (file.name.endsWith(".xlsx")) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[];

            // Get header row (row 3) and data row (row 4)
            const headerRow = rows[2];
            const dataRow = rows[3];

            if (!headerRow || !dataRow) {
              throw new Error("Required rows not found in Excel file");
            }

            const newRankings: Record<string, number> = {};

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
              setStrengthsOrder(prev => ({ ...prev, ...newRankings }));
              toast({
                title: "Excel processed",
                description: `Updated ${Object.keys(newRankings).length} strength rankings from the Excel file.`,
              });
            } else {
              throw new Error('No valid rankings found in Excel file');
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
      }
    } catch (error) {
      console.error("File processing error:", error);
      toast({
        title: "File processing failed",
        description: error instanceof Error ? error.message : "Please check the file format",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      if (event.target) {
        event.target.value = ''; // Reset file input
      }
    }
  };

  const handleSubmit = () => {
    const orderedStrengths = Object.entries(strengthsOrder).map(([name, rank]) => ({
      name,
      score: rank,
    }));

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
              accept=".xlsx,.pdf"
              onChange={handleFileUpload}
              className="flex-1"
              disabled={isProcessing}
            />
            <Button variant="outline" size="icon" disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Upload an Excel file or PDF containing your strength rankings
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4">
          {Object.entries(THEMES).map(([domain, themes]) => (
            <div key={domain}>
              <h3 className="font-semibold mb-2">{domain}</h3>
              {themes.map((theme) => (
                <div key={theme} className="mb-2">
                  <Label htmlFor={theme}>{theme}</Label>
                  <Input
                    id={theme}
                    type="number"
                    min="1"
                    max="34"
                    value={strengthsOrder[theme] || ""}
                    placeholder="Enter rank (1-34)"
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value, 10);
                      if (!isNaN(newValue) && newValue >= 1 && newValue <= 34) {
                        setStrengthsOrder((prev) => ({
                          ...prev,
                          [theme]: newValue,
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
          <Button 
            onClick={handleSubmit} 
            disabled={updateStrengths.isPending || isProcessing}
          >
            {updateStrengths.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}