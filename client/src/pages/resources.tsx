import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiLinkedin } from "react-icons/si";
import { ExternalLink } from "lucide-react";

const RESOURCES = [
  {
    title: "Understanding Your CliftonStrengths",
    description: "A deep dive into how your top strengths shape your leadership style",
    link: "https://www.linkedin.com/pulse/understanding-your-cliftonstrengths-sample-article",
    date: "February 2025"
  },
  {
    title: "Leveraging Strategic Thinking Domain",
    description: "How to maximize your impact using Strategic Thinking strengths",
    link: "https://www.linkedin.com/pulse/leveraging-strategic-thinking-domain-sample",
    date: "January 2025"
  },
  {
    title: "The Power of Relationship Building",
    description: "Building stronger teams through understanding relationship dynamics",
    link: "https://www.linkedin.com/pulse/power-relationship-building-sample",
    date: "December 2024"
  }
] as const;

export default function Resources() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Resources</h1>
              <p className="text-muted-foreground mt-2">
                Discover insights and best practices for leveraging your strengths
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {RESOURCES.map((resource) => (
              <Card key={resource.title} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center space-x-2 mb-2">
                    <SiLinkedin className="h-5 w-5 text-[#0A66C2]" />
                    <span className="text-sm text-muted-foreground">{resource.date}</span>
                  </div>
                  <CardTitle className="line-clamp-2">{resource.title}</CardTitle>
                  <CardDescription>{resource.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow" />
                <div className="p-6 pt-0">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(resource.link, '_blank')}
                  >
                    Read on LinkedIn
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
