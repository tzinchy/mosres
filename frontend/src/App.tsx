import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApartsPage } from "@/pages/ApartsPage";
import { BuildingPage } from "@/pages/BuildingPage";
import { BuildingsListPage } from "@/pages/BuildingsListPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { MapPage } from "@/pages/MapPage";
import { MortgagePage } from "@/pages/MortgagePage";
import { NotificationsPage } from "@/pages/NotificationsPage";

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <TooltipProvider delay={200}>
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/aparts" element={<ApartsPage />} />
              <Route path="/buildings" element={<BuildingsListPage />} />
              <Route path="/buildings/:id" element={<BuildingPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/mortgage" element={<MortgagePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
        <Toaster position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
