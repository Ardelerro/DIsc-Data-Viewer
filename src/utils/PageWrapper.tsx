import { motion } from "framer-motion";
import type { FC, PropsWithChildren } from "react";

const pageVariants = {
  initial: { opacity: 0, scale: 0.98, filter: "blur(4px)" },
  in:      { opacity: 1, scale: 1,    filter: "blur(0px)" },
  out:     { opacity: 0, scale: 1.01, filter: "blur(4px)" },
};

const PageWrapper: FC<PropsWithChildren<{}>> = ({ children }) => (
  <motion.div
    initial="initial"
    animate="in"
    exit="out"
    variants={pageVariants}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    className="w-full min-h-screen bg-gradient-to-br from-indigo-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800"
  >
    {children}
  </motion.div>
);

export default PageWrapper;