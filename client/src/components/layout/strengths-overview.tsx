import { useQuery } from "@tanstack/react-query";
import type { SelectStrength } from "@db/schema";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";
import { DOMAIN_CATEGORIES, THEMES } from "@/pages/strengths";

export default function StrengthsOverview() {
  const { data: strengths } = useQuery<SelectStrength[]>({
    queryKey: ["/api/strengths"],
  });

  // Calculate domain scores
  const calculateDomainScores = () => {
    if (!strengths) return [];

    return DOMAIN_CATEGORIES.map(domain => {
      const domainThemes = THEMES[domain];
      const strengthsInDomain = strengths.filter(s =>
        domainThemes.some(theme => theme.name === s.name)
      );

      // Sum up all ranks in the domain
      const totalRank = strengthsInDomain.reduce((sum, s) => sum + s.score, 0);

      // Calculate inverse score (1/sum) - higher score means better performance
      const inverseScore = totalRank === 0 ? 0 : 1 / totalRank;

      return {
        domain,
        value: inverseScore
      };
    });
  };

  return (
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
  );
}