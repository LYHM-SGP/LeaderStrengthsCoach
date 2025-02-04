import { useQuery } from "@tanstack/react-query";
import type { SelectStrength } from "@db/schema";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import StrengthOrderForm from "@/components/layout/strength-order-form";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

export const DOMAIN_CATEGORIES = [
  "Executing",
  "Influencing",
  "Relationship Building",
  "Strategic Thinking"
] as const;

export const THEMES = {
  "Executing": [
    { rank: 15, name: 'Achiever' },
    { rank: 21, name: 'Arranger' },
    { rank: 18, name: 'Belief' },
    { rank: 33, name: 'Consistency' },
    { rank: 6, name: 'Deliberative' },
    { rank: 23, name: 'Discipline' },
    { rank: 13, name: 'Focus' },
    { rank: 16, name: 'Responsibility' },
    { rank: 24, name: 'Restorative' }
  ],
  "Influencing": [
    { rank: 17, name: 'Activator' },
    { rank: 12, name: 'Command' },
    { rank: 22, name: 'Communication' },
    { rank: 11, name: 'Competition' },
    { rank: 20, name: 'Maximizer' },
    { rank: 7, name: 'Self-Assurance' },
    { rank: 10, name: 'Significance' },
    { rank: 25, name: 'Woo' }
  ],
  "Relationship Building": [
    { rank: 29, name: 'Adaptability' },
    { rank: 27, name: 'Connectedness' },
    { rank: 26, name: 'Developer' },
    { rank: 31, name: 'Empathy' },
    { rank: 32, name: 'Harmony' },
    { rank: 34, name: 'Includer' },
    { rank: 14, name: 'Individualization' },
    { rank: 30, name: 'Positivity' },
    { rank: 19, name: 'Relator' }
  ],
  "Strategic Thinking": [
    { rank: 4, name: 'Analytical' },
    { rank: 28, name: 'Context' },
    { rank: 2, name: 'Futuristic' },
    { rank: 5, name: 'Ideation' },
    { rank: 9, name: 'Input' },
    { rank: 8, name: 'Intellection' },
    { rank: 1, name: 'Learner' },
    { rank: 3, name: 'Strategic' }
  ]
};

export default function Strengths() {
  const { user } = useAuth();
  const { data: strengths } = useQuery<SelectStrength[]>({
    queryKey: ["/api/strengths"],
  });

  // Get top 5 strengths
  const topStrengths = strengths
    ?.sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map(s => s.name)
    .join(" | ");

  // Calculate domain scores
  const calculateDomainScores = () => {
    if (!strengths) return [];

    return DOMAIN_CATEGORIES.map(domain => {
      const domainThemes = THEMES[domain];
      const strengthsInDomain = strengths.filter(s => 
        domainThemes.some(theme => theme.name === s.name)
      );

      // Calculate average rank (lower is better)
      const avgRank = strengthsInDomain.reduce((sum, s) => sum + s.score, 0) / 
        (strengthsInDomain.length || 1);

      // Normalize score (34 - rank to make higher ranks = higher score, then normalize to 0-100)
      const normalizedScore = ((34 - avgRank) / 34) * 100;

      return {
        domain,
        value: Math.round(normalizedScore)
      };
    });
  };

  const getThemeColor = (domain: string, rank: number) => {
    const isTop10 = rank <= 10;

    switch (domain) {
      case 'Strategic Thinking':
        return isTop10 ? 'bg-emerald-600 text-white' : 'bg-emerald-50';
      case 'Relationship Building':
        return isTop10 ? 'bg-blue-600 text-white' : 'bg-blue-50';
      case 'Influencing':
        return isTop10 ? 'bg-orange-500 text-white' : 'bg-orange-50';
      case 'Executing':
        return isTop10 ? 'bg-purple-600 text-white' : 'bg-purple-50';
      default:
        return 'bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold">{user?.fullName}</h1>
              <p className="text-muted-foreground mt-1">
                {topStrengths || "No strengths data available"}
              </p>
            </div>
            <StrengthOrderForm />
          </div>

          {/* Domain Radar Chart */}
          <div className="mb-8 bg-card p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Domain Overview</h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={calculateDomainScores()}>
                  <PolarGrid />
                  <PolarAngleAxis 
                    dataKey="domain"
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                  />
                  <Radar
                    name="Domain Strength"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.5}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-6">
            {DOMAIN_CATEGORIES.map((domain) => (
              <div key={domain} className="space-y-2">
                <div className="text-center border-b border-gray-200 pb-2">
                  <h2 className="text-sm font-semibold tracking-wider uppercase">
                    {domain}
                    <span className="text-xs align-top ml-0.5">®</span>
                  </h2>
                </div>
                <div className="space-y-1">
                  {THEMES[domain].map((theme) => {
                    const userStrength = strengths?.find(s => s.name === theme.name);
                    const rank = userStrength?.score || theme.rank;

                    return (
                      <div
                        key={theme.name}
                        className={`p-2.5 rounded ${getThemeColor(domain, rank)}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <span className="font-medium">{theme.name}</span>
                          </div>
                          <span className="text-sm">{rank}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}