import {
  Calendar,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Edit,
  ExternalLink,
  FolderOpen,
  MapPin,
  Package,
  Plus,
  Search,
  Trash2,
  Upload,
  User
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { supabase } from "../lib/supabase";
import { useToastContext } from "../contexts/ToastContext";
import { DateInput } from "./ui/date-input";
import { crudOperations } from "../utils/userTracking";
import { useAuth } from "../contexts/AuthContext";
import { isCustomerRole, UserRole } from "../utils/rolePermissions";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  customer_id: string | null;
  customer_name: string;
  location: string;
  start_date: string;
  end_date: string | null;
  status: "active" | "completed" | "on-hold";
  estimated_cost: number;
  estimated_panels: number;
  actual_panels: number;
}

export function ProjectManagement() {
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const { user: currentUser } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Add form submission protection
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const lastSubmissionTime = useRef<number>(0);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [startDateFrom, setStartDateFrom] = useState("");
  const [startDateTo, setStartDateTo] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const [formData, setFormData] = useState({
    name: "",
    customer_id: "",
    new_customer_name: "",
    new_customer_email: "",
    new_customer_phone: "",
    location: "",
    start_date: "",
    end_date: "",
    status: "active" as "active" | "completed" | "on-hold",
    estimated_cost: 0,
    estimated_panels: 0,
  });

  // Function to suggest a unique project name
  const suggestUniqueProjectName = async (baseName: string): Promise<string> => {
    let counter = 1;
    let suggestedName = baseName;
    
    while (counter <= 10) { // Limit to 10 attempts
      const { data: existingProjects, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('name', suggestedName);
      
      if (error) {
        console.error('Error checking for existing projects:', error);
        break;
      }
      
      if (!existingProjects || existingProjects.length === 0) {
        return suggestedName;
      }
      
      suggestedName = `${baseName} (${counter})`;
      counter++;
    }
    
    // If we can't find a unique name, append timestamp
    return `${baseName} (${new Date().getTime()})`;
  };

  // Function to check if project name is available
  const checkProjectNameAvailability = async (name: string): Promise<{ available: boolean; suggestedName?: string }> => {
    if (!name.trim()) {
      return { available: true };
    }
    
    const { data: existingProjects, error } = await supabase
      .from('projects')
      .select('id, name')
      .eq('name', name);
    
    if (error) {
      console.error('Error checking project name availability:', error);
      return { available: true }; // Assume available if we can't check
    }
    
    if (!existingProjects || existingProjects.length === 0) {
      return { available: true };
    }
    
    const suggestedName = await suggestUniqueProjectName(name);
    return { available: false, suggestedName };
  };

  // Function to debug customer issues
  const debugCustomerIssues = async () => {
    console.log('=== CUSTOMER DEBUG ===');
    
    // Check all customers
    try {
      const { data: allCustomers, error } = await supabase
        .from('customers')
        .select('id, name, email')
        .order('name');
      
      if (error) {
        console.error('Error fetching all customers:', error);
      } else {
        console.log('All available customers:', allCustomers);
      }
    } catch (error) {
      console.error('Exception fetching all customers:', error);
    }
    
    console.log('=== END CUSTOMER DEBUG ===');
  };

  // Fetch customers and projects on mount
  useEffect(() => {
    fetchCustomers();
    fetchProjects();
  }, []);

  // Reset submitting state when dialog closes
  useEffect(() => {
    if (!isAddDialogOpen && !editingProject) {
      setIsSubmitting(false);
    }
  }, [isAddDialogOpen, editingProject]);

  const fetchCustomers = async () => {
    // Check if current user is a customer and implement data filtering
    const isCustomer = currentUser?.role ? isCustomerRole(currentUser.role as UserRole) : false;
    
    let query = supabase
      .from('customers')
      .select('*');
    
    // If user is a customer, only show their own customer record
    if (isCustomer && currentUser?.customer_id) {
      query = query.eq('id', currentUser.customer_id);
      console.log('Filtering customers for customer user:', currentUser.customer_id);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching customers:', error);
      return;
    }
    setCustomers(data || []);
  };

  const fetchProjects = async () => {
    // Check if current user is a customer and implement data filtering
    const isCustomer = currentUser?.role ? isCustomerRole(currentUser.role as UserRole) : false;
    
    let query = supabase
      .from('projects')
      .select(`
        *,
        customers (name)
      `);
    
    // If user is a customer, filter projects by their customer_id
    if (isCustomer && currentUser?.customer_id) {
      query = query.eq('customer_id', currentUser.customer_id);
      console.log('Filtering projects for customer:', currentUser.customer_id);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching projects:', error);
      return;
    }
    
    // Fetch actual panel counts for each project
    const projectsWithPanelCounts = await Promise.all(
      data?.map(async (project) => {
        let panelQuery = supabase
          .from('panels')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);
        
        // If user is a customer, also filter panels by customer_id
        if (isCustomer && currentUser?.customer_id) {
          panelQuery = panelQuery.eq('customer_id', currentUser.customer_id);
        }
        
        const { count: panelCount, error: panelError } = await panelQuery;
        
        if (panelError) {
          console.error('Error fetching panel count for project:', project.id, panelError);
        }
        
        return {
          id: project.id,
          name: project.name,
          customer_id: project.customer_id,
          customer_name: project.customers?.name || 'No Customer',
          location: project.location,
          start_date: project.start_date,
          end_date: project.end_date,
          status: project.status,
          estimated_cost: project.estimated_cost,
          estimated_panels: project.estimated_panels,
          actual_panels: panelCount ?? 0
        };
      }) || []
    );
    
    setProjects(projectsWithPanelCounts);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      customer_id: "",
      new_customer_name: "",
      new_customer_email: "",
      new_customer_phone: "",
      location: "",
      start_date: "",
      end_date: "",
      status: "active",
      estimated_cost: 0,
      estimated_panels: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('Form submission already in progress, ignoring duplicate submission');
      return;
    }
    
    // Debounce rapid submissions (prevent submissions within 2 seconds)
    const now = Date.now();
    if (now - lastSubmissionTime.current < 2000) {
      console.log('Form submission debounced, ignoring rapid submission');
      return;
    }
    lastSubmissionTime.current = now;
    
    setIsSubmitting(true);
    
    // Add timeout to prevent stuck state
    const timeoutId = setTimeout(() => {
      console.log('Form submission timeout, resetting state');
      setIsSubmitting(false);
      showToast('Request timed out. Please try again.', 'error');
    }, 30000); // 30 seconds timeout
    
    try {
      // Check if current user is a customer and implement data filtering
      const isCustomer = currentUser?.role ? isCustomerRole(currentUser.role as UserRole) : false;
      
      let customerId = formData.customer_id;
      
      // Validate required fields
      if (!formData.name.trim()) {
        showToast('Project name is required', 'error');
        clearTimeout(timeoutId);
        setIsSubmitting(false);
        return;
      }
      
      if (!formData.start_date) {
        showToast('Start date is required', 'error');
        clearTimeout(timeoutId);
        setIsSubmitting(false);
        return;
      }
      
      if (!formData.location.trim()) {
        showToast('Location is required', 'error');
        clearTimeout(timeoutId);
        setIsSubmitting(false);
        return;
      }
      
      // If user is a customer, force them to use their own customer_id
      if (isCustomer && currentUser?.customer_id) {
        customerId = currentUser.customer_id;
        console.log('Customer user forced to use their own customer_id:', customerId);
      } else if (formData.customer_id === "other") {
        // If "Other" is selected, create new customer (only for non-customer users)
        try {
          // Validate new customer data
          if (!formData.new_customer_name.trim()) {
            showToast('New customer name is required', 'error');
            clearTimeout(timeoutId);
            setIsSubmitting(false);
            return;
          }
          
          console.log('Creating new customer with data:', {
            name: formData.new_customer_name,
            email: formData.new_customer_email,
            phone: formData.new_customer_phone || null
          });
          
          const newCustomer = await crudOperations.create('customers', {
            name: formData.new_customer_name,
            email: formData.new_customer_email,
            phone: formData.new_customer_phone || null
          });
          
          customerId = newCustomer.id;
          console.log('Customer created successfully with ID:', customerId);
        } catch (error) {
          console.error('Error creating customer:', error);
          showToast('Error creating customer. Please try again.', 'error');
          clearTimeout(timeoutId);
          setIsSubmitting(false);
          return;
        }
      }

      if (!customerId) {
        showToast('Please select a customer', 'error');
        clearTimeout(timeoutId);
        setIsSubmitting(false);
        return;
      }

      // Validate that the selected customer exists
      try {
        console.log('Validating selected customer:', customerId);
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('id, name')
          .eq('id', customerId)
          .single();
        
        if (customerError) {
          console.error('Error validating customer:', customerError);
          showToast('Selected customer is invalid. Please choose a different customer.', 'error');
          clearTimeout(timeoutId);
          setIsSubmitting(false);
          return;
        }
        
        if (!customer) {
          showToast('Selected customer does not exist. Please choose a valid customer.', 'error');
          clearTimeout(timeoutId);
          setIsSubmitting(false);
          return;
        }
        
        console.log('Customer validation successful:', customer);
      } catch (error) {
        console.error('Error validating customer:', error);
        showToast('Error validating customer. Please try again.', 'error');
        clearTimeout(timeoutId);
        setIsSubmitting(false);
        return;
      }

      console.log('Submitting project data:', {
        editingProject,
        formData,
        customerId
      });
      
      if (editingProject) {
        const updateData = {
          name: formData.name,
          customer_id: customerId,
          location: formData.location,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          status: formData.status,
          estimated_cost: formData.estimated_cost,
          estimated_panels: formData.estimated_panels
        };
        console.log('Updating project with data:', updateData);
        
        await crudOperations.update('projects', editingProject.id, updateData);
        
        showToast('Project updated successfully', 'success');
        setEditingProject(null);
      } else {
        // Check if project name already exists before creating
        console.log('Checking for existing project with name:', formData.name);
        const { data: existingProjects, error: checkError } = await supabase
          .from('projects')
          .select('id, name, customer_id')
          .eq('name', formData.name);
        
        if (checkError) {
          console.error('Error checking for existing projects:', checkError);
        } else if (existingProjects && existingProjects.length > 0) {
          const suggestedName = await suggestUniqueProjectName(formData.name);
          showToast(
            `A project with the name "${formData.name}" already exists. Suggested name: "${suggestedName}"`, 
            'error'
          );
          // Update the form with the suggested name
          setFormData(prev => ({ ...prev, name: suggestedName }));
          clearTimeout(timeoutId);
          setIsSubmitting(false);
          return;
        }
        
        const createData = {
          name: formData.name,
          customer_id: customerId,
          location: formData.location,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          status: formData.status,
          estimated_cost: formData.estimated_cost,
          estimated_panels: formData.estimated_panels
        };
        console.log('Creating project with data:', createData);
        
        await crudOperations.create('projects', createData);
        
        showToast('Project added successfully', 'success');
        setIsAddDialogOpen(false);
      }
      
      resetForm();
      await fetchProjects();
      await fetchCustomers();
    } catch (error) {
      console.error('Error saving project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error saving project';
      showToast(errorMessage, 'error');
    } finally {
      clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  };

  const startEdit = (project: Project) => {
    // Check if current user is a customer and implement data filtering
    const isCustomer = currentUser?.role ? isCustomerRole(currentUser.role as UserRole) : false;
    
    // If user is a customer, verify they can only edit their own projects
    if (isCustomer && currentUser?.customer_id) {
      if (project.customer_id !== currentUser.customer_id) {
        showToast('You can only edit your own projects', 'error');
        return;
      }
    }
    
    setEditingProject(project);
    setFormData({
      name: project.name,
      customer_id: project.customer_id || "",
      new_customer_name: "",
      new_customer_email: "",
      new_customer_phone: "",
      location: project.location,
      start_date: project.start_date,
      end_date: project.end_date || "",
      status: project.status,
      estimated_cost: project.estimated_cost,
      estimated_panels: project.estimated_panels,
    });
  };

  const handleDelete = (project: Project) => {
    // Check if current user is a customer and implement data filtering
    const isCustomer = currentUser?.role ? isCustomerRole(currentUser.role as UserRole) : false;
    
    // If user is a customer, verify they can only delete their own projects
    if (isCustomer && currentUser?.customer_id) {
      if (project.customer_id !== currentUser.customer_id) {
        showToast('You can only delete your own projects', 'error');
        return;
      }
    }
    
    setDeletingProject(project);
  };

  const confirmDelete = async () => {
    if (deletingProject) {
      setIsDeleting(true);
      
      // Check if current user is a customer and implement data filtering
      const isCustomer = currentUser?.role ? isCustomerRole(currentUser.role as UserRole) : false;
      
      // If user is a customer, verify they can only delete their own projects
      if (isCustomer && currentUser?.customer_id) {
        if (deletingProject.customer_id !== currentUser.customer_id) {
          showToast('You can only delete your own projects', 'error');
          setDeletingProject(null);
          setIsDeleting(false);
          return;
        }
      }
      
      try {
        // Check for all dependencies in the correct order
        console.log('Checking project dependencies...');
        
        // 1. Check for panels
        let panelQuery = supabase
          .from('panels')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', deletingProject.id);
        
        if (isCustomer && currentUser?.customer_id) {
          panelQuery = panelQuery.eq('customer_id', currentUser.customer_id);
        }
        
        const { count: panelCount, error: panelError } = await panelQuery;
        
        if (panelError) {
          console.error('Error checking for panels:', panelError);
          showToast('Error checking project dependencies', 'error');
          return;
        }
        
        // 2. Check for facades (through buildings)
        // First get building IDs for this project
        let buildingIdsForCountQuery = supabase
          .from('buildings')
          .select('id')
          .eq('project_id', deletingProject.id);
        
        if (isCustomer && currentUser?.customer_id) {
          buildingIdsForCountQuery = buildingIdsForCountQuery.eq('customer_id', currentUser.customer_id);
        }
        
        const { data: buildingIdsForCount, error: buildingIdsForCountError } = await buildingIdsForCountQuery;
        
        if (buildingIdsForCountError) {
          console.error('Error checking for facades:', buildingIdsForCountError);
          showToast('Error checking project dependencies', 'error');
          return;
        }
        
        let facadeCount = 0;
        if (buildingIdsForCount && buildingIdsForCount.length > 0) {
          let facadeQuery = supabase
            .from('facades')
            .select('id', { count: 'exact', head: true })
            .in('building_id', buildingIdsForCount.map(b => b.id));
          
          if (isCustomer && currentUser?.customer_id) {
            facadeQuery = facadeQuery.eq('customer_id', currentUser.customer_id);
          }
          
          const { count: facadeCountResult, error: facadeError } = await facadeQuery;
          
          if (facadeError) {
            console.error('Error checking for facades:', facadeError);
            showToast('Error checking project dependencies', 'error');
            return;
          }
          
          facadeCount = facadeCountResult || 0;
        }
        
        // 3. Check for buildings
        let buildingQuery = supabase
          .from('buildings')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', deletingProject.id);
        
        if (isCustomer && currentUser?.customer_id) {
          buildingQuery = buildingQuery.eq('customer_id', currentUser.customer_id);
        }
        
        const { count: buildingCount, error: buildingError } = await buildingQuery;
        
        if (buildingError) {
          console.error('Error checking for buildings:', buildingError);
          showToast('Error checking project dependencies', 'error');
          return;
        }
        
        // Show warning if project has dependencies
        const totalDependencies = (panelCount || 0) + (facadeCount || 0) + (buildingCount || 0);
        
        if (totalDependencies > 0) {
          const dependencyDetails = [
            panelCount ? `${panelCount} panel(s)` : null,
            facadeCount ? `${facadeCount} facade(s)` : null,
            buildingCount ? `${buildingCount} building(s)` : null
          ].filter(Boolean).join(', ');
          
          const confirmed = window.confirm(
            `This project has ${dependencyDetails} associated with it. Deleting the project will also delete all associated data. Are you sure you want to continue?`
          );
          
          if (!confirmed) {
            setDeletingProject(null);
            return;
          }
          
          console.log(`Deleting dependencies for project ${deletingProject.id}: ${dependencyDetails}`);
          
          // Delete in the correct order: Panels → Facades → Buildings → Project
          
          // 1. Delete panels
          if (panelCount && panelCount > 0) {
            console.log(`Deleting ${panelCount} panels...`);
            let deletePanelsQuery = supabase
              .from('panels')
              .delete()
              .eq('project_id', deletingProject.id);
            
            if (isCustomer && currentUser?.customer_id) {
              deletePanelsQuery = deletePanelsQuery.eq('customer_id', currentUser.customer_id);
            }
            
            const { error: deletePanelsError } = await deletePanelsQuery;
            
            if (deletePanelsError) {
              console.error('Error deleting panels:', deletePanelsError);
              showToast('Error deleting project panels', 'error');
              return;
            }
            
            console.log('Panels deleted successfully');
          }
          
          // 2. Delete facades
          if (facadeCount && facadeCount > 0) {
            console.log(`Deleting ${facadeCount} facades...`);
            
            // First, get all building IDs for this project
            let buildingIdsQuery = supabase
              .from('buildings')
              .select('id')
              .eq('project_id', deletingProject.id);
            
            if (isCustomer && currentUser?.customer_id) {
              buildingIdsQuery = buildingIdsQuery.eq('customer_id', currentUser.customer_id);
            }
            
            const { data: buildingIds, error: buildingIdsError } = await buildingIdsQuery;
            
            if (buildingIdsError) {
              console.error('Error getting building IDs:', buildingIdsError);
              showToast('Error deleting project facades', 'error');
              return;
            }
            
            if (buildingIds && buildingIds.length > 0) {
              // Delete facades that belong to these buildings
              let deleteFacadesQuery = supabase
                .from('facades')
                .delete()
                .in('building_id', buildingIds.map(b => b.id));
              
              if (isCustomer && currentUser?.customer_id) {
                deleteFacadesQuery = deleteFacadesQuery.eq('customer_id', currentUser.customer_id);
              }
              
              const { error: deleteFacadesError } = await deleteFacadesQuery;
              
              if (deleteFacadesError) {
                console.error('Error deleting facades:', deleteFacadesError);
                showToast('Error deleting project facades', 'error');
                return;
              }
              
              console.log('Facades deleted successfully');
            }
          }
          
          // 3. Delete buildings
          if (buildingCount && buildingCount > 0) {
            console.log(`Deleting ${buildingCount} buildings...`);
            let deleteBuildingsQuery = supabase
              .from('buildings')
              .delete()
              .eq('project_id', deletingProject.id);
            
            if (isCustomer && currentUser?.customer_id) {
              deleteBuildingsQuery = deleteBuildingsQuery.eq('customer_id', currentUser.customer_id);
            }
            
            const { error: deleteBuildingsError } = await deleteBuildingsQuery;
            
            if (deleteBuildingsError) {
              console.error('Error deleting buildings:', deleteBuildingsError);
              showToast('Error deleting project buildings', 'error');
              return;
            }
            
            console.log('Buildings deleted successfully');
          }
        }
        
        // Now delete the project
        console.log('Deleting project...');
        await crudOperations.delete('projects', deletingProject.id);
        
        showToast('Project deleted successfully', 'success');
        setDeletingProject(null);
        await fetchProjects();
      } catch (error) {
        console.error('Error deleting project:', error);
        
        // Check if it's a foreign key constraint error
        if (error instanceof Error && error.message.includes('409')) {
          showToast('Cannot delete project: It has associated data. Please delete all associated data first.', 'error');
        } else {
          showToast('Error deleting project', 'error');
        }
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleCardClick = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: "default", label: "Active" },
      completed: { variant: "secondary", label: "Completed" },
      "on-hold": { variant: "destructive", label: "On Hold" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: "secondary", label: status };

    return (
      <Badge variant={config.variant as any} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  // Get unique values for filters
  const uniqueCustomers = Array.from(new Set(projects.map((p) => p.customer_name).filter(Boolean))).sort();
  const uniqueLocations = Array.from(new Set(projects.map((p) => p.location).filter(Boolean))).sort();

  // Filter and sort projects
  const filteredAndSortedProjects = projects
    .filter((project) => {
      // Search filter
      if (
        searchTerm &&
        !(project.name || "").toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(project.customer_name || "").toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(project.location || "").toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Customer filter
      if (customerFilter && customerFilter !== "all" && project.customer_name !== customerFilter) {
        return false;
      }

      // Status filter
      if (statusFilter && statusFilter !== "all" && project.status !== statusFilter) {
        return false;
      }

      // Location filter
      if (locationFilter && locationFilter !== "all" && project.location !== locationFilter) {
        return false;
      }

      // Date range filter
      if (dateRangeFilter && dateRangeFilter !== "all") {
        const projectStart = new Date(project.start_date);
        const projectEnd = project.end_date ? new Date(project.end_date) : new Date();
        const now = new Date();

        switch (dateRangeFilter) {
          case "this-month":
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            if (projectStart >= nextMonth || projectEnd < thisMonth) return false;
            break;
          case "this-quarter":
            const quarter = Math.floor(now.getMonth() / 3);
            const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
            const quarterEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 1);
            if (projectStart >= quarterEnd || projectEnd < quarterStart) return false;
            break;
          case "this-year":
            const yearStart = new Date(now.getFullYear(), 0, 1);
            const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
            if (projectStart >= yearEnd || projectEnd < yearStart) return false;
            break;
          case "custom":
            if (startDateFrom && projectStart < new Date(startDateFrom)) return false;
            if (startDateTo && projectStart > new Date(startDateTo)) return false;
            break;
        }
      }

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = (a.name || "").localeCompare(b.name || "");
          break;
        case "customer":
          comparison = (a.customer_name || "").localeCompare(b.customer_name || "");
          break;
        case "location":
          comparison = (a.location || "").localeCompare(b.location || "");
          break;
        case "status":
          comparison = (a.status || "").localeCompare(b.status || "");
          break;
        case "startDate":
          comparison = new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime();
          break;
        case "endDate":
          comparison = new Date(a.end_date || 0).getTime() - new Date(b.end_date || 0).getTime();
          break;
        case "estimatedCost":
          comparison = (a.estimated_cost || 0) - (b.estimated_cost || 0);
          break;
        case "estimatedPanels":
          comparison = (a.estimated_panels || 0) - (b.estimated_panels || 0);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedProjects.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedProjects = filteredAndSortedProjects.slice(startIndex, endIndex);

  // Reset to first page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCustomerFilter("all");
    setStatusFilter("all");
    setLocationFilter("all");
    setDateRangeFilter("all");
    setStartDateFrom("");
    setStartDateTo("");
    setSortBy("name");
    setSortOrder("asc");
    setCurrentPage(1);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const activeFiltersCount = [
    searchTerm,
    customerFilter !== "all" ? customerFilter : "",
    statusFilter !== "all" ? statusFilter : "",
    locationFilter !== "all" ? locationFilter : "",
    dateRangeFilter !== "all" ? dateRangeFilter : "",
  ].filter(Boolean).length;

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  // Generate page numbers for pagination
  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("...");
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }
      if (currentPage < totalPages - 2) {
        pages.push("...");
      }
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Project Management</h1>
          <p className="text-muted-foreground">
            Manage your projects, timelines, and deliverables
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {isSubmitting ? "Adding Project..." : "Add New Project"}
                </DialogTitle>
                <DialogDescription>
                  {isSubmitting 
                    ? "Please wait while we create your project..." 
                    : "Create a new project for a customer."
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          name: e.target.value,
                        })
                      }
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="customer">Customer</Label>
                    <Select
                      value={formData.customer_id}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          customer_id: value,
                        })
                      }
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.customer_id === "other" && (
                    <div className="grid gap-4 border-l-4 border-primary pl-4">
                      <div className="grid gap-2">
                        <Label htmlFor="new_customer_name">New Customer Name</Label>
                        <Input
                          id="new_customer_name"
                          value={formData.new_customer_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              new_customer_name: e.target.value,
                            })
                          }
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="new_customer_email">New Customer Email</Label>
                        <Input
                          id="new_customer_email"
                          type="email"
                          value={formData.new_customer_email}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              new_customer_email: e.target.value,
                            })
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="new_customer_phone">New Customer Phone</Label>
                        <Input
                          id="new_customer_phone"
                          type="tel"
                          value={formData.new_customer_phone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              new_customer_phone: e.target.value,
                            })
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  )}
<div className="grid grid-cols-2 gap-4">
                    <DateInput
                      id="startDate"
                      label="Start Date"
                      value={formData.start_date}
                      onChange={(value) =>
                        setFormData({
                          ...formData,
                          start_date: value,
                        })
                      }
                      required
                    />
                    <DateInput
                      id="endDate"
                      label="End Date"
                      value={formData.end_date}
                      onChange={(value) =>
                        setFormData({
                          ...formData,
                          end_date: value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          location: e.target.value,
                        })
                      }
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="estimatedCost">Estimated Cost ($)</Label>
                      <Input
                        id="estimatedCost"
                        type="number"
                        min="0"
                        step="100"
                        value={formData.estimated_cost}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            estimated_cost: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="estimatedPanels">Estimated Panels</Label>
                      <Input
                        id="estimatedPanels"
                        type="number"
                        min="0"
                        step="1"
                        value={formData.estimated_panels}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            estimated_panels: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          status: value as any,
                        })
                      }
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="on-hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Adding Project..." : "Add Project"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters Panel - Always Visible */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters & Search</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="h-5 w-5 p-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* First row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {/* Search */}
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      handleFilterChange();
                    }}
                    className="pl-8"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Customer Filter */}
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select
                  value={customerFilter}
                  onValueChange={(value) => {
                    setCustomerFilter(value);
                    handleFilterChange();
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All customers</SelectItem>
                    {uniqueCustomers.map((customer) => (
                      <SelectItem key={customer} value={customer}>
                        {customer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    handleFilterChange();
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location Filter */}
              <div className="space-y-2">
                <Label>Location</Label>
                <Select
                  value={locationFilter}
                  onValueChange={(value) => {
                    setLocationFilter(value);
                    handleFilterChange();
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {uniqueLocations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Page Size */}
              <div className="space-y-2">
                <Label>Items per page</Label>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(parseInt(value));
                    setCurrentPage(1);
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 per page</SelectItem>
                    <SelectItem value="24">24 per page</SelectItem>
                    <SelectItem value="36">36 per page</SelectItem>
                    <SelectItem value="48">48 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Second row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select
                  value={dateRangeFilter}
                  onValueChange={(value) => {
                    setDateRangeFilter(value);
                    handleFilterChange();
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any time</SelectItem>
                    <SelectItem value="this-month">This month</SelectItem>
                    <SelectItem value="this-quarter">This quarter</SelectItem>
                    <SelectItem value="this-year">This year</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date From */}
              {dateRangeFilter === "custom" && (
                <>
                  <DateInput
                    id="startDateFrom"
                    label="Start Date From"
                    value={startDateFrom}
                    onChange={(value) => {
                      setStartDateFrom(value);
                      handleFilterChange();
                    }}
                  />
                  <DateInput
                    id="startDateTo"
                    label="Start Date To"
                    value={startDateTo}
                    onChange={(value) => {
                      setStartDateTo(value);
                      handleFilterChange();
                    }}
                  />
                </>
              )}

              {/* Sort By */}
              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Project Name</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="startDate">Start Date</SelectItem>
                    <SelectItem value="estimatedCost">Estimated Cost</SelectItem>
                    <SelectItem value="estimatedPanels">Estimated Panels</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order */}
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Select
                  value={sortOrder}
                  onValueChange={(value) => setSortOrder(value as "asc" | "desc")}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-
              {Math.min(endIndex, filteredAndSortedProjects.length)} of {filteredAndSortedProjects.length} projects
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters} disabled={isSubmitting}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {filteredAndSortedProjects.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            {activeFiltersCount > 0 ? "No projects match your filters" : "No projects found"}
          </p>
          {activeFiltersCount > 0 && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4" disabled={isSubmitting}>
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedProjects.map((project) => (
              <Card
                key={project.id}
                className="qatar-card cursor-pointer hover:shadow-xl"
                onClick={() => handleCardClick(project)}
              >
                <CardHeader className="qatar-card-header">
                  <div className="flex items-start justify-between flex-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle className="qatar-card-title">
                          {project.name}
                        </CardTitle>
                        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="qatar-card-subtitle">
                        PRJ-{project.id.slice(-4).toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    {getStatusBadge(project.status)}
                  </div>
                </CardHeader>

                <CardContent className="qatar-card-content">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-card-foreground truncate">{project.location}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-card-foreground truncate">{project.customer_name}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">
                        {formatDate(project.start_date)} - {formatDate(project.end_date || '')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-card-foreground font-medium">
                        {formatCurrency(project.estimated_cost)}
                      </span>
                    </div>
                  </div>

                  <div className="qatar-card-footer">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Panels:</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-card-foreground">{project.actual_panels}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      <div className="qatar-progress flex-1">
                        <div
                          className="qatar-progress-bar"
                          style={{ width: `${project.estimated_panels > 0 ? (project.actual_panels / project.estimated_panels) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-muted-foreground min-w-[3rem] text-right">
                        {project.actual_panels}/{project.estimated_panels}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(project);
                        }}
                        className="flex-1"
                        disabled={isSubmitting}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project);
                        }}
                        className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={isSubmitting}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center pt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      disabled={isSubmitting}
                    />
                  </PaginationItem>

                  {getVisiblePages().map((page, index) => (
                    <PaginationItem key={index}>
                      {page === "..." ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          onClick={() => setCurrentPage(page as number)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                          disabled={isSubmitting}
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      disabled={isSubmitting}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      {editingProject && (
        <Dialog open={true} onOpenChange={() => setEditingProject(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {isSubmitting ? "Updating Project..." : "Edit Project"}
              </DialogTitle>
              <DialogDescription>
                {isSubmitting 
                  ? "Please wait while we update your project..." 
                  : "Update project information."
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Project Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-customer">Customer</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        customer_id: value,
                      })
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.customer_id === "other" && (
                  <div className="grid gap-4 border-l-4 border-primary pl-4">
                    <div className="grid gap-2">
                      <Label htmlFor="new_customer_name">New Customer Name</Label>
                      <Input
                        id="new_customer_name"
                        value={formData.new_customer_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            new_customer_name: e.target.value,
                          })
                        }
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new_customer_email">New Customer Email</Label>
                      <Input
                        id="new_customer_email"
                        type="email"
                        value={formData.new_customer_email}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            new_customer_email: e.target.value,
                          })
                        }
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new_customer_phone">New Customer Phone</Label>
                      <Input
                        id="new_customer_phone"
                        type="tel"
                        value={formData.new_customer_phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            new_customer_phone: e.target.value,
                          })
                        }
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="edit-location">Location</Label>
                  <Input
                    id="edit-location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: e.target.value,
                      })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <DateInput
                    id="edit-startDate"
                    label="Start Date"
                    value={formData.start_date}
                    onChange={(value) =>
                      setFormData({
                        ...formData,
                        start_date: value,
                      })
                    }
                    required
                  />
                  <DateInput
                    id="edit-endDate"
                    label="End Date"
                    value={formData.end_date}
                    onChange={(value) =>
                      setFormData({
                        ...formData,
                        end_date: value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-estimatedCost">Estimated Cost ($)</Label>
                    <Input
                      id="edit-estimatedCost"
                      type="number"
                      min="0"
                      step="100"
                      value={formData.estimated_cost}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          estimated_cost: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-estimatedPanels">Estimated Panels</Label>
                    <Input
                      id="edit-estimatedPanels"
                      type="number"
                      min="0"
                      step="1"
                      value={formData.estimated_panels}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          estimated_panels: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        status: value as any,
                      })
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating Project..." : "Update Project"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingProject} onOpenChange={() => setDeletingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>
                  This action cannot be undone. This will permanently delete the project "
                  <strong>{deletingProject?.name}</strong>".
                </p>
                {deletingProject && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Project ID: {deletingProject.id}</p>
                    <p>• Location: {deletingProject.location}</p>
                    <p>• Customer: {deletingProject.customer_name}</p>
                    <p>• Current Panels: {deletingProject.actual_panels}</p>
                    {deletingProject.actual_panels > 0 && (
                      <p className="text-destructive font-medium">
                        ⚠️ This project has {deletingProject.actual_panels} panel(s) that will also be deleted.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Empty export to ensure this file is treated as a module
export {};