import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { DataProvider } from "./context/DataContext";
import Home from "./pages/Home";
import Search from "./pages/Search";
import ServerSearchPage from "./pages/SearchServer";
import UploadPage from "./pages/UploadPage";
import ErrorPage from "./pages/ErrorPage";

function App() {
  return (
    <DataProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/server-search" element={<ServerSearchPage />} />
          <Route path="/upload" element={<UploadPage />} />
                    <Route path="*" element={<ErrorPage code={404} />} />
        </Routes>
      </Router>
    </DataProvider>
  );
}

export default App;