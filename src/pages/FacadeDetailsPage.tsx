import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Layers, Edit, Trash2, Building2, FolderOpen } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { supabase } from "../lib/supabase";
import { PanelsSection } from "../components/project-details/PanelsSection";
import { FacadeModalTrigger } from "../components/FacadeModal";
import { useAuth } from "../contexts/AuthContext";
import { hasPermission, UserRole } from "../utils/rolePermissions";
import { useToastContext } from "../contexts/ToastContext";
import { crudOperations } from "../utils/userTracking";

interface Facade {
  id: string;
  name: string;
  building_id: string;
  status: number;
  description?: string;
  created_at: string;
  updated_at: string;
  totalArea: number;
  totalAmount: number;
  totalWeight: number;
}

interface Building {
  id: string;
  name: string;
  project_id: string;
  status: number;
  description?: string;
  created_at: string;
  updated_at: string;
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

export function FacadeDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const { user: currentUser } = useAuth();
  
  const [facade, setFacade] = useState<Facade | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("panels");

  const canEditFacades = currentUser?.role ? hasPermission(currentUser.role as UserRole, 'facades', 'canUpdate') : false;
  const canDeleteFacades = currentUser?.role ? hasPermission(currentUser.role as UserRole, 'facades', 'canDelete') : false;

  useEffect(() => {
    if (id) {
      loadFacadeDetails(id);
    }
  }, [id]);

  const loadFacadeDetails = async (facadeId: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`Loading facade details for ID: ${facadeId}`);

      // Fetch facade with building, project and customer data
      const { data: facadeData, error: facadeError } = await supabase
        .from('facades')
        .select(`
          *,
          buildings (
            *,
            projects (
              *,
              customers (id, name, email, phone, created_at, updated_at)
            )
          )
        `)
        .eq('id', facadeId)
        .single();

      if (facadeError) {
        throw facadeError;
      }

      if (facadeData) {
        // Calculate totals from panels
        const { data: panelsData, error: panelsError } = await supabase
          .from('panels')
          .select('ifp_qty_area_sm, unit_rate_qr_m2, weight')
          .eq('facade_id', facadeId);

        if (panelsError) {
          console.error('Error fetching panels for totals:', panelsError);
        }

        const totals = {
          totalArea: panelsData?.reduce((sum, panel) => sum + (panel.ifp_qty_area_sm || 0), 0) || 0,
          totalAmount: panelsData?.reduce((sum, panel) => sum + ((panel.ifp_qty_area_sm || 0) * (panel.unit_rate_qr_m2 || 0)), 0) || 0,
          totalWeight: panelsData?.reduce((sum, panel) => sum + (panel.weight || 0), 0) || 0,
        };

        setFacade({
          ...facadeData,
          ...totals
        });
        setBuilding(facadeData.buildings);
        setProject(facadeData.buildings.projects);
        setCustomer(facadeData.buildings.projects.customers);
        console.log("Facade details loaded successfully:", facadeData.name);
      } else {
        setError("Facade not found");
      }
    } catch (err) {
      console.error("Error loading facade details:", err);
      setError("Failed to load facade details");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!facade) return;

    try {
      await crudOperations.delete('facades', facade.id);
      showToast('Facade deleted successfully', 'success');
      navigate(`/buildings/${facade.building_id}`);
    } catch (error) {
      console.error('Error deleting facade:', error);
      showToast('Error deleting facade', 'error');
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
          <p className="text-muted-foreground">Loading facade details...</p>
        </div>
      </div>
    );
  }

  if (error || !facade) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Facade not found</h3>
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
          onClick={() => navigate(`/buildings/${facade.building_id}`)}
          className="hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Building
        </Button>
      </div>

      {/* Facade Overview */}
      <Card className="qatar-card">
        <CardHeader className="qatar-card-header">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="qatar-card-title text-2xl">
                  {facade.name}
                </CardTitle>
                {getStatusBadge(facade.status)}
              </div>
              <p className="qatar-card-subtitle">
                FCD-{facade.id.slice(-4).toUpperCase()}
              </p>
            </div>
            <div className="flex gap-2">
              {canEditFacades && (
                <FacadeModalTrigger
                  onSubmit={async (data) => {
                    const { error } = await supabase
                      .from('facades')
                      .update({
                        name: data.name,
                        building_id: data.building_id,
                        status: data.status,
                        description: data.description,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', facade.id);

                    if (error) {
                      console.error('Error updating facade:', error);
                      showToast('Error updating facade', 'error');
                      return;
                    }

                    setFacade({ ...facade, ...data, updated_at: new Date().toISOString() });
                    showToast('Facade updated successfully', 'success');
                  }}
                  editingFacade={facade}
                  currentProject={project ? {
                    id: project.id,
                    name: project.name,
                    customer: customer?.name
                  } : undefined}
                  currentBuilding={building ? {
                    id: building.id,
                    name: building.name
                  } : undefined}
                />
              )}
              {canDeleteFacades && (
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
                  {facade.description || "No description provided"}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Building</h4>
                <p className="text-muted-foreground">
                  {building?.name || "Unknown building"}
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
                  {formatDate(facade.created_at)}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Last Updated</h4>
                <p className="text-muted-foreground">
                  {formatDate(facade.updated_at)}
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

          {/* Facade Totals */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium mb-4">Facade Totals</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Total Area</span>
                </div>
                <p className="text-2xl font-bold">{facade.totalArea.toFixed(2)} m²</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Total Amount</span>
                </div>
                <p className="text-2xl font-bold">{facade.totalAmount.toFixed(2)} QR</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Total Weight</span>
                </div>
                <p className="text-2xl font-bold">{facade.totalWeight.toFixed(2)} kg</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="panels">Panels</TabsTrigger>
        </TabsList>

        <TabsContent value="panels" className="space-y-6">
          <PanelsSection
            projectId={building?.project_id || ""}
            projectName={project?.name || ""}
            facadeId={facade.id}
            facadeName={facade.name}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
