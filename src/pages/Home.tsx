import type { FC } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useMemo, useCallback, lazy } from "react";
import { useTheme } from "../components/ThemeProvider";
import { useData } from "../context/DataContext";
import TopUsers from "../components/displays/topDisplays/TopUsers";
import TopChannels from "../components/displays/topDisplays/TopChannels";
import TopServers from "../components/displays/topDisplays/TopServers";
import TopStreaks from "../components/displays/topDisplays/TopStreaks";
import {
  type DateRange,
  filterMonthly,
  filterHourlyByRange,
} from "../utils/uiUtils/timeFilterUtils";
import SelfDisplay from "../components/displays/SelfDisplay";
const HourlyChart = lazy(() => import("../components/charts/HourlyChart"));
const HourlyMoodChart = lazy(
  () => import("../components/charts/HourlyMoodChart"),
);
import SettingsModal from "../components/displays/SettingsDisplay";
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
  ArrowRight,
} from "lucide-react";
import WrappedCarousel from "../components/displays/WrappedDisplay";
import { ICON_BTN } from "../config/theme";
import TimeRangeSelector from "../components/forms/TimeRangeSelector";

const Home: FC = () => {
  const { data, clearData, hydrating } = useData();
  const { theme, toggleTheme } = useTheme();
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
  const [showWrapped, setShowWrapped] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const hasDaily = !!(
    data?.aggregateStats?.daily &&
    Object.keys(data.aggregateStats.daily).length > 0
  );
  const lastDataDate = useMemo(() => {
    if (!data?.aggregateStats?.daily) return undefined;
    const keys = Object.keys(data.aggregateStats.daily);
    const sorted = [...keys].sort();
    return sorted.length > 0 ? sorted[sorted.length - 1] : undefined;
  }, [data]);

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

  const [menuOpen, setMenuOpen] = useState(false);

  const memoizedHourly = useMemo(() => data?.aggregateStats.hourly, [data]);
  const memoizedMonthly = useMemo(() => data?.aggregateStats.monthly, [data]);
  const filteredMonthly = useMemo(
    () => (memoizedMonthly ? filterMonthly(memoizedMonthly, dateRange) : {}),
    [memoizedMonthly, dateRange],
  );
  const filteredHourly = useMemo(() => {
    if (!dateRange) return memoizedHourly ?? {};
    const dailyHourly = data?.aggregateStats.dailyHourly;
    if (!dailyHourly) return memoizedHourly ?? {};
    return filterHourlyByRange(dailyHourly, dateRange);
  }, [data, dateRange, memoizedHourly]);

  const iconBtn = ICON_BTN;

  if (hydrating) {
    return (
      <div className="min-h-screen w-full bg-[var(--color-bg)] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[var(--color-border-solid)] border-t-[var(--color-accent)] animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 text-center bg-[var(--color-bg)]">
        <h1 className="text-xl font-semibold mb-2 text-[var(--color-text-1)]">
          Discord Stats
        </h1>
        <p className="text-sm text-[var(--color-text-3)] mb-6">
          Upload your Discord data package to get started
        </p>
        <Link
          to="/upload"
          className="inline-block px-5 py-2 bg-[var(--color-accent)] hover:opacity-90 text-white text-sm font-medium rounded-lg transition-opacity duration-150"
        >
          Upload Data Package
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[var(--color-bg)] overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        {/* ─── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-[var(--color-border)]">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-[var(--color-text-1)]">
              Discord Stats
            </h1>
            <p className="text-xs text-[var(--color-text-3)] mt-0.5">
              {data.self.username}
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-0.5">
            <button
              onClick={() => setShowSettings(true)}
              className={iconBtn}
              title="Settings"
            >
              <Settings className="[var(--icon-size)]" />
            </button>
            <button
              onClick={() => setShowConfirmDelete(true)}
              className={iconBtn}
              title="Delete data"
            >
              <Trash2 className="[var(--icon-size)]" />
            </button>
            <button
              onClick={handleDownloadData}
              className={iconBtn}
              title="Download data"
            >
              <Download className="[var(--icon-size)]" />
            </button>
            <button
              onClick={() => setShowWrapped(true)}
              className={iconBtn}
              title="Share Wrapped"
            >
              <Share2Icon className="[var(--icon-size)]" />
            </button>
            <button
              onClick={toggleTheme}
              className={`${iconBtn} relative w-8 h-8`}
              title="Toggle theme"
            >
              <motion.span
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  rotate: theme === "light" ? 0 : 90,
                  scale: theme === "light" ? 1 : 0,
                  opacity: theme === "light" ? 1 : 0,
                }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <Sun className="[var(--icon-size)]" />
              </motion.span>
              <motion.span
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  rotate: theme === "dark" ? 0 : -90,
                  scale: theme === "dark" ? 1 : 0,
                  opacity: theme === "dark" ? 1 : 0,
                }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <Moon className="[var(--icon-size)]" />
              </motion.span>
            </button>
          </div>
        </div>

        {/* ─── Profile ────────────────────────────────────────────── */}
        <div className="mb-5">
          <SelfDisplay />
        </div>

        {/* ─── Navigation cards ───────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <Link to="/search">
            <div className="group flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-raised)] transition-all duration-150 cursor-pointer">
              <div>
                <h3 className="text-sm font-medium text-[var(--color-text-1)]">
                  Search DMs
                </h3>
                <p className="text-xs text-[var(--color-text-3)] mt-0.5">
                  View stats for specific users
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--color-text-3)] group-hover:text-[var(--color-accent)] transition-colors duration-150 shrink-0" />
            </div>
          </Link>

          <Link to="/server-search">
            <div className="group flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-raised)] transition-all duration-150 cursor-pointer">
              <div>
                <h3 className="text-sm font-medium text-[var(--color-text-1)]">
                  Search by Server
                </h3>
                <p className="text-xs text-[var(--color-text-3)] mt-0.5">
                  Explore server-specific analytics
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--color-text-3)] group-hover:text-[var(--color-accent)] transition-colors duration-150 shrink-0" />
            </div>
          </Link>
        </div>

        {/* ─── Charts & tables ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {showElements.moodChart && (
            <HourlyMoodChart className="col-span-1 lg:col-span-2" />
          )}
          <div className="col-span-1 lg:col-span-2 flex flex-wrap items-center gap-3 px-0.5 mt-2">
            <TimeRangeSelector
              hasDaily={hasDaily}
              anchorDate={lastDataDate}
              onChange={setDateRange}
            />
          </div>
          {showElements.hourlyCharts && (
            <HourlyChart
              data={filteredHourly}
              className="col-span-1 lg:col-span-2"
            />
          )}
          {showElements.monthlyCharts && (
            <MonthlyChart
              data={filteredMonthly}
              className="col-span-1 lg:col-span-2"
            />
          )}
          {showElements.topUsers && <TopUsers dateRange={dateRange} />}
          {showElements.topStreaks && <TopStreaks dateRange={dateRange} />}
          {showElements.topChannels && <TopChannels dateRange={dateRange} />}
          {showElements.topServers && <TopServers dateRange={dateRange} />}
        </div>
      </div>

      {/* ─── Mobile FAB ─────────────────────────────────────────── */}
      {createPortal(
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 45, damping: 14 }}
          className="fixed bottom-4 left-4 sm:hidden flex items-center gap-2 z-50 max-w-[calc(100vw-2rem)]"
        >
          <motion.button
            onClick={() => setMenuOpen((v) => !v)}
            whileTap={{ scale: 0.9 }}
            animate={menuOpen ? { rotate: 90 } : { rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="shrink-0 p-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] cursor-pointer text-[var(--color-text-2)]"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            <MenuIcon className="w-5 h-5" />
          </motion.button>

          <motion.div
            initial={false}
            animate={menuOpen ? "open" : "closed"}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            variants={{
              open: { width: "auto", opacity: 1, pointerEvents: "auto", x: 0 },
              closed: { width: 0, opacity: 0, pointerEvents: "none", x: -10 },
            }}
            className="flex items-center gap-1 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-1"
          >
            <button
              onClick={() => setShowSettings(true)}
              className="shrink-0 p-2 rounded-full cursor-pointer active:scale-90 transition text-[var(--color-text-3)]"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="shrink-0 p-2 rounded-full cursor-pointer active:scale-90 transition text-[var(--color-text-3)]"
              aria-label="Delete data"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownloadData}
              className="shrink-0 p-2 rounded-full cursor-pointer active:scale-90 transition text-[var(--color-text-3)]"
              aria-label="Download data"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowWrapped(true)}
              className="shrink-0 p-2 rounded-full cursor-pointer active:scale-90 transition text-[var(--color-text-3)]"
              aria-label="Share Wrapped"
            >
              <Share2Icon className="w-5 h-5" />
            </button>
            <button
              onClick={toggleTheme}
              className="relative shrink-0 w-9 h-9 rounded-full cursor-pointer active:scale-90 transition text-[var(--color-text-3)]"
              aria-label="Toggle theme"
            >
              <motion.span
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  rotate: theme === "dark" ? 0 : 90,
                  scale: theme === "dark" ? 1 : 0,
                  opacity: theme === "dark" ? 1 : 0,
                }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <Sun className="w-5 h-5" />
              </motion.span>
              <motion.span
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  rotate: theme === "light" ? 0 : -90,
                  scale: theme === "light" ? 1 : 0,
                  opacity: theme === "light" ? 1 : 0,
                }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <Moon className="w-5 h-5" />
              </motion.span>
            </button>
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

      {/* ─── Delete confirm ─────────────────────────────────────── */}
      {showConfirmDelete &&
        createPortal(
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 w-72 max-w-sm flex flex-col gap-4"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-1)]">
                  Delete all data?
                </h3>
                <p className="text-xs text-[var(--color-text-2)] mt-1">
                  This will permanently delete all your data and cannot be
                  undone.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-2)] hover:bg-[var(--color-surface-raised)] transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    clearData();
                    setShowConfirmDelete(false);
                  }}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--color-negative)] hover:opacity-90 text-white transition-opacity duration-150"
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
            data={data}
            onClose={() => setShowWrapped(false)}
          />,
          document.body,
        )}
    </div>
  );
};

export default Home;
