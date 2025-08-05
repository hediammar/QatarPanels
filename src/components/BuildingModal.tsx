import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Plus } from "lucide-react";
import { Textarea } from './ui/textarea';
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useToastContext } from "../contexts/ToastContext";

interface Project {
  id: string;
  name: string;
  customer?: string;
}

interface ProjectData {
  id: string;
  name: string;
  customers: {
    name: string;
  } | null;
}

interface BuildingData {
  id: string;
  name: string;
  project_id: string;
  address: string;
  status: number;
  created_at: string;
  description?: string;
}

interface BuildingModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingBuilding?: BuildingData | null;
  onSubmit: (buildingData: Omit<BuildingData, "id" | "created_at">) => void;
  trigger?: React.ReactNode;
  currentProject?: {
    id: string;
    name: string;
    customer?: string;
  };
  currentProjectId?: string;
  currentProjectName?: string;
}

export function BuildingModal({
  isOpen,
  onOpenChange,
  editingBuilding,
  onSubmit,
  trigger,
  currentProject,
  currentProjectId,
  currentProjectName
}: BuildingModalProps) {
  const { user: currentUser } = useAuth();
  const { showToast } = useToastContext();
  const [formData, setFormData] = useState({
    name: "",
    project_id: "",
    address: "",
    status: "active" as "active" | "completed" | "on-hold" | "inactive",
    description: ""
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);

  // Map UI status to database integer
  const statusToNumber: { [key: string]: number } = {
    inactive: 0,
    active: 1,
    "on-hold": 2,
    completed: 3
  };

  // Map database integer to UI status
  const numberToStatus: { [key: number]: string } = {
    0: "inactive",
    1: "active",
    2: "on-hold",
    3: "completed"
  };

  // Determine the current project context
  const effectiveProject = currentProject || (currentProjectId && currentProjectName ? {
    id: currentProjectId,
    name: currentProjectName
  } : null);

  // Fetch projects from Supabase
  useEffect(() => {
    async function fetchProjects() {
      setProjectsLoading(true);
      try {
        console.log('🔍 BuildingModal: Starting project fetch...');
        console.log('🔍 BuildingModal: Modal isOpen:', isOpen);
        
        const { data, error } = await supabase
          .from('projects')
          .select(`
            id, 
            name, 
            customers (name)
          `)
          .order('name');
        
        if (error) {
          console.error('❌ BuildingModal: Error fetching projects:', error);
          showToast('Failed to load projects', 'error');
          setProjects([]);
          return;
        }
        
        console.log('✅ BuildingModal: Projects fetched successfully:', data);
        console.log('✅ BuildingModal: Raw projects data:', data);
        
        // Transform the data to match the expected interface
        const transformedProjects: Project[] = (data as any[])?.map((project: any) => {
          const transformed = {
            id: project.id,
            name: project.name,
            customer: project.customers?.name || ''
          };
          console.log('🔍 BuildingModal: Transformed project:', transformed);
          return transformed;
        }) || [];
        
        console.log('✅ BuildingModal: Final transformed projects:', transformedProjects);
        setProjects(transformedProjects);
      } catch (error) {
        console.error('❌ BuildingModal: Exception during project fetch:', error);
        showToast('Failed to load projects', 'error');
        setProjects([]);
      } finally {
        setProjectsLoading(false);
        console.log('🔍 BuildingModal: Project loading finished');
      }
    }

    // Only fetch projects when modal is open
    if (isOpen) {
      console.log('🔍 BuildingModal: Modal opened, fetching projects...');
      fetchProjects();
    } else {
      console.log('🔍 BuildingModal: Modal closed, not fetching projects');
    }
  }, [isOpen, showToast]);

  // Reset form when modal opens/closes or editing building changes
  useEffect(() => {
    if (editingBuilding) {
      setFormData({
        name: editingBuilding.name,
        project_id: editingBuilding.project_id,
        address: editingBuilding.address,
        status: numberToStatus[editingBuilding.status] as "active" | "completed" | "on-hold" | "inactive",
        description: editingBuilding.description || ""
      });
    } else {
      setFormData({
        name: "",
        project_id: effectiveProject?.id || "",
        address: "",
        status: "active",
        description: ""
      });
    }
  }, [editingBuilding, isOpen, effectiveProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser?.id) {
      showToast('You must be logged in to perform this action', 'error');
      return;
    }

    // Validate required fields
    if (!formData.name.trim()) {
      showToast('Building name is required', 'error');
      return;
    }

    if (!formData.project_id) {
      showToast('Project selection is required', 'error');
      return;
    }

    if (!formData.address.trim()) {
      showToast('Building address is required', 'error');
      return;
    }

    // Verify the user exists in the database
    try {
      const { data: userCheck, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', currentUser.id)
        .single();

      if (userError || !userCheck) {
        console.error('User not found in database:', currentUser.id);
        showToast('User authentication error. Please log in again.', 'error');
        return;
      }
    } catch (error) {
      console.error('Error verifying user:', error);
      showToast('Authentication error. Please log in again.', 'error');
      return;
    }
    
    try {
      const buildingData = {
        name: formData.name.trim(),
        project_id: formData.project_id,
        address: formData.address.trim(),
        status: statusToNumber[formData.status],
        description: formData.description.trim()
      };
      
      onSubmit(buildingData);
      
      // Reset form and close modal
      setFormData({
        name: "",
        project_id: effectiveProject?.id || "",
        address: "",
        status: "active",
        description: ""
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting building:', error);
      showToast('Failed to save building', 'error');
    }
  };

  const handleCancel = () => {
    // Reset form and close modal
    setFormData({
      name: "",
      project_id: effectiveProject?.id || "",
      address: "",
      status: "active",
      description: ""
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-card-foreground">
            {editingBuilding ? 'Edit Building' : 'Create New Building'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-card-foreground">Building Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter building name"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="project" className="text-card-foreground">Project *</Label>
              <Select 
                value={formData.project_id} 
                onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                disabled={projectsLoading}
              >
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue placeholder={projectsLoading ? "Loading projects..." : "Select project"} />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {projects.length === 0 && !projectsLoading ? (
                    <SelectItem value="" disabled className="text-popover-foreground">
                      No projects available
                    </SelectItem>
                  ) : (
                    projects.map((project) => {
                      console.log('🔍 BuildingModal: Rendering project in dropdown:', project);
                      return (
                        <SelectItem 
                          key={project.id} 
                          value={project.id} 
                          className="text-popover-foreground"
                        >
                          {project.name} {project.customer ? `- ${project.customer}` : ''}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              {projectsLoading && (
                <p className="text-xs text-muted-foreground">Loading projects...</p>
              )}
              {!projectsLoading && projects.length === 0 && (
                <div className="text-xs text-destructive space-y-1">
                  <p>No projects found. Please create a project first.</p>
                  <p>You can create projects from the Projects page.</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setProjectsLoading(true);
                      // Trigger a re-fetch
                      const fetchProjects = async () => {
                        try {
                          const { data, error } = await supabase
                            .from('projects')
                            .select(`
                              id, 
                              name, 
                              customers (name)
                            `)
                            .order('name');
                          
                          if (error) {
                            console.error('Error fetching projects:', error);
                            showToast('Failed to load projects', 'error');
                            setProjects([]);
                            return;
                          }
                          
                          const transformedProjects: Project[] = (data as any[])?.map((project: any) => ({
                            id: project.id,
                            name: project.name,
                            customer: project.customers?.name || ''
                          })) || [];
                          
                          setProjects(transformedProjects);
                        } catch (error) {
                          console.error('Error fetching projects:', error);
                          showToast('Failed to load projects', 'error');
                          setProjects([]);
                        } finally {
                          setProjectsLoading(false);
                        }
                      };
                      fetchProjects();
                    }}
                    className="mt-2"
                  >
                    Retry
                  </Button>
                </div>
              )}
              {!projectsLoading && projects.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {projects.length} project{projects.length !== 1 ? 's' : ''} available
                </p>
              )}
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address" className="text-card-foreground">Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter building address"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status" className="text-card-foreground">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => 
                  setFormData({ ...formData, status: value as "active" | "completed" | "on-hold" | "inactive" })
                }
              >
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="active" className="text-popover-foreground">Active</SelectItem>
                  <SelectItem value="completed" className="text-popover-foreground">Completed</SelectItem>
                  <SelectItem value="on-hold" className="text-popover-foreground">On Hold</SelectItem>
                  <SelectItem value="inactive" className="text-popover-foreground">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description" className="text-card-foreground">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter building description (optional)"
              className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              rows={3}
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={loading || projectsLoading || projects.length === 0}
            >
              {editingBuilding ? 'Update Building' : 'Create Building'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel} 
              className="border-border text-foreground hover:bg-accent"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BuildingModalTrigger({ 
  onSubmit, 
  editingBuilding,
  currentProject,
  currentProjectId,
  currentProjectName,
  ...props 
}: Omit<BuildingModalProps, "isOpen" | "onOpenChange" | "trigger">) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <BuildingModal
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      editingBuilding={editingBuilding}
      onSubmit={onSubmit}
      currentProject={currentProject}
      currentProjectId={currentProjectId}
      currentProjectName={currentProjectName}
      trigger={
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {editingBuilding ? 'Edit Building' : 'Add Building'}
        </Button>
      }
      {...props}
    />
  );
}