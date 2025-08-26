import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Edit, Trash2, FolderOpen, Users, ChevronUp, ChevronDown, Package, Plus, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { hasPermission, UserRole } from "../utils/rolePermissions";
import { useToastContext } from "../contexts/ToastContext";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  created_by: string;
}

interface PanelGroup {
  id: string;
  name: string;
  description: string;
  project_id: string;
  project_name: string;
  total_panels: number;
  total_area: number;
  total_amount: number;
  total_weight: number;
}

interface NoteWithPanelGroups extends Note {
  panel_groups: PanelGroup[];
}

// Separate component for panel group card
function PanelGroupCard({ panelGroup, navigate }: { panelGroup: PanelGroup; navigate: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [groupPanels, setGroupPanels] = useState<any[]>([]);
  const [loadingPanels, setLoadingPanels] = useState(false);

  // Load panels for this group when expanded
  useEffect(() => {
    if (isExpanded && groupPanels.length === 0) {
      loadGroupPanels(panelGroup.id);
    }
  }, [isExpanded, panelGroup.id]);

  const loadGroupPanels = async (groupId: string) => {
    setLoadingPanels(true);
    try {
      // Fetch panel memberships for this group
      const { data: membershipData, error: membershipError } = await supabase
        .from('panel_group_memberships')
        .select('panel_id')
        .eq('panel_group_id', groupId);

      if (membershipError) {
        console.error('Error fetching panel group memberships:', membershipError);
        return;
      }

      const panelIds = membershipData?.map(m => m.panel_id) || [];

      if (panelIds.length === 0) {
        setGroupPanels([]);
        return;
      }

      // Fetch panel details
      const { data: panelsData, error: panelsError } = await supabase
        .from('panels')
        .select(`
          id,
          name,
          status,
          drawing_number,
          ifp_qty_nos,
          issue_transmittal_no,
          unit_rate_qr_m2,
          ifp_qty_area_sm,
          weight
        `)
        .in('id', panelIds);

      if (panelsError) {
        console.error('Error fetching panels:', panelsError);
        return;
      }

      const formattedPanels = panelsData?.map(panel => ({
        id: panel.id,
        name: panel.name,
        status: mapPanelStatus(panel.status),
        panelTag: panel.issue_transmittal_no || `TAG-${panel.id.slice(0, 8)}`,
        dwgNo: panel.drawing_number || 'N/A',
        unitQty: panel.ifp_qty_nos || 0,
        unitRateQrM2: panel.unit_rate_qr_m2 || 0,
        ifpQtyAreaSm: panel.ifp_qty_area_sm || 0,
        weight: panel.weight || 0,
      })) || [];

      setGroupPanels(formattedPanels);
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoadingPanels(false);
    }
  };

  const mapPanelStatus = (status: number): string => {
    const statusMap: { [key: number]: string } = {
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
  };

  return (
    <Card key={panelGroup.id} className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <div>
              <CardTitle className="text-lg">{panelGroup.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {panelGroup.description}
              </p>
            </div>
          </div>


        </div>

        {/* Group Summary */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            <span>{panelGroup.total_panels || 0} panels</span>
          </div>
          <div className="flex items-center gap-1">
            <FolderOpen className="h-4 w-4" />
            <span>{panelGroup.project_name}</span>
          </div>
        </div>
        
        {/* Group Totals */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <span>Total Area: {panelGroup.total_area.toFixed(2)} m²</span>
          </div>
          <div className="flex items-center gap-1">
            <span>Total Amount: {panelGroup.total_amount.toFixed(2)} QR</span>
          </div>
          <div className="flex items-center gap-1">
            <span>Total Weight: {panelGroup.total_weight.toFixed(2)} kg</span>
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

            {loadingPanels ? (
              <div className="flex items-center justify-center py-4">
                <div className="text-muted-foreground">Loading panels...</div>
              </div>
            ) : groupPanels.length === 0 ? (
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
}

export function NoteDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const { user: currentUser } = useAuth();
  
  const [note, setNote] = useState<NoteWithPanelGroups | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("panel-groups");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '' });
  const [availablePanelGroups, setAvailablePanelGroups] = useState<Array<{id: string, name: string, project_name: string}>>([]);
  const [selectedPanelGroups, setSelectedPanelGroups] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const canEditNotes = currentUser?.role ? hasPermission(currentUser.role as UserRole, 'notes', 'canUpdate') : false;
  const canDeleteNotes = currentUser?.role ? hasPermission(currentUser.role as UserRole, 'notes', 'canDelete') : false;

  useEffect(() => {
    if (id) {
      loadNoteDetails(id);
    }
  }, [id]);

  const loadNoteDetails = async (noteId: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`Loading note details for ID: ${noteId}`);

      // Fetch note details
      const { data: noteData, error: noteError } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (noteError) {
        throw noteError;
      }

      if (noteData) {
        // Fetch panel groups for this note
        const { data: notePanelGroupsData, error: notePanelGroupsError } = await supabase
          .from('note_panel_groups')
          .select('panel_group_id')
          .eq('note_id', noteId);

        if (notePanelGroupsError) {
          throw notePanelGroupsError;
        }

        if (!notePanelGroupsData || notePanelGroupsData.length === 0) {
          setNote({
            ...noteData,
            panel_groups: []
          });
          setLoading(false);
          return;
        }

        // Get panel group details
        const panelGroupIds = notePanelGroupsData.map(item => item.panel_group_id);
        const { data: panelGroupsData, error: panelGroupsError } = await supabase
          .from('panel_groups')
          .select('id, name, description, project_id')
          .in('id', panelGroupIds);

        if (panelGroupsError) {
          throw panelGroupsError;
        }

        // Get project names
        const projectIds = panelGroupsData?.map(item => item.project_id).filter(Boolean) || [];
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds);

        if (projectsError) {
          throw projectsError;
        }

        const projectsMap = new Map(projectsData?.map(p => [p.id, p.name]) || []);

        // Calculate totals for each panel group using many-to-many relationship
        const panelGroupsWithTotals = await Promise.all(
          (panelGroupsData || []).map(async (panelGroup) => {
            // First get panel memberships for this group
            const { data: membershipData, error: membershipError } = await supabase
              .from('panel_group_memberships')
              .select('panel_id')
              .eq('panel_group_id', panelGroup.id);

            if (membershipError) {
              console.error('Error fetching panel group memberships:', panelGroup.id, membershipError);
              return {
                ...panelGroup,
                project_name: projectsMap.get(panelGroup.project_id) || 'Unknown Project',
                total_panels: 0,
                total_area: 0,
                total_amount: 0,
                total_weight: 0
              };
            }

            const panelIds = membershipData?.map(m => m.panel_id) || [];

            if (panelIds.length === 0) {
              return {
                ...panelGroup,
                project_name: projectsMap.get(panelGroup.project_id) || 'Unknown Project',
                total_panels: 0,
                total_area: 0,
                total_amount: 0,
                total_weight: 0
              };
            }

            // Then get panel details
            const { data: panelsData, error: panelsError } = await supabase
              .from('panels')
              .select('ifp_qty_area_sm, unit_rate_qr_m2, weight')
              .in('id', panelIds);

            if (panelsError) {
              console.error('Error fetching panels for panel group:', panelGroup.id, panelsError);
              return {
                ...panelGroup,
                project_name: projectsMap.get(panelGroup.project_id) || 'Unknown Project',
                total_panels: 0,
                total_area: 0,
                total_amount: 0,
                total_weight: 0
              };
            }

            const total_panels = panelsData?.length || 0;
            const total_area = panelsData?.reduce((sum, panel) => sum + (panel.ifp_qty_area_sm || 0), 0) || 0;
            const total_amount = panelsData?.reduce((sum, panel) => {
              const area = panel.ifp_qty_area_sm || 0;
              const rate = panel.unit_rate_qr_m2 || 0;
              return sum + (area * rate);
            }, 0) || 0;
            const total_weight = panelsData?.reduce((sum, panel) => sum + (panel.weight || 0), 0) || 0;

            return {
              ...panelGroup,
              project_name: projectsMap.get(panelGroup.project_id) || 'Unknown Project',
              total_panels,
              total_area,
              total_amount,
              total_weight
            };
          })
        );

        setNote({
          ...noteData,
          panel_groups: panelGroupsWithTotals
        });
        console.log("Note details loaded successfully:", noteData.title);
      } else {
        setError("Note not found");
      }
    } catch (err) {
      console.error("Error loading note details:", err);
      setError("Failed to load note details");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!note) return;

    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', note.id);

      if (error) throw error;

      showToast('Note deleted successfully', 'success');
      navigate('/notes');
    } catch (error) {
      console.error('Error deleting note:', error);
      showToast('Error deleting note', 'error');
    }
  };

  const openEditDialog = () => {
    if (!note) return;
    
    setEditForm({
      title: note.title,
      content: note.content || ''
    });
    setSelectedPanelGroups(note.panel_groups.map(pg => pg.id));
    loadAvailablePanelGroups();
    setIsEditDialogOpen(true);
  };

  const loadAvailablePanelGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('panel_groups')
        .select(`
          id,
          name,
          project_id
        `)
        .order('name');

      if (error) throw error;

      // Get project names
      const projectIds = Array.from(new Set(data.map(item => item.project_id).filter(Boolean)));
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);

      if (projectsError) throw projectsError;

      const projectsMap = new Map(projectsData?.map(p => [p.id, p.name]) || []);

      const formattedData = data.map(item => ({
        id: item.id,
        name: item.name,
        project_name: projectsMap.get(item.project_id) || 'Unknown Project'
      }));

      setAvailablePanelGroups(formattedData);
    } catch (error) {
      console.error('Error fetching panel groups:', error);
      showToast('Error fetching panel groups', 'error');
    }
  };

  const handleUpdateNote = async () => {
    if (!note || !editForm.title.trim()) {
      showToast('Note title is required', 'error');
      return;
    }

    setIsUpdating(true);
    try {
      // Update the note
      const { error: noteError } = await supabase
        .from('notes')
        .update({
          title: editForm.title.trim(),
          content: editForm.content.trim()
        })
        .eq('id', note.id);

      if (noteError) throw noteError;

      // Remove all existing panel groups and add the new selection
      const { error: removeError } = await supabase
        .from('note_panel_groups')
        .delete()
        .eq('note_id', note.id);

      if (removeError) throw removeError;

      // Add new panel groups if any are selected
      if (selectedPanelGroups.length > 0) {
        const notePanelGroups = selectedPanelGroups.map(panelGroupId => ({
          note_id: note.id,
          panel_group_id: panelGroupId
        }));

        const { error: addGroupsError } = await supabase
          .from('note_panel_groups')
          .insert(notePanelGroups);

        if (addGroupsError) throw addGroupsError;
      }

      showToast('Note updated successfully', 'success');
      setIsEditDialogOpen(false);
      loadNoteDetails(note.id); // Reload the note data
    } catch (error) {
      console.error('Error updating note:', error);
      showToast('Error updating note', 'error');
    } finally {
      setIsUpdating(false);
    }
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
          <p className="text-muted-foreground">Loading note details...</p>
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Note not found</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => navigate("/notes")}>
            Back to Notes
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
          onClick={() => navigate('/notes')}
          className="hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Notes
        </Button>
      </div>

      {/* Note Overview */}
      <Card className="qatar-card">
        <CardHeader className="qatar-card-header">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="qatar-card-title text-2xl">
                  {note.title}
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {note.panel_groups.length} panel groups
                </Badge>
              </div>
              <p className="qatar-card-subtitle">
                NT-{note.id.slice(-4).toUpperCase()}
              </p>
            </div>
            <div className="flex gap-2">
              {canEditNotes && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openEditDialog}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
              {canDeleteNotes && (
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
                <h4 className="font-medium mb-2">Content</h4>
                <p className="text-muted-foreground">
                  {note.content || "No content provided"}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Created</h4>
                <p className="text-muted-foreground">
                  {formatDate(note.created_at)}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Created By</h4>
                <p className="text-muted-foreground">
                  {note.created_by || "Unknown user"}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Note ID</h4>
                <p className="text-muted-foreground font-mono text-sm">
                  {note.id}
                </p>
              </div>
            </div>
          </div>

          {/* Note Totals */}
          {note.panel_groups.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-medium mb-4">Note Totals</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Total Panel Groups</span>
                  </div>
                  <p className="text-2xl font-bold">{note.panel_groups.length}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Total Panels</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {note.panel_groups.reduce((sum, group) => sum + group.total_panels, 0)}
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Total Area</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {note.panel_groups.reduce((sum, group) => sum + group.total_area, 0).toFixed(2)} m²
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Total Amount</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {note.panel_groups.reduce((sum, group) => sum + group.total_amount, 0).toFixed(2)} QR
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabbed Sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="panel-groups">Panel Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="panel-groups" className="space-y-6">
          {note.panel_groups.length > 0 ? (
            <div className="space-y-4">
              {note.panel_groups.map((panelGroup) => (
                <PanelGroupCard 
                  key={panelGroup.id} 
                  panelGroup={panelGroup} 
                  navigate={navigate} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No panel groups</h3>
              <p className="text-muted-foreground mb-4">
                This note doesn't have any panel groups associated with it.
              </p>
              <Button onClick={() => navigate('/notes')}>
                Back to Notes
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
            <DialogDescription>
              Update the note and its associated panel groups.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Enter note title"
              />
            </div>
            <div>
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                placeholder="Enter note content"
                rows={4}
              />
            </div>
            <div>
              <Label>Panel Groups</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !selectedPanelGroups.includes(value)) {
                    setSelectedPanelGroups([...selectedPanelGroups, value]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select panel groups to add" />
                </SelectTrigger>
                <SelectContent>
                  {availablePanelGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name} - {group.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPanelGroups.length > 0 && (
                <div className="mt-2 space-y-2">
                  <Label>Selected Panel Groups:</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedPanelGroups.map((groupId) => {
                      const group = availablePanelGroups.find(g => g.id === groupId);
                      return (
                        <Badge
                          key={groupId}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => setSelectedPanelGroups(selectedPanelGroups.filter(id => id !== groupId))}
                        >
                          {group?.name} - {group?.project_name}
                          <X className="ml-1 h-3 w-3" />
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateNote} disabled={isUpdating}>
                {isUpdating ? "Updating..." : "Update Note"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
