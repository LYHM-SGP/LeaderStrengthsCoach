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
    { rank: 23, name: 'Discipline' },
    { rank: 17, name: 'Actuator' },
    { rank: 20, name: 'Maximizer' },
    { rank: 21, name: 'Arranger' },
    { rank: 13, name: 'Focus' },
    { rank: 12, name: 'Command' },
    { rank: 7, name: 'Self-Assurance' },
    { rank: 6, name: 'Deliberative' }
  ],
  INFLUENCING: [
    { rank: 17, name: 'Actuator' },
    { rank: 20, name: 'Maximizer' },
    { rank: 12, name: 'Command' },
    { rank: 7, name: 'Self-Assurance' },
    { rank: 22, name: 'Communication' },
    { rank: 10, name: 'Significance' },
    { rank: 11, name: 'Competition' },
    { rank: 25, name: 'Woo' }
  ],
  'RELATIONSHIP BUILDING': [
    { rank: 29, name: 'Adaptability' },
    { rank: 34, name: 'Includer' },
    { rank: 27, name: 'Connectedness' },
    { rank: 14, name: 'Individualization' },
    { rank: 26, name: 'Developer' },
    { rank: 30, name: 'Positivity' },
    { rank: 31, name: 'Empathy' },
    { rank: 19, name: 'Relator' },
    { rank: 32, name: 'Harmony' }
  ],
  'STRATEGIC THINKING': [
    { rank: 4, name: 'Analytical' },
    { rank: 9, name: 'Input' },
    { rank: 2, name: 'Futuristic' },
    { rank: 8, name: 'Intellection' },
    { rank: 1, name: 'Learner' },
    { rank: 28, name: 'Context' },
    { rank: 5, name: 'Ideation' },
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

          {/* DNA-like header graphic */}
          <div className="w-full h-24 mb-8 relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="relative w-full">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-200 via-orange-200 to-blue-200 opacity-30"></div>
                <div className="relative h-2 bg-gradient-to-r from-purple-500 via-emerald-500 to-blue-500"></div>
              </div>
            </div>
            <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-white to-transparent"></div>
            <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-white to-transparent"></div>
            <div className="relative">
              <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white"></div>
              <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white"></div>
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
                  {THEMES[domain].map((theme) => (
                    <div
                      key={theme.name}
                      className={`p-2.5 rounded ${
                        domain === 'STRATEGIC THINKING'
                          ? 'bg-emerald-600 text-white'
                          : domain === 'RELATIONSHIP BUILDING'
                          ? 'bg-blue-50'
                          : domain === 'INFLUENCING'
                          ? 'bg-orange-50'
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