import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SelectProduct } from "@db/schema";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileText, Calendar, Loader2 } from "lucide-react";
import { useEffect } from "react";

declare const Stripe: any;

let stripePromise: Promise<any> | null = null;

const getStripe = async () => {
  if (!stripePromise) {
    stripePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = () => {
        if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
          reject(new Error('Stripe publishable key is not configured'));
          return;
        }
        resolve(Stripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY));
      };
      script.onerror = () => {
        reject(new Error('Failed to load Stripe'));
      };
      document.body.appendChild(script);
    });
  }
  return stripePromise;
};

export default function Shop() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { data: products } = useQuery<SelectProduct[]>({
    queryKey: ["/api/products"],
  });

  useEffect(() => {
    // Preload Stripe on component mount
    getStripe().catch(error => {
      toast({
        title: "Stripe initialization failed",
        description: error.message,
        variant: "destructive",
      });
    });
  }, [toast]);

  const handleCheckout = async (productId: number) => {
    try {
      setIsLoading(true);
      const res = await apiRequest("POST", "/api/checkout", { productId });
      const { sessionId } = await res.json();

      const stripe = await getStripe();
      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        throw error;
      }
    } catch (error) {
      toast({
        title: "Checkout failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Shop</h1>
              <p className="text-muted-foreground mt-2">
                Purchase reports and coaching sessions to accelerate your leadership development
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products?.map((product) => (
              <Card key={product.id} className="flex flex-col">
                <CardHeader>
                  <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                    {product.type === "report" ? (
                      <FileText className="h-6 w-6 text-primary" />
                    ) : (
                      <Calendar className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <CardTitle>{product.name}</CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="text-2xl font-bold">
                    ${Number(product.price).toFixed(2)}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => handleCheckout(product.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Purchase'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}