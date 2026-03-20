type ShowElementsState = {
  topUsers: boolean;
  topChannels: boolean;
  topServers: boolean;
  topStreaks: boolean;
  hourlyCharts: boolean;
  monthlyCharts: boolean;
  moodChart: boolean;
};
interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

interface SettingsModalProps<T extends Record<string, boolean>> {
  showSettings: boolean;
  showElements: T;
  setShowSettings: (value: boolean) => void;
  setShowElements: React.Dispatch<React.SetStateAction<T>>;
}
interface MonthlyChartProps {
  data: Record<string, number>;
  className?: string;
}

interface HourlyChartProps {
  data: Record<string, number>;
  className?: string;
  title?: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  tier: AchievementTier;
  icon: LucideIcon;
  iconColor: string;
  unlocked: boolean;
  secret?: boolean;
  progress?: { current: number; target: number };
}


type WrappedSlide = {
  id: string;
  priority: number;
  enabled: boolean;
  render: () => HTMLElement | null;
};

type AchievementTier = "bronze" | "silver" | "gold" | "secret";

interface AchievementDef {
  id: string;
  name: string;
  description: string;
  tier: AchievementTier;
  icon: LucideIcon;
  iconColor: string;
  secret?: boolean;
  progress?:(data) => { current: number; target: number };

  check: (data: ProcessedData) => boolean;
}

type PersonalityId =
  | "night_owl"
  | "quick_draw"
  | "broadcaster"
  | "loyalist"
  | "novelist"
  | "ghost"
  | "reactor"
  | "voice_first"
  | "balanced";

interface Personality {
  id: PersonalityId;
  name: string;
  tagline: string;
  icon: LucideIcon;
  iconColor: string;
  signals: string[];
}

interface PersonalityDef {
  id: PersonalityId;
  name: string;
  tagline: string;
  icon: LucideIcon;
  iconColor: string;
  score: (data: ProcessedData) => { points: number; signals: string[] };
}
export {
  ShowElementsState,
  StatProps,
  SettingsModalProps,
  MonthlyChartProps,
  HourlyChartProps,
  WrappedSlide,
  AchievementTier,
  Achievement,
  AchievementDef,
  PersonalityId,
  Personality,
  PersonalityDef,
};
