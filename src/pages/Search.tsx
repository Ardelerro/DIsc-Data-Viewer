import type { FC } from "react";
import { Link } from "react-router-dom";
import UserSearch from "../components/search/UserSearch";
import { useData } from "../context/DataContext";
import { ICON_BTN } from "../config/theme";
import { ArrowLeft } from "lucide-react";

const Search: FC = () => {
  const { data, hydrating } = useData();

  if (hydrating) {
    return (
      <div className="min-h-screen w-full bg-[var(--color-bg)] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[var(--color-border-solid)] border-t-[var(--color-accent)] animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen w-full bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--color-text-2)] mb-4">No data available</p>
          <Link to="/upload" className="text-[var(--color-accent)] underline">
            Upload your Discord data
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[var(--color-bg)] overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-[var(--color-border)]">
          <h1 className="text-base font-semibold tracking-tight text-[var(--color-text-1)]">
            Search DMs
          </h1>
          <Link to="/" className={ICON_BTN} aria-label="Back to home">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
        <UserSearch />
      </div>
    </div>
  );
};

export default Search;
