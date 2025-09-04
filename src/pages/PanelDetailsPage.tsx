import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Edit, Trash2, Square, DollarSign, Weight, Calendar, FileText, QrCode, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { DateInput } from "../components/ui/date-input";
import { supabase } from "../lib/supabase";
import { StatusChangeDialog } from "../components/StatusChangeDialog";
import { QRCodeModal } from "../components/QRCodeModal";
import { useAuth } from "../contexts/AuthContext";
import { hasPermission, UserRole } from "../utils/rolePermissions";
import { useToastContext } from "../contexts/ToastContext";
import { crudOperations } from "../utils/userTracking";
import { PanelModel } from "../components/project-details/PanelsSection";
import { PANEL_STATUSES, validateStatusTransition, getValidNextStatuses, isSpecialStatus } from "../utils/statusValidation";

const PANEL_TYPES = [
  "GRC", "GRG", "GRP", "EIFS", "UHPC"
] as const;

interface Panel {
  id: string;
  name: string;
  type: number;
  status: number;
  project_id: string;
  building_id?: string;
  facade_id?: string;
  issue_transmittal_no?: string;
  drawing_number?: string;
  unit_rate_qr_m2?: number;
  ifp_qty_area_sm?: number;
  ifp_qty_nos?: number;
  weight?: number;
  dimension?: string;
  issued_for_production_date?: string;
  created_at: string;
  updated_at: string;
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

interface Facade {
  id: string;
  name: string;
  building_id: string;
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

export function PanelDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const { user: currentUser } = useAuth();
  
  const [panel, setPanel] = useState<Panel | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [facade, setFacade] = useState<Facade | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [isStatusChangeDialogOpen, setIsStatusChangeDialogOpen] = useState(false);
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSavingPanel, setIsSavingPanel] = useState(false);
  const [newPanelModel, setNewPanelModel] = useState({
    name: "",
    type: 0,
    status: 0,
    building_id: undefined as string | undefined,
    facade_id: undefined as string | undefined,
    issue_transmittal_no: undefined as string | undefined,
    drawing_number: undefined as string | undefined,
    unit_rate_qr_m2: undefined as number | undefined,
    ifp_qty_area_sm: undefined as number | undefined,
    ifp_qty_nos: undefined as number | undefined,
    weight: undefined as number | undefined,
    dimension: undefined as string | undefined,
    issued_for_production_date: undefined as string | undefined,
  });

  const canEditPanels = currentUser?.role ? hasPermission(currentUser.role as UserRole, 'panels', 'canUpdate') : false;
  const canDeletePanels = currentUser?.role ? hasPermission(currentUser.role as UserRole, 'panels', 'canDelete') : false;

  // Map database integers to UI strings
  const typeMap: { [key: number]: string } = PANEL_TYPES.reduce((acc, type, index) => ({ ...acc, [index]: type }), {});
  const statusMap: { [key: number]: string } = PANEL_STATUSES.reduce((acc, status, index) => ({ ...acc, [index]: status }), {});
  const typeReverseMap = Object.fromEntries(Object.entries(typeMap).map(([k, v]) => [v, parseInt(k)]));
  const statusReverseMap = Object.fromEntries(Object.entries(statusMap).map(([k, v]) => [v, parseInt(k)]));

  useEffect(() => {
    if (id) {
      loadPanelDetails(id);
    }
  }, [id]);

  const loadPanelDetails = async (panelId: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`Loading panel details for ID: ${panelId}`);

      // Fetch panel with all related data
      const { data: panelData, error: panelError } = await supabase
        .from('panels')
        .select(`
          *,
          projects (
            *,
            customers (id, name, email, phone, created_at, updated_at)
          ),
          buildings (
            id, name, project_id, status, description, created_at, updated_at
          ),
          facades (
            id, name, building_id, status, description, created_at, updated_at
          )
        `)
        .eq('id', panelId)
        .single();

      if (panelError) {
        throw panelError;
      }

      if (panelData) {
        setPanel(panelData);
        setProject(panelData.projects);
        setCustomer(panelData.projects.customers);
        setBuilding(panelData.buildings);
        setFacade(panelData.facades);
        console.log("Panel details loaded successfully:", panelData.name);
      } else {
        setError("Panel not found");
      }
    } catch (err) {
      console.error("Error loading panel details:", err);
      setError("Failed to load panel details");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!panel) return;

    try {
      await crudOperations.delete('panels', panel.id);
      showToast('Panel deleted successfully', 'success');
      navigate(`/projects/${panel.project_id}`);
    } catch (error) {
      console.error('Error deleting panel:', error);
      showToast('Error deleting panel', 'error');
    }
  };

  const handleStatusChange = () => {
    setIsStatusChangeDialogOpen(true);
  };

  const handleStatusChanged = () => {
    // Reload panel details to get updated status
    if (panel) {
      loadPanelDetails(panel.id);
    }
  };

  const handleViewQRCode = () => {
    setIsQRCodeModalOpen(true);
  };

  const startEditPanel = () => {
    if (!panel) return;
    
    setNewPanelModel({
      name: panel.name,
      type: panel.type,
      status: panel.status,
      building_id: panel.building_id,
      facade_id: panel.facade_id,
      issue_transmittal_no: panel.issue_transmittal_no,
      drawing_number: panel.drawing_number,
      unit_rate_qr_m2: panel.unit_rate_qr_m2,
      ifp_qty_area_sm: panel.ifp_qty_area_sm,
      ifp_qty_nos: panel.ifp_qty_nos,
      weight: panel.weight,
      dimension: panel.dimension,
      issued_for_production_date: panel.issued_for_production_date,
    });
    setIsEditDialogOpen(true);
  };

  const handleSavePanel = async () => {
    if (!panel || isSavingPanel) return;
    
    if (newPanelModel.name.trim() === "") {
      showToast("Panel name is required", "error");
      return;
    }

    // Validate status transition if status has changed
    if (panel.status !== newPanelModel.status) {
      const validation = validateStatusTransition(panel.status, newPanelModel.status);
      if (!validation.isValid) {
        showToast(validation.error || "Invalid status transition", "error");
        return;
      }
    }

    setIsSavingPanel(true);

    const panelData = {
      name: newPanelModel.name,
      type: newPanelModel.type,
      status: newPanelModel.status,
      project_id: panel.project_id,
      building_id: newPanelModel.building_id || null,
      facade_id: newPanelModel.facade_id || null,
      issue_transmittal_no: newPanelModel.issue_transmittal_no || null,
      drawing_number: newPanelModel.drawing_number || null,
      unit_rate_qr_m2: newPanelModel.unit_rate_qr_m2 || null,
      ifp_qty_area_sm: newPanelModel.ifp_qty_area_sm || null,
      ifp_qty_nos: newPanelModel.ifp_qty_nos || null,
      weight: newPanelModel.weight || null,
      dimension: newPanelModel.dimension || null,
      issued_for_production_date: newPanelModel.issued_for_production_date || null,
    };

    try {
      // Update panel with user tracking
      await crudOperations.update("panels", panel.id, panelData);
      
      // Reload panel details to get updated data
      await loadPanelDetails(panel.id);
      
      showToast("Panel updated successfully", "success");
    } catch (error) {
      console.error("Error updating panel:", error);
      showToast("Error updating panel", "error");
    } finally {
      setIsSavingPanel(false);
      setIsEditDialogOpen(false);
    }
  };

  const getValidStatuses = (currentStatus: number) => {
    const validNextStatuses = getValidNextStatuses(currentStatus);
    const allStatuses = PANEL_STATUSES.map((_, index) => index);
    
    // Include special statuses (On Hold, Cancelled) that can be set from any status
    const specialStatuses = allStatuses.filter(status => isSpecialStatus(status));
    
    // Combine valid next statuses with special statuses, removing duplicates
    const validStatuses = Array.from(new Set([...validNextStatuses, ...specialStatuses]));
    
    return validStatuses.sort((a, b) => a - b);
  };

  const getStatusBadge = (status: number) => {
    const statusString = PANEL_STATUSES[status] || "Unknown";
    const statusConfig = {
      "Produced": {
        variant: "default" as const,
        label: "Produced",
        color: "bg-status-active text-status-active-foreground",
      },
      "In Production": {
        variant: "secondary" as const,
        label: "In Production",
        color: "bg-status-complete text-status-complete-foreground",
      },
      "Delivered": {
        variant: "outline" as const,
        label: "Delivered",
        color: "bg-status-inactive text-status-inactive-foreground",
      },
      "Installed": {
        variant: "default" as const,
        label: "Installed",
        color: "bg-status-active text-status-active-foreground",
      },
      "On Hold": {
        variant: "destructive" as const,
        label: "On Hold",
        color: "bg-status-onhold text-status-onhold-foreground",
      },
      "Cancelled": {
        variant: "destructive" as const,
        label: "Cancelled",
        color: "bg-destructive text-destructive-foreground",
      },
    };

    const config = statusConfig[statusString as keyof typeof statusConfig] || {
      variant: "secondary" as const,
      label: statusString,
      color: "bg-secondary text-secondary-foreground",
    };

    return (
      <Badge className={`text-xs ${config.color}`}>
        {config.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: number) => {
    const typeString = PANEL_TYPES[type] || "Unknown";
    return (
      <Badge variant="outline" className="text-xs">
        {typeString}
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-QA', {
      style: 'currency',
      currency: 'QAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading panel details...</p>
        </div>
      </div>
    );
  }

  if (error || !panel) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Panel not found</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => navigate("/projects")}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  // Convert panel to PanelModel for StatusChangeDialog
  const panelModel: PanelModel = {
    id: panel.id,
    name: panel.name,
    type: panel.type,
    status: panel.status,
    project_id: panel.project_id,
    project_name: project?.name,
    building_id: panel.building_id,
    building_name: building?.name,
    facade_id: panel.facade_id,
    facade_name: facade?.name,
    issue_transmittal_no: panel.issue_transmittal_no,
    drawing_number: panel.drawing_number,
    unit_rate_qr_m2: panel.unit_rate_qr_m2,
    ifp_qty_area_sm: panel.ifp_qty_area_sm,
    ifp_qty_nos: panel.ifp_qty_nos,
    weight: panel.weight,
    dimension: panel.dimension,
    issued_for_production_date: panel.issued_for_production_date,
  };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (facade) {
              navigate(`/facades/${facade.id}`);
            } else if (building) {
              navigate(`/buildings/${building.id}`);
            } else {
              navigate(`/projects/${panel.project_id}`);
            }
          }}
          className="hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {facade ? 'Facade' : building ? 'Building' : 'Project'}
        </Button>
      </div>

      {/* Panel Overview */}
      <Card className="qatar-card">
        <CardHeader className="qatar-card-header">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="qatar-card-title text-2xl">
                  {panel.name}
                </CardTitle>
                {getStatusBadge(panel.status)}
                {getTypeBadge(panel.type)}
              </div>
              <p className="qatar-card-subtitle">
                {panel.issue_transmittal_no || `PNL-${panel.id.slice(-4).toUpperCase()}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewQRCode}
                className="hover:bg-accent"
              >
                <QrCode className="h-3 w-3" />
              </Button>
              {canEditPanels && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStatusChange}
                  className="hover:bg-accent"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
              {canEditPanels && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startEditPanel}
                  className="hover:bg-accent"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
              {canDeletePanels && (
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
                <h4 className="font-medium mb-2">Drawing Number</h4>
                <p className="text-muted-foreground">
                  {panel.drawing_number || "Not specified"}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Building</h4>
                <p className="text-muted-foreground">
                  {building?.name || "Not assigned"}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Facade</h4>
                <p className="text-muted-foreground">
                  {facade?.name || "Not assigned"}
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
                  {formatDate(panel.created_at)}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Last Updated</h4>
                <p className="text-muted-foreground">
                  {formatDate(panel.updated_at)}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Issued for Production</h4>
                <p className="text-muted-foreground">
                  {panel.issued_for_production_date ? formatDate(panel.issued_for_production_date) : "Not set"}
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

          {/* Panel Specifications */}
          <div className="mt-6 pt-6 border-t border-border/50">
            <h4 className="font-medium mb-4">Panel Specifications</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-semibold text-card-foreground">Area:</span>
                  <span className="text-muted-foreground">{(panel.ifp_qty_area_sm || 0).toFixed(2)} m²</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-semibold text-card-foreground">Unit Rate:</span>
                  <span className="text-muted-foreground">{formatCurrency(panel.unit_rate_qr_m2 || 0)}/m²</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-semibold text-card-foreground">Total Amount:</span>
                  <span className="text-muted-foreground">{formatCurrency((panel.ifp_qty_area_sm || 0) * (panel.unit_rate_qr_m2 || 0))}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Weight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-semibold text-card-foreground">Weight:</span>
                  <span className="text-muted-foreground">{(panel.weight || 0).toFixed(2)} kg</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-semibold text-card-foreground">Quantity:</span>
                  <span className="text-muted-foreground">{panel.ifp_qty_nos || 0} units</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-semibold text-card-foreground">Dimension:</span>
                  <span className="text-muted-foreground">{panel.dimension || "Not specified"}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <Card className="qatar-card">
            <CardHeader className="qatar-card-header">
              <CardTitle className="qatar-card-title">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="qatar-card-content">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Issue Transmittal Number</h4>
                  <p className="text-muted-foreground">
                    {panel.issue_transmittal_no || "Not specified"}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Panel Type</h4>
                  <p className="text-muted-foreground">
                    {PANEL_TYPES[panel.type] || "Unknown"}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Current Status</h4>
                  <p className="text-muted-foreground">
                    {PANEL_STATUSES[panel.status] || "Unknown"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Change Dialog */}
      <StatusChangeDialog
        panel={panelModel}
        isOpen={isStatusChangeDialogOpen}
        onClose={() => setIsStatusChangeDialogOpen(false)}
        onStatusChanged={handleStatusChanged}
      />

      {/* QR Code Modal */}
      <QRCodeModal
        panel={panelModel}
        isOpen={isQRCodeModalOpen}
        onClose={() => setIsQRCodeModalOpen(false)}
      />

      {/* Edit Panel Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Panel</DialogTitle>
            <DialogDescription>Update panel information for {panel?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Panel Name *</Label>
              <Input
                id="edit-name"
                value={newPanelModel.name}
                onChange={(e) => setNewPanelModel({ ...newPanelModel, name: e.target.value })}
                placeholder="Enter panel name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Panel Type *</Label>
              <Select
                value={typeMap[newPanelModel.type]}
                onValueChange={(value) => setNewPanelModel({ ...newPanelModel, type: typeReverseMap[value] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PANEL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status *</Label>
              <Select
                value={statusMap[newPanelModel.status]}
                onValueChange={(value) => setNewPanelModel({ ...newPanelModel, status: statusReverseMap[value] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {panel ? getValidStatuses(panel.status).map((statusIndex) => {
                    const statusName = statusMap[statusIndex];
                    const isSpecial = isSpecialStatus(statusIndex);
                    return (
                      <SelectItem key={statusIndex} value={statusName}>
                        <div className="flex items-center gap-2">
                          <span>{statusName}</span>
                          {isSpecial && (
                            <Badge variant="outline" className="text-xs">
                              Special
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  }) : PANEL_STATUSES.map((status, index) => {
                    const isSpecial = isSpecialStatus(index);
                    return (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          <span>{status}</span>
                          {isSpecial && (
                            <Badge variant="outline" className="text-xs">
                              Special
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <DateInput
                id="edit-issued_for_production_date"
                label="Issued for Production Date"
                value={newPanelModel.issued_for_production_date}
                onChange={(value) => setNewPanelModel({ ...newPanelModel, issued_for_production_date: value || undefined })}
                placeholder="Select date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-issue_transmittal_no">Issue/Transmittal Number</Label>
              <Input
                id="edit-issue_transmittal_no"
                value={newPanelModel.issue_transmittal_no || ""}
                onChange={(e) => setNewPanelModel({ ...newPanelModel, issue_transmittal_no: e.target.value || undefined })}
                placeholder="Enter issue/transmittal number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-drawing_number">Drawing Number</Label>
              <Input
                id="edit-drawing_number"
                value={newPanelModel.drawing_number || ""}
                onChange={(e) => setNewPanelModel({ ...newPanelModel, drawing_number: e.target.value || undefined })}
                placeholder="Enter drawing number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-unit_rate_qr_m2">Unit Rate QR/m²</Label>
              <Input
                id="edit-unit_rate_qr_m2"
                type="number"
                min="0"
                value={newPanelModel.unit_rate_qr_m2 || ""}
                onChange={(e) => setNewPanelModel({ ...newPanelModel, unit_rate_qr_m2: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="Enter unit rate"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ifp_qty_area_sm">IFP Qty Area SM</Label>
              <Input
                id="edit-ifp_qty_area_sm"
                type="number"
                min="0"
                value={newPanelModel.ifp_qty_area_sm || ""}
                onChange={(e) => setNewPanelModel({ ...newPanelModel, ifp_qty_area_sm: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="Enter IFP qty area"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ifp_qty_nos">IFP Qty Nos</Label>
              <Input
                id="edit-ifp_qty_nos"
                type="number"
                min="0"
                value={newPanelModel.ifp_qty_nos || ""}
                onChange={(e) => setNewPanelModel({ ...newPanelModel, ifp_qty_nos: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Enter IFP qty nos"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-weight">Weight (kg)</Label>
              <Input
                id="edit-weight"
                type="number"
                min="0"
                step="0.1"
                value={newPanelModel.weight || ""}
                onChange={(e) => setNewPanelModel({ ...newPanelModel, weight: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="Enter weight in kg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-dimension">Dimension</Label>
              <Input
                id="edit-dimension"
                value={newPanelModel.dimension || ""}
                onChange={(e) => setNewPanelModel({ ...newPanelModel, dimension: e.target.value || undefined })}
                placeholder="Enter dimension (e.g., 2.5m x 1.2m)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePanel} disabled={isSavingPanel}>
              {isSavingPanel ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
