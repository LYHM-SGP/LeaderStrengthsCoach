import { useQuery } from "@tanstack/react-query";
import type { SelectStrength } from "@db/schema";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";

const DOMAIN_CATEGORIES = [
  'EXECUTING',
  'INFLUENCING',
  'RELATIONSHIP BUILDING',
  'STRATEGIC THINKING'
] as const;

const THEMES = {
  EXECUTING: [
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
  INFLUENCING: [
    { rank: 17, name: 'Activator' },
    { rank: 12, name: 'Command' },
    { rank: 22, name: 'Communication' },
    { rank: 11, name: 'Competition' },
    { rank: 20, name: 'Maximizer' },
    { rank: 7, name: 'Self-Assurance' },
    { rank: 10, name: 'Significance' },
    { rank: 25, name: 'Woo' }
  ],
  'RELATIONSHIP BUILDING': [
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
  'STRATEGIC THINKING': [
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

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Lawrence Yong</h1>
            <p className="text-muted-foreground mt-1">
              Learner | Futuristic | Strategic | Analytical | Ideation
            </p>
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
                  {THEMES[domain].map((theme) => (
                    <div
                      key={theme.name}
                      className={`p-2.5 rounded ${
                        domain === 'STRATEGIC THINKING'
                          ? theme.rank <= 10
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-50'
                          : domain === 'RELATIONSHIP BUILDING'
                          ? 'bg-blue-50'
                          : domain === 'INFLUENCING'
                          ? theme.rank <= 10
                            ? 'bg-orange-500 text-white'
                            : 'bg-orange-50'
                          : theme.rank <= 10
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="font-medium">{theme.name}</span>
                        </div>
                        <span className="text-sm">{theme.rank}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">
              You Lead With Strategic Thinking CliftonStrengths themes
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Leaders with great Strategic Thinking strengths are the ones who keep us all focused on what could be. They are constantly absorbing and analyzing information and helping the team make better decisions. People with strength in this domain continually stretch our thinking for the future.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}