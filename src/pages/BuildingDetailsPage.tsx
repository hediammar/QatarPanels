import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Edit, Trash2, Square, DollarSign, Weight, Package } from "lucide-react";
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

  const canEditBuildings = currentUser?.role ? hasPermission(currentUser.role as UserRole, 'buildings', 'canUpdate') : false;
  const canDeleteBuildings = currentUser?.role ? hasPermission(currentUser.role as UserRole, 'buildings', 'canDelete') : false;

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
        // Fetch panels for this building to calculate totals
        const { data: panelsData, error: panelsError } = await supabase
          .from('panels')
          .select(`
            unit_rate_qr_m2,
            ifp_qty_area_sm,
            weight
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

      {/* Building Overview */}
      <Card className="qatar-card">
        <CardHeader className="qatar-card-header">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="qatar-card-title text-2xl">
                  {building.name}
                </CardTitle>
                {getStatusBadge(building.status)}
              </div>
              <p className="qatar-card-subtitle">
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
        </CardHeader>

        <CardContent className="qatar-card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-muted-foreground">
                  {building.description || "No description provided"}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Project</h4>
                <p className="text-muted-foreground">
                  {project?.name || "Unknown project"}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Customer</h4>
                <p className="text-muted-foreground">
                  {customer?.name || "Unknown customer"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Created</h4>
                <p className="text-muted-foreground">
                  {formatDate(building.created_at)}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Last Updated</h4>
                <p className="text-muted-foreground">
                  {formatDate(building.updated_at)}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Location</h4>
                <p className="text-muted-foreground">
                  {project?.location || "Location not specified"}
                </p>
              </div>
            </div>
          </div>

          {/* Building Totals */}
          <div className="mt-6 pt-6 border-t border-border/50">
            <h4 className="font-medium mb-4">Building Totals</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-semibold text-card-foreground">Total Area:</span>
                  <span className="text-muted-foreground">{(building.totalArea || 0).toFixed(2)} m²</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-semibold text-card-foreground">Total Amount:</span>
                  <span className="text-muted-foreground">{(building.totalAmount || 0).toFixed(2)} QR</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Weight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-semibold text-card-foreground">Total Weight:</span>
                  <span className="text-muted-foreground">{(building.totalWeight || 0).toFixed(2)} kg</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-semibold text-card-foreground">Total Panels:</span>
                  <span className="text-muted-foreground">{building.totalPanels || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
