import type { FC } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface ErrorPageProps {
  code?: number;
  message?: string;
}

const errorMessages: Record<number, string> = {
  301: "Page moved permanently.",
  400: "Bad request. Something's off with your request.",
  401: "You're not authorized to view this page.",
  403: "Access denied. You don't have permission.",
  404: "Page not found. Maybe it moved?",
  500: "Internal server error. Our bad!",
  502: "Bad gateway. Try again later.",
  503: "Service unavailable. Please try again soon.",
  504: "Gateway timeout. The server took too long to respond.",
};

const ErrorPage: FC<ErrorPageProps> = ({ code = 404, message }) => {
  const displayMessage = message ?? errorMessages[code] ?? "Unexpected error occurred.";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)]">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center px-6"
      >
        <h1 className="text-7xl font-extrabold text-[var(--color-accent)] mb-4">
          {code}
        </h1>
        <h2 className="text-2xl font-semibold text-[var(--color-text-1)] mb-2">
          {displayMessage}
        </h2>
        <p className="text-[var(--color-text-2)] mb-8">
          Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/"
            className="px-6 py-3 rounded-lg bg-[var(--color-accent)] hover:opacity-90 text-white font-medium transition-opacity"
          >
            Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 rounded-lg bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)] text-[var(--color-text-1)] font-medium transition-colors"
          >
            Back
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 0.15, y: 0 }}
        transition={{ delay: 0.3, duration: 1 }}
        className="absolute bottom-10 text-9xl select-none text-[var(--color-border-solid)] font-extrabold"
      >
        {code}
      </motion.div>
    </div>
  );
};

export default ErrorPage;
