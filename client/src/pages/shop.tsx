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

const getStripe = (() => {
  let stripePromise: Promise<any> | null = null;

  return async () => {
    if (!stripePromise) {
      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        throw new Error('Stripe publishable key not found');
      }

      stripePromise = new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.async = true;
        script.onload = () => {
          resolve(new Stripe(publishableKey));
        };
        document.body.appendChild(script);
      });
    }
    return stripePromise;
  };
})();

export default function Shop() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  const { data: products } = useQuery<SelectProduct[]>({
    queryKey: ["/api/products"],
  });

  useEffect(() => {
    // Preload Stripe on component mount
    getStripe().catch(error => {
      console.error('Stripe initialization error:', error);
      setStripeError(error.message);
      toast({
        title: "Payment system initialization failed",
        description: "Please refresh the page or try again later",
        variant: "destructive",
      });
    });
  }, [toast]);

  const handleCheckout = async (productId: number) => {
    if (stripeError) {
      toast({
        title: "Payment system unavailable",
        description: "Please refresh the page or try again later",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      console.log('Starting checkout for product:', productId);

      const res = await apiRequest("POST", "/api/checkout", { productId });
      const data = await res.json();

      if (!data.url) {
        throw new Error('No checkout URL received from server');
      }

      // Instead of using Stripe's redirectToCheckout, use the session URL directly
      window.location.href = data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout failed",
        description: error instanceof Error ? error.message : "Please try again later",
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
                    disabled={isLoading || !!stripeError}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : stripeError ? (
                      'Payment Unavailable'
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