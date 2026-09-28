import { HashRouter, Routes, Route } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import ScrollToTop from "./components/ScrollToTop";
import BackToTop from "./components/BackToTop";
import ScoresTicker from "./components/layout/ScoresTicker";
import SiteHeader from "./components/layout/SiteHeader";
import SiteFooter from "./components/layout/SiteFooter";
import Home from "./pages/Home";
import ThisWeek from "./pages/ThisWeek";
import Teams from "./pages/Teams";
import Schedule from "./pages/Schedule";
import Predictions from "./pages/Predictions";
import Ask from "./pages/Ask";
import Method from "./pages/Method";

export default function App() {
  return (
    <HashRouter>
      <MotionConfig reducedMotion="user">
        <ScrollToTop />
        <ScoresTicker />
        <SiteHeader />
        <main className="min-h-[70vh]">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/week" element={<ThisWeek />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/ask" element={<Ask />} />
            <Route path="/method" element={<Method />} />
          </Routes>
        </main>
        <SiteFooter />
        <BackToTop />
      </MotionConfig>
    </HashRouter>
  );
}
