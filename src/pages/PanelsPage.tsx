import {
  AlertCircle,
  CheckCircle,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronRightIcon,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Edit,
  FileText,
  FolderOpen,
  FolderPlus,
  Hash,
  History,
  Layers,
  Package,
  Plus,
  QrCode,
  Search,
  Square,
  Trash2,
  Upload,
  Users,
  X,
  RefreshCw
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { supabase } from "../lib/supabase";
import { Textarea } from "../components/ui/textarea";
import { Timeline } from "../components/Timeline";
import { QRCodeModal } from "../components/QRCodeModal";
import { useToastContext } from "../contexts/ToastContext";
import { DateInput } from "../components/ui/date-input";
import { crudOperations, testDatabaseConnection, checkTableStructure, testMinimalPanelCreation } from "../utils/userTracking";
import { StatusChangeDialog } from "../components/StatusChangeDialog";
import { useAuth } from "../contexts/AuthContext";
import { hasPermission, isCustomerRole, UserRole } from "../utils/rolePermissions";
import { 
  PANEL_STATUSES, 
  PanelStatus,
  validateStatusTransition, 
  getValidNextStatuses,
  isSpecialStatus 
} from "../utils/statusValidation";


const PANEL_TYPES = [
"GRC","GRG","GRP","EIFS","UHPC"
] as const;

type PanelType = (typeof PANEL_TYPES)[number];

interface Building {
  id: string;
  name: string;
}

interface Facade {
  id: string;
  name: string;
}

export interface PanelModel {
  id: string;
  name: string;
  type: number;
  status: number;
  project_id: string;
  project_name?: string;
  building_id?: string;
  building_name?: string;
  facade_id?: string;
  facade_name?: string;
  issue_transmittal_no?: string;
  drawing_number?: string;
  unit_rate_qr_m2?: number;
  ifp_qty_area_sm?: number;
  ifp_qty_nos?: number;
  weight?: number;
  dimension?: string;
  issued_for_production_date?: string;
}

interface ImportedPanel {
  id: string;
  name: string;
  type: number;
  status: number;
  project_id: string;
  project_name: string;
  building_id?: string;
  building_name?: string;
  facade_id?: string;
  facade_name?: string;
  issue_transmittal_no?: string;
  drawing_number?: string;
  unit_rate_qr_m2?: number;
  ifp_qty_area_sm?: number;
  ifp_qty_nos?: number;
  weight?: number;
  dimension?: string;
  issued_for_production_date?: string;
  isValid: boolean;
  errors: string[];
}


export function PanelsPage() {
  const { showToast } = useToastContext();
  const { user: currentUser } = useAuth();
  const [panels, setPanels] = useState<PanelModel[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [facades, setFacades] = useState<Facade[]>([]);
  const [projects, setProjects] = useState<Array<{id: string, name: string, customer_id?: string}>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [facadeFilter, setFacadeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddPanelDialogOpen, setIsAddPanelDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [panelToDelete, setPanelToDelete] = useState<PanelModel | null>(null);
  const [editingPanel, setEditingPanel] = useState<PanelModel | null>(null);
  const [selectedPanelForQR, setSelectedPanelForQR] = useState<PanelModel | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandAllRows, setExpandAllRows] = useState(false);
  const [isBulkImportMode, setIsBulkImportMode] = useState(false);
  const [bulkImportStep, setBulkImportStep] = useState<"upload" | "preview" | "importing" | "complete">("upload");
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [importedPanels, setImportedPanels] = useState<ImportedPanel[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState({ successful: 0, failed: 0 });
  const [bulkImportErrors, setBulkImportErrors] = useState<string[]>([]);
  const [bulkImportCurrentPage, setBulkImportCurrentPage] = useState(1);
  const [bulkImportPageSize] = useState(25);
  const [bulkImportSearchTerm, setBulkImportSearchTerm] = useState("");
  const [bulkImportStatusFilter, setBulkImportStatusFilter] = useState<string>("all");
  const [bulkImportTypeFilter, setBulkImportTypeFilter] = useState<string>("all");
  const [bulkImportValidityFilter, setBulkImportValidityFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPanels, setSelectedPanels] = useState<Set<string>>(new Set());
  const [isAddToGroupDialogOpen, setIsAddToGroupDialogOpen] = useState(false);
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedPanelForTimeline, setSelectedPanelForTimeline] = useState<PanelModel | null>(null);
  const [isBulkStatusDialogOpen, setIsBulkStatusDialogOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<number>(0);
  const [isStatusChangeDialogOpen, setIsStatusChangeDialogOpen] = useState(false);
  const [selectedPanelForStatusChange, setSelectedPanelForStatusChange] = useState<PanelModel | null>(null);

  // RBAC Permission checks
  const canCreatePanels = currentUser?.role ? hasPermission(currentUser.role as any, 'panels', 'canCreate') : false;
  const canUpdatePanels = currentUser?.role ? hasPermission(currentUser.role as any, 'panels', 'canUpdate') : false;
  const canDeletePanels = currentUser?.role ? hasPermission(currentUser.role as any, 'panels', 'canDelete') : false;
  const canBulkImportPanels = currentUser?.role ? hasPermission(currentUser.role as any, 'panels', 'canBulkImport') : false;
  const canChangePanelStatus = currentUser?.role ? hasPermission(currentUser.role as any, 'panels', 'canChangeStatus') : false;
  const canCreatePanelGroups = currentUser?.role ? hasPermission(currentUser.role as any, 'panelGroups', 'canCreate') : false;

  // Helper function to get valid statuses for a given current status
  const getValidStatuses = (currentStatus: number) => {
    const validNextStatuses = getValidNextStatuses(currentStatus);
    const allStatuses = PANEL_STATUSES.map((_, index) => index);
    
    // Include special statuses (On Hold, Cancelled) that can be set from any status
    const specialStatuses = allStatuses.filter(status => isSpecialStatus(status));
    
    // Combine valid next statuses with special statuses, removing duplicates
    const validStatuses = Array.from(new Set([...validNextStatuses, ...specialStatuses]));
    
    return validStatuses.sort((a, b) => a - b);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 10;

  // Map database integers to UI strings
  const typeMap: { [key: number]: PanelType } = PANEL_TYPES.reduce((acc, type, index) => ({ ...acc, [index]: type }), {});
  const statusMap: { [key: number]: PanelStatus } = PANEL_STATUSES.reduce((acc, status, index) => ({ ...acc, [index]: status }), {});
  const typeReverseMap = Object.fromEntries(Object.entries(typeMap).map(([k, v]) => [v, parseInt(k)]));
  const statusReverseMap = Object.fromEntries(Object.entries(statusMap).map(([k, v]) => [v, parseInt(k)]));

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
  const [newPanelGroupModel, setNewPanelGroupModel] = useState({
    name: "",
    description: "",
    status: 1,
  });

  const handleCreateGroup = async () => {
    try {
      if (!newPanelGroupModel.name.trim()) {
        alert("Group name is required");
        return;
      }

      const panelIds = Array.from(selectedPanels);

      const { data, error } = await supabase.rpc('create_panel_group_from_panels', {
        panel_ids: panelIds,
        name: newPanelGroupModel.name || null,
        description: newPanelGroupModel.description || null,
        status: newPanelGroupModel.status,
      });

      if (error) {
        console.error('Error creating panel group:', error);
        alert('Failed to create panel group');
        return;
      }

      setNewPanelGroupModel({
        name: "",
        description: "",
        status: 1,
      });
      setIsCreateGroupDialogOpen(false);

      console.log('New panel group created with ID:', data);
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedPanels.size === 0) {
      showToast("No panels selected", "error");
      return;
    }

    try {
      const panelIds = Array.from(selectedPanels);
      const selectedPanelObjects = panels.filter(panel => selectedPanels.has(panel.id));
      
      // Validate status transitions for all selected panels
      for (const panel of selectedPanelObjects) {
        const validation = validateStatusTransition(panel.status, bulkStatusValue);
        if (!validation.isValid) {
          showToast(`Cannot update panel "${panel.name}": ${validation.error}`, "error");
          return;
        }
      }
      
      // Update each panel individually to track user changes
      for (const panelId of panelIds) {
        await crudOperations.update("panels", panelId, { status: bulkStatusValue });
        // Database triggers will automatically add status history
      }

      // Update local state
      setPanels(panels.map(panel => 
        selectedPanels.has(panel.id) 
          ? { ...panel, status: bulkStatusValue }
          : panel
      ));

      showToast(`Successfully updated status for ${selectedPanels.size} panel(s)`, "success");
      setIsBulkStatusDialogOpen(false);
      setSelectedPanels(new Set());
      setIsSelectionMode(false);
      setBulkStatusValue(0);
    } catch (error) {
      console.error("Unexpected error:", error);
      showToast("An unexpected error occurred", "error");
    }
  };
  // Shared data fetcher so we can reuse after CRUD/status changes
  const fetchData = async () => {
    setLoading(true);

    // Check if current user is a customer and implement data filtering
    const isCustomer = currentUser?.role ? isCustomerRole(currentUser.role as UserRole) : false;

    // Fetch projects with customer filtering
    let projectQuery = supabase
      .from("projects")
      .select("id, name, customer_id");
    
    if (isCustomer && currentUser?.customer_id) {
      projectQuery = projectQuery.eq('customer_id', currentUser.customer_id);
      console.log('Filtering projects for customer:', currentUser.customer_id);
    }
    
    const { data: projectData, error: projectError } = await projectQuery;
    if (projectError) {
      console.error("Error fetching projects:", projectError);
    } else {
      setProjects(projectData || []);
      // Set first project as default if available
      if (projectData && projectData.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectData[0].id);
      }
    }
    const accessibleProjectIds = (projectData || []).map((p: any) => p.id);

    // Fetch buildings with customer filtering
    let buildingQuery = supabase
      .from("buildings")
      .select("id, name, project_id");
    // For customer users, restrict buildings to their accessible projects
    if (isCustomer && accessibleProjectIds.length > 0) {
      buildingQuery = buildingQuery.in('project_id', accessibleProjectIds);
    }
    
    const { data: buildingData, error: buildingError } = await buildingQuery;
    if (buildingError) {
      console.error("Error fetching buildings:", buildingError);
    } else {
      setBuildings(buildingData || []);
    }

    // Fetch facades with customer filtering
    let facadeQuery = supabase
      .from("facades")
      .select(`
        id,
        name,
        buildings!inner(project_id)
      `);
    // For customer users, restrict facades to their accessible projects via buildings join
    if (isCustomer && accessibleProjectIds.length > 0) {
      facadeQuery = facadeQuery.in('buildings.project_id', accessibleProjectIds);
    }
    
    const { data: facadeData, error: facadeError } = await facadeQuery;
    if (facadeError) {
      console.error("Error fetching facades:", facadeError);
    } else {
      setFacades(facadeData || []);
    }

    // Fetch panels with customer filtering
    let panelQuery = supabase
      .from("panels")
      .select(`
        *,
        projects!inner(name, customer_id),
        buildings(name),
        facades(name)
      `);
    // For customer users, restrict panels to projects they own via join filter
    if (isCustomer && currentUser?.customer_id) {
      panelQuery = panelQuery.eq('projects.customer_id', currentUser.customer_id);
    }

    const { data, error } = await panelQuery;

    if (error) {
      console.error("Error fetching panels:", error);
    } else {
      const formattedData = data?.map((panel) => ({
        ...panel,
        project_name: panel.projects?.name,
        building_name: panel.buildings?.name,
        facade_name: panel.facades?.name,
      })) || [];
      setPanels(formattedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentUser?.customer_id]);

  // Filter panels
  const filteredPanels = panels.filter((panel) => {
    const matchesSearch =
      searchTerm === "" ||
      panel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (panel.building_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (panel.facade_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (panel.drawing_number?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (panel.issue_transmittal_no?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || statusMap[panel.status] === statusFilter;
    const matchesType = typeFilter === "all" || typeMap[panel.type] === typeFilter;
    const matchesBuilding = buildingFilter === "all" || panel.building_name === buildingFilter;
    const matchesFacade = facadeFilter === "all" || panel.facade_name === facadeFilter;
    return matchesSearch && matchesStatus && matchesType && matchesBuilding && matchesFacade;
  });

  const totalPages = Math.ceil(filteredPanels.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPanels = filteredPanels.slice(startIndex, startIndex + itemsPerPage);

  const activeFiltersCount = [
    searchTerm !== "",
    statusFilter !== "all",
    typeFilter !== "all",
    buildingFilter !== "all",
    facadeFilter !== "all",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
    setBuildingFilter("all");
    setFacadeFilter("all");
    setCurrentPage(1);
  };

  const handleViewQRCode = (panel: PanelModel) => {
    setSelectedPanelForQR(panel);
  };

  const handleDeletePanel = (panel: PanelModel) => {
    setPanelToDelete(panel);
    setIsDeleteDialogOpen(true);
  };

  const handleOpenTimeline = (panel: PanelModel) => {
    setSelectedPanelForTimeline(panel);
    setIsTimelineOpen(true);
  };

  const handleStatusChange = (panel: PanelModel) => {
    setSelectedPanelForStatusChange(panel);
    setIsStatusChangeDialogOpen(true);
  };

  const handleStatusChanged = () => {
    // Explicitly refresh data to ensure UI reflects latest status
    fetchData();
  };

  const confirmDeletePanel = async () => {
    if (panelToDelete) {
      try {
        await crudOperations.delete("panels", panelToDelete.id);
        setPanels(panels.filter((p) => p.id !== panelToDelete.id));
        showToast("Panel deleted successfully", "success");
      } catch (error) {
        console.error("Error deleting panel:", error);
        showToast("Error deleting panel", "error");
      }
      setIsDeleteDialogOpen(false);
      setPanelToDelete(null);
    }
  };

  const startEditPanel = (panel: PanelModel) => {
    setEditingPanel(panel);
    // Set the selected project to the panel's project
    setSelectedProjectId(panel.project_id);
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
    if (newPanelModel.name.trim() === "") {
      showToast("Panel name is required", "error");
      return;
    }

    // Test database connection first
    const dbConnectionOk = await testDatabaseConnection();
    if (!dbConnectionOk) {
      showToast("Database connection failed. Please try again.", "error");
      return;
    }

    // Check table structure
    const panelsTableOk = await checkTableStructure('panels');
    if (!panelsTableOk) {
      showToast("Panels table structure check failed. Please try again.", "error");
      return;
    }

    // Test minimal panel creation
    const minimalTestOk = await testMinimalPanelCreation();
    if (!minimalTestOk) {
      showToast("Panel creation test failed. Please check database permissions.", "error");
      return;
    }

    // Check if current user is a customer and implement data filtering
    const isCustomer = currentUser?.role ? isCustomerRole(currentUser.role as UserRole) : false;
      
    // If user is a customer, verify they can only work with their own projects
    if (isCustomer && currentUser?.customer_id) {
      const targetProjectId = editingPanel ? editingPanel.project_id : selectedProjectId;
      
      // For customer users, we'll rely on the database-level filtering
      // The fetchData function already filters projects by customer_id
      console.log('Customer user creating/editing panel for project:', targetProjectId);
    }

    // Validate status transition if editing an existing panel
    if (editingPanel) {
      const validation = validateStatusTransition(editingPanel.status, newPanelModel.status);
      if (!validation.isValid) {
        showToast(validation.error || "Invalid status transition", "error");
        return;
      }
    }

    const panelData = {
      name: newPanelModel.name,
      type: newPanelModel.type,
      status: newPanelModel.status,
      project_id: editingPanel ? editingPanel.project_id : selectedProjectId,
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

    console.log('Panel data being sent:', panelData);

    // Validate data types before sending
    const validatedPanelData = {
      ...panelData,
      type: Number(panelData.type),
      status: Number(panelData.status),
      unit_rate_qr_m2: panelData.unit_rate_qr_m2 ? Number(panelData.unit_rate_qr_m2) : null,
      ifp_qty_area_sm: panelData.ifp_qty_area_sm ? Number(panelData.ifp_qty_area_sm) : null,
      ifp_qty_nos: panelData.ifp_qty_nos ? Number(panelData.ifp_qty_nos) : null,
      weight: panelData.weight ? Number(panelData.weight) : null,
    };

    console.log('Validated panel data:', validatedPanelData);

    try {
      if (editingPanel) {
        // Check if status changed
        const statusChanged = editingPanel.status !== panelData.status;
        console.log(`Updating panel ${editingPanel.id}:`, {
          oldStatus: editingPanel.status,
          newStatus: panelData.status,
          statusChanged
        });
        
        // Update panel with user tracking
        console.log('Calling crudOperations.update...');
        await crudOperations.update("panels", editingPanel.id, validatedPanelData);
        console.log('crudOperations.update completed');
        
        // Database triggers will automatically add status history when status changes
        if (statusChanged) {
          console.log(`Status changed from ${editingPanel.status} to ${validatedPanelData.status}, database triggers will handle history`);
        } else {
          console.log(`Status unchanged (${validatedPanelData.status}), no history needed`);
        }
        
        // Fetch the updated panel data with relations to get correct project name
        const { data: updatedPanel, error: fetchError } = await supabase
          .from("panels")
          .select(`
            *,
            projects!inner(name),
            buildings(name),
            facades(name)
          `)
          .eq("id", editingPanel.id)
          .single();

        if (fetchError) {
          console.error("Error fetching updated panel data:", fetchError);
        } else {
          setPanels(
            panels.map((p) =>
              p.id === editingPanel.id
                ? { 
                    ...p, 
                    ...validatedPanelData, 
                    project_name: updatedPanel.projects?.name, 
                    building_name: updatedPanel.buildings?.name, 
                    facade_name: updatedPanel.facades?.name,
                    building_id: validatedPanelData.building_id || undefined,
                    facade_id: validatedPanelData.facade_id || undefined,
                    issue_transmittal_no: validatedPanelData.issue_transmittal_no || undefined,
                    drawing_number: validatedPanelData.drawing_number || undefined,
                    unit_rate_qr_m2: validatedPanelData.unit_rate_qr_m2 || undefined,
                    ifp_qty_area_sm: validatedPanelData.ifp_qty_area_sm || undefined,
                    ifp_qty_nos: validatedPanelData.ifp_qty_nos || undefined,
                    weight: validatedPanelData.weight || undefined,
                    issued_for_production_date: validatedPanelData.issued_for_production_date || undefined,
                    dimension: validatedPanelData.dimension || undefined, 
                  }
                : p
            )
          );
        }
        showToast("Panel updated successfully", "success");
      } else {
        if (!selectedProjectId) {
          showToast("Please select a project first", "error");
          return;
        }

        // Create new panel with the prepared data
        const newPanel = await crudOperations.create("panels", validatedPanelData);

        // Database triggers will automatically add initial status history
        console.log(`Panel created with status ${validatedPanelData.status}, database triggers will handle initial history`);

        // Fetch the complete panel data with relations
        const { data: completePanel, error: fetchError } = await supabase
          .from("panels")
          .select(`
            *,
            projects!inner(name),
            buildings(name),
            facades(name)
          `)
          .eq("id", newPanel.id)
          .single();

        if (fetchError) {
          console.error("Error fetching complete panel data:", fetchError);
        } else {
          setPanels([
            ...panels,
            {
              ...completePanel,
              project_name: completePanel.projects?.name,
              building_name: completePanel.buildings?.name,
              facade_name: completePanel.facades?.name,
            },
          ]);
        }
        showToast("Panel added successfully", "success");
      }
    } catch (error) {
      console.error("Error saving panel:", error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('customer_id')) {
          showToast("Customer validation failed. Please check your selection.", "error");
        } else if (error.message.includes('project_id')) {
          showToast("Project validation failed. Please check your selection.", "error");
        } else if (error.message.includes('building_id')) {
          showToast("Building validation failed. Please check your selection.", "error");
        } else if (error.message.includes('facade_id')) {
          showToast("Facade validation failed. Please check your selection.", "error");
        } else {
          showToast(`Error saving panel: ${error.message}`, "error");
        }
      } else {
        showToast("Error saving panel", "error");
      }
    }

    setIsAddPanelDialogOpen(false);
    setIsEditDialogOpen(false);
    setEditingPanel(null);
    setNewPanelModel({
      name: "",
      type: 0,
      status: 1,
      building_id: undefined,
      facade_id: undefined,
      issue_transmittal_no: undefined,
      drawing_number: undefined,
      unit_rate_qr_m2: undefined,
      ifp_qty_area_sm: undefined,
      ifp_qty_nos: undefined,
      weight: undefined,
      dimension: undefined,
      issued_for_production_date: undefined,
    });
  };

  const normalizeType = (type: string): number => {
    const normalized = type.toLowerCase().trim();
    if (normalized.includes("wall")) return 0;
    if (normalized.includes("facade")) return 1;
    if (normalized.includes("stair")) return 2;
    if (normalized.includes("column")) return 3;
    if (normalized.includes("beam")) return 4;
    if (normalized.includes("slab")) return 5;
    return 0;
  };

  const normalizeStatus = (status: string): number => {
    const normalized = status.toLowerCase().trim();

    if (normalized.includes("produce")) return PANEL_STATUSES.indexOf("Produced");
    if (normalized.includes("check")) return PANEL_STATUSES.indexOf("Issued For Production");
    if (normalized.includes("inspect")) return PANEL_STATUSES.indexOf("Inspected");
    if (normalized.includes("approved final")) return PANEL_STATUSES.indexOf("Approved Final");
    if (normalized.includes("approved material") || normalized.includes("approve")) return PANEL_STATUSES.indexOf("Approved Material");
    if (normalized.includes("reject")) return PANEL_STATUSES.indexOf("Rejected Material");
    if (normalized.includes("issue")) return PANEL_STATUSES.indexOf("Issued");
    if (normalized.includes("proceed")) return PANEL_STATUSES.indexOf("Proceed for Delivery");
    if (normalized.includes("deliver")) return PANEL_STATUSES.indexOf("Delivered");
    if (normalized.includes("install")) return PANEL_STATUSES.indexOf("Installed");
    if (normalized.includes("broken")) return PANEL_STATUSES.indexOf("Broken at Site");
    if (normalized.includes("on hold")) return PANEL_STATUSES.indexOf("On Hold");
    if (normalized.includes("cancel")) return PANEL_STATUSES.indexOf("Cancelled");

    return 0;
  };


  const validatePanel = (panel: ImportedPanel) => {
    const errors: string[] = [];
    if (!panel.name.trim()) errors.push("Panel name is required");
    if (panel.unit_rate_qr_m2 && panel.unit_rate_qr_m2 < 0) errors.push("Unit rate cannot be negative");
    if (panel.ifp_qty_area_sm && panel.ifp_qty_area_sm < 0) errors.push("IFP qty area cannot be negative");
    if (panel.ifp_qty_nos && panel.ifp_qty_nos < 0) errors.push("IFP qty nos cannot be negative");
    panel.errors = errors;
    panel.isValid = errors.length === 0;
  };

  const handleFileUpload = async (selectedFile: File) => {
    if (!selectedFile) return;

    try {
      setBulkImportFile(selectedFile);
      setBulkImportErrors([]);
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      if (jsonData.length === 0) {
        setBulkImportErrors(["The Excel file appears to be empty or invalid."]);
        return;
      }

      const parsedPanels: ImportedPanel[] = jsonData.map((row: any, index: number) => {
        const panel: ImportedPanel = {
          id: `import-${Date.now()}-${index}`,
          name: row["Panel Name"] || row["Name"] || row["panel_name"] || "",
          type: normalizeType(row["Type"] || row["Panel Type"] || row["type"] || "GRC"),
          status: normalizeStatus(row["Status"] || row["status"] || "Manufactured"),
          project_id: 'projectId',
          project_name: 'projectName',
          building_id: row["Building ID"] || row["building_id"] || undefined,
          building_name: row["Building Name"] || row["building_name"] || undefined,
          facade_id: row["Facade ID"] || row["facade_id"] || undefined,
          facade_name: row["Facade Name"] || row["facade_name"] || undefined,
          issue_transmittal_no: row["Issue Transmittal No"] || row["IssueTransmittalNo"] || row["issue_transmittal_no"] || undefined,
          drawing_number: row["Drawing Number"] || row["DrawingNumber"] || row["drawing_number"] || undefined,
          unit_rate_qr_m2: parseFloat(row["Unit Rate QR/m2"] || row["unit_rate_qr_m2"] || "0") || undefined,
          ifp_qty_area_sm: parseFloat(row["IFP Qty Area SM"] || row["ifp_qty_area_sm"] || "0") || undefined,
          ifp_qty_nos: parseInt(row["IFP Qty Nos"] || row["ifp_qty_nos"] || "0") || undefined,
          weight: parseFloat(row["Weight"] || row["weight"] || "0") || undefined,
          dimension: row["Dimension"] || row["dimension"] || undefined,
          issued_for_production_date: row["Issued for Production Date"] || row["IssuedForProductionDate"] || row["issued_for_production_date"] || undefined,
          isValid: true,
          errors: [],
        };

        validatePanel(panel);
        return panel;
      });

      setImportedPanels(parsedPanels);
      setBulkImportStep("preview");
    } catch (error) {
      console.error("Error parsing Excel file:", error);
      setBulkImportErrors(["Failed to parse Excel file. Please ensure it's a valid .xlsx file."]);
    }
  };

  const updateImportedPanel = (index: number, field: keyof ImportedPanel, value: any) => {
    const actualIndex = importedPanels.findIndex((p) => p.id === filteredImportedPanels[index].id);
    const updatedPanels = [...importedPanels];
    (updatedPanels[actualIndex] as any)[field] = value;
    validatePanel(updatedPanels[actualIndex]);
    setImportedPanels(updatedPanels);
  };

  const removeImportedPanel = (index: number) => {
    const panelToRemove = filteredImportedPanels[index];
    setImportedPanels((prev) => prev.filter((p) => p.id !== panelToRemove.id));
  };

  const handleImportPanels = async () => {
    const validPanels = importedPanels.filter((p) => p.isValid);
    if (validPanels.length === 0) {
      setBulkImportErrors(["No valid panels to import. Please fix the errors and try again."]);
      return;
    }

    try {
      setBulkImportStep("importing");
      setImportProgress(0);

      if (!selectedProjectId) {
        setBulkImportErrors(["Please select a project first"]);
        return;
      }

      const newPanels = validPanels.map((p) => ({
        name: p.name,
        type: p.type,
        status: p.status,
        project_id: selectedProjectId,
        building_id: p.building_id || null,
        facade_id: p.facade_id || null,
        issue_transmittal_no: p.issue_transmittal_no || null,
        drawing_number: p.drawing_number || null,
        unit_rate_qr_m2: p.unit_rate_qr_m2 || null,
        ifp_qty_area_sm: p.ifp_qty_area_sm || null,
        ifp_qty_nos: p.ifp_qty_nos || null,
        weight: p.weight || null,
        dimension: p.dimension || null,
        issued_for_production_date: p.issued_for_production_date || null,
      }));

      // Import panels with user tracking
      const importedPanels = [];
      for (const panelData of newPanels) {
        try {
          const newPanel = await crudOperations.create("panels", panelData);
          // Database triggers will automatically add status history
          importedPanels.push(newPanel);
        } catch (error) {
          console.error("Error importing panel:", error);
          // Continue with other panels even if one fails
        }
      }

      // Fetch complete data for imported panels
      const panelIds = importedPanels.map(p => p.id);
      const { data, error } = await supabase
        .from("panels")
        .select(`
          *,
          projects!inner(name),
          buildings(name),
          facades(name)
        `)
        .in("id", panelIds);

      if (error) {
        console.error("Error fetching imported panels:", error);
      }

      setPanels([
        ...panels,
        ...(data?.map((panel) => ({
          ...panel,
          project_name: panel.projects?.name,
          building_name: panel.buildings?.name,
          facade_name: panel.facades?.name,
        })) || []),
      ]);

      setImportResults({ successful: validPanels.length, failed: 0 });
      setBulkImportStep("complete");
    } catch (error) {
      console.error("Bulk import error:", error);
      setBulkImportErrors(["Failed to import panels. Please try again."]);
    } finally {
      setImportProgress(100);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        "Panel Name": "Sample Panel 1",
        "Type": "GRC",
        "Status": "Issued For Production",
        "Building Name": "Sample Building",
        "Facade Name": "Sample Facade",
        "Issue Transmittal No": "T-001",
        "Drawing Number": "DWG-001-A1",
        "Unit Rate QR/m2": 100.5,
        "IFP Qty Area SM": 50.25,
        "IFP Qty Nos": 1,
        "Weight": 150.5,
        "Issued for Production Date": "2024-01-15",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Panels Template");
    XLSX.writeFile(wb, "panels_import_template.xlsx");
  };

  // Bulk import filters
  const filteredImportedPanels = importedPanels.filter((panel) => {
    const matchesSearch =
      bulkImportSearchTerm === "" ||
      panel.name.toLowerCase().includes(bulkImportSearchTerm.toLowerCase()) ||
      (panel.building_name?.toLowerCase().includes(bulkImportSearchTerm.toLowerCase()) ?? false) ||
      (panel.drawing_number?.toLowerCase().includes(bulkImportSearchTerm.toLowerCase()) ?? false) ||
      (panel.issue_transmittal_no?.toLowerCase().includes(bulkImportSearchTerm.toLowerCase()) ?? false);
    const matchesStatus = bulkImportStatusFilter === "all" || statusMap[panel.status] === bulkImportStatusFilter;
    const matchesType = bulkImportTypeFilter === "all" || typeMap[panel.type] === bulkImportTypeFilter;
    const matchesValidity =
      bulkImportValidityFilter === "all" ||
      (bulkImportValidityFilter === "valid" && panel.isValid) ||
      (bulkImportValidityFilter === "invalid" && !panel.isValid);
    return matchesSearch && matchesStatus && matchesType && matchesValidity;
  });

  const bulkImportTotalPages = Math.ceil(filteredImportedPanels.length / bulkImportPageSize);
  const bulkImportStartIndex = (bulkImportCurrentPage - 1) * bulkImportPageSize;
  const bulkImportEndIndex = bulkImportStartIndex + bulkImportPageSize;
  const paginatedImportedPanels = filteredImportedPanels.slice(bulkImportStartIndex, bulkImportEndIndex);

  const validPanelsCount = importedPanels.filter((p) => p.isValid).length;
  const invalidPanelsCount = importedPanels.length - validPanelsCount;

  const clearBulkImportFilters = () => {
    setBulkImportSearchTerm("");
    setBulkImportStatusFilter("all");
    setBulkImportTypeFilter("all");
    setBulkImportValidityFilter("all");
    setBulkImportCurrentPage(1);
  };

  const activeBulkImportFiltersCount = [
    bulkImportSearchTerm,
    bulkImportStatusFilter !== "all" ? bulkImportStatusFilter : "",
    bulkImportTypeFilter !== "all" ? bulkImportTypeFilter : "",
    bulkImportValidityFilter !== "all" ? bulkImportValidityFilter : "",
  ].filter(Boolean).length;

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedPanels(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedPanels.size === paginatedPanels.length) {
      setSelectedPanels(new Set());
    } else {
      setSelectedPanels(new Set(paginatedPanels.map(p => p.id)));
    }
  };

  const togglePanelSelection = (panelId: string) => {
    setSelectedPanels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(panelId)) {
        newSet.delete(panelId);
      } else {
        newSet.add(panelId);
      }
      return newSet;
    });
  };

  if (loading) {
    return <div>Loading panels...</div>;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Panels</h2>
          <Badge variant="secondary" className="ml-2">{filteredPanels.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
           {isSelectionMode && (
            <>
              {canChangePanelStatus && (
                <Button
                  variant="outline"
                  onClick={() => setIsBulkStatusDialogOpen(true)}
                  disabled={selectedPanels.size === 0}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Update Status ({selectedPanels.size})
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setIsAddToGroupDialogOpen(true)}
                disabled={selectedPanels.size === 0}
              >
                <Users className="h-4 w-4 mr-2" />
                Add to Group ({selectedPanels.size})
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsCreateGroupDialogOpen(true)}
                disabled={selectedPanels.size === 0}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </>
          )}
          {canCreatePanels && (
            <Button onClick={() => setIsAddPanelDialogOpen(true)} disabled={!canCreatePanels}>
              <Plus className="h-4 w-4 mr-2" />
              Add Panel
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters & Search</CardTitle>
            {activeFiltersCount > 0 && <Badge variant="secondary" className="h-5 w-5 p-0 text-xs">{activeFiltersCount}</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search panels..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {PANEL_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {PANEL_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Building</Label>
                <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All buildings" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">All buildings</SelectItem>
                    {buildings.map((building) => (
                      <SelectItem key={building.id} value={building.name}>
                        {building.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Facade</Label>
                <Select value={facadeFilter} onValueChange={setFacadeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All facades" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">All facades</SelectItem>
                    {facades.map((facade) => (
                      <SelectItem key={facade.id} value={facade.name}>
                        {facade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredPanels.length)} of {filteredPanels.length} panels
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Panels List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {paginatedPanels.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchTerm || statusFilter !== "all" || typeFilter !== "all" || buildingFilter !== "all" || facadeFilter !== "all"
                    ? "No panels match your search criteria"
                    : "No panels found"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== "all" || typeFilter !== "all" || buildingFilter !== "all" || facadeFilter !== "all"
                    ? "Try adjusting your filters to see more results."
                    : "Get started by adding your first precast panel."}
                </p>
                {!searchTerm && statusFilter === "all" && typeFilter === "all" && buildingFilter === "all" && facadeFilter === "all" && (
                  <div className="flex items-center justify-center gap-2">
                    <Button onClick={() => setIsAddPanelDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Panel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsBulkImportMode(true)}
                      className="bg-secondary hover:bg-secondary/90 text-secondary-foreground border-border"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Bulk Import
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              paginatedPanels.map((panel) => (
                <Collapsible key={panel.id} >
                  <div className="border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center space-x-4 flex-1">
                          {isSelectionMode && (
                            <div 
                              className="flex items-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePanelSelection(panel.id);
                              }}
                            >
                              {selectedPanels.has(panel.id) ? (
                                <CheckSquare className="h-5 w-5 text-primary" />
                              ) : (
                                <Square className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2">
                            {!isSelectionMode && (
                              <>
                                {expandedRows.has(panel.id) ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                            <div>
                              <p className="font-medium text-sm">{panel.name}</p>
                              <p className="text-xs text-muted-foreground">{panel.project_name}</p>
                            </div>
                            <div className="flex items-center">
                              <Layers className="mr-2 h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{typeMap[panel.type]}</span>
                            </div>
                            <div>
                              <Badge className={'bg-primary text-primary-foreground'}>{statusMap[panel.status]}</Badge>
                            </div>
                            <div className="flex items-center">
                              <FolderOpen className="mr-2 h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{panel.building_name || "—"}</span>
                            </div>
                            <div className="flex items-center">
                              <Hash className="mr-2 h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{panel.ifp_qty_nos || "0"}</span>
                            </div>
                          </div>
                        </div>
                       <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(panel);
                            }}
                            className="p-0 text-blue-600 hover:text-blue-700"
                            title="Change Status"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewQRCode(panel);
                            }}
                            className="p-0"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                            <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenTimeline(panel);
                            }}
                            className="p-0"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                           {canUpdatePanels && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditPanel(panel);
                              }}
                              className="p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                           {canDeletePanels && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePanel(panel);
                              }}
                              className="p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 border-t bg-muted/25">
                        <div className="grid grid-cols-3 gap-4 pt-4">
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Technical Details</h4>
                            <div className="space-y-1">
                              <div className="flex items-center">
                                <FileText className="mr-2 h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Issue/Transmittal Number:</span>
                                <span className="text-xs ml-2">{panel.issue_transmittal_no || "—"}</span>
                              </div>
                              <div className="flex items-center">
                                <FileText className="mr-2 h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Drawing Number:</span>
                                <span className="text-xs ml-2">{panel.drawing_number || "—"}</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Quantities</h4>
                            <div className="space-y-1">
                              <div className="flex items-center">
                                <Hash className="mr-2 h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Unit Rate QR/m²:</span>
                                <span className="text-xs ml-2">{panel.unit_rate_qr_m2 || "—"}</span>
                              </div>
                              <div className="flex items-center">
                                <Hash className="mr-2 h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">IFP Qty Area SM:</span>
                                <span className="text-xs ml-2">{panel.ifp_qty_area_sm || "—"}</span>
                              </div>
                              <div className="flex items-center">
                                <Hash className="mr-2 h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">IFP Qty Nos:</span>
                                <span className="text-xs ml-2">{panel.ifp_qty_nos || "—"}</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Project Info</h4>
                            <div className="space-y-1">
                              <div className="flex items-center">
                                <FolderOpen className="mr-2 h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Project:</span>
                                <span className="text-xs ml-2">{panel.project_name}</span>
                              </div>
                              <div className="flex items-center">
                                <FolderOpen className="mr-2 h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Building:</span>
                                <span className="text-xs ml-2">{panel.building_name || "—"}</span>
                              </div>
                              <div className="flex items-center">
                                <FolderOpen className="mr-2 h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Facade:</span>
                                <span className="text-xs ml-2">{panel.facade_name || "—"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1))
                  .map((page, index, array) => (
                    <div key={page} className="flex items-center gap-1">
                      {index > 0 && array[index - 1] !== page - 1 && <span className="text-muted-foreground">...</span>}
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    </div>
                  ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddPanelDialogOpen} onOpenChange={setIsAddPanelDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Panel</DialogTitle>
            <DialogDescription>Create a new panel</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Panel Name *</Label>
              <Input
                id="name"
                value={newPanelModel.name}
                onChange={(e) => setNewPanelModel({ ...newPanelModel, name: e.target.value })}
                placeholder="Enter panel name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Panel Type *</Label>
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
            <DateInput
              id="issued_for_production_date"
              label="Issued for Production Date"
              value={newPanelModel.issued_for_production_date}
              onChange={(value) => setNewPanelModel({ ...newPanelModel, issued_for_production_date: value || undefined })}
              placeholder="Select date"
            />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={statusMap[newPanelModel.status]}
                onValueChange={(value) => setNewPanelModel({ ...newPanelModel, status: statusReverseMap[value] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PANEL_STATUSES.map((status, index) => {
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
              <Label htmlFor="building_id">Building</Label>
              <Select
                value={newPanelModel.building_id || ""}
                onValueChange={(value) => setNewPanelModel({ ...newPanelModel, building_id: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select building" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="facade_id">Facade</Label>
              <Select
                value={newPanelModel.facade_id || ""}
                onValueChange={(value) => setNewPanelModel({ ...newPanelModel, facade_id: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select facade" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {facades.map((facade) => (
                    <SelectItem key={facade.id} value={facade.id}>
                      {facade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue_transmittal_no">Issue/Transmittal Number</Label>
              <Input
                id="issue_transmittal_no"
                value={newPanelModel.issue_transmittal_no || ""}
                onChange={(e) => setNewPanelModel({ ...newPanelModel, issue_transmittal_no: e.target.value || undefined })}
                placeholder="Enter issue/transmittal number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drawing_number">Drawing Number</Label>
              <Input
                id="drawing_number"
                value={newPanelModel.drawing_number || ""}
                onChange={(e) => setNewPanelModel({ ...newPanelModel, drawing_number: e.target.value || undefined })}
                placeholder="Enter drawing number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_rate_qr_m2">Unit Rate QR/m²</Label>
              <Input
                id="unit_rate_qr_m2"
                type="number"
                min="0"
                value={newPanelModel.unit_rate_qr_m2 || ""}
                onChange={(e) => setNewPanelModel({ ...newPanelModel, unit_rate_qr_m2: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="Enter unit rate"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ifp_qty_area_sm">IFP Qty Area SM</Label>
              <Input
                id="ifp_qty_area_sm"
                type="number"
                min="0"
                value={newPanelModel.ifp_qty_area_sm || ""}
                onChange={(e) => setNewPanelModel({ ...newPanelModel, ifp_qty_area_sm: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="Enter IFP qty area"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ifp_qty_nos">IFP Qty Nos</Label>
              <Input
                id="ifp_qty_nos"
                type="number"
                min="0"
                value={newPanelModel.ifp_qty_nos || ""}
                onChange={(e) => setNewPanelModel({ ...newPanelModel, ifp_qty_nos: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Enter IFP qty nos"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                min="0"
                step="0.1"
                value={newPanelModel.weight || ""}
                onChange={(e) => setNewPanelModel({ ...newPanelModel, weight: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="Enter weight in kg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dimension">Dimension</Label>
              <Input
                id="dimension"
                value={newPanelModel.dimension || ""}
                onChange={(e) => setNewPanelModel({ ...newPanelModel, dimension: e.target.value || undefined })}
                placeholder="Enter dimension (e.g., 2.5m x 1.2m)"
              />
            </div>
            
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddPanelDialogOpen(false);
                setNewPanelModel({
                  name: "",
                  type: 0,
                  status: 1,
                  building_id: undefined,
                  facade_id: undefined,
                  issue_transmittal_no: undefined,
                  drawing_number: undefined,
                  unit_rate_qr_m2: undefined,
                  ifp_qty_area_sm: undefined,
                  ifp_qty_nos: undefined,
                  weight: undefined,
                  dimension: undefined,
                  issued_for_production_date: undefined,
                });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePanel} disabled={!canCreatePanels}>Add Panel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Panel</DialogTitle>
            <DialogDescription>Update panel information for {editingPanel?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project">Project *</Label>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <DateInput
              id="edit-issued_for_production_date"
              label="Issued for Production Date"
              value={newPanelModel.issued_for_production_date}
              onChange={(value) => setNewPanelModel({ ...newPanelModel, issued_for_production_date: value || undefined })}
              placeholder="Select date"
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
                  {editingPanel ? getValidStatuses(editingPanel.status).map((statusIndex) => {
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
              <Label htmlFor="edit-building_id">Building</Label>
              <Select
                value={newPanelModel.building_id || ""}
                onValueChange={(value) => setNewPanelModel({ ...newPanelModel, building_id: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select building" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-facade_id">Facade</Label>
              <Select
                value={newPanelModel.facade_id || ""}
                onValueChange={(value) => setNewPanelModel({ ...newPanelModel, facade_id: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select facade" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {facades.map((facade) => (
                    <SelectItem key={facade.id} value={facade.id}>
                      {facade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingPanel(null);
                setNewPanelModel({
                  name: "",
                  type: 0,
                  status: 1,
                  building_id: undefined,
                  facade_id: undefined,
                  issue_transmittal_no: undefined,
                  drawing_number: undefined,
                  unit_rate_qr_m2: undefined,
                  ifp_qty_area_sm: undefined,
                  ifp_qty_nos: undefined,
                  weight: undefined,
                  dimension: undefined,
                  issued_for_production_date: undefined,
                });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePanel}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Panel</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the panel "{panelToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPanelToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePanel} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedPanelForQR && (
        <QRCodeModal
          isOpen={!!selectedPanelForQR}
          onClose={() => setSelectedPanelForQR(null)}
          panel={selectedPanelForQR}
        />
      )}


      <Dialog open={isTimelineOpen} onOpenChange={setIsTimelineOpen}>
        <DialogContent className="w-[95vw] h-[90vh] max-w-6xl max-h-[90vh] flex flex-col sm:w-[90vw] md:w-[85vw] lg:w-[80vw]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Panel Timeline</DialogTitle>
            <DialogDescription>
              Status history for {selectedPanelForTimeline?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 pr-2">
            {selectedPanelForTimeline && (
              <Timeline
                panel={selectedPanelForTimeline}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Update Dialog */}
      <Dialog open={isBulkStatusDialogOpen} onOpenChange={setIsBulkStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Panel Status</DialogTitle>
            <DialogDescription>
              Update status for {selectedPanels.size} selected panel(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-status">New Status *</Label>
              <Select
                value={statusMap[bulkStatusValue]}
                onValueChange={(value) => setBulkStatusValue(statusReverseMap[value])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  {PANEL_STATUSES.map((status, index) => {
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
            <div className="bg-muted/25 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                This will update the status of {selectedPanels.size} selected panel(s) to the new status.
                <br />
                <strong>Note:</strong> Only valid status transitions will be allowed for each panel.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsBulkStatusDialogOpen(false);
                setBulkStatusValue(0);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkStatusUpdate} disabled={bulkStatusValue === 0}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Group Dialog */}
      <Dialog open={isCreateGroupDialogOpen} onOpenChange={setIsCreateGroupDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Panel Group</DialogTitle>
          <DialogDescription>
            Create a new panel group with {selectedPanels.size} selected panels
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name *</Label>
            <Input
              id="group-name"
              value={newPanelGroupModel.name}
              onChange={(e) =>
                setNewPanelGroupModel({ ...newPanelGroupModel, name: e.target.value })
              }
              placeholder="Enter group name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={statusMap[newPanelGroupModel.status]}
              onValueChange={(value) =>
                setNewPanelGroupModel({
                  ...newPanelGroupModel,
                  status: statusReverseMap[value],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PANEL_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-description">Description</Label>
            <Textarea
              id="group-description"
              value={newPanelGroupModel.description}
              onChange={(e) =>
                setNewPanelGroupModel({
                  ...newPanelGroupModel,
                  description: e.target.value,
                })
              }
              placeholder="Enter group description (optional)"
              rows={3}
            />
          </div>
          <div className="bg-muted/25 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              This will create a new panel group with {selectedPanels.size} panels from the current selection.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsCreateGroupDialogOpen(false);
              setNewPanelGroupModel({
                name: "",
                description: "",
                status: 1,
              });
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleCreateGroup}>Create Group</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      {/* Status Change Dialog */}
      <StatusChangeDialog
        panel={selectedPanelForStatusChange}
        isOpen={isStatusChangeDialogOpen}
        onClose={() => {
          setIsStatusChangeDialogOpen(false);
          setSelectedPanelForStatusChange(null);
        }}
        onStatusChanged={handleStatusChanged}
      />
      </div>
    </div>
  );
}