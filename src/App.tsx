import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectDetailsPage } from "./pages/ProjectDetailsPage";
import { BuildingsPage } from "./pages/BuildingsPage";
import { CustomersPage } from "./pages/CustomersPage";
import { PanelGroupsPage } from "./pages/PanelGroupsPage";
import { UsersPage } from "./pages/UsersPage";
import { BulkImportProjectsPage } from "./pages/BulkImportProjectsPage";
import { BulkImportPanelsPage } from "./pages/BulkImportPanelsPage";
import { FacadesPage } from "./pages/FacadesPage";
import { PanelsPage } from "./pages/PanelsPage";
import { BuildingDetailsPage } from "./pages/BuildingDetailsPage";
import { FacadeDetailsPage } from "./pages/FacadeDetailsPage";
import { LoginPage } from "./pages/LoginPage";
import { ToastProvider } from "./contexts/ToastContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";
import { forceEnglishLocale } from "./utils/date-utils";

export default function App() {
  // Force English locale for date inputs
  React.useEffect(() => {
    forceEnglishLocale();
  }, []);

  return (    
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <HomePage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/projects" element={
              <ProtectedRoute>
                <Layout>
                  <ProjectsPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/projects/:id" element={
              <ProtectedRoute>
                <Layout>
                  <ProjectDetailsPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/buildings" element={
              <ProtectedRoute>
                <Layout>
                  <BuildingsPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/buildings/:id" element={
              <ProtectedRoute>
                <Layout>
                  <BuildingDetailsPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/facades" element={
              <ProtectedRoute>
                <Layout>
                  <FacadesPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/facades/:id" element={
              <ProtectedRoute>
                <Layout>
                  <FacadeDetailsPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/panels" element={
              <ProtectedRoute>
                <Layout>
                  <PanelsPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/customers" element={
              <ProtectedRoute>
                <Layout>
                  <CustomersPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/panel-groups" element={
              <ProtectedRoute>
                <Layout>
                  <PanelGroupsPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <AdminRoute>
                <Layout>
                  <UsersPage />
                </Layout>
              </AdminRoute>
            } />
            <Route path="/bulk-import-projects" element={
              <ProtectedRoute>
                <Layout>
                  <BulkImportProjectsPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/bulk-import-panels" element={
              <ProtectedRoute>
                <Layout>
                  <BulkImportPanelsPage />
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}