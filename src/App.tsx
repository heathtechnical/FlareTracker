import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import CheckIn from "./pages/CheckIn";
import Trends from "./pages/Trends";
import ConditionDetails from "./pages/ConditionDetail";
import MedicationsList from "./pages/MedicationsList";
import ConditionsList from "./pages/ConditionsList";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="check-in" element={<CheckIn />} />
            <Route path="trends" element={<Trends />} />
            <Route path="conditions" element={<ConditionsList />} />
            <Route path="conditions/:id" element={<ConditionDetails />} />
            <Route path="medications" element={<MedicationsList />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
