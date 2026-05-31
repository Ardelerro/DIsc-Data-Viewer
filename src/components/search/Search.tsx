import type { FC, ReactNode } from "react";
import { motion } from "framer-motion";

interface SearchProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  animationKey?: string | null;
  children: ReactNode;
}

const Search: FC<SearchProps> = ({
  icon,
  title,
  subtitle,
  animationKey,
  children,
}) => {
  return (
    <div className="max-w-5xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        key={animationKey ?? undefined}
        className="p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-0 bg-[var(--color-accent-soft)] rounded-xl text-[var(--color-accent)] overflow-hidden flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-1)]">
              {title}
            </h1>
            <p className="text-sm text-[var(--color-text-3)]">{subtitle}</p>
          </div>
        </div>

        {children}
      </motion.div>
    </div>
  );
};

export default Search;
