import {
  AlertCircle,
  Calendar,
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
import { QRCodeModal } from "../QRCodeModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { supabase } from "../../lib/supabase";
import { Textarea } from "../ui/textarea";
import { Timeline } from "../Timeline";
import { useToastContext } from "../../contexts/ToastContext";
import { DateInput } from "../ui/date-input";
import { crudOperations } from "../../utils/userTracking";
import { StatusChangeDialog } from "../StatusChangeDialog";
import { useAuth } from "../../contexts/AuthContext";
import { hasPermission, UserRole } from "../../utils/rolePermissions";
import { 
  PANEL_STATUSES, 
  PanelStatus,
  validateStatusTransition, 
  getValidNextStatuses,
  isSpecialStatus 
} from "../../utils/statusValidation";


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
  building_id?: string;
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

interface PanelsSectionProps {
  projectId: string;
  projectName: string;
}

interface QRCodeModalProps {
  panelId: string;
  panelName: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PanelsSection({ projectId, projectName }: PanelsSectionProps) {
  const { user: currentUser } = useAuth();
  const { showToast } = useToastContext();
  const [panels, setPanels] = useState<PanelModel[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [facades, setFacades] = useState<Facade[]>([]);
  const [allFacades, setAllFacades] = useState<Facade[]>([]);
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
  const [bulkStatusValue, setBulkStatusValue] = useState<number | null>(null);
  const [isStatusChangeDialogOpen, setIsStatusChangeDialogOpen] = useState(false);
  const [selectedPanelForStatusChange, setSelectedPanelForStatusChange] = useState<PanelModel | null>(null);
  const [isSavingPanel, setIsSavingPanel] = useState(false);
  const [isBulkStatusUpdating, setIsBulkStatusUpdating] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isAddingToGroup, setIsAddingToGroup] = useState(false);
  const [isImportingPanels, setIsImportingPanels] = useState(false);
  const [panelGroups, setPanelGroups] = useState<Array<{id: string, name: string, description: string}>>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const canCreatePanels = currentUser?.role ? hasPermission(currentUser.role as UserRole, 'panels', 'canCreate') : false;

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
  });

  const handleCreateGroup = async () => {
    if (isCreatingGroup) return; // Prevent double submission
    
    try {
      if (!newPanelGroupModel.name.trim()) {
        alert("Group name is required");
        return;
      }

      setIsCreatingGroup(true);

      const panelIds = Array.from(selectedPanels);

      const { data, error } = await supabase.rpc('create_panel_group_from_panels', {
        panel_ids: panelIds,
        name: newPanelGroupModel.name || null,
        description: newPanelGroupModel.description || null,
      });

      if (error) {
        console.error('Error creating panel group:', error);
        alert('Failed to create panel group');
        return;
      }

      setNewPanelGroupModel({
        name: "",
        description: "",
      });
      setIsCreateGroupDialogOpen(false);

      console.log('New panel group created with ID:', data);
      
      // Refresh the panels data to reflect the new group
      await fetchData();
      setSelectedPanels(new Set());
      setIsSelectionMode(false);
      showToast('Panel group created successfully', 'success');
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const fetchPanelGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('panel_groups')
        .select('id, name, description')
        .order('name');

      if (error) {
        console.error('Error fetching panel groups:', error);
        return;
      }

      setPanelGroups(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  const handleAddToExistingGroup = async () => {
    if (isAddingToGroup) return;
    
    try {
      if (!selectedGroupId) {
        alert("Please select a group");
        return;
      }

      setIsAddingToGroup(true);
      const panelIds = Array.from(selectedPanels);

      const { error } = await supabase.rpc('add_panels_to_group', {
        group_id: selectedGroupId,
        panel_ids: panelIds
      });

      if (error) {
        console.error('Error adding panels to group:', error);
        alert('Failed to add panels to group');
        return;
      }

      // Refresh the panels data to reflect the changes
      await fetchData();
      setSelectedPanels(new Set());
      setIsSelectionMode(false);
      setSelectedGroupId("");
      setIsAddToGroupDialogOpen(false);
      showToast('Panels added to group successfully', 'success');
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    } finally {
      setIsAddingToGroup(false);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (isBulkStatusUpdating) return; // Prevent double submission
    
    if (selectedPanels.size === 0) {
      showToast("No panels selected", "error");
      return;
    }

    if (bulkStatusValue === null) {
      showToast("Please select a status", "error");
      return;
    }

    setIsBulkStatusUpdating(true);

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
        console.log('Bulk updating panel:', panelId, 'with status:', bulkStatusValue);
        await crudOperations.update("panels", panelId, { status: bulkStatusValue as number });
        // Database triggers will automatically add status history
      }

      // Update local state
      setPanels(panels.map(panel => 
        selectedPanels.has(panel.id) 
           ? { ...panel, status: bulkStatusValue as number }
          : panel
      ));

      showToast(`Successfully updated status for ${selectedPanels.size} panel(s)`, "success");
      setIsBulkStatusDialogOpen(false);
      setSelectedPanels(new Set());
      setIsSelectionMode(false);
      setBulkStatusValue(null);
    } catch (error) {
      console.error("Unexpected error:", error);
      showToast("An unexpected error occurred", "error");
    } finally {
      setIsBulkStatusUpdating(false);
    }
  };
  const fetchData = async () => {
    setLoading(true);

    const { data: buildingData, error: buildingError } = await supabase
      .from("buildings")
      .select("id, name")
      .eq("project_id", projectId);
    if (buildingError) {
      console.error("Error fetching buildings:", buildingError);
    } else {
      setBuildings(buildingData || []);
    }

    const { data: facadeData, error: facadeError } = await supabase
      .from("facades")
      .select(`
        id,
        name,
        building_id,
        buildings!inner(project_id)
      `)
      .eq("buildings.project_id", projectId)
      if (facadeError) {
        console.error("Error fetching facades:", facadeError);
      } else {
        setAllFacades(facadeData || []);
        setFacades(facadeData || []);
      }

    const { data, error } = await supabase
      .from("panels")
      .select(`
        *,
        projects!inner(name),
        buildings(name),
        facades(name)
      `)
      .eq("project_id", projectId);

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
    fetchPanelGroups();
  }, [projectId]);

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

  // Function to filter facades based on selected building
  const filterFacadesByBuilding = (buildingId: string | undefined) => {
    if (!buildingId) {
      setFacades(allFacades);
      return;
    }
    const filteredFacades = allFacades.filter(facade => facade.building_id === buildingId);
    setFacades(filteredFacades);
  };

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
    // Refresh the panels data
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
      issued_for_production_date: panel.issued_for_production_date,
      dimension: panel.dimension,
    });
    // Filter facades based on the panel's building
    filterFacadesByBuilding(panel.building_id);
    setIsEditDialogOpen(true);
  };

  const handleSavePanel = async () => {
    if (isSavingPanel) return; // Prevent double submission
    
    if (newPanelModel.name.trim() === "") {
      showToast("Panel name is required", "error");
      return;
    }

    // Validate status transition if editing an existing panel and status has changed
    if (editingPanel && editingPanel.status !== newPanelModel.status) {
      const validation = validateStatusTransition(editingPanel.status, newPanelModel.status);
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
      project_id: projectId,
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
      if (editingPanel) {
        // Check if status changed
        const statusChanged = editingPanel.status !== panelData.status;
        console.log(`Updating panel ${editingPanel.id}:`, {
          oldStatus: editingPanel.status,
          newStatus: panelData.status,
          statusChanged
        });
        
        // Update panel with user tracking
        console.log('Calling crudOperations.update with panelData:', panelData);
        await crudOperations.update("panels", editingPanel.id, panelData);
        console.log('crudOperations.update completed');
        
        // Database triggers will automatically add status history when status changes
        if (statusChanged) {
          console.log(`Status changed from ${editingPanel.status} to ${panelData.status}, database triggers will handle history`);
        } else {
          console.log(`Status unchanged (${panelData.status}), no history needed`);
        }
        
        setPanels(
          panels.map((p) =>
            p.id === editingPanel.id
              ? { 
                  ...p, 
                  ...panelData, 
                  project_name: projectName, 
                  building_name: buildings.find(b => b.id === panelData.building_id)?.name, 
                  facade_name: facades.find(e => e.id === panelData.facade_id)?.name,
                  building_id: panelData.building_id || undefined,
                  facade_id: panelData.facade_id || undefined,
                  issue_transmittal_no: panelData.issue_transmittal_no || undefined,
                  drawing_number: panelData.drawing_number || undefined,
                  unit_rate_qr_m2: panelData.unit_rate_qr_m2 || undefined,
                  ifp_qty_area_sm: panelData.ifp_qty_area_sm || undefined,
                  ifp_qty_nos: panelData.ifp_qty_nos || undefined,
                  weight: panelData.weight || undefined,
                  issued_for_production_date: panelData.issued_for_production_date || undefined,
                  dimension: panelData.dimension || undefined,
                }
              : p
          )
        );
        showToast("Panel updated successfully", "success");
      } else {
        // Create panel with user tracking
        console.log('Calling crudOperations.create with panelData:', panelData);
        const newPanel = await crudOperations.create("panels", panelData);
        
        // Database triggers will automatically add initial status history
        console.log(`Panel created with status ${panelData.status}, database triggers will handle initial history`);
        
        // Fetch the complete panel data with relations
        const { data, error } = await supabase
          .from("panels")
          .select(`
            *,
            projects!inner(name),
            buildings(name),
            facades(name)
          `)
          .eq("id", newPanel.id)
          .single();
          
        if (error) {
          console.error("Error fetching complete panel data:", error);
        } else {
          setPanels([
            ...panels,
            {
              ...data,
              project_name: data.projects?.name,
              building_name: data.buildings?.name,
              facade_name: data.facades?.name,
            },
          ]);
        }
        showToast("Panel added successfully", "success");
      }
    } catch (error) {
      console.error("Error saving panel:", error);
      showToast("Error saving panel", "error");
    } finally {
      setIsSavingPanel(false);
      setIsAddPanelDialogOpen(false);
      setIsEditDialogOpen(false);
      setEditingPanel(null);
      setNewPanelModel({
        name: "",
        type: 0,
        status: 0,
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
      // Reset facades to show all
      setFacades(allFacades);
    }
  };

  const normalizeType = (type: string): number => {
    if (!type) return 0;
    const normalized = type.trim().toUpperCase().replace(/\./g, "");
    // Match against PANEL_TYPES exactly or common variants
    if (normalized === "GRC") return PANEL_TYPES.indexOf("GRC");
    if (normalized === "GRG") return PANEL_TYPES.indexOf("GRG");
    if (normalized === "GRP") return PANEL_TYPES.indexOf("GRP");
    if (normalized === "EIFS") return PANEL_TYPES.indexOf("EIFS");
    if (normalized === "UHPC") return PANEL_TYPES.indexOf("UHPC");
    // Fallback to first type
    return 0;
  };

  const normalizeStatus = (status: string): number => {
    if (!status) return 0;
    const normalized = status.toLowerCase().trim();

    if (normalized.includes("issued for production")) return PANEL_STATUSES.indexOf("Issued For Production");
    if (normalized.includes("manufactur") || normalized.includes("produce")) return PANEL_STATUSES.indexOf("Produced");
    if (normalized.includes("inspect")) return PANEL_STATUSES.indexOf("Inspected");
    if (normalized.includes("approved final")) return PANEL_STATUSES.indexOf("Approved Final");
    if (normalized.includes("approved material") || (normalized.includes("approve") && !normalized.includes("final"))) return PANEL_STATUSES.indexOf("Approved Material");
    if (normalized.includes("reject")) return PANEL_STATUSES.indexOf("Rejected Material");
    if (normalized === "issued" || normalized.includes("issue")) return PANEL_STATUSES.indexOf("Issued");
    if (normalized.includes("proceed")) return PANEL_STATUSES.indexOf("Proceed for Delivery");
    if (normalized.includes("deliver")) return PANEL_STATUSES.indexOf("Delivered");
    if (normalized.includes("install")) return PANEL_STATUSES.indexOf("Installed");
    if (normalized.includes("broken")) return PANEL_STATUSES.indexOf("Broken at Site");
    if (normalized.includes("on hold") || normalized === "hold") return PANEL_STATUSES.indexOf("On Hold");
    if (normalized.includes("cancel")) return PANEL_STATUSES.indexOf("Cancelled");

    return 0;
  };


  const validatePanel = (panel: ImportedPanel) => {
    const errors: string[] = [];
    if (!panel.name.trim()) errors.push("Panel name is required");
    if (panel.unit_rate_qr_m2 && panel.unit_rate_qr_m2 < 0) errors.push("Unit rate cannot be negative");
    if (panel.ifp_qty_area_sm && panel.ifp_qty_area_sm < 0) errors.push("IFP qty area cannot be negative");
    if (panel.ifp_qty_nos && panel.ifp_qty_nos < 0) errors.push("IFP qty nos cannot be negative");
    // Note: Building and facade validation errors are removed since they will be created automatically during import
    panel.errors = errors;
    panel.isValid = errors.length === 0;
  };

  const normalizeName = (value?: string) => (value || "").trim().toLowerCase();

  const findBuildingIdByName = (name?: string): string | undefined => {
    if (!name) return undefined;
    const target = normalizeName(name);
    const match = buildings.find((b) => normalizeName(b.name) === target);
    return match?.id;
  };

  const findFacadeIdByName = (name?: string): string | undefined => {
    if (!name) return undefined;
    const target = normalizeName(name);
    const match = facades.find((f) => normalizeName(f.name) === target);
    return match?.id;
  };

  // New helper functions for creating buildings and facades
  const createBuildingIfNotExists = async (buildingName: string): Promise<string | null> => {
    if (!buildingName) return null;
    
    // First check if building already exists
    const existingBuildingId = findBuildingIdByName(buildingName);
    if (existingBuildingId) {
      return existingBuildingId;
    }

    // Create new building
    try {
      const buildingData = {
        name: buildingName,
        project_id: projectId,
        status: 0, // Default status
        description: `Building created during bulk import for ${projectName}`,
      };

      console.log('Creating new building:', buildingData);
      const newBuilding = await crudOperations.create("buildings", buildingData);
      
      // Add to local state
      setBuildings(prev => [...prev, { id: newBuilding.id, name: buildingName }]);
      
      console.log('Building created successfully:', newBuilding.id);
      return newBuilding.id;
    } catch (error) {
      console.error('Error creating building:', error);
      throw new Error(`Failed to create building "${buildingName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const createFacadeIfNotExists = async (facadeName: string, buildingId: string): Promise<string | null> => {
    if (!facadeName || !buildingId) return null;
    
    // First check if facade already exists in this building
    const existingFacadeId = findFacadeIdByName(facadeName);
    if (existingFacadeId) {
      // Verify it belongs to the correct building
      const facade = facades.find(f => f.id === existingFacadeId);
      if (facade && facade.building_id === buildingId) {
        return existingFacadeId;
      }
    }

    // Create new facade
    try {
      const facadeData = {
        name: facadeName,
        building_id: buildingId,
        status: 0, // Default status
        description: `Facade created during bulk import for building ${buildingId}`,
      };

      console.log('Creating new facade:', facadeData);
      const newFacade = await crudOperations.create("facades", facadeData);
      
      // Add to local state
      setFacades(prev => [...prev, { id: newFacade.id, name: facadeName, building_id: buildingId }]);
      
      console.log('Facade created successfully:', newFacade.id);
      return newFacade.id;
    } catch (error) {
      console.error('Error creating facade:', error);
      throw new Error(`Failed to create facade "${facadeName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const resolveBuildingAndFacadeIds = async (panel: ImportedPanel): Promise<{ building_id?: string, facade_id?: string }> => {
    let resolvedBuildingId = panel.building_id;
    let resolvedFacadeId = panel.facade_id;

    // If building name is provided but no building ID, try to find or create building
    if (panel.building_name && !resolvedBuildingId) {
      try {
        const buildingId = await createBuildingIfNotExists(panel.building_name);
        resolvedBuildingId = buildingId || undefined;
      } catch (error) {
        console.error('Error resolving building:', error);
        throw error;
      }
    }

    // If facade name is provided but no facade ID, try to find or create facade
    if (panel.facade_name && !resolvedFacadeId) {
      if (!resolvedBuildingId) {
        throw new Error(`Cannot create facade "${panel.facade_name}" without a building`);
      }
      
      try {
        const facadeId = await createFacadeIfNotExists(panel.facade_name, resolvedBuildingId);
        resolvedFacadeId = facadeId || undefined;
      } catch (error) {
        console.error('Error resolving facade:', error);
        throw error;
      }
    }

    return {
      building_id: resolvedBuildingId,
      facade_id: resolvedFacadeId,
    };
  };

  const formatDateToISO = (d: Date) => {
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseExcelDateToISO = (value: any): string | undefined => {
    if (!value) return undefined;
    if (value instanceof Date) return formatDateToISO(value);
    if (typeof value === "number") {
      try {
        const parsed = (XLSX as any).SSF?.parse_date_code?.(value);
        if (parsed && parsed.y && parsed.m && parsed.d) {
          return formatDateToISO(new Date(parsed.y, parsed.m - 1, parsed.d));
        }
      } catch (_) {
        // ignore parsing errors
      }
    }
    if (typeof value === "string") {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return formatDateToISO(d);
    }
    return undefined;
  };

  const handleFileUpload = async (selectedFile: File) => {
    if (!selectedFile) return;

    try {
      setBulkImportFile(selectedFile);
      setBulkImportErrors([]);
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      if (jsonData.length === 0) {
        setBulkImportErrors(["The Excel file appears to be empty or invalid."]);
        return;
      }

      const parsedPanels: ImportedPanel[] = jsonData.map((row: any, index: number) => {
        const buildingNameFromRow = row["Building Name"] || row["building_name"] || undefined;
        const facadeNameFromRow = row["Facade Name"] || row["facade_name"] || undefined;
        const resolvedBuildingId = row["Building ID"] || row["building_id"] || findBuildingIdByName(buildingNameFromRow);
        const resolvedFacadeId = row["Facade ID"] || row["facade_id"] || findFacadeIdByName(facadeNameFromRow);
        const issuedForProductionRaw = row["Issued for Production Date"] || row["issued_for_production_date"] || undefined;
        const issuedForProductionISO = parseExcelDateToISO(issuedForProductionRaw);
        const panel: ImportedPanel = {
          id: `import-${Date.now()}-${index}`,
          name: row["Panel Name"] || row["Name"] || row["panel_name"] || "",
          type: normalizeType(row["Type"] || row["Panel Type"] || row["type"] || "GRC"),
          status: normalizeStatus(row["Status"] || row["status"] || "Issued For Production"),
          project_id: projectId,
          project_name: projectName,
          building_id: resolvedBuildingId || undefined,
          building_name: buildingNameFromRow,
          facade_id: resolvedFacadeId || undefined,
          facade_name: facadeNameFromRow,
          issue_transmittal_no: row["Issue Transmittal No"] || row["IssueTransmittalNo"] || row["issue_transmittal_no"] || undefined,
          drawing_number: row["Drawing Number"] || row["DrawingNumber"] || row["drawing_number"] || undefined,
          unit_rate_qr_m2: parseFloat(row["Unit Rate QR/m2"] || row["unit_rate_qr_m2"] || "0") || undefined,
          ifp_qty_area_sm: parseFloat(row["IFP Qty Area SM"] || row["ifp_qty_area_sm"] || "0") || undefined,
          ifp_qty_nos: parseInt(row["IFP Qty Nos"] || row["ifp_qty_nos"] || "0") || undefined,
          weight: parseFloat(row["Weight"] || row["weight"] || "0") || undefined,
          dimension: row["Dimension"] || row["dimension"] || undefined,
          issued_for_production_date: issuedForProductionISO,
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
    if (isImportingPanels) return; // Prevent double submission
    
    const validPanels = importedPanels.filter((p) => p.isValid);
    if (validPanels.length === 0) {
      setBulkImportErrors(["No valid panels to import. Please fix the errors and try again."]);
      return;
    }

    setIsImportingPanels(true);

    try {
      setBulkImportStep("importing");
      setImportProgress(0);

      // Import panels with user tracking
      const importedPanels = [];
      let processedCount = 0;
      
      for (const panel of validPanels) {
        try {
          console.log('Processing panel:', panel.name);
          
          // Resolve building and facade IDs (create if they don't exist)
          const { building_id, facade_id } = await resolveBuildingAndFacadeIds(panel);
          
          const panelData = {
            name: panel.name,
            type: panel.type,
            status: panel.status,
            project_id: projectId,
            building_id: building_id || null,
            facade_id: facade_id || null,
            issue_transmittal_no: panel.issue_transmittal_no || null,
            drawing_number: panel.drawing_number || null,
            unit_rate_qr_m2: panel.unit_rate_qr_m2 || null,
            ifp_qty_area_sm: panel.ifp_qty_area_sm || null,
            ifp_qty_nos: panel.ifp_qty_nos || null,
            weight: panel.weight || null,
            dimension: panel.dimension || null,
            issued_for_production_date: panel.issued_for_production_date || null,
          };

          console.log('Importing panel with data:', panelData);
          const newPanel = await crudOperations.create("panels", panelData);
          // Database triggers will automatically add status history
          importedPanels.push(newPanel);
          
          // Update progress
          processedCount++;
          setImportProgress((processedCount / validPanels.length) * 100);
          
        } catch (error) {
          console.error("Error importing panel:", error);
          // Continue with other panels even if one fails
          processedCount++;
          setImportProgress((processedCount / validPanels.length) * 100);
        }
      }

      // Fetch complete data for imported panels
      const panelIds = importedPanels.map(p => p.id);
      if (panelIds.length > 0) {
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
        } else {
          setPanels([
            ...panels,
            ...(data?.map((panel) => ({
              ...panel,
              project_name: panel.projects?.name,
              building_name: panel.buildings?.name,
              facade_name: panel.facades?.name,
            })) || []),
          ]);
        }
      }

      setImportResults({ successful: importedPanels.length, failed: validPanels.length - importedPanels.length });
      setBulkImportStep("complete");
    } catch (error) {
      console.error("Bulk import error:", error);
      setBulkImportErrors(["Failed to import panels. Please try again."]);
    } finally {
      setImportProgress(100);
      setIsImportingPanels(false);
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
        "Weight": 25.5,
        "Dimension": "2.5m x 1.2m",
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

  if (isBulkImportMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Bulk Import Panels</h2>
            <span className="text-sm text-muted-foreground">for {projectName}</span>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setIsBulkImportMode(false);
              setBulkImportStep("upload");
              setBulkImportFile(null);
              setImportedPanels([]);
              setImportProgress(0);
              setImportResults({ successful: 0, failed: 0 });
              setBulkImportErrors([]);
              setBulkImportCurrentPage(1);
              setBulkImportSearchTerm("");
              setBulkImportStatusFilter("all");
              setBulkImportTypeFilter("all");
              setBulkImportValidityFilter("all");
            }}
            className="border-border text-foreground hover:bg-accent"
          >
            <X className="h-4 w-4 mr-2" />
            Back to Panels
          </Button>
        </div>

        {bulkImportStep === "upload" && (
          <div className="space-y-6">
            {bulkImportErrors.length > 0 && (
              <div className="bg-destructive/15 border border-destructive/20 text-destructive p-4 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium mb-2">Import Errors</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {bulkImportErrors.map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBulkImportErrors([])}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Excel File
                  </CardTitle>
                  <CardDescription>Upload panels data for {projectName}</CardDescription>
                    </div>
                                      <div>
                    <Button variant="outline" onClick={downloadTemplate} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                  </div>
                
                </CardHeader>
                <CardContent>
                  <div
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = Array.from(e.dataTransfer.files);
                      const excelFile = files.find((f) => f.name.endsWith(".xlsx") || f.name.endsWith(".xls"));
                      if (excelFile) handleFileUpload(excelFile);
                    }}
                  >
                    <Upload className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
                    <h4 className="text-xl font-medium mb-3">Drop your Excel file here</h4>
                    <p className="text-muted-foreground mb-4">or click to browse files</p>
                    <p className="text-sm text-muted-foreground">Supports .xlsx files with panel data</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                  />
                  <div className="space-y-3 mt-8">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Excel file must be in .xlsx format</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Required columns: Panel Name, Type</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Panels will be added to: {projectName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Panel types: GRC, GRG, GRP, EIFS, UHPC</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Panel statuses: Issued For Production, Produced, Inspected, Approved Material, Rejected Material, Issued, Proceed for Delivery, Delivered, Installed, Approved Final, Broken at Site, On Hold, Cancelled</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Buildings and facades will be created automatically if they don't exist</span>
                    </div>
                  </div>
                </CardContent>
              </Card>


          </div>
        )}

        {bulkImportStep === "preview" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Preview Import Data</h3>
                <p className="text-sm text-muted-foreground">Review and edit the imported panels before completing the import</p>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="secondary">{validPanelsCount} Valid</Badge>
                {invalidPanelsCount > 0 && <Badge variant="destructive">{invalidPanelsCount} Invalid</Badge>}
              </div>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Filters & Search</CardTitle>
                  {activeBulkImportFiltersCount > 0 && (
                    <Badge variant="secondary" className="h-5 w-5 p-0 text-xs">{activeBulkImportFiltersCount}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Search</Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search panels..."
                          value={bulkImportSearchTerm}
                          onChange={(e) => {
                            setBulkImportSearchTerm(e.target.value);
                            setBulkImportCurrentPage(1);
                          }}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={bulkImportStatusFilter}
                        onValueChange={(value) => {
                          setBulkImportStatusFilter(value);
                          setBulkImportCurrentPage(1);
                        }}
                      >
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
                      <Select
                        value={bulkImportTypeFilter}
                        onValueChange={(value) => {
                          setBulkImportTypeFilter(value);
                          setBulkImportCurrentPage(1);
                        }}
                      >
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
                      <Label>Validation</Label>
                      <Select
                        value={bulkImportValidityFilter}
                        onValueChange={(value) => {
                          setBulkImportValidityFilter(value);
                          setBulkImportCurrentPage(1);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All items" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All items</SelectItem>
                          <SelectItem value="valid">Valid only</SelectItem>
                          <SelectItem value="invalid">Invalid only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {bulkImportStartIndex + 1}-{Math.min(bulkImportEndIndex, filteredImportedPanels.length)} of {filteredImportedPanels.length} panels
                    </div>
                    <Button variant="outline" size="sm" onClick={clearBulkImportFilters}>
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead className="min-w-[200px]">Panel Name</TableHead>
                        <TableHead className="min-w-[120px]">Type</TableHead>
                        <TableHead className="min-w-[120px]">Status</TableHead>
                        <TableHead className="min-w-[120px]">Building</TableHead>
                        <TableHead className="min-w-[120px]">Facade</TableHead>
                        <TableHead className="min-w-[120px]">Issue/Trans No</TableHead>
                        <TableHead className="min-w-[120px]">Drawing No</TableHead>
                        <TableHead className="min-w-[100px]">Weight (kg)</TableHead>
                        <TableHead className="min-w-[150px]">Production Date</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedImportedPanels.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <Package className="h-8 w-8 text-muted-foreground" />
                              <p className="text-muted-foreground">No panels match your search criteria</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedImportedPanels.map((panel, index) => (
                          <TableRow key={panel.id} className={!panel.isValid ? "bg-destructive/5" : ""}>
                            <TableCell>
                              {panel.isValid ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <span title={panel.errors.join(", ")}>
                                  <AlertCircle className="h-4 w-4 text-destructive" />
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                value={panel.name}
                                onChange={(e) => updateImportedPanel(index, "name", e.target.value)}
                                className={panel.errors.some((e) => e.includes("name")) ? "border-destructive" : ""}
                                placeholder="Enter panel name"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={typeMap[panel.type]}
                                onValueChange={(value) => updateImportedPanel(index, "type", typeReverseMap[value])}
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
                            </TableCell>
                            <TableCell>
                              <Select
                                value={statusMap[panel.status]}
                                onValueChange={(value) => updateImportedPanel(index, "status", statusReverseMap[value])}
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
                            </TableCell>
                            <TableCell>
                              <Select
                                value={panel.building_id || ""}
                                onValueChange={(value) => updateImportedPanel(index, "building_id", value || undefined)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select building" />
                                </SelectTrigger>
                                <SelectContent>
                                  {buildings.map((building) => (
                                    <SelectItem key={building.id} value={building.id}>
                                      {building.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={panel.facade_id || ""}
                                onValueChange={(value) => updateImportedPanel(index, "facade_id", value || undefined)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select facade" />
                                </SelectTrigger>
                                <SelectContent>
                                  {facades.map((facade) => (
                                    <SelectItem key={facade.id} value={facade.id}>
                                      {facade.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={panel.issue_transmittal_no || ""}
                                onChange={(e) => updateImportedPanel(index, "issue_transmittal_no", e.target.value || undefined)}
                                placeholder="T-001"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={panel.drawing_number || ""}
                                onChange={(e) => updateImportedPanel(index, "drawing_number", e.target.value || undefined)}
                                placeholder="DWG-001"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                value={panel.weight || ""}
                                onChange={(e) => updateImportedPanel(index, "weight", e.target.value ? parseFloat(e.target.value) : undefined)}
                                placeholder="25.5"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="date"
                                value={panel.issued_for_production_date || ""}
                                onChange={(e) => updateImportedPanel(index, "issued_for_production_date", e.target.value || undefined)}
                                placeholder="2024-01-15"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeImportedPanel(index)}
                                className="p-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {bulkImportTotalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Page {bulkImportCurrentPage} of {bulkImportTotalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBulkImportCurrentPage(1)}
                        disabled={bulkImportCurrentPage === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBulkImportCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={bulkImportCurrentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">{bulkImportCurrentPage} of {bulkImportTotalPages}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBulkImportCurrentPage((prev) => Math.min(bulkImportTotalPages, prev + 1))}
                        disabled={bulkImportCurrentPage === bulkImportTotalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBulkImportCurrentPage(bulkImportTotalPages)}
                        disabled={bulkImportCurrentPage === bulkImportTotalPages}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {invalidPanelsCount > 0 && (
              <div className="bg-destructive/15 border border-destructive/20 text-destructive p-4 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">{invalidPanelsCount} panel(s) have validation errors. Please fix them before importing.</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setBulkImportStep("upload")}>
                Back to Upload
              </Button>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsBulkImportMode(false);
                    setBulkImportStep("upload");
                    setBulkImportFile(null);
                    setImportedPanels([]);
                    setImportProgress(0);
                    setImportResults({ successful: 0, failed: 0 });
                    setBulkImportErrors([]);
                  }}
                >
                  Cancel Import
                </Button>
                <Button onClick={handleImportPanels} disabled={validPanelsCount === 0 || isImportingPanels}>
                  {isImportingPanels ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Importing...
                    </>
                  ) : (
                    `Import ${validPanelsCount} Panel${validPanelsCount !== 1 ? "s" : ""}`
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {bulkImportStep === "importing" && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="space-y-6">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Package className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-medium">Importing Panels...</h3>
                  <p className="text-muted-foreground">Please wait while we process your data</p>
                </div>
                <div className="space-y-4 max-w-md mx-auto">
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="h-2 bg-primary rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }} />
                  </div>
                  <p className="text-sm text-muted-foreground">{Math.round(importProgress)}% complete</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {bulkImportStep === "complete" && (
          <Card>
            <CardContent className="p-12 pt-6 text-center">
              <div className="space-y-6">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-medium">Import Complete!</h3>
                  <p className="text-muted-foreground">{importResults.successful} panels have been imported successfully to {projectName}.</p>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    onClick={() => {
                      setBulkImportStep("upload");
                      setBulkImportFile(null);
                      setImportedPanels([]);
                      setImportProgress(0);
                      setImportResults({ successful: 0, failed: 0 });
                      setBulkImportErrors([]);
                    }}
                  >
                    Import More Panels
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsBulkImportMode(false);
                      setBulkImportStep("upload");
                      setBulkImportFile(null);
                      setImportedPanels([]);
                      setImportProgress(0);
                      setImportResults({ successful: 0, failed: 0 });
                      setBulkImportErrors([]);
                    }}
                  >
                    Back to Panels
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Panels</h2>
          <Badge variant="secondary" className="ml-2">{filteredPanels.length}</Badge>
          <span className="text-sm text-muted-foreground">in {projectName}</span>
        </div>
        <div className="flex items-center gap-2">
           {isSelectionMode && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsBulkStatusDialogOpen(true)}
                disabled={selectedPanels.size === 0}
              >
                <Edit className="h-4 w-4 mr-2" />
                Update Status ({selectedPanels.size})
              </Button>
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
         {isSelectionMode && <Button
            variant="outline"
            onClick={toggleSelectAll}
            disabled={paginatedPanels.length === 0}
          >
            {selectedPanels.size === paginatedPanels.length && paginatedPanels.length > 0 ? (
              <>
                <Square className="h-4 w-4 mr-2" />
                Deselect All
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4 mr-2" />
                Select All
              </>
            )}
          </Button>}
          <Button
            variant={isSelectionMode ? "default" : "outline"}
            onClick={toggleSelectionMode}
          >
            {isSelectionMode ? (
              <>
                <CheckSquare className="h-4 w-4 mr-2" />
                Exit Selection
              </>
            ) : (
              <>
                <Square className="h-4 w-4 mr-2" />
                Select Panels
              </>
            )}
          </Button>
          {!isSelectionMode&&
          <>
            <Button
              variant="outline"
              onClick={() => setIsBulkImportMode(true)}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground border-border"
            >
              <Upload className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>
            <Button onClick={() => setIsAddPanelDialogOpen(true)} disabled={!canCreatePanels}>
              <Plus className="h-4 w-4 mr-2" />
              Add Panel
            </Button>
          </>}
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
                  <SelectContent>
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
                  <SelectContent>
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
                    : "Get started by adding your first panel."}
                </p>
                {!searchTerm && statusFilter === "all" && typeFilter === "all" && buildingFilter === "all" && facadeFilter === "all" && (
                  <div className="flex items-center justify-center gap-2">
                    <Button onClick={() => setIsAddPanelDialogOpen(true)} disabled={!canCreatePanels}>
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
                              <div className="flex items-center">
                                <Hash className="mr-2 h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Weight:</span>
                                <span className="text-xs ml-2">{panel.weight ? `${panel.weight} kg` : "—"}</span>
                              </div>
                              <div className="flex items-center">
                                <Calendar className="mr-2 h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Production Date:</span>
                                <span className="text-xs ml-2">{panel.issued_for_production_date ? new Date(panel.issued_for_production_date).toLocaleDateString('en-GB') : "—"}</span>
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
            <DialogDescription>Create a new panel for {projectName}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <DateInput
              id="issued_for_production_date"
              label="Issued for Production Date"
              value={newPanelModel.issued_for_production_date}
              onChange={(value) => setNewPanelModel({ ...newPanelModel, issued_for_production_date: value || undefined })}
              placeholder="Select date"
            />
            <div className="space-y-2">
              <Label htmlFor="building_id">Building</Label>
              <Select
                value={newPanelModel.building_id || ""}
                onValueChange={(value) => {
                  setNewPanelModel({ 
                    ...newPanelModel, 
                    building_id: value || undefined,
                    facade_id: undefined // Clear facade when building changes
                  });
                  filterFacadesByBuilding(value || undefined);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select building" />
                </SelectTrigger>
                <SelectContent>
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
                <SelectContent>
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
                  status: 0,
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
                // Reset facades to show all
                setFacades(allFacades);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePanel} disabled={!canCreatePanels || isSavingPanel}>
              {isSavingPanel ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : (
                'Add Panel'
              )}
            </Button>
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
                onValueChange={(value) => {
                  setNewPanelModel({ 
                    ...newPanelModel, 
                    building_id: value || undefined,
                    facade_id: undefined // Clear facade when building changes
                  });
                  filterFacadesByBuilding(value || undefined);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select building" />
                </SelectTrigger>
                <SelectContent>
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
                <SelectContent>
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
            <DateInput
              id="edit-issued_for_production_date"
              label="Issued for Production Date"
              value={newPanelModel.issued_for_production_date}
              onChange={(value) => setNewPanelModel({ ...newPanelModel, issued_for_production_date: value || undefined })}
              placeholder="Select date"
            />
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
                  status: 0,
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
                // Reset facades to show all
                setFacades(allFacades);
              }}
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
                value={bulkStatusValue === null ? undefined : statusMap[bulkStatusValue]}
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
                setBulkStatusValue(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkStatusUpdate} disabled={bulkStatusValue === null || isBulkStatusUpdating}>
              {isBulkStatusUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                'Update Status'
              )}
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
              });
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleCreateGroup} disabled={isCreatingGroup}>
            {isCreatingGroup ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              'Create Group'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      {/* Add to Existing Group Dialog */}
      <Dialog open={isAddToGroupDialogOpen} onOpenChange={setIsAddToGroupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Existing Panel Group</DialogTitle>
            <DialogDescription>
              Add {selectedPanels.size} selected panels to an existing group
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-select">Select Group *</Label>
              <Select
                value={selectedGroupId}
                onValueChange={setSelectedGroupId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a panel group" />
                </SelectTrigger>
                <SelectContent>
                  {panelGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                      {group.description && ` - ${group.description}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted/25 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                This will add {selectedPanels.size} panels to the selected group. Individual panel statuses will be preserved.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddToGroupDialogOpen(false);
                setSelectedGroupId("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddToExistingGroup} disabled={isAddingToGroup || !selectedGroupId}>
              {isAddingToGroup ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : (
                'Add to Group'
              )}
            </Button>
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
  );
}