import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApartPage } from "@/pages/ApartPage";
import { ApartsPage } from "@/pages/ApartsPage";
import { BuildingPage } from "@/pages/BuildingPage";
import { BuildingsListPage } from "@/pages/BuildingsListPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { MapPage } from "@/pages/MapPage";
import { MortgagePage } from "@/pages/MortgagePage";
import { LoginPage } from "@/pages/LoginPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { PlateWatchesPage } from "@/pages/PlateWatchesPage";
import { TorgiCarsPage } from "@/pages/TorgiCarsPage";
import { TorgiDashboardPage } from "@/pages/TorgiDashboardPage";
import { TorgiLotPage } from "@/pages/TorgiLotPage";
import { TorgiObjectPage } from "@/pages/TorgiObjectPage";
import { TorgiObjectsDashboardPage } from "@/pages/TorgiObjectsDashboardPage";
import { TorgiObjectsPage } from "@/pages/TorgiObjectsPage";
import { getToken } from "@/lib/auth";

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

/** Токен живёт в localStorage; saveSession/clearSession шлют событие mosres.auth. */
function subscribeToken(cb: () => void) {
  window.addEventListener("mosres.auth", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("mosres.auth", cb);
    window.removeEventListener("storage", cb);
  };
}

export default function App() {
  const token = useSyncExternalStore(subscribeToken, getToken);

  if (!token) return <LoginPage />;

  return (
    <QueryClientProvider client={qc}>
      <TooltipProvider delay={200}>
        <BrowserRouter>
          <AppShell>
            <Routes>
              {/* стартовая страница — сводка торгов; москварталы живут на /mosres */}
              <Route path="/" element={<TorgiDashboardPage />} />
              <Route path="/mosres" element={<DashboardPage />} />
              <Route path="/aparts" element={<ApartsPage />} />
              <Route path="/aparts/:id" element={<ApartPage />} />
              <Route path="/buildings" element={<BuildingsListPage />} />
              <Route path="/buildings/:id" element={<BuildingPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/mortgage" element={<MortgagePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/torgi" element={<Navigate to="/" replace />} />
              <Route path="/torgi/cars" element={<TorgiCarsPage />} />
              <Route path="/torgi/cars/:lotId" element={<TorgiLotPage />} />
              <Route path="/torgi/plates" element={<PlateWatchesPage />} />
              <Route
                path="/dash/objects"
                element={<TorgiObjectsDashboardPage />}
              />
              <Route path="/torgi/objects" element={<TorgiObjectsPage />} />
              <Route path="/torgi/objects/:lotId" element={<TorgiObjectPage />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
        <Toaster position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
