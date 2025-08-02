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


interface Project {
  id: string;
  name: string;
  customer?: string;
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

// Sample projects data - only used when no current project is provided
const sampleProjects: Project[] = [
  {
    id: "1",
    name: "Qatar National Convention Centre",
    customer: "Qatar Foundation"
  },
  {
    id: "2", 
    name: "Doha Sports Complex",
    customer: "Qatar Sports Authority"
  },
  {
    id: "3",
    name: "Al Rayyan Stadium",
    customer: "Supreme Committee"
  },
  {
    id: "4",
    name: "Lusail Towers",
    customer: "Qatari Diar"
  }
];

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
  const [formData, setFormData] = useState({
    name: "",
    project_id: "",
    address: "",
    status: "active" as "active" | "completed" | "on-hold" | "inactive",
    description: ""
  });
  const [projects, setProjects] = useState<Project[]>([]);

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

  const isProjectPredefined = !!effectiveProject;

  // Fetch projects from Supabase if no current project is provided
  useEffect(() => {
    async function fetchProjects() {
      if (!isProjectPredefined) {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, customer');
        
        if (error) {
          console.error('Error fetching projects:', error);
          setProjects(sampleProjects);
          return;
        }
        
        setProjects(data || sampleProjects);
      }
    }

    fetchProjects();
  }, [isProjectPredefined]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let selectedProject;
    if (isProjectPredefined) {
      selectedProject = { id: effectiveProject.id, name: effectiveProject.name };
    } else {
      selectedProject = projects.find(p => p.id === formData.project_id);
    }
    
    onSubmit({
      name: formData.name,
      project_id: formData.project_id,
      address: formData.address,
      status: statusToNumber[formData.status],
      description: formData.description
    });
    
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
              {isProjectPredefined ? (
                <Input
                  id="project"
                  value={`${effectiveProject.name}${effectiveProject.customer ? ` - ${effectiveProject.customer}` : ''}`}
                  disabled
                  className="bg-input/50 border-border text-muted-foreground cursor-not-allowed"
                />
              ) : (
                <Select 
                  value={formData.project_id} 
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                >
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {projects.map((project) => (
                      <SelectItem 
                        key={project.id} 
                        value={project.id} 
                        className="text-popover-foreground"
                      >
                        {project.name} {project.customer ? `- ${project.customer}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {isProjectPredefined && (
                <p className="text-xs text-muted-foreground">
                  This building will be added to the current project
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
            >
              {editingBuilding ? 'Update Building' : 'Create Building'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel} 
              className="border-border text-foreground hover:bg-accent"
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