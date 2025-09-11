import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Edit, Trash2, Square, DollarSign, Weight, Package, TrendingUp, Clock, User, MapPin } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { supabase } from "../lib/supabase";
import { FacadesSection } from "../components/project-details/FacadesSection";
import { BuildingModalTrigger } from "../components/BuildingModal";
import { useAuth } from "../contexts/AuthContext";
import { hasPermission, UserRole } from "../utils/rolePermissions";
import { useToastContext } from "../contexts/ToastContext";
import { crudOperations } from "../utils/userTracking";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface Building {
  id: string;
  name: string;
  project_id: string;
  status: number;
  description?: string;
  created_at: string;
  updated_at: string;
  totalArea?: number;
  totalAmount?: number;
  totalWeight?: number;
  totalPanels?: number;
}

interface Project {
  id: string;
  name: string;
  customer_id: string;
  location: string;
  start_date: string;
  end_date: string;
  status: number;
  estimated_cost: number;
  estimated_panels: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

export function BuildingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const { user: currentUser } = useAuth();
  
  const [building, setBuilding] = useState<Building | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("facades");
  const [panelStatusCounts, setPanelStatusCounts] = useState<Record<string, number>>({});
  const [totalPanels, setTotalPanels] = useState<number>(0);

  const canEditBuildings = currentUser?.role ? hasPermission(currentUser.role as UserRole, 'buildings', 'canUpdate') : false;
  const canDeleteBuildings = currentUser?.role ? hasPermission(currentUser.role as UserRole, 'buildings', 'canDelete') : false;

  // Panel status domain used across the app
  const PANEL_STATUSES = [
    'Issued For Production',
    'Produced',
    'Proceed for Delivery',
    'Delivered',
    'Approved Material',
    'Rejected Material',
    'Installed',
    'Inspected',
    'Approved Final',
    'On Hold',
    'Cancelled',
    'Broken at Site',
  ] as const;

  const statusMap: { [key: number]: string } = Object.fromEntries(
    PANEL_STATUSES.map((status, index) => [index, status])
  );

  // Color palette per status
  const STATUS_COLORS: Record<string, string> = {
    "Issued For Production": "#E11D48",
    Produced: "#F59E0B",
    Inspected: "#8B5CF6",
    "Approved Material": "#22C55E",
    "Rejected Material": "#EF4444",
    Issued: "#2563EB",
    "Proceed for Delivery": "#06B6D4",
    Delivered: "#3B82F6",
    Installed: "#10B981",
    "Approved Final": "#84CC16",
    "Broken at Site": "#F97316",
    "On Hold": "#A3A3A3",
    Cancelled: "#475569",
  };

  useEffect(() => {
    if (id) {
      loadBuildingDetails(id);
    }
  }, [id]);

  const loadBuildingDetails = async (buildingId: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`Loading building details for ID: ${buildingId}`);

      // Fetch building with project and customer data
      const { data: buildingData, error: buildingError } = await supabase
        .from('buildings')
        .select(`
          *,
          projects (
            *,
            customers (id, name, email, phone, created_at, updated_at)
          )
        `)
        .eq('id', buildingId)
        .single();

      if (buildingError) {
        throw buildingError;
      }

      if (buildingData) {
        // Fetch panels for this building to calculate totals and status counts
        const { data: panelsData, error: panelsError } = await supabase
          .from('panels')
          .select(`
            unit_rate_qr_m2,
            ifp_qty_area_sm,
            weight,
            status
          `)
          .eq('building_id', buildingId);

        if (panelsError) {
          console.error('Error fetching panels for building:', buildingId, panelsError);
        }

        // Calculate totals
        const totalArea = panelsData?.reduce((sum, panel) => sum + (panel.ifp_qty_area_sm || 0), 0) || 0;
        const totalAmount = panelsData?.reduce((sum, panel) => {
          const area = panel.ifp_qty_area_sm || 0;
          const rate = panel.unit_rate_qr_m2 || 0;
          return sum + (area * rate);
        }, 0) || 0;
        const totalWeight = panelsData?.reduce((sum, panel) => sum + (panel.weight || 0), 0) || 0;
        const totalPanels = panelsData?.length || 0;

        // Calculate panel status counts
        const counts: Record<string, number> = {};
        for (const panel of panelsData || []) {
          const statusName = statusMap[panel.status] || "Unknown";
          counts[statusName] = (counts[statusName] || 0) + 1;
        }
        setPanelStatusCounts(counts);
        setTotalPanels(totalPanels);

        const buildingWithTotals = {
          ...buildingData,
          totalArea,
          totalAmount,
          totalWeight,
          totalPanels
        };

        setBuilding(buildingWithTotals);
        setProject(buildingData.projects);
        setCustomer(buildingData.projects.customers);
        console.log("Building details loaded successfully:", buildingData.name);
      } else {
        setError("Building not found");
      }
    } catch (err) {
      console.error("Error loading building details:", err);
      setError("Failed to load building details");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!building) return;

    try {
      await crudOperations.delete('buildings', building.id);
      showToast('Building deleted successfully', 'success');
      navigate(`/projects/${building.project_id}`);
    } catch (error) {
      console.error('Error deleting building:', error);
      showToast('Error deleting building', 'error');
    }
  };

  const getStatusBadge = (status: number) => {
    const statusMap: { [key: number]: string } = {
      0: "inactive",
      1: "active",
      2: "on-hold",
      3: "completed"
    };

    const statusString = statusMap[status] || "inactive";
    const statusConfig = {
      active: {
        variant: "default",
        label: "Active",
        color: "bg-status-active text-status-active-foreground",
      },
      completed: {
        variant: "secondary",
        label: "Completed",
        color: "bg-status-complete text-status-complete-foreground",
      },
      "on-hold": {
        variant: "destructive",
        label: "On Hold",
        color: "bg-status-onhold text-status-onhold-foreground",
      },
      inactive: {
        variant: "outline",
        label: "Inactive",
        color: "bg-status-inactive text-status-inactive-foreground",
      },
    };

    const config = statusConfig[statusString as keyof typeof statusConfig] || {
      variant: "secondary",
      label: statusString,
      color: "bg-secondary text-secondary-foreground",
    };

    return (
      <Badge className={`text-xs ${config.color}`}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatQatarRiyal = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "QAR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getProgress = () => {
    if (!project || !project.estimated_panels || project.estimated_panels === 0)
      return 0;
    return Math.round(((panelStatusCounts["Installed"] || 0) / project.estimated_panels) * 100);
  };

  const pieData = Object.entries(panelStatusCounts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ name: status, value: count }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading building details...</p>
        </div>
      </div>
    );
  }

  if (error || !building) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Building not found</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => navigate("/projects")}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/projects/${building.project_id}`)}
          className="hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Project
        </Button>
      </div>

      {/* Building Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{building.name}</h1>
            {getStatusBadge(building.status)}
          </div>
          <p className="text-muted-foreground">
            BLD-{building.id.slice(-4).toUpperCase()}
          </p>
        </div>
        <div className="flex gap-2">
          {canEditBuildings && (
            <BuildingModalTrigger
              onSubmit={async (data: Omit<Building, "id" | "created_at" | "updated_at">) => {
                const { error } = await supabase
                  .from('buildings')
                  .update({
                    name: data.name,
                    project_id: data.project_id,
                    status: data.status,
                    description: data.description,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', building.id);

                if (error) {
                  console.error('Error updating building:', error);
                  showToast('Error updating building', 'error');
                  return;
                }

                setBuilding({ ...building, ...data, updated_at: new Date().toISOString() });
                showToast('Building updated successfully', 'success');
              }}
              editingBuilding={building}
              currentProject={project ? {
                id: project.id,
                name: project.name,
                customer: customer?.name
              } : undefined}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          )}
          {canDeleteBuildings && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="border-red-400/50 text-red-400 hover:bg-red-400/10"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Building Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Project Card */}
        <Card className="qatar-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{project?.name || 'No Project'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {customer?.name || 'No Customer'}
            </p>
          </CardContent>
        </Card>

        {/* Location Card */}
        <Card className="qatar-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Location</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{project?.location || 'Unknown'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Project Site
            </p>
          </CardContent>
        </Card>

        {/* Description Card */}
        <Card className="qatar-card">
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Description</CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {building.description || "No description provided"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Building Details
            </p>
          </CardContent>
        </Card>

        {/* Timeline Card */}
        <Card className="qatar-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatDate(building.created_at)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Building Date
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Building Details Grid - 2x2 Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Manufacturing Pipeline */}
          <Card className="qatar-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Manufacturing Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-card-foreground">Issued For Production</span>
                  <span className="text-muted-foreground">
                    {(panelStatusCounts['Issued For Production'] || 0) + (panelStatusCounts['Produced'] || 0) + 
                     (panelStatusCounts['Proceed for Delivery'] || 0) + (panelStatusCounts['Delivered'] || 0) + 
                     (panelStatusCounts['Approved Material'] || 0) + (panelStatusCounts['Rejected Material'] || 0) + 
                     (panelStatusCounts['Installed'] || 0) + (panelStatusCounts['Inspected'] || 0) + 
                     (panelStatusCounts['Approved Final'] || 0) + (panelStatusCounts['On Hold'] || 0) + 
                     (panelStatusCounts['Cancelled'] || 0) + (panelStatusCounts['Broken at Site'] || 0)} / {project?.estimated_panels || 0}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${project && project.estimated_panels && project.estimated_panels > 0 ? 
                        (((panelStatusCounts['Issued For Production'] || 0) + (panelStatusCounts['Produced'] || 0) + 
                         (panelStatusCounts['Proceed for Delivery'] || 0) + (panelStatusCounts['Delivered'] || 0) + 
                         (panelStatusCounts['Approved Material'] || 0) + (panelStatusCounts['Rejected Material'] || 0) + 
                         (panelStatusCounts['Installed'] || 0) + (panelStatusCounts['Inspected'] || 0) + 
                         (panelStatusCounts['Approved Final'] || 0) + (panelStatusCounts['On Hold'] || 0) + 
                         (panelStatusCounts['Cancelled'] || 0) + (panelStatusCounts['Broken at Site'] || 0)) / project.estimated_panels) * 100 : 0}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {project && project.estimated_panels && project.estimated_panels > 0 ? 
                    ((((panelStatusCounts['Issued For Production'] || 0) + (panelStatusCounts['Produced'] || 0) + 
                      (panelStatusCounts['Proceed for Delivery'] || 0) + (panelStatusCounts['Delivered'] || 0) + 
                      (panelStatusCounts['Approved Material'] || 0) + (panelStatusCounts['Rejected Material'] || 0) + 
                      (panelStatusCounts['Installed'] || 0) + (panelStatusCounts['Inspected'] || 0) + 
                      (panelStatusCounts['Approved Final'] || 0) + (panelStatusCounts['On Hold'] || 0) + 
                      (panelStatusCounts['Cancelled'] || 0) + (panelStatusCounts['Broken at Site'] || 0)) / project.estimated_panels) * 100).toFixed(1) : 0}% panels issued for production
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-card-foreground">Delivered Progress</span>
                  <span className="text-muted-foreground">
                    {(panelStatusCounts['Delivered'] || 0) + (panelStatusCounts['Approved Material'] || 0) + 
                     (panelStatusCounts['Rejected Material'] || 0) + (panelStatusCounts['Installed'] || 0) + 
                     (panelStatusCounts['Inspected'] || 0) + (panelStatusCounts['Approved Final'] || 0)} / {project?.estimated_panels || 0}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${project && project.estimated_panels && project.estimated_panels > 0 ? 
                        (((panelStatusCounts['Delivered'] || 0) + (panelStatusCounts['Approved Material'] || 0) + 
                         (panelStatusCounts['Rejected Material'] || 0) + (panelStatusCounts['Installed'] || 0) + 
                         (panelStatusCounts['Inspected'] || 0) + (panelStatusCounts['Approved Final'] || 0)) / project.estimated_panels) * 100 : 0}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {project && project.estimated_panels && project.estimated_panels > 0 ? 
                    ((((panelStatusCounts['Delivered'] || 0) + (panelStatusCounts['Approved Material'] || 0) + 
                      (panelStatusCounts['Rejected Material'] || 0) + (panelStatusCounts['Installed'] || 0) + 
                      (panelStatusCounts['Inspected'] || 0) + (panelStatusCounts['Approved Final'] || 0)) / project.estimated_panels) * 100).toFixed(1) : 0}% panels delivered
                </p>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-card-foreground">Produced Progress</span>
                  <span className="text-muted-foreground">
                    {(panelStatusCounts['Produced'] || 0) + (panelStatusCounts['Proceed for Delivery'] || 0) + 
                     (panelStatusCounts['Delivered'] || 0) + (panelStatusCounts['Approved Material'] || 0) + 
                     (panelStatusCounts['Rejected Material'] || 0) + (panelStatusCounts['Installed'] || 0) + 
                     (panelStatusCounts['Inspected'] || 0) + (panelStatusCounts['Approved Final'] || 0)} / {project?.estimated_panels || 0}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${project && project.estimated_panels && project.estimated_panels > 0 ? 
                        (((panelStatusCounts['Produced'] || 0) + (panelStatusCounts['Proceed for Delivery'] || 0) + 
                         (panelStatusCounts['Delivered'] || 0) + (panelStatusCounts['Approved Material'] || 0) + 
                         (panelStatusCounts['Rejected Material'] || 0) + (panelStatusCounts['Installed'] || 0) + 
                         (panelStatusCounts['Inspected'] || 0) + (panelStatusCounts['Approved Final'] || 0)) / project.estimated_panels) * 100 : 0}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {project && project.estimated_panels && project.estimated_panels > 0 ? 
                    ((((panelStatusCounts['Produced'] || 0) + (panelStatusCounts['Proceed for Delivery'] || 0) + 
                      (panelStatusCounts['Delivered'] || 0) + (panelStatusCounts['Approved Material'] || 0) + 
                      (panelStatusCounts['Rejected Material'] || 0) + (panelStatusCounts['Installed'] || 0) + 
                      (panelStatusCounts['Inspected'] || 0) + (panelStatusCounts['Approved Final'] || 0)) / project.estimated_panels) * 100).toFixed(1) : 0}% panels produced
                </p>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-card-foreground">Installation Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {panelStatusCounts['Installed'] || 0} / {project?.estimated_panels || 0}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${project && project.estimated_panels && project.estimated_panels > 0 ? 
                        ((panelStatusCounts['Installed'] || 0) / project.estimated_panels) * 100 : 0}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {project && project.estimated_panels && project.estimated_panels > 0 ? 
                    (((panelStatusCounts['Installed'] || 0) / project.estimated_panels) * 100).toFixed(1) : 0}% panels installed
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-card-foreground">On Hold Progress</span>
                  <span className="text-muted-foreground">
                    {panelStatusCounts['On Hold'] || 0} / {project?.estimated_panels || 0}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${project && project.estimated_panels && project.estimated_panels > 0 ? 
                        ((panelStatusCounts['On Hold'] || 0) / project.estimated_panels) * 100 : 0}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {project && project.estimated_panels && project.estimated_panels > 0 ? 
                    (((panelStatusCounts['On Hold'] || 0) / project.estimated_panels) * 100).toFixed(1) : 0}% panels on hold
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-card-foreground">Cancelled Progress</span>
                  <span className="text-muted-foreground">
                    {panelStatusCounts['Cancelled'] || 0} / {project?.estimated_panels || 0}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${project && project.estimated_panels && project.estimated_panels > 0 ? 
                        ((panelStatusCounts['Cancelled'] || 0) / project.estimated_panels) * 100 : 0}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {project && project.estimated_panels && project.estimated_panels > 0 ? 
                    (((panelStatusCounts['Cancelled'] || 0) / project.estimated_panels) * 100).toFixed(1) : 0}% panels cancelled
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-card-foreground">Broken at Site Progress</span>
                  <span className="text-muted-foreground">
                    {panelStatusCounts['Broken at Site'] || 0} / {project?.estimated_panels || 0}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${project && project.estimated_panels && project.estimated_panels > 0 ? 
                        ((panelStatusCounts['Broken at Site'] || 0) / project.estimated_panels) * 100 : 0}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {project && project.estimated_panels && project.estimated_panels > 0 ? 
                    (((panelStatusCounts['Broken at Site'] || 0) / project.estimated_panels) * 100).toFixed(1) : 0}% panels broken at site
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Efficiency Metrics */}
          <Card className="qatar-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Efficiency Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm text-card-foreground">Production Efficiency</span>
                </div>
                <Badge variant="secondary">
                  {project && project.estimated_panels && project.estimated_panels > 0 ? 
                    ((((panelStatusCounts['Produced'] || 0) + (panelStatusCounts['Proceed for Delivery'] || 0) + 
                      (panelStatusCounts['Delivered'] || 0) + (panelStatusCounts['Approved Material'] || 0) + 
                      (panelStatusCounts['Rejected Material'] || 0) + (panelStatusCounts['Installed'] || 0) + 
                      (panelStatusCounts['Inspected'] || 0) + (panelStatusCounts['Approved Final'] || 0)) / project.estimated_panels) * 100).toFixed(1) : 0}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-card-foreground">Delivery Efficiency</span>
                </div>
                <Badge variant="secondary">
                  {project && project.estimated_panels && project.estimated_panels > 0 ? 
                    (((panelStatusCounts['Delivered'] || 0) + (panelStatusCounts['Approved Material'] || 0) + 
                      (panelStatusCounts['Installed'] || 0) + (panelStatusCounts['Inspected'] || 0) + 
                      (panelStatusCounts['Approved Final'] || 0)) / project.estimated_panels * 100).toFixed(1) : 0}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-sm text-card-foreground">Overall Completion</span>
                </div>
                <Badge variant="secondary">
                  {project && project.estimated_panels && project.estimated_panels > 0 ? 
                    (((panelStatusCounts['Approved Final'] || 0) / (project.estimated_panels || 1)) * 100).toFixed(1) : 0}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Progress Overview */}
          <Card className="qatar-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progress Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {totalPanels === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-10">
                  No panels yet for this building
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Installed vs Estimated</span>
                    <span className="font-medium">{getProgress()}%</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                            {pieData.map((entry) => (
                              <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#999999"} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any, name: any) => [`${value} (${Math.round(((value as number) / totalPanels) * 100)}%)`, name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {['Issued For Production', 'Produced', 'Delivered', 'Installed'].map((status) => {
                        const count = panelStatusCounts[status] || 0;
                        return (
                          <div key={status} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: STATUS_COLORS[status] || "#999999" }} />
                              <span className="text-muted-foreground">{status}</span>
                            </div>
                            <span className="font-medium text-foreground">{count}</span>
                          </div>
                        );
                      })}
                      <div className="flex items-center justify-between text-sm pt-2 border-t">
                        <span className="text-muted-foreground">Total Panels</span>
                        <span className="font-medium text-foreground">{totalPanels}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Estimated Panels</span>
                        <span className="font-medium text-foreground">{project?.estimated_panels || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Building Totals */}
          <Card className="qatar-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Building Totals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Square className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Total Area</span>
                  </div>
                  <div className="text-2xl font-bold text-card-foreground">
                    {(building.totalArea || 0).toFixed(2)} m²
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Total Amount</span>
                  </div>
                  <div className="text-2xl font-bold text-card-foreground">
                    {formatQatarRiyal(building.totalAmount || 0)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Weight className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Total Weight</span>
                  </div>
                  <div className="text-2xl font-bold text-card-foreground">
                    {(building.totalWeight || 0).toFixed(2)} kg
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Total Panels</span>
                  </div>
                  <div className="text-2xl font-bold text-card-foreground">
                    {totalPanels}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>


      {/* Tabbed Sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="facades">Facades</TabsTrigger>
        </TabsList>

        <TabsContent value="facades" className="space-y-6">
          <FacadesSection
            projectId={building.project_id}
            projectName={project?.name}
            buildingId={building.id}
            buildingName={building.name}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
