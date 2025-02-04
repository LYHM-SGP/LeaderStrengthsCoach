import { useQuery } from "@tanstack/react-query";
import type { SelectStrength } from "@db/schema";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";
import { DOMAIN_CATEGORIES, THEMES } from "@/pages/strengths";

const DOMAIN_COLORS = {
  'Strategic Thinking': 'rgb(16 185 129)', // emerald-600
  'Relationship Building': 'rgb(37 99 235)', // blue-600
  'Influencing': 'rgb(249 115 22)', // orange-500
  'Executing': 'rgb(147 51 234)', // purple-600
};

export default function StrengthsOverview() {
  const { data: strengths } = useQuery<SelectStrength[]>({
    queryKey: ["/api/strengths"],
  });

  const calculateDomainScores = () => {
    if (!strengths) return [];

    return DOMAIN_CATEGORIES.map(domain => {
      const domainThemes = THEMES[domain];
      const strengthsInDomain = strengths.filter(s =>
        domainThemes.some(theme => theme.name === s.name)
      );

      const totalRank = strengthsInDomain.reduce((sum, s) => sum + s.score, 0);
      const inverseScore = totalRank === 0 ? 0 : 1 / totalRank;

      return {
        domain,
        value: inverseScore,
        fill: DOMAIN_COLORS[domain as keyof typeof DOMAIN_COLORS]
      };
    });
  };

  return (
    <div className="h-[500px]"> {/* Increased height for better visibility */}
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={calculateDomainScores()}>
          <PolarGrid stroke="hsl(var(--muted-foreground))" />
          <PolarAngleAxis
            dataKey="domain"
            tick={{ 
              fill: 'hsl(var(--foreground))',
              fontSize: 14,
              fontWeight: 500
            }}
          />
          {DOMAIN_CATEGORIES.map((domain) => (
            <Radar
              key={domain}
              name={domain}
              dataKey="value"
              stroke={DOMAIN_COLORS[domain as keyof typeof DOMAIN_COLORS]}
              fill={DOMAIN_COLORS[domain as keyof typeof DOMAIN_COLORS]}
              fillOpacity={0.3}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}