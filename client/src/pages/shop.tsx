import { useQuery } from "@tanstack/react-query";
import type { SelectProduct } from "@db/schema";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileText, Calendar } from "lucide-react";

declare const Stripe: any;

export default function Shop() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: products } = useQuery<SelectProduct[]>({
    queryKey: ["/api/products"],
  });

  const handleCheckout = async (productId: number) => {
    try {
      const res = await apiRequest("POST", "/api/checkout", { productId });
      const { sessionId } = await res.json();

      const stripe = await Stripe(process.env.VITE_STRIPE_PUBLIC_KEY);
      await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
      toast({
        title: "Checkout failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Shop</h1>

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
                  >
                    Purchase
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
