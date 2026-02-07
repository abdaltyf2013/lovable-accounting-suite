import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import MainLayout from "@/components/layout/MainLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import Invoices from "@/pages/Invoices";
import Accountants from "@/pages/Accountants";
import Reports from "@/pages/Reports";
import AccountantsRanking from "@/pages/AccountantsRanking";
import SettlementsLog from "@/pages/SettlementsLog";
import AuditLog from "@/pages/AuditLog";
import Settings from "@/pages/Settings";
import Debts from "@/pages/Debts";
import Tasks from "@/pages/Tasks";
import ClientProfile from "@/pages/ClientProfile";
import Partnership from "@/pages/Partnership";
import NotFound from "@/pages/NotFound";
import { AIChatWidget } from "@/components/ai/AIChatWidget";
import Install from "@/pages/Install";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { ShortcutsHelp } from "@/components/ui/ShortcutsHelp";
import { SuperAdminDashboard } from "@/pages/admin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/install" element={<Install />} />
              <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route element={<MainLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/clients/:id" element={<ClientProfile />} />
                <Route path="/sales" element={<Invoices type="sales" />} />
                <Route path="/purchases" element={<Invoices type="purchase" />} />
                <Route path="/accountants" element={<Accountants />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/ranking" element={<AccountantsRanking />} />
                <Route path="/settlements" element={<SettlementsLog />} />
                <Route path="/audit-log" element={<AuditLog />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/debts" element={<Debts />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/partnership" element={<Partnership />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            <AIChatWidget />
            <CommandPalette />
            <ShortcutsHelp />
          </AuthProvider>
        </HashRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
