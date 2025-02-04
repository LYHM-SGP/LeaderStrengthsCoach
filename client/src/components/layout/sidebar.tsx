import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, BarChart2, BookOpen, ShoppingCart, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Strengths", href: "/strengths", icon: BarChart2 },
  { name: "Coaching Notes", href: "/coaching", icon: BookOpen },
  { name: "Shop", href: "/shop", icon: ShoppingCart },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();

  return (
    <div className="w-64 min-h-screen bg-sidebar border-r">
      <div className="h-16 flex items-center px-4 border-b">
        <h1 className="text-xl font-bold text-sidebar-foreground">StrengthsCoach</h1>
      </div>

      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3",
                  location === item.href && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}