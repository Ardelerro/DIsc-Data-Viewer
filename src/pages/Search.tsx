import type { FC } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import UserSearch from "../components/UserSearch";
import { useData } from "../context/DataContext";

const Search: FC = () => {
    const { data } = useData();

    if (!data) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-slate-600 dark:text-slate-300 mb-4">No data available</p>
                    <Link to="/upload" className="text-indigo-600 dark:text-indigo-400 underline">
                        Upload your Discord data
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 px-4 py-8">
            <div className="mb-6">
                <Link
                    to="/"
                    className="inline-block p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
                    aria-label="Back"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-5 h-5 text-slate-700 dark:text-slate-300"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
            </div>

            <UserSearch />
        </div>
    );
};

export default Search;
