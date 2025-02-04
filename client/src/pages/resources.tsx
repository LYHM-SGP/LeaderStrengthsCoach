import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiLinkedin } from "react-icons/si";
import { ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LinkedInPost {
  id: string;
  specificContent: {
    'com.linkedin.ugc.ShareContent': {
      shareCommentary: {
        text: string;
      };
      shareMediaCategory: string;
    };
  };
  lifecycleState: string;
  created: {
    time: number;
  };
}

interface LinkedInError {
  message: string;
  authUrl?: string;
}

export default function Resources() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: feed, isLoading, error, refetch } = useQuery<LinkedInPost[], LinkedInError>({
    queryKey: ["/api/linkedin-feed"],
    retry: false,
    onError: (error: LinkedInError) => {
      if (!error.message.includes('LinkedIn authentication required')) {
        toast({
          title: "Error loading LinkedIn feed",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  });

  const handleLinkedInAuth = async () => {
    try {
      const res = await fetch('/api/linkedin/auth');
      if (!res.ok) throw new Error('Failed to start LinkedIn authentication');

      const { authUrl } = await res.json();
      if (!authUrl) throw new Error('No authentication URL received');

      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to start LinkedIn auth:', error);
      toast({
        title: "Authentication Failed",
        description: "Unable to connect to LinkedIn. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isAuthError = error && 'message' in error && error.message === "LinkedIn authentication required";

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Resources</h1>
              <p className="text-muted-foreground mt-2">
                Latest insights and thoughts on CliftonStrengths coaching
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isAuthError ? (
            <Card>
              <CardHeader>
                <CardTitle>Connect with LinkedIn</CardTitle>
                <CardDescription>
                  To view your LinkedIn posts and articles, please connect your LinkedIn account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleLinkedInAuth}
                  className="gap-2"
                >
                  <SiLinkedin className="h-5 w-5" />
                  Connect LinkedIn Account
                </Button>
              </CardContent>
            </Card>
          ) : error ? (
            <Card className="bg-destructive/10 border-destructive">
              <CardHeader>
                <CardTitle>Unable to load LinkedIn feed</CardTitle>
                <CardDescription>
                  Please check back later or refresh the page
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {feed?.map((post) => (
                <Card key={post.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-center space-x-2 mb-2">
                      <SiLinkedin className="h-5 w-5 text-[#0A66C2]" />
                      <span className="text-sm text-muted-foreground">
                        {formatDate(post.created.time)}
                      </span>
                    </div>
                    <CardTitle className="line-clamp-2">
                      {post.specificContent['com.linkedin.ugc.ShareContent'].shareCommentary.text.split('\n')[0]}
                    </CardTitle>
                    <CardDescription className="line-clamp-3">
                      {post.specificContent['com.linkedin.ugc.ShareContent'].shareCommentary.text}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow" />
                  <div className="p-6 pt-0">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(`https://www.linkedin.com/feed/update/${post.id}`, '_blank')}
                    >
                      Read on LinkedIn
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}