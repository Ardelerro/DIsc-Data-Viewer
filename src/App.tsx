import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { DataProvider } from "./context/DataContext";
import Home from "./pages/Home";
import Search from "./pages/Search";
import ServerSearchPage from "./pages/SearchServer";
import UploadPage from "./pages/UploadPage";

function App() {
  return (
    <DataProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/server-search" element={<ServerSearchPage />} />
          <Route path="/upload" element={<UploadPage />} />
        </Routes>
      </Router>
    </DataProvider>
  );
}

export default App;