import type { FC } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useData } from "../context/DataContext";
import TopUsers from "../components/TopUsers";
import TopChannels from "../components/TopChannels";
import TopServers from "../components/TopServers";
import TopStreaks from "../components/TopStreaks";
import SelfDisplay from "../components/SelfDisplay";

const Home: FC = () => {
  const { data, clearData } = useData();

  // If no data, show upload prompt
  if (!data) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
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
          </motion.div>
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
          <button
            onClick={clearData}
            className="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg transition-colors"
          >
            Clear Data
          </button>
        </div>

        <div className="mb-8">
          <SelfDisplay />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-xl bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-700"
          >
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Total Messages
            </h3>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {data.aggregateStats.messageCount.toLocaleString()}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-xl bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-700"
          >
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Avg. Time Between Messages
            </h3>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {Math.round(data.aggregateStats.averageGapBetweenMessages / 60)} min
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-xl bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-700"
          >
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Most Used Word
            </h3>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {data.aggregateStats.topWords?.[0] || 'N/A'}
            </p>
          </motion.div>
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
              <p className="text-purple-100">View detailed stats for specific users</p>
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
          <TopUsers />
          <TopStreaks />
          <TopChannels />
          <TopServers />
        </div>
      </div>
    </div>
  );
};

export default Home;