import type { FC } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useMemo, useCallback, lazy } from "react";
import { useData } from "../context/DataContext";
import TopUsers from "../components/topDisplays/TopUsers";
import TopChannels from "../components/topDisplays/TopChannels";
import TopServers from "../components/topDisplays/TopServers";
import TopStreaks from "../components/topDisplays/TopStreaks";
import SelfDisplay from "../components/SelfDisplay";
const HourlyChart = lazy(() => import("../components/charts/HourlyChart"));
const HourlyMoodChart = lazy(() => import("../components/charts/HourlyMoodChart"));
import SettingsModal from "../components/SettingsModal";
import type { ShowElementsState } from "../types/types";
const MonthlyChart = lazy(() => import("../components/charts/MonthlyChart"));
import { createPortal } from "react-dom";
import {
  Settings,
  Trash2,
  Download,
  Sun,
  Moon,
  MenuIcon,
  Share2Icon,
} from "lucide-react";
import WrappedCarousel from "../components/WrappedCarousel";
import type { WrappedCardData } from "../types/discord";

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
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
  const [showWrapped, setShowWrapped] = useState(false);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const t = prev === "light" ? "dark" : "light";
      localStorage.setItem("theme", t);
      if (t === "dark") {
        document.documentElement.classList.add("dark");
        setTheme("dark");
      } else {
        document.documentElement.classList.remove("dark");
        setTheme("light");
      }
      return t;
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
  const [fabOnLeft, setFabOnLeft] = useState(false);

  const memoizedHourly = useMemo(() => data?.aggregateStats.hourly, [data]);
  const memoizedMonthly = useMemo(() => data?.aggregateStats.monthly, [data]);
  const wrappedData = useMemo<WrappedCardData | null>(() => {
    if (!data) return null;

    const topUsers: { username: string; messageCount: number }[] = [];

    for (const [key, stats] of Object.entries(data.channelStats)) {
      if (!stats.recipientName || !key.startsWith("dm_")) continue;
      const totalMessages = Object.values(stats.hourly || {}).reduce(
        (a, b) => a + b,
        0,
      );
      //console.log(key, stats.recipientName, totalMessages);

      topUsers.push({
        username: stats.recipientName,
        messageCount: totalMessages,
      });
    }
    topUsers.sort((a, b) => b.messageCount - a.messageCount);
    const serverStats: WrappedCardData["serverStats"] = {};

    for (const [key, stats] of Object.entries(data.channelStats)) {
      if (!key.startsWith("channel_")) continue;

      const channelId = key.replace(/^channel_/, "");

      const total = Object.values(stats.hourly || {}).reduce(
        (sum, val) => sum + (val ?? 0),
        0,
      );

      const type = data.channelMapping[channelId];

      if (!["GUILD_TEXT", "PUBLIC_THREAD", "GUILD_VOICE"].includes(type)) {
        continue;
      }

      const serverId =
        data.serverMapping.channelToServer[channelId] ??
        `unknown (${channelId})`;

      if (!serverStats[serverId]) {
        serverStats[serverId] = {
          name:
            data.serverMapping.serverNames[serverId] ??
            `Unknown Server (${serverId})`,
          messageCount: 0,
        };
      }

      serverStats[serverId].messageCount += total;
    }

    return {
      self: data.self,
      aggregateStats: {
        messageCount: data.aggregateStats.messageCount,
        hourly: data.aggregateStats.hourly,
        monthly: data.aggregateStats.monthly,
        topWords: data.aggregateStats.topWords,
      },
      channelStats: Object.fromEntries(
        Object.entries(data.channelStats).map(([id, ch]) => [
          id,
          {
            monthly: ch.monthly,
            hourly: ch.hourly,
            name: data.channelNaming[id],
          },
        ]),
      ),
      activityStats: data.activityStats,
      topUsers,
      serverStats,
    };
  }, [data]);
  if (!data) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 sm:px-8 text-center bg-gradient-to-br from-indigo-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-900 dark:text-white">
          Discord Stats Dashboard
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 mb-6">
          Upload your Discord data package to get started
        </p>
        <Link
          to="/upload"
          className="inline-block px-6 sm:px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
        >
          Upload Data Package
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2">
              Discord Stats Dashboard
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
              Welcome back, {data.self.username}!
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-4">
            <div
              onClick={() => setShowSettings(true)}
              className="cursor-pointer"
            >
              <Settings className="w-6 h-6 stroke-indigo-500 hover:stroke-indigo-600 dark:stroke-indigo-300 dark:hover:stroke-indigo-200 transition-colors" />
            </div>
            <div
              onClick={() => setShowConfirmDelete(true)}
              className="cursor-pointer"
            >
              <Trash2 className="w-6 h-6 stroke-red-500 hover:stroke-red-600 dark:stroke-red-300 dark:hover:stroke-red-200 transition-colors" />
            </div>
            <div onClick={handleDownloadData} className="cursor-pointer">
              <Download className="w-6 h-6 stroke-emerald-500 hover:stroke-emerald-600 dark:stroke-emerald-300 dark:hover:stroke-emerald-200 transition-colors" />
            </div>
            <div
              className="cursor-pointer"
              onClick={() => setShowWrapped(true)}
            >
              <Share2Icon className="w-6 h-6 stroke-slate-600 hover:stroke-slate-700 dark:stroke-slate-300 dark:hover:stroke-slate-200 transition-colors" />
            </div>
            <div
              onClick={toggleTheme}
              className="relative w-6 h-6 cursor-pointer"
            >
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  rotate: theme === "dark" ? 0 : 90,
                  scale: theme === "dark" ? 1 : 0,
                  opacity: theme === "dark" ? 1 : 0,
                }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <Sun className="w-6 h-6 stroke-slate-600 dark:stroke-slate-200" />
              </motion.div>

              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  rotate: theme === "light" ? 0 : -90,
                  scale: theme === "light" ? 1 : 0,
                  opacity: theme === "light" ? 1 : 0,
                }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <Moon className="w-6 h-6 stroke-slate-600 dark:stroke-slate-200" />
              </motion.div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <SelfDisplay />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Link to="/search">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-5 sm:p-6 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer"
            >
              <h3 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2">
                Search DMs by User
              </h3>
              <p className="text-purple-100 text-sm sm:text-base">
                View detailed stats for specific users
              </p>
            </motion.div>
          </Link>

          <Link to="/server-search">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-5 sm:p-6 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer"
            >
              <h3 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2">
                Search by Server
              </h3>
              <p className="text-blue-100 text-sm sm:text-base">
                Explore server-specific analytics
              </p>
            </motion.div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {showElements.moodChart && (
            <HourlyMoodChart className="col-span-1 lg:col-span-2" />
          )}
          {showElements.hourlyCharts && (
            <HourlyChart
              data={memoizedHourly!}
              className="col-span-1 lg:col-span-2"
            />
          )}
          {showElements.monthlyCharts && (
            <MonthlyChart
              data={memoizedMonthly!}
              className="col-span-1 lg:col-span-2"
            />
          )}
          {showElements.topUsers && <TopUsers />}
          {showElements.topStreaks && <TopStreaks />}
          {showElements.topChannels && <TopChannels />}
          {showElements.topServers && <TopServers />}
        </div>
      </div>

      {createPortal(
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 45, damping: 14 }}
          className={`
          fixed bottom-3 sm:hidden
          ${fabOnLeft ? "left-1/2 -translate-x-1/2" : "left-0 -translate-x-7"}
          flex items-center gap-3 z-50
        `}
        >
          <motion.div
            initial={false}
            animate={fabOnLeft ? "open" : "closed"}
            transition={{
              duration: 0.28,
              ease: [0.22, 1, 0.36, 1],
            }}
            variants={{
              open: {
                width: "auto",
                opacity: 1,
                pointerEvents: "auto",
                x: 0,
              },
              closed: {
                width: 0,
                opacity: 0,
                pointerEvents: "none",
                x: -10,
              },
            }}
            className="
      flex items-center gap-3 overflow-hidden
      rounded-full bg-white/90 dark:bg-slate-800/90
      backdrop-blur-xl shadow-xl border border-slate-200 dark:border-slate-700
      px-4 py-0
    "
          >
            <div
              onClick={() => setShowSettings(true)}
              className="p-3 rounded-full cursor-pointer active:scale-90 transition"
            >
              <Settings className="w-6 h-6 stroke-indigo-500 dark:stroke-indigo-300" />
            </div>

            <div
              onClick={() => setShowConfirmDelete(true)}
              className="p-3 rounded-full cursor-pointer active:scale-90 transition"
            >
              <Trash2 className="w-6 h-6 stroke-red-500 dark:stroke-red-300" />
            </div>

            <div
              onClick={handleDownloadData}
              className="p-3 rounded-full cursor-pointer active:scale-90 transition"
            >
              <Download className="w-6 h-6 stroke-emerald-500 dark:stroke-emerald-300" />
            </div>
            <div
              className="p-3 rounded-full cursor-pointer active:scale-90 transition"
              onClick={() => setShowWrapped(true)}
            >
              <Share2Icon className="w-6 h-6 stroke-slate-600 hover:stroke-slate-700 dark:stroke-slate-300 dark:hover:stroke-slate-200 transition-colors" />
            </div>
            <div
              onClick={toggleTheme}
              className="relative w-6 h-6 p-3 rounded-full cursor-pointer active:scale-90 transition"
            >
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  rotate: theme === "dark" ? 0 : 90,
                  scale: theme === "dark" ? 1 : 0,
                  opacity: theme === "dark" ? 1 : 0,
                }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <Sun className="w-6 h-6 stroke-slate-600 dark:stroke-slate-200" />
              </motion.div>

              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  rotate: theme === "light" ? 0 : -90,
                  scale: theme === "light" ? 1 : 0,
                  opacity: theme === "light" ? 1 : 0,
                }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <Moon className="w-6 h-6 stroke-slate-600 dark:stroke-slate-200" />
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            onClick={() => setFabOnLeft((v) => !v)}
            whileTap={{ scale: 0.9 }}
            animate={fabOnLeft ? { rotate: 90 } : { rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
            className="
      p-3 rounded-full bg-white dark:bg-slate-800
      shadow-xl border border-slate-200 dark:border-slate-700
      cursor-pointer
    "
          >
            <MenuIcon className="w-6 h-6 stroke-slate-700 dark:stroke-slate-300" />
          </motion.div>
        </motion.div>,
        document.body,
      )}
      <SettingsModal
        showSettings={showSettings}
        showElements={showElements}
        setShowSettings={setShowSettings}
        setShowElements={setShowElements}
      />
      {showConfirmDelete &&
        createPortal(
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-slate-800 rounded-xl p-6 w-80 max-w-sm shadow-xl flex flex-col gap-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Are you sure?
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                This will delete all your data and cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    clearData();
                    setShowConfirmDelete(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>,
          document.body,
        )}
      {showWrapped &&
        createPortal(
          <WrappedCarousel
            data={wrappedData!}
            onClose={() => setShowWrapped(false)}
          />,
          document.body,
        )}
    </div>
  );
};

export default Home;
