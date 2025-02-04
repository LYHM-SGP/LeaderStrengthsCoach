import { useQuery } from "@tanstack/react-query";
import type { SelectNote } from "@db/schema";
import Sidebar from "@/components/layout/sidebar";
import CoachingNotes from "@/components/layout/coaching-notes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Coaching() {
  const { data: notes } = useQuery<SelectNote[]>({
    queryKey: ["/api/notes"],
  });

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Coaching Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-lg bg-muted flex items-center justify-center mb-4">
                  <img
                    src="https://images.unsplash.com/photo-1425421669292-0c3da3b8f529"
                    alt="Professional coaching session"
                    className="object-cover rounded-lg w-full h-full"
                  />
                </div>
                <p className="text-muted-foreground">
                  Your coaching journey is a personal path of growth and
                  development. Use this space to document insights, track progress,
                  and reflect on your leadership development.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-4">
                  <div>
                    <dt className="font-medium">Total Notes</dt>
                    <dd className="text-3xl font-bold">
                      {notes?.length || 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">Recent Activity</dt>
                    <dd className="text-muted-foreground">
                      {notes?.[0]
                        ? `Last note: ${new Date(
                            notes[0].createdAt!
                          ).toLocaleDateString()}`
                        : "No notes yet"}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>

          {notes && <CoachingNotes notes={notes} />}
        </div>
      </main>
    </div>
  );
}
