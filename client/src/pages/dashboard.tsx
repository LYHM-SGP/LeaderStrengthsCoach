import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import StrengthsOverview from "@/components/layout/strengths-overview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { SelectStrength, SelectNote } from "@db/schema";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: strengths } = useQuery<SelectStrength[]>({
    queryKey: ["/api/strengths"],
  });

  const { data: notes } = useQuery<SelectNote[]>({
    queryKey: ["/api/notes"],
  });

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Welcome back, {user?.fullName}</h1>

          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Strengths Domains Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <StrengthsOverview />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Coaching Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notes?.slice(0, 3).map((note) => (
                  <div key={note.id} className="p-4 rounded-lg border">
                    <h3 className="font-medium mb-2">{note.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}