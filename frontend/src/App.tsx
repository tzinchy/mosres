import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApartsPage } from "@/pages/ApartsPage";
import { BuildingPage } from "@/pages/BuildingPage";

const qc = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ApartsPage />} />
            <Route path="/buildings/:id" element={<BuildingPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
