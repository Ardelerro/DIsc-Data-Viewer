import { AnimatePresence } from "framer-motion";
import { useLocation, Routes, Route } from "react-router-dom";
import ErrorPage from "../pages/ErrorPage";
import ServerSearchPage from "../pages/SearchServer";
import UploadPage from "../pages/UploadPage";
import PageWrapper from "./PageWrapper";
import Home from "../pages/Home";
import Search from "../pages/Search";

function AppWrapper() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/search" element={<PageWrapper><Search /></PageWrapper>} />
        <Route path="/server-search" element={<PageWrapper><ServerSearchPage /></PageWrapper>} />
        <Route path="/upload" element={<PageWrapper><UploadPage /></PageWrapper>} />
        <Route path="*" element={<PageWrapper><ErrorPage code={404} /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

export default AppWrapper;