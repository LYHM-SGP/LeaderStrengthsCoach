import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import type { SelectStrength } from '@db/schema';

interface StrengthChartProps {
  strengths: SelectStrength[];
}

export default function StrengthChart({ strengths }: StrengthChartProps) {
  const data = strengths.map(strength => ({
    name: strength.name,
    value: strength.score
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="name" />
          <Radar
            name="Strengths"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
