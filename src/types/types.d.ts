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

interface SettingsModalProps {
  showSettings: boolean;
  theme: "light" | "dark";
  showElements: ShowElementsState;
  setShowSettings: (value: boolean) => void;
  toggleTheme: () => void;
  setShowElements: React.Dispatch<React.SetStateAction<ShowElementsState>>;
  handleDownloadData: () => void;
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