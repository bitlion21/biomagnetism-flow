import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/Login";
import { AgendaPage } from "@/pages/Agenda";
import { PatientsPage } from "@/pages/Patients";
import { PatientDetailPage } from "@/pages/PatientDetail";
import { SessionPage } from "@/pages/Session";
import { KnowledgePage } from "@/pages/Knowledge";
import { KnowledgeImagesPage } from "@/pages/KnowledgeImages";
import { DiseaseDetailPage } from "@/pages/DiseaseDetail";
import { HelpPage } from "@/pages/Help";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-soft text-primary">Cargando...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-soft text-primary">Cargando...</div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      
      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <AgendaPage />
        </ProtectedRoute>
      } />
      <Route path="/patients" element={
        <ProtectedRoute>
          <PatientsPage />
        </ProtectedRoute>
      } />
      <Route path="/patients/:id" element={
        <ProtectedRoute>
          <PatientDetailPage />
        </ProtectedRoute>
      } />
      <Route path="/session/:patientId" element={
        <ProtectedRoute>
          <SessionPage />
        </ProtectedRoute>
      } />
      <Route path="/knowledge" element={
        <ProtectedRoute>
          <KnowledgePage />
        </ProtectedRoute>
      } />
      <Route path="/knowledge/images" element={
        <ProtectedRoute>
          <KnowledgeImagesPage />
        </ProtectedRoute>
      } />
      <Route path="/knowledge/diseases/:id" element={
        <ProtectedRoute>
          <DiseaseDetailPage />
        </ProtectedRoute>
      } />
      <Route path="/knowledge/help" element={
        <ProtectedRoute>
          <HelpPage />
        </ProtectedRoute>
      } />
      
      {/* Catch all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
            <AppRoutes />
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
