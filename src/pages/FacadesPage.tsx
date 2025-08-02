import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
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
  Layers,
  Search,
  Edit,
  Trash2,
  Building,
  FolderOpen,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { FacadeModalTrigger } from "../components/FacadeModal";

interface FacadeData {
  id: string;
  name: string;
  building_id: string;
  building_name?: string;
  project_name?: string;
  status: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface FacadesPageProps {
  projectId?: string;
  projectName?: string;
  buildingId?: string;
  buildingName?: string;
}

export function FacadesPage({
  projectId,
  projectName,
  buildingId,
  buildingName,
}: FacadesPageProps) {
  const [facades, setFacades] = useState<FacadeData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Map database status (integer) to UI status
  const statusMap: { [key: number]: string } = {
    0: "inactive",
    1: "active",
    2: "on-hold",
    3: "completed"
  };

  const getStatusBadge = (status: number) => {
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
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Fetch facades from Supabase
  useEffect(() => {
    async function fetchFacades() {
      setLoading(true);
      let query = supabase
        .from('facades')
        .select(`
          *,
          buildings (
            name,
            projects (
              name
            )
          )
        `);
      
      if (buildingId) {
        query = query.eq('building_id', buildingId);
      } else if (projectId) {
        query = query.eq('buildings.project_id', projectId);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching facades:', error);
        return;
      }
      
      const formattedData = data?.map(facade => ({
        ...facade,
        building_name: facade.buildings?.name,
        project_name: facade.buildings?.projects?.name
      })) || [];
      
      setFacades(formattedData);
      setLoading(false);
    }

    fetchFacades();
  }, [projectId, buildingId]);

  const handleEdit = async (facade: FacadeData) => {
    // The FacadeModalTrigger will handle opening the modal
  };

  const handleDelete = async (facade: FacadeData) => {
    if (window.confirm('Are you sure you want to delete this facade?')) {
      const { error } = await supabase
        .from('facades')
        .delete()
        .eq('id', facade.id);

      if (error) {
        console.error('Error deleting facade:', error);
        return;
      }

      setFacades(facades.filter(f => f.id !== facade.id));
    }
  };

  const handleAddFacade = async (facadeData: Omit<FacadeData, "id" | "created_at" | "updated_at">) => {
    const { data, error } = await supabase
      .from('facades')
      .insert({
        name: facadeData.name,
        building_id: facadeData.building_id,
        status: facadeData.status,
        description: facadeData.description
      })
      .select(`
        *,
        buildings (
          name,
          projects (
            name
          )
        )
      `)
      .single();

    if (error) {
      console.error('Error adding facade:', error);
      return;
    }

    const formattedData = {
      ...data,
      building_name: data.buildings?.name,
      project_name: data.buildings?.projects?.name
    };

    setFacades([...facades, formattedData]);
  };

  const uniqueBuildings = Array.from(new Set(facades.map(facade => facade.building_name || ''))).filter(Boolean);

  const filteredFacades = facades.filter((facade) => {
    const matchesSearch = searchTerm === "" || 
      facade.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (facade.building_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === "all" || statusMap[facade.status] === statusFilter;
    const matchesBuilding = buildingFilter === "all" || facade.building_name === buildingFilter;
    
    return matchesSearch && matchesStatus && matchesBuilding;
  });

  const activeFacadeFiltersCount = [
    searchTerm !== "",
    statusFilter !== "all",
    buildingFilter !== "all",
  ].filter(Boolean).length;

  const clearFacadeFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setBuildingFilter("all");
  };

  const currentProject = projectId && projectName ? {
    id: projectId,
    name: projectName,
  } : undefined;

  const currentBuilding = buildingId && buildingName ? {
    id: buildingId,
    name: buildingName,
  } : undefined;

  if (loading) {
    return <div>Loading facades...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Facades</h2>
          <Badge variant="secondary" className="ml-2">
            {filteredFacades.length}
          </Badge>
          {projectName && (
            <span className="text-sm text-muted-foreground">
              in {projectName}
            </span>
          )}
          {buildingName && (
            <span className="text-sm text-muted-foreground">
              • {buildingName}
            </span>
          )}
        </div>
        <FacadeModalTrigger
          onSubmit={handleAddFacade}
          currentProject={currentProject}
          currentBuilding={currentBuilding}
        />
      </div>

      {/* Filters & Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters & Search</CardTitle>
            {activeFacadeFiltersCount > 0 && (
              <Badge variant="secondary" className="h-5 w-5 p-0 text-xs">
                {activeFacadeFiltersCount}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search facades..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Building</Label>
                <Select
                  value={buildingFilter}
                  onValueChange={setBuildingFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All buildings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All buildings</SelectItem>
                    {uniqueBuildings.map((building) => (
                      <SelectItem key={building} value={building}>
                        {building}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {filteredFacades.length} of {facades.length} facades
            </div>
            <Button variant="outline" size="sm" onClick={clearFacadeFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Facades Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFacades.map((facade) => (
          <Card
            key={facade.id}
            className="qatar-card flex flex-col justify-between"
          >
            <CardHeader className="qatar-card-header">
              <div>
                <CardTitle className="qatar-card-title">
                  {facade.name}
                </CardTitle>
                <p className="qatar-card-subtitle">
                  FCD-{facade.id.slice(-4).toUpperCase()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(facade.status)}
              </div>
            </CardHeader>

            <CardContent className="qatar-card-content">
              <div className="space-y-3">
                {!projectName && facade.project_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-card-foreground truncate">
                      {facade.project_name}
                    </span>
                  </div>
                )}

                {!buildingName && facade.building_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-card-foreground truncate">
                      {facade.building_name}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Layers className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-card-foreground font-medium">
                    {facade.description ? 'Has description' : 'No description'}
                  </span>
                </div>
              </div>

              <div className="qatar-card-footer">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Created: {formatDate(facade.created_at)}
                  </div>
                  <div className="flex gap-2">
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
                          return;
                        }

                        setFacades(facades.map(f => 
                          f.id === facade.id ? { ...f, ...data, updated_at: new Date().toISOString() } : f
                        ));
                      }}
                      editingFacade={facade}
                      currentProject={currentProject}
                      currentBuilding={currentBuilding}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(facade)}
                      className="border-red-400/50 text-red-400 hover:bg-red-400/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFacades.length === 0 && (
        <div className="text-center py-12">
          <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No facades found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== "all" || buildingFilter !== "all"
              ? "Try adjusting your filters"
              : "Get started by adding your first facade"}
          </p>
          {(!searchTerm && statusFilter === "all" && buildingFilter === "all") && (
            <FacadeModalTrigger 
              onSubmit={handleAddFacade}
              currentProject={currentProject}
              currentBuilding={currentBuilding}
            />
          )}
        </div>
      )}
    </div>
  );
}