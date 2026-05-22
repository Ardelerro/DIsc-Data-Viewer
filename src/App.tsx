import { BrowserRouter as Router} from "react-router-dom";
import { DataProvider } from "./context/DataContext";
import AppWrapper from "./components/AppWrapper";

function App() {
  return (
    <DataProvider>
      <Router>
        <AppWrapper />
      </Router>
    </DataProvider>
  );
}

export default App;