import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStrengthSchema, type SelectStrength } from "@db/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import StrengthChart from "@/components/layout/strength-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

const strengthCategories = [
  "Strategic Thinking",
  "Relationship Building",
  "Influencing",
  "Executing",
];

export default function Strengths() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: strengths } = useQuery<SelectStrength[]>({
    queryKey: ["/api/strengths"],
  });

  const form = useForm({
    resolver: zodResolver(insertStrengthSchema),
    defaultValues: {
      name: "",
      category: "",
      score: 0,
      notes: "",
    },
  });

  const createStrength = useMutation({
    mutationFn: async (data: typeof form.getValues()) => {
      const res = await apiRequest("POST", "/api/strengths", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strengths"] });
      setOpen(false);
      form.reset();
    },
  });

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Your CliftonStrengths</h1>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Strength
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Strength</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((data) =>
                      createStrength.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Strength Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {strengthCategories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="score"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Score (1-10)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createStrength.isPending}>
                      Save Strength
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Strength Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {strengths && <StrengthChart strengths={strengths} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-4">
                  {strengthCategories.map((category) => {
                    const categoryStrengths =
                      strengths?.filter((s) => s.category === category) || [];
                    return (
                      <div key={category}>
                        <dt className="font-medium mb-1">{category}</dt>
                        <dd className="text-sm text-muted-foreground">
                          {categoryStrengths.length} strengths identified
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {strengths?.map((strength) => (
              <Card key={strength.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        {strength.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {strength.category}
                      </p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                      Score: {strength.score}/10
                    </div>
                  </div>
                  {strength.notes && (
                    <p className="text-sm text-muted-foreground mt-4">
                      {strength.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
