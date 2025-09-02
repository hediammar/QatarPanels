import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  MapPin,
  Calendar,
  User,
  DollarSign,
  Package,
  Building2,
  Clock,
  TrendingUp,
  Edit,
  Settings,
  Square,
  Weight,
} from "lucide-react";
import { Project } from "../../pages/ProjectDetailsPage";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";



interface ProjectOverviewProps {
  project: Project;
  customer: any;
  onEdit?: () => void;
  onSettings?: () => void;
}

export function ProjectOverview({ project, customer, onEdit, onSettings }: ProjectOverviewProps) {
  // Panel status domain used across the app
  const PANEL_STATUSES = [
    "Issued For Production",
    "Produced",
    "Inspected",
    "Approved Material",
    "Rejected Material",
    "Issued",
    "Proceed for Delivery",
    "Delivered",
    "Installed",
    "Approved Final",
    "Broken at Site",
    "On Hold",
    "Cancelled",
  ] as const;

  const statusMap: { [key: number]: string } = Object.fromEntries(
    PANEL_STATUSES.map((status, index) => [index, status])
  );

  // Color palette per status
  const STATUS_COLORS: Record<string, string> = {
    "Issued For Production": "#E11D48",
    Produced: "#F59E0B",
    Inspected: "#8B5CF6",
    "Approved Material": "#22C55E",
    "Rejected Material": "#EF4444",
    Issued: "#2563EB",
    "Proceed for Delivery": "#06B6D4",
    Delivered: "#3B82F6",
    Installed: "#10B981",
    "Approved Final": "#84CC16",
    "Broken at Site": "#F97316",
    "On Hold": "#A3A3A3",
    Cancelled: "#475569",
  };

  const [panelStatusCounts, setPanelStatusCounts] = useState<Record<string, number>>({});
  const [totalPanels, setTotalPanels] = useState<number>(0);

  useEffect(() => {
    const fetchPanelStatuses = async () => {
      const { data, error } = await supabase
        .from("panels")
        .select("status")
        .eq("project_id", project.id);

      if (error) {
        console.error("Error fetching panel statuses:", error);
        setPanelStatusCounts({});
        setTotalPanels(0);
        return;
      }

      const counts: Record<string, number> = {};
      for (const row of data || []) {
        const statusName = statusMap[(row as any).status] || "Unknown";
        counts[statusName] = (counts[statusName] || 0) + 1;
      }
      setPanelStatusCounts(counts);
      setTotalPanels(data?.length || 0);
    };

    fetchPanelStatuses();
  }, [project.id]);

  const pieData = Object.entries(panelStatusCounts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ name: status, value: count }));
  const getStatusBadge = (status: string) => {
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
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: "secondary",
      label: status,
      color: "bg-secondary text-secondary-foreground",
    };

    return (
      <Badge className={`text-xs ${config.color}`}>
        {config.label}
      </Badge>
    );
  };

  const getProgress = () => {
    if (!project || !project.estimated_panels || project.estimated_panels === 0)
      return 0;
    return Math.round(((panelStatusCounts["Installed"] || 0) / project.estimated_panels) * 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatQatarRiyal = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "QAR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getDaysRemaining = () => {
    if (!project?.end_date) return null;
    const endDate = new Date(project.end_date);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const daysRemaining = getDaysRemaining();
  const progress = getProgress();

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            {getStatusBadge(project.status)}
          </div>
        </div>
      </div>

      {/* Project Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Customer Card */}
        <Card className="qatar-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{customer?.name || 'No Customer'}</div>
            {customer?.email && (
              <p className="text-xs text-muted-foreground mt-1">
                {customer.email}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Location Card */}
        <Card className="qatar-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Location</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{project.location}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Project Site
            </p>
          </CardContent>
        </Card>

        {/* Budget Card */}
        <Card className="qatar-card">
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatCurrency(project.estimated_cost)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Estimated Cost
            </p>
          </CardContent>
        </Card>

        {/* Timeline Card */}
        <Card className="qatar-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timeline</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {daysRemaining !== null ? (
                daysRemaining > 0 ? (
                  `${daysRemaining} days`
                ) : daysRemaining === 0 ? (
                  "Due today"
                ) : (
                  `${Math.abs(daysRemaining)} days overdue`
                )
              ) : (
                "—"
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Remaining
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Project Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Timeline */}
        <Card className="qatar-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Project Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Start Date</span>
              <span className="font-medium">{formatDate(project.start_date)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">End Date</span>
              <span className="font-medium">{formatDate(project.end_date)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              {getStatusBadge(project.status)}
            </div>
          </CardContent>
        </Card>

        {/* Project Progress with Pie Chart */}
        <Card className="qatar-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Progress Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalPanels === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-10">
                No panels yet for this project
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Installed vs Estimated</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                          {pieData.map((entry) => (
                            <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#999999"} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any, name: any) => [`${value} (${Math.round(((value as number) / totalPanels) * 100)}%)`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {pieData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: STATUS_COLORS[item.name] || "#999999" }} />
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                        <span className="font-medium text-foreground">{item.value}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Total Panels</span>
                      <span className="font-medium text-foreground">{totalPanels}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Estimated Panels</span>
                      <span className="font-medium text-foreground">{project.estimated_panels}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Building Totals Section */}
      <Card className="qatar-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Building Totals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Square className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Total Area</span>
              </div>
              <div className="text-2xl font-bold text-card-foreground">
                {(project.total_area || 0).toFixed(2)} m²
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Total Amount</span>
              </div>
              <div className="text-2xl font-bold text-card-foreground">
                {formatQatarRiyal(project.total_amount || 0)}
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Weight className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Total Weight</span>
              </div>
              <div className="text-2xl font-bold text-card-foreground">
                {(project.total_weight || 0).toFixed(2)} kg
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Total Panels</span>
              </div>
              <div className="text-2xl font-bold text-card-foreground">
                {totalPanels}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}