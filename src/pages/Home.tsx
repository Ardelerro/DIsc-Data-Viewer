import type { FC } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useMemo, useCallback } from "react";
import { useData } from "../context/DataContext";
import TopUsers from "../components/TopUsers";
import TopChannels from "../components/TopChannels";
import TopServers from "../components/TopServers";
import TopStreaks from "../components/TopStreaks";
import SelfDisplay from "../components/SelfDisplay";
import HourlyChart from "../components/HourlyChart";
import HourlyMoodChart from "../components/HourlyMoodChart";
import SettingsModal from "../components/SettingsModal";
import type { ShowElementsState } from "../types/types";
import MonthlyChart from "../components/MonthlyChart";

const Home: FC = () => {
  const { data, clearData } = useData();
  const [showSettings, setShowSettings] = useState(false);
  const [showElements, setShowElements] = useState<ShowElementsState>({
    topUsers: true,
    topChannels: true,
    topServers: true,
    topStreaks: true,
    hourlyCharts: true,
    monthlyCharts: true,
    moodChart: true,
  });
  const [theme, setTheme] = useState<"light" | "dark">(
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === "light" ? "dark" : "light";
      if (newTheme === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
      return newTheme;
    });
  }, []);

  const handleDownloadData = useCallback(() => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "discord_processed_data.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const handleClearData = useCallback(() => {
    clearData();
  }, [clearData]);

  // ✅ Memoize chart data so re-renders don’t cascade into child components
  const memoizedHourly = useMemo(() => data?.aggregateStats.hourly, [data]);
  const memoizedMonthly = useMemo(() => data?.aggregateStats.monthly, [data]);

  if (!data) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4 text-slate-900 dark:text-white">
            Discord Stats Dashboard
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
            Upload your Discord data package to get started
          </p>
          <Link
            to="/upload"
            className="inline-block px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
          >
            Upload Data Package
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              Discord Stats Dashboard
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Welcome back, {data.self.username}!
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 text-sm bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg transition-colors"
            >
              Settings ⚙️
            </button>
            <button
              onClick={handleClearData}
              className="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg transition-colors"
            >
              Clear Data
            </button>
          </div>
        </div>

        <div className="mb-8">
          <SelfDisplay />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link to="/search">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="p-6 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
            >
              <h3 className="text-xl font-bold mb-2">Search DMs by User</h3>
              <p className="text-purple-100">
                View detailed stats for specific users
              </p>
            </motion.div>
          </Link>

          <Link to="/server-search">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="p-6 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
            >
              <h3 className="text-xl font-bold mb-2">Search by Server</h3>
              <p className="text-blue-100">Explore server-specific analytics</p>
            </motion.div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {showElements.moodChart && (
            <HourlyMoodChart className="col-span-1 lg:col-span-2" />
          )}
          {showElements.hourlyCharts && (
            <HourlyChart
              data={memoizedHourly}
              className="col-span-1 lg:col-span-2"
            />
          )}
          {showElements.monthlyCharts && (
            <MonthlyChart
              data={memoizedMonthly}
              className="col-span-1 lg:col-span-2"
            />
          )}
          {showElements.topUsers && <TopUsers />}
          {showElements.topStreaks && <TopStreaks />}
          {showElements.topChannels && <TopChannels />}
          {showElements.topServers && <TopServers />}
        </div>
      </div>

      <SettingsModal
        showSettings={showSettings}
        theme={theme}
        showElements={showElements}
        setShowSettings={setShowSettings}
        toggleTheme={toggleTheme}
        setShowElements={setShowElements}
        handleDownloadData={handleDownloadData}
      />
    </div>
  );
};

export default Home;
