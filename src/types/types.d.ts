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

export { ShowElementsState, StatProps, SettingsModalProps, MonthlyChartProps, HourlyChartProps };