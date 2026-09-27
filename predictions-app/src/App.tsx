import { HashRouter, Routes, Route } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardShell from "./components/DashboardShell";
import ScrollToTop from "./components/ScrollToTop";
import BackToTop from "./components/BackToTop";
import ThisWeek from "./pages/ThisWeek";
import Teams from "./pages/Teams";
import Schedule from "./pages/Schedule";
import Predictions from "./pages/Predictions";
import Method from "./pages/Method";

export default function App() {
  return (
    <HashRouter>
      <TooltipProvider>
        <ScrollToTop />
        <DashboardShell>
          <Routes>
            <Route path="/" element={<ThisWeek />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/method" element={<Method />} />
          </Routes>
        </DashboardShell>
        <BackToTop />
      </TooltipProvider>
    </HashRouter>
  );
}