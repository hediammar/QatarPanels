import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectManagement } from '../components/ProjectManagement';
import { apiService } from '../utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { AlertCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';

export function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (showRetrying = false) => {
    try {
      if (showRetrying) {
        setIsRetrying(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log('Loading projects and customers data...');
      
      const [projectsData, customersData] = await Promise.all([
        apiService.getProjects(),
        apiService.getCustomers()
      ]);

      setProjects(projectsData || []);
      setCustomers(customersData || []);
      
      console.log('Data loaded successfully:', {
        projects: projectsData?.length || 0,
        customers: customersData?.length || 0,
        fallbackMode: apiService.isInFallbackMode()
      });

    } catch (err) {
      console.error('Error loading projects data:', err);
      setError('Failed to load data. Please check your connection and try again.');
      
      // Try to load fallback data as a last resort
      try {
        const [fallbackProjects, fallbackCustomers] = await Promise.all([
          apiService.getProjects(),
          apiService.getCustomers()
        ]);
        setProjects(fallbackProjects || []);
        setCustomers(fallbackCustomers || []);
        setError(null);
        console.log('Fallback data loaded successfully');
      } catch (fallbackErr) {
        console.error('Failed to load fallback data:', fallbackErr);
        // Keep the error state but with empty arrays
        setProjects([]);
        setCustomers([]);
      }
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  };

  const handleRetry = () => {
    loadData(true);
  };

  const handleAddProject = async (projectData: any) => {
    try {
      const newProject = await apiService.createProject(projectData);
      setProjects(prev => [...prev, newProject]);
    } catch (err) {
      console.error('Error adding project:', err);
      setError('Failed to add project. Please try again.');
    }
  };

  const handleUpdateProject = async (id: string, updates: any) => {
    try {
      const updatedProject = await apiService.updateProject(id, updates);
      setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
    } catch (err) {
      console.error('Error updating project:', err);
      setError('Failed to update project. Please try again.');
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await apiService.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Failed to delete project. Please try again.');
    }
  };

  const handleNavigateToBulkImport = () => {
    navigate('/bulk-import-projects');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProjectManagement/>
    </div>
  );
}