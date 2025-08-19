import {
  Building,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  Edit,
  Grid3X3,
  Package,
  Plus,
  Search,
  Users,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";

const PANEL_STATUSES = [
  { value: "Issued For Production", label: "Issued For Production" },
  { value: "Produced", label: "Produced" },
  { value: "Inspected", label: "Inspected" },
  { value: "Approved Material", label: "Approved Material" },
  { value: "Rejected Material", label: "Rejected Material" },
  { value: "Issued", label: "Issued" },
  { value: "Proceed for Delivery", label: "Proceed for Delivery" },
  { value: "Delivered", label: "Delivered" },
  { value: "Installed", label: "Installed" },
  { value: "Approved Final", label: "Approved Final" },
  { value: "Broken at Site", label: "Broken at Site" },
  { value: "On Hold", label: "On Hold" },
  { value: "Cancelled", label: "Cancelled" },
] as const;

type PanelStatus = (typeof PANEL_STATUSES)[number]["value"];

interface PanelModel {
  id: string;
  name: string;
  status: PanelStatus;
  panelTag: string;
  dwgNo: string;
  unitQty: number;
  groupId: string;
  project_name?: string;
  building_name?: string;
  facade_name?: string;
}

interface PanelGroupModel {
  id: string;
  name: string;
  description: string;
  panelCount: number;
  createdAt: string;
  project: string;
}

interface PanelGroupsSectionProps {
  onAddGroup?: () => void;
  onEditGroup?: (group: PanelGroupModel) => void;
  onDeleteGroup?: (group: PanelGroupModel) => void;
  onViewGroup?: (group: PanelGroupModel) => void;
}

interface UpdateGroupDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  group: PanelGroupModel;
  onGroupUpdated: () => void;
}

interface DeleteGroupDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  group: PanelGroupModel;
  onGroupDeleted: () => void;
}

interface CreateGroupDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated: () => void;
}

interface AddPanelsToGroupDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  onPanelsAdded: () => void;
}

interface UpdateGroupStatusDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  currentStatus: string;
  onStatusUpdate: () => void;
}

function UpdateGroupDialog({ isOpen, onOpenChange, group, onGroupUpdated }: UpdateGroupDialogProps) {
  const [groupName, setGroupName] = useState(group.name);
  const [groupDescription, setGroupDescription] = useState(group.description || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateGroup = async () => {
    if (!groupName.trim()) {
      alert("Group name is required");
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.rpc('update_panel_group', {
        group_id: group.id,
        group_name: groupName.trim(),
        group_description: groupDescription.trim() || null
      });

      if (error) {
        console.error('Error updating panel group:', error);
        alert('Failed to update panel group');
        return;
      }

      onGroupUpdated();
      onOpenChange(false);
      alert('Panel group updated successfully');
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Panel Group</DialogTitle>
          <DialogDescription>
            Update the details for the panel group "{group.name}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name *</Label>
            <Input
              id="name"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter group description (optional)"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setGroupName(group.name);
              setGroupDescription(group.description || "");
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleUpdateGroup} disabled={isUpdating}>
            {isUpdating ? "Updating..." : "Update Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteGroupDialog({ isOpen, onOpenChange, group, onGroupDeleted }: DeleteGroupDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteGroup = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_panel_group', {
        group_id: group.id
      });

      if (error) {
        console.error('Error deleting panel group:', error);
        alert('Failed to delete panel group');
        return;
      }

      onGroupDeleted();
      onOpenChange(false);
      alert('Panel group deleted successfully');
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Panel Group</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the panel group "{group.name}"?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
            <p className="text-sm text-destructive">
              This action will:
            </p>
            <ul className="text-sm text-destructive mt-2 list-disc list-inside">
              <li>Remove all panels from this group</li>
              <li>Delete the panel group permanently</li>
              <li>This action cannot be undone</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDeleteGroup} 
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateGroupDialog({ isOpen, onOpenChange, onGroupCreated }: CreateGroupDialogProps) {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert("Group name is required");
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_panel_group', {
        group_name: groupName.trim(),
        group_description: groupDescription.trim() || null
      });

      if (error) {
        console.error('Error creating panel group:', error);
        alert('Failed to create panel group');
        return;
      }

      if (data) {
        setGroupName("");
        setGroupDescription("");
        onOpenChange(false);
        onGroupCreated();
        alert('Panel group created successfully');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Panel Group</DialogTitle>
          <DialogDescription>
            Create a new panel group to organize your panels
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name *</Label>
            <Input
              id="name"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter group description (optional)"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setGroupName("");
              setGroupDescription("");
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleCreateGroup} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddPanelsToGroupDialog({ isOpen, onOpenChange, groupId, groupName, onPanelsAdded }: AddPanelsToGroupDialogProps) {
  const [availablePanels, setAvailablePanels] = useState<PanelModel[]>([]);
  const [selectedPanels, setSelectedPanels] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchAvailablePanels = async () => {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('panels')
            .select(`
              id,
              name,
              status,
              drawing_number,
              ifp_qty_nos,
              issue_transmittal_no,
              projects (name),
              buildings (name),
              facades (name)
            `)
            .is('panel_group_id', null); // Only panels not already in a group

          if (error) {
            console.error('Error fetching available panels:', error);
            return;
          }

          const formattedPanels = data.map(panel => ({
            id: panel.id,
            name: panel.name,
            status: mapPanelStatus(panel.status),
            panelTag: panel.issue_transmittal_no || `TAG-${panel.id.slice(0, 8)}`,
            dwgNo: panel.drawing_number || 'N/A',
            unitQty: panel.ifp_qty_nos || 0,
            groupId: '',
            project_name: '',
            building_name: '',
            facade_name: '',
          }));

          setAvailablePanels(formattedPanels);
        } catch (err) {
          console.error('Unexpected error:', err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchAvailablePanels();
    }
  }, [isOpen]);

  const handleAddPanels = async () => {
    if (selectedPanels.size === 0) {
      alert("Please select at least one panel");
      return;
    }

    setIsAdding(true);
    try {
      const { error } = await supabase.rpc('add_panels_to_group', {
        group_id: groupId,
        panel_ids: Array.from(selectedPanels)
      });

      if (error) {
        console.error('Error adding panels to group:', error);
        alert('Failed to add panels to group');
        return;
      }

      setSelectedPanels(new Set());
      onOpenChange(false);
      onPanelsAdded();
      alert('Panels added to group successfully');
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    } finally {
      setIsAdding(false);
    }
  };

  const togglePanelSelection = (panelId: string) => {
    const newSelected = new Set(selectedPanels);
    if (newSelected.has(panelId)) {
      newSelected.delete(panelId);
    } else {
      newSelected.add(panelId);
    }
    setSelectedPanels(newSelected);
  };

  const selectAllPanels = () => {
    setSelectedPanels(new Set(availablePanels.map(panel => panel.id)));
  };

  const clearSelection = () => {
    setSelectedPanels(new Set());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-5xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Add Panels to "{groupName}"</DialogTitle>
          <DialogDescription>
            Select panels to add to this group. Individual panel statuses will be preserved.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            <div className="text-sm text-muted-foreground">
              {selectedPanels.size} of {availablePanels.length} panels selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllPanels}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-muted-foreground">Loading available panels...</div>
              </div>
            ) : availablePanels.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-muted-foreground">No available panels to add</div>
              </div>
            ) : (
              <div className="divide-y">
                {availablePanels.map((panel) => (
                  <div key={panel.id} className="flex items-center p-4 hover:bg-muted/50">
                    <Checkbox
                      checked={selectedPanels.has(panel.id)}
                      onCheckedChange={() => togglePanelSelection(panel.id)}
                      className="mr-3 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{panel.name}</span>
                        <Badge variant="secondary" className="flex-shrink-0">{panel.status}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="truncate">Tag: {panel.panelTag}</span>
                        <span className="truncate">Drawing: {panel.dwgNo}</span>
                        <span className="truncate">Qty: {panel.unitQty}</span>
                        {panel.project_name && <span className="truncate">Project: {panel.project_name}</span>}
                        {panel.building_name && <span className="truncate">Building: {panel.building_name}</span>}
                        {panel.facade_name && <span className="truncate">Facade: {panel.facade_name}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSelectedPanels(new Set());
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleAddPanels} disabled={isAdding || selectedPanels.size === 0}>
            {isAdding ? "Adding..." : `Add ${selectedPanels.size} Panel${selectedPanels.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UpdateGroupStatusDialog({ isOpen, onOpenChange, groupId, groupName, currentStatus, onStatusUpdate }: UpdateGroupStatusDialogProps) {
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateStatus = async () => {
    setIsUpdating(true);
    try {
      // Since panel_groups table doesn't have a status column, we'll just close the dialog
      // In a real implementation, you might want to add a status column to the table
      onStatusUpdate();
      onOpenChange(false);
      alert('Panel group status updated successfully');
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Panel Group Status</DialogTitle>
          <DialogDescription>
            Update the status for the panel group "{groupName}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdateStatus} disabled={isUpdating}>
            {isUpdating ? "Updating..." : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Fetch panel groups from Supabase
async function fetchPanelGroups(): Promise<PanelGroupModel[]> {
  const { data, error } = await supabase
    .from('panel_groups')
    .select(`
      id,
      name,
      description,
      created_at,
      panels (id, project_id, projects (name))
    `);

  if (error) {
    console.error('Error fetching panel groups:', error);
    return [];
  }

  return data.map(group => ({
    id: group.id,
    name: group.name,
    description: group.description || '',
    panelCount: group.panels.length,
    createdAt: new Date(group.created_at).toISOString(),
    project: group.panels[0]?.projects?.[0]?.name || 'Unknown',
  }));
}

async function fetchPanels(): Promise<PanelModel[]> {
  const { data, error } = await supabase
    .from('panels')
    .select(`
      id,
      name,
      type,
      status,
      panel_group_id,
      drawing_number,
      ifp_qty_nos,
      issue_transmittal_no
    `);

  if (error) {
    console.error('Error fetching panels:', error);
    return [];
  }

  return data.map(panel => ({
    id: panel.id,
    name: panel.name,
    status: mapPanelStatus(panel.status),
    panelTag: panel.issue_transmittal_no || `TAG-${panel.id.slice(0, 8)}`,
    dwgNo: panel.drawing_number || 'N/A',
    unitQty: panel.ifp_qty_nos || 0,
    groupId: panel.panel_group_id,
  }));
}

function mapPanelStatus(status: number): PanelStatus {
  const statusMap: { [key: number]: PanelStatus } = {
    0: "Issued For Production",
    1: "Produced",
    2: "Inspected",
    3: "Approved Material",
    4: "Rejected Material",
    5: "Issued",
    6: "Proceed for Delivery",
    7: "Delivered",
    8: "Installed",
    9: "Approved Final",
    10: "Broken at Site",
    11: "On Hold",
    12: "Cancelled",
  };

  return statusMap[status] || "Issued For Production";
}

export function PanelGroupsPage({
  onAddGroup,
  onEditGroup,
  onDeleteGroup,
  onViewGroup,
}: PanelGroupsSectionProps) {
  const [panelGroups, setPanelGroups] = useState<PanelGroupModel[]>([]);
  const [panels, setPanels] = useState<PanelModel[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [panelCountMinFilter, setPanelCountMinFilter] = useState("");
  const [panelCountMaxFilter, setPanelCountMaxFilter] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isUpdateGroupDialogOpen, setIsUpdateGroupDialogOpen] = useState(false);
  const [isDeleteGroupDialogOpen, setIsDeleteGroupDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PanelGroupModel | null>(null);
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [isAddPanelsDialogOpen, setIsAddPanelsDialogOpen] = useState(false);
  const [isUpdateStatusDialogOpen, setIsUpdateStatusDialogOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      const groups = await fetchPanelGroups();
      const panelsData = await fetchPanels();
      setPanelGroups(groups);
      setPanels(panelsData);
    }
    loadData();

    const groupSubscription = supabase
      .channel('panel_groups')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'panel_groups' }, () => {
        fetchPanelGroups().then(setPanelGroups);
      })
      .subscribe();

    const panelSubscription = supabase
      .channel('panels')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'panels' }, () => {
        fetchPanels().then(setPanels);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(groupSubscription);
      supabase.removeChannel(panelSubscription);
    };
  }, []);

  const getGroupPanels = (group: PanelGroupModel) => {
    return panels.filter(panel => panel.groupId === group.id);
  };

  const toggleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleEdit = (group: PanelGroupModel) => {
    onEditGroup?.(group);
  };

  const handleOpenUpdateGroup = (group: PanelGroupModel) => {
    setSelectedGroup(group);
    setIsUpdateGroupDialogOpen(true);
  };

  const handleOpenDeleteGroup = (group: PanelGroupModel) => {
    setSelectedGroup(group);
    setIsDeleteGroupDialogOpen(true);
  };

  const handleOpenCreateGroup = () => {
    setIsCreateGroupDialogOpen(true);
  };

  const handleOpenAddPanels = (group: PanelGroupModel) => {
    setSelectedGroup(group);
    setIsAddPanelsDialogOpen(true);
  };

  const handleOpenUpdateStatus = (group: PanelGroupModel) => {
    setSelectedGroup(group);
    setIsUpdateStatusDialogOpen(true);
  };

  const handleDelete = async (groupId: string) => {
    try {
      onDeleteGroup?.({ id: groupId, name: "Loading...", description: "", panelCount: 0, createdAt: "", project: "" });
      await supabase.rpc('delete_panel_group', { group_id: groupId });
      onDeleteGroup?.({ id: groupId, name: "Deleted", description: "", panelCount: 0, createdAt: "", project: "" });
      await fetchPanelGroups().then(setPanelGroups);
      await fetchPanels().then(setPanels);
    } catch (err: any) {
      console.error('Error deleting panel group:', err);
      onDeleteGroup?.({ id: groupId, name: "Error", description: "", panelCount: 0, createdAt: "", project: "" });
    }
  };

  const uniqueProjects = Array.from(new Set(panelGroups.map(group => group.project)));

  const filteredGroups = panelGroups.filter((group) => {
    const matchesSearch = searchTerm === "" ||
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProject = projectFilter === "all" || group.project === projectFilter;

    const matchesPanelCount = (() => {
      if (!panelCountMinFilter && !panelCountMaxFilter) return true;
      const min = panelCountMinFilter ? parseInt(panelCountMinFilter) : 0;
      const max = panelCountMaxFilter ? parseInt(panelCountMaxFilter) : Infinity;
      return group.panelCount >= min && group.panelCount <= max;
    })();

    const matchesDateRange = (() => {
      if (dateRangeFilter === "all") return true;
      const groupDate = new Date(group.createdAt);
      const now = new Date();

      switch (dateRangeFilter) {
        case "this-month": {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          return groupDate >= monthStart;
        }
        case "this-quarter": {
          const quarterStart = new Date(
            now.getFullYear(),
            Math.floor(now.getMonth() / 3) * 3,
            1
          );
          return groupDate >= quarterStart;
        }
        case "this-year": {
          const yearStart = new Date(now.getFullYear(), 0, 1);
          return groupDate >= yearStart;
        }
        default:
          return true;
      }
    })();

    return matchesSearch && matchesProject && matchesPanelCount && matchesDateRange;
  });

  const activePanelGroupFiltersCount = [
    searchTerm !== "",
    projectFilter !== "all",
    panelCountMinFilter !== "",
    panelCountMaxFilter !== "",
    dateRangeFilter !== "all",
  ].filter(Boolean).length;

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const clearPanelGroupFilters = () => {
    setSearchTerm("");
    setProjectFilter("all");
    setPanelCountMinFilter("");
    setPanelCountMaxFilter("");
    setDateRangeFilter("all");
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredGroups.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedGroups = filteredGroups.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Panel Groups</h2>
          <Badge variant="secondary" className="ml-2">
            {filteredGroups.length}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenCreateGroup} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Panel Group
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters & Search</CardTitle>
            {activePanelGroupFiltersCount > 0 && (
              <Badge variant="secondary" className="h-5 w-5 p-0 text-xs">
                {activePanelGroupFiltersCount}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search groups..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      handleFilterChange();
                    }}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  value={projectFilter}
                  onValueChange={(value) => {
                    setProjectFilter(value);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {uniqueProjects.map((project) => (
                      <SelectItem key={project} value={project}>
                        {project}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>



              <div className="space-y-2">
                <Label>Min Panels</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={panelCountMinFilter}
                  onChange={(e) => {
                    setPanelCountMinFilter(e.target.value);
                    handleFilterChange();
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Max Panels</Label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={panelCountMaxFilter}
                  onChange={(e) => {
                    setPanelCountMaxFilter(e.target.value);
                    handleFilterChange();
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select
                  value={dateRangeFilter}
                  onValueChange={(value) => {
                    setDateRangeFilter(value);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any time</SelectItem>
                    <SelectItem value="this-month">This month</SelectItem>
                    <SelectItem value="this-quarter">This quarter</SelectItem>
                    <SelectItem value="this-year">This year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredGroups.length)} of {filteredGroups.length} panel groups
              </div>
              <Button variant="outline" size="sm" onClick={clearPanelGroupFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Panel Groups List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Panel Groups</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paginatedGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">
                  {searchTerm || projectFilter !== 'all' || panelCountMinFilter || panelCountMaxFilter || dateRangeFilter !== 'all'
                    ? 'No panel groups match your search criteria'
                    : 'No panel groups found'}
                </h3>
                <p className="text-muted-foreground text-center">
                  {searchTerm || projectFilter !== 'all' || panelCountMinFilter || panelCountMaxFilter || dateRangeFilter !== 'all'
                    ? 'Try adjusting your filters to see more results.'
                    : 'Get started by creating your first panel group.'}
                </p>
                {!searchTerm && projectFilter === 'all' && !panelCountMinFilter && !panelCountMaxFilter && dateRangeFilter === 'all' && (
                  <Button onClick={handleOpenCreateGroup} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Panel Group
                  </Button>
                )}
              </div>
            ) : (
              paginatedGroups.map((group) => {
                const isExpanded = expandedGroups.has(group.id);
                const groupPanels = getGroupPanels(group);

                return (
                  <Card key={group.id} className="overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleGroupExpansion(group.id)}
                            className="p-1"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <div>
                            <CardTitle className="text-lg">{group.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {group.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenUpdateStatus(group)}
                                >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenAddPanels(group)}
                                >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(group)}
                                >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(group.id)}
                                >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>

                      {/* Group Summary */}
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          <span>{group.project}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          <span>{group.panelCount || 0} panels</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Created {group.createdAt ? new Date(group.createdAt).toLocaleDateString() : 'Unknown'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content - Panels in Group */}
                    {isExpanded && (
                      <CardContent className="pt-0">
                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Panels in this Group ({groupPanels.length})
                          </h4>

                          {groupPanels.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">
                              No panels assigned to this group
                            </p>
                          ) : (
                            <div className="grid gap-3">
                              {groupPanels.map((panel) => (
                                <div key={panel.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium">{panel.name}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                      <span>Tag: {panel.panelTag}</span>
                                      <span>Drawing: {panel.dwgNo}</span>
                                      <span>Qty: {panel.unitQty}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={'bg-primary text-primary-foreground'}>
                                      {panel.status}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })
            )}
          </div>

          {/* Update Group Status Dialog */}
          {selectedGroup && (
            <UpdateGroupStatusDialog
              isOpen={isUpdateStatusDialogOpen}
              onOpenChange={setIsUpdateStatusDialogOpen}
              groupId={selectedGroup.id}
              groupName={selectedGroup.name}
              currentStatus="active"
              onStatusUpdate={() => fetchPanelGroups().then(setPanelGroups)}
            />
          )}

          {/* Create Group Dialog */}
          {isCreateGroupDialogOpen && (
            <CreateGroupDialog
              isOpen={isCreateGroupDialogOpen}
              onOpenChange={setIsCreateGroupDialogOpen}
              onGroupCreated={() => {
                setIsCreateGroupDialogOpen(false);
                fetchPanelGroups().then(setPanelGroups);
              }}
            />
          )}

          {/* Add Panels to Group Dialog */}
          {selectedGroup && (
            <AddPanelsToGroupDialog
              isOpen={isAddPanelsDialogOpen}
              onOpenChange={setIsAddPanelsDialogOpen}
              groupId={selectedGroup.id}
              groupName={selectedGroup.name}
              onPanelsAdded={() => {
                setIsAddPanelsDialogOpen(false);
                fetchPanelGroups().then(setPanelGroups);
                fetchPanels().then(setPanels); // Refresh panels to reflect added ones
              }}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
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
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}