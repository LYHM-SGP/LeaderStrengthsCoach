import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SelectStrength } from "@db/schema";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const THEME_CATEGORIES = {
  'Strategic Thinking': 'bg-emerald-600 text-white',
  'Relationship Building': 'bg-blue-100 text-blue-900',
  'Influencing': 'bg-orange-100 text-orange-900',
  'Executing': 'bg-purple-100 text-purple-900'
} as const;

type ThemeCategory = keyof typeof THEME_CATEGORIES;

export default function Strengths() {
  const { user } = useAuth();
  const { data: strengths } = useQuery<SelectStrength[]>({
    queryKey: ["/api/strengths"],
  });

  const strengthsByCategory = strengths?.reduce((acc, strength) => {
    const category = strength.category as ThemeCategory;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(strength);
    return acc;
  }, {} as Record<ThemeCategory, SelectStrength[]>);

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">{user?.fullName}</h1>
            <p className="text-muted-foreground">
              {user?.title} | {user?.organization}
            </p>
          </div>

          <div className="mb-12">
            {Object.entries(THEME_CATEGORIES).map(([category, colorClass]) => (
              <div key={category} className="mb-8">
                <h2 className="text-xl font-semibold mb-4">{category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {strengthsByCategory?.[category as ThemeCategory]?.map((strength) => (
                    <Card 
                      key={strength.id}
                      className={`${colorClass}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{strength.name}</span>
                          <span className="text-sm">{strength.score}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>You Lead With {user?.role}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Leaders with great Strategic Thinking strengths are the ones who keep us all focused on what could be. They are constantly absorbing and analyzing information and helping the team make better decisions. People with strength in this domain continually stretch our thinking for the future.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}