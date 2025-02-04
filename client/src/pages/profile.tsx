import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">My Profile</h1>

          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <div>
                  <dt className="font-medium text-lg">Name</dt>
                  <dd className="text-muted-foreground mt-1">{user?.fullName}</dd>
                </div>
                <div>
                  <dt className="font-medium text-lg">Role</dt>
                  <dd className="text-muted-foreground mt-1">{user?.role}</dd>
                </div>
                <div>
                  <dt className="font-medium text-lg">Title</dt>
                  <dd className="text-muted-foreground mt-1">{user?.title}</dd>
                </div>
                <div>
                  <dt className="font-medium text-lg">Organization</dt>
                  <dd className="text-muted-foreground mt-1">{user?.organization}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
