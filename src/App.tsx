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
import { ToastProvider } from "./contexts/ToastContext";
import { forceEnglishLocale } from "./utils/date-utils";

export default function App() {
  // Force English locale for date inputs
  React.useEffect(() => {
    forceEnglishLocale();
  }, []);

  return (    
    <ToastProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailsPage />} />
            <Route path="/buildings" element={<BuildingsPage />} />
            <Route path="/facades" element={<FacadesPage />} />
            <Route path="/panels" element={<PanelsPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/panel-groups" element={<PanelGroupsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/bulk-import-projects" element={<BulkImportProjectsPage />} />
            <Route path="/bulk-import-panels" element={<BulkImportPanelsPage />} />
          </Routes>
        </Layout>
      </Router>
    </ToastProvider>
  );
}