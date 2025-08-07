import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import { 
  Users, 
  FolderOpen, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  MapPin,
  Building2,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Target,
  Activity,
  BarChart3
} from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Upload, FileSpreadsheet, Trash2, Download, Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import * as XLSX from 'xlsx';

// Panel status constants - ONLY the 5 specified statuses
const PANEL_STATUSES = [
  "Installed",
  "Delivered", 
  "Rejected",
  "Manufactured",
  "Inspected"
] as const;

type PanelStatus = typeof PANEL_STATUSES[number];

interface DashboardProps {
  customers: any[];
  projects: any[];
  panels: any[];
}

export function Dashboard({ customers, projects, panels }: DashboardProps) {
  // Calculate metrics
  const totalCustomers = customers.length;
  const totalProjects = projects.length;
  const totalPanels = panels.length;
  
  // Project status breakdown
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const onHoldProjects = projects.filter(p => p.status === 'on-hold').length;
  
  // Panel status breakdown with only the 5 specified statuses
  const panelStatusCounts = PANEL_STATUSES.reduce((acc, status) => {
    acc[status] = panels.filter(p => p.status === status).length;
    return acc;
  }, {} as Record<PanelStatus, number>);

  // Calculate project financial metrics
  const totalEstimatedValue = projects.reduce((sum, project) => sum + (project.estimatedCost || 0), 0);
  const totalEstimatedPanels = projects.reduce((sum, project) => sum + (project.estimatedPanels || 0), 0);
  const averageProjectValue = totalProjects > 0 ? totalEstimatedValue / totalProjects : 0;
  
  // Panel completion rate (Installed + Delivered = completed)
  const completedPanelsCount = panelStatusCounts['Installed'] + panelStatusCounts['Delivered'];
  const panelCompletionRate = totalPanels > 0 ? (completedPanelsCount / totalPanels) * 100 : 0;

  // Project progress tracking
  const projectProgress = totalEstimatedPanels > 0 ? (totalPanels / totalEstimatedPanels) * 100 : 0;
  
  // Recent activity (last 30 days simulation)
  const recentProjects = projects.filter(p => {
    const startDate = new Date(p.startDate);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return startDate >= thirtyDaysAgo;
  }).length;

  // Location-based project distribution
  const locationData = projects.reduce((acc, project) => {
    const location = project.location || 'Unknown';
    acc[location] = (acc[location] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const locationChartData = Object.entries(locationData)
    .map(([location, count]) => ({ location, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Panel status chart data for pie chart
  const panelStatusChartData = PANEL_STATUSES.map(status => ({
    status,
    count: panelStatusCounts[status]
  })).filter(item => item.count > 0);

  // Monthly project trend (simulated)
  const monthlyTrend = [
    { month: 'Jan', projects: Math.max(0, totalProjects - 5), value: Math.max(0, totalEstimatedValue - 500000) },
    { month: 'Feb', projects: Math.max(0, totalProjects - 4), value: Math.max(0, totalEstimatedValue - 400000) },
    { month: 'Mar', projects: Math.max(0, totalProjects - 3), value: Math.max(0, totalEstimatedValue - 300000) },
    { month: 'Apr', projects: Math.max(0, totalProjects - 2), value: Math.max(0, totalEstimatedValue - 200000) },
    { month: 'May', projects: Math.max(0, totalProjects - 1), value: Math.max(0, totalEstimatedValue - 100000) },
    { month: 'Jun', projects: totalProjects, value: totalEstimatedValue }
  ];

  // Vibrant Qatar theme-aligned color schemes - much brighter and more appealing
  const STATUS_COLORS: Record<PanelStatus, string> = {
    'Installed': '#10B981',      // Bright emerald green - success/completion
    'Delivered': '#3B82F6',      // Bright blue - delivery/transport
    'Rejected': '#EF4444',       // Bright red - issues/rejection
    'Manufactured': '#F59E0B',   // Bright amber - manufacturing/production
    'Inspected': '#8B5CF6'       // Bright purple - quality control
  };

  // Enhanced chart colors with better contrast and vibrancy
  const CHART_COLORS = {
    primary: '#DC2626',              // Vibrant red (primary brand)
    secondary: '#059669',            // Emerald green (success)
    accent: '#7C3AED',              // Purple (accent)
    warning: '#D97706',             // Orange (warning)
    info: '#2563EB',                // Blue (info)
    success: '#059669',             // Green (success)
    danger: '#DC2626',              // Red (danger)
    muted: '#6B7280',               // Gray (muted)
    mutedForeground: '#D1D5DB',     // Light gray (text)
    border: '#374151',              // Dark gray (borders)
    grid: '#4B5563',                // Gray (grid lines)
    tooltip: '#1F2937',             // Dark gray (tooltip bg)
    tooltipForeground: '#F9FAFB',   // White (tooltip text)
    background: '#FFFFFF',          // White backgrounds
    gradientStart: '#DC2626',       // Red gradient start
    gradientEnd: '#7C2D12'          // Dark red gradient end
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getStatusIcon = (status: PanelStatus) => {
    const iconStyle = "h-4 w-4";
    switch (status) {
      case 'Installed': return <CheckCircle className={`${iconStyle} text-emerald-400`} />;
      case 'Delivered': return <Package className={`${iconStyle} text-blue-400`} />;
      case 'Rejected': return <AlertCircle className={`${iconStyle} text-red-400`} />;
      case 'Manufactured': return <Clock className={`${iconStyle} text-amber-400`} />;
      case 'Inspected': return <CheckCircle className={`${iconStyle} text-purple-400`} />;
    }
  };

  // Enhanced Custom Tooltip with better design
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xl">
          <p className="text-gray-900 font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-700">
                {entry.dataKey}: <span className="font-medium">{entry.value}</span>
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1>Dashboard</h1>
        <p className="text-muted-foreground">Overview of your CRM and precast panel operations</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="qatar-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{formatNumber(totalCustomers)}</div>
            <p className="text-xs text-muted-foreground">
              Active business relationships
            </p>
          </CardContent>
        </Card>

        <Card className="qatar-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Active Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{formatNumber(totalProjects)}</div>
            <p className="text-xs text-muted-foreground">
              {activeProjects} active, {completedProjects} completed
            </p>
          </CardContent>
        </Card>

        <Card className="qatar-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Total Panels</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{formatNumber(totalPanels)}</div>
            <p className="text-xs text-muted-foreground">
              {panelStatusCounts.Installed} installed ({panelCompletionRate.toFixed(1)}% complete)
            </p>
          </CardContent>
        </Card>

        <Card className="qatar-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Project Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{formatCurrency(totalEstimatedValue)}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatCurrency(averageProjectValue)} per project
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Panel Status Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {PANEL_STATUSES.map((status) => (
          <Card key={status} className="qatar-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">{status}</CardTitle>
              {getStatusIcon(status)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">{panelStatusCounts[status]}</div>
              <p className="text-xs text-muted-foreground">
                {totalPanels > 0 ? ((panelStatusCounts[status] / totalPanels) * 100).toFixed(1) : 0}% of total
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress and Analytics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="qatar-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-card-foreground">
              <Target className="h-5 w-5" />
              Manufacturing Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-card-foreground">Panel Production</span>
                <span className="text-sm text-muted-foreground">
                  {totalPanels} / {totalEstimatedPanels}
                </span>
              </div>
              <Progress value={Math.min(projectProgress, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {projectProgress.toFixed(1)}% of estimated panels produced
              </p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-card-foreground">Installation Rate</span>
                <span className="text-sm text-muted-foreground">
                  {panelStatusCounts.Installed} / {totalPanels}
                </span>
              </div>
              <Progress value={totalPanels > 0 ? (panelStatusCounts.Installed / totalPanels) * 100 : 0} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {totalPanels > 0 ? ((panelStatusCounts.Installed / totalPanels) * 100).toFixed(1) : 0}% panels installed
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="qatar-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-card-foreground">
              <Activity className="h-5 w-5" />
              Quality Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-sm text-card-foreground">Quality Pass Rate</span>
              </div>
              <Badge variant="secondary">
                {totalPanels > 0 
                  ? (((totalPanels - panelStatusCounts.Rejected) / totalPanels) * 100).toFixed(1) 
                  : 100}%
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-sm text-card-foreground">Inspected</span>
              </div>
              <Badge variant="secondary">{panelStatusCounts.Inspected}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-sm text-card-foreground">Rejected</span>
              </div>
              <Badge variant="destructive">{panelStatusCounts.Rejected}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="qatar-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-card-foreground">
              <BarChart3 className="h-5 w-5" />
              Key Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-card-foreground">Avg Project Value</span>
              <span className="text-sm font-medium text-card-foreground">{formatCurrency(averageProjectValue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-card-foreground">Avg Panels/Project</span>
              <span className="text-sm font-medium text-card-foreground">
                {totalProjects > 0 ? Math.round(totalEstimatedPanels / totalProjects) : 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-card-foreground">Manufacturing Rate</span>
              <span className="text-sm font-medium text-card-foreground">
                {totalEstimatedPanels > 0 ? ((totalPanels / totalEstimatedPanels) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-card-foreground">Installation Rate</span>
              <span className="text-sm font-medium text-card-foreground">
                {totalPanels > 0 ? ((panelStatusCounts.Installed / totalPanels) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Panel Status Distribution */}
        <Card className="qatar-card">
          <CardHeader>
            <CardTitle className="text-lg text-card-foreground">Panel Status Distribution</CardTitle>
            <CardDescription className="text-muted-foreground">Current status breakdown of all panels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={panelStatusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, count, percent }) => 
                      `${status}: ${(percent ? percent * 100 : 0).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill={CHART_COLORS.primary}
                    dataKey="count"
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {panelStatusChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={STATUS_COLORS[entry.status as PanelStatus]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Panel Processing Pipeline */}
        <Card className="qatar-card">
          <CardHeader>
            <CardTitle className="text-lg text-card-foreground">Processing Pipeline</CardTitle>
            <CardDescription className="text-muted-foreground">Panel status flow and quantities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={panelStatusChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis 
                    dataKey="status" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fill: '#ffffff80', fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: '#ffffff80', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    fill={CHART_COLORS.primary}
                    radius={[4, 4, 0, 0]}
                  >
                    {panelStatusChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={STATUS_COLORS[entry.status as PanelStatus]} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Location Distribution */}
        <Card className="qatar-card">
          <CardHeader>
            <CardTitle className="text-lg text-card-foreground">Projects by Location</CardTitle>
            <CardDescription className="text-muted-foreground">Geographic distribution of projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart layout="vertical" data={locationChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis 
                    type="number" 
                    tick={{ fill: '#ffffff80', fontSize: 12 }}
                  />
                  <YAxis 
                    dataKey="location" 
                    type="category" 
                    width={100}
                    tick={{ fill: '#ffffff80', fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    fill={CHART_COLORS.info}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Manufacturing Timeline */}
        <Card className="qatar-card">
          <CardHeader>
            <CardTitle className="text-lg text-card-foreground">Manufacturing Progress</CardTitle>
            <CardDescription className="text-muted-foreground">Panel production and completion trend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={[
                  { status: 'Manufactured', count: panelStatusCounts.Manufactured, cumulative: panelStatusCounts.Manufactured },
                  { status: 'Inspected', count: panelStatusCounts.Inspected, cumulative: panelStatusCounts.Manufactured + panelStatusCounts.Inspected },
                  { status: 'Delivered', count: panelStatusCounts.Delivered, cumulative: panelStatusCounts.Manufactured + panelStatusCounts.Inspected + panelStatusCounts.Delivered },
                  { status: 'Installed', count: panelStatusCounts.Installed, cumulative: panelStatusCounts.Manufactured + panelStatusCounts.Inspected + panelStatusCounts.Delivered + panelStatusCounts.Installed }
                ]}>
                  <defs>
                    <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis 
                    dataKey="status" 
                    tick={{ fill: '#ffffff80', fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: '#ffffff80', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="cumulative" 
                    stroke={CHART_COLORS.success}
                    fill="url(#colorArea)"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke={CHART_COLORS.warning}
                    strokeWidth={3}
                    dot={{ fill: CHART_COLORS.warning, strokeWidth: 2, r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects Activity */}
      <Card className="qatar-card">
        <CardHeader>
          <CardTitle className="text-lg text-card-foreground">Recent Projects</CardTitle>
          <CardDescription className="text-muted-foreground">Latest project activity and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projects.slice(0, 5).map((project) => (
              <div key={project.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-card-foreground">{project.name}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {project.customer}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {project.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(project.estimatedCost || 0)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {project.status === 'active' && <Badge className="status-active">Active</Badge>}
                  {project.status === 'completed' && <Badge className="status-complete">Completed</Badge>}
                  {project.status === 'on-hold' && <Badge className="status-onhold">On Hold</Badge>}
                  {project.status === 'inactive' && <Badge className="status-inactive">Inactive</Badge>}
                  <span className="text-sm text-muted-foreground">
                    {project.estimatedPanels || 0} panels
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface BulkImportPageProps {
  customers: any[];
  onImportProjects: (projects: any[]) => Promise<void>;
  onNavigateBack: () => void;
}

interface ImportedProject {
  id: string;
  name: string;
  customer: string;
  customerId: string;
  location: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'on-hold';
  estimatedCost: number;
  estimatedPanels: number;
  isValid: boolean;
  errors: string[];
}

export function BulkImportPage({ customers, onImportProjects, onNavigateBack }: BulkImportPageProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [projects, setProjects] = useState<ImportedProject[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState({ successful: 0, failed: 0 });
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter states for preview table
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [validityFilter, setValidityFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const resetImport = () => {
    setStep('upload');
    setFile(null);
    setProjects([]);
    setImporting(false);
    setImportProgress(0);
    setImportResults({ successful: 0, failed: 0 });
    setErrors([]);
    // Reset filters
    setSearchTerm('');
    setCustomerFilter('all');
    setStatusFilter('all');
    setLocationFilter('all');
    setValidityFilter('all');
    setDateRangeFilter('all');
    setCurrentPage(1);
  };

  const handleFilterChange = () => {
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCustomerFilter('all');
    setStatusFilter('all');
    setLocationFilter('all');
    setValidityFilter('all');
    setDateRangeFilter('all');
    setCurrentPage(1);
  };

  // Calculate active filters count
  const activeFiltersCount = [
    searchTerm,
    customerFilter !== 'all' ? customerFilter : '',
    statusFilter !== 'all' ? statusFilter : '',
    locationFilter !== 'all' ? locationFilter : '',
    validityFilter !== 'all' ? validityFilter : '',
    dateRangeFilter !== 'all' ? dateRangeFilter : ''
  ].filter(Boolean).length;

  // Get unique values for filters
  const uniqueCustomers = Array.from(new Set(projects.map(p => p.customer).filter(Boolean))).sort();
  const uniqueLocations = Array.from(new Set(projects.map(p => p.location).filter(Boolean))).sort();

  // Filter projects based on all criteria
  const filteredProjects = projects.filter(project => {
    const matchesSearch = searchTerm === '' || 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCustomer = customerFilter === 'all' || project.customer === customerFilter;
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesLocation = locationFilter === 'all' || project.location === locationFilter;
    const matchesValidity = validityFilter === 'all' || 
      (validityFilter === 'valid' && project.isValid) ||
      (validityFilter === 'invalid' && !project.isValid);
    
    const matchesDateRange = (() => {
      if (dateRangeFilter === 'all') return true;
      if (!project.startDate) return false;
      
      const startDate = new Date(project.startDate);
      const now = new Date();
      
      switch (dateRangeFilter) {
        case 'this-month': {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          return startDate >= monthStart && startDate <= monthEnd;
        }
        case 'this-quarter': {
          const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
          return startDate >= quarterStart && startDate <= quarterEnd;
        }
        case 'this-year': {
          const yearStart = new Date(now.getFullYear(), 0, 1);
          const yearEnd = new Date(now.getFullYear(), 11, 31);
          return startDate >= yearStart && startDate <= yearEnd;
        }
        case 'next-year': {
          const nextYearStart = new Date(now.getFullYear() + 1, 0, 1);
          const nextYearEnd = new Date(now.getFullYear() + 1, 11, 31);
          return startDate >= nextYearStart && startDate <= nextYearEnd;
        }
        default: return true;
      }
    })();
    
    return matchesSearch && matchesCustomer && matchesStatus && matchesLocation && matchesValidity && matchesDateRange;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredProjects.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

  const handleFileUpload = async (selectedFile: File) => {
    if (!selectedFile) return;

    try {
      setFile(selectedFile);
      setErrors([]);
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      if (jsonData.length === 0) {
        setErrors(['The Excel file appears to be empty or invalid.']);
        return;
      }

      // Parse and validate the imported data
      const parsedProjects: ImportedProject[] = jsonData.map((row: any, index: number) => {
        const project: ImportedProject = {
          id: `import-${Date.now()}-${index}`,
          name: row['Project Name'] || row['Name'] || row['project_name'] || '',
          customer: row['Customer'] || row['customer'] || '',
          customerId: '',
          location: row['Location'] || row['location'] || '',
          startDate: formatDate(row['Start Date'] || row['StartDate'] || row['start_date']),
          endDate: formatDate(row['End Date'] || row['EndDate'] || row['end_date']),
          status: normalizeStatus(row['Status'] || row['status'] || 'active'),
          estimatedCost: parseNumber(row['Estimated Cost'] || row['EstimatedCost'] || row['estimated_cost'] || 0),
          estimatedPanels: parseInt(row['Estimated Panels'] || row['EstimatedPanels'] || row['estimated_panels'] || '0') || 0,
          isValid: true,
          errors: []
        };

        // Validate the project
        validateProject(project);
        
        // Try to match customer
        const matchedCustomer = customers.find(c => 
          c.name.toLowerCase().trim() === project.customer.toLowerCase().trim()
        );
        
        if (matchedCustomer) {
          project.customerId = matchedCustomer.id;
        } else if (project.customer) {
          project.errors.push(`Customer "${project.customer}" not found`);
          project.isValid = false;
        }

        return project;
      });

      setProjects(parsedProjects);
      setStep('preview');
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      setErrors(['Failed to parse Excel file. Please ensure it\'s a valid .xlsx file.']);
    }
  };

  const formatDate = (dateValue: any): string => {
    if (!dateValue) return '';
    
    // Handle Excel date serial numbers
    if (typeof dateValue === 'number') {
      const date = new Date((dateValue - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    // Handle string dates
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    return '';
  };

  const parseNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[,$]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const normalizeStatus = (status: string): 'active' | 'completed' | 'on-hold' => {
    const normalized = status.toLowerCase().trim();
    if (normalized.includes('complete')) return 'completed';
    if (normalized.includes('hold') || normalized.includes('pause')) return 'on-hold';
    return 'active';
  };

  const validateProject = (project: ImportedProject) => {
    const errors: string[] = [];

    if (!project.name.trim()) {
      errors.push('Project name is required');
    }

    if (!project.customer.trim()) {
      errors.push('Customer is required');
    }

    if (!project.location.trim()) {
      errors.push('Location is required');
    }

    if (!project.startDate) {
      errors.push('Start date is required');
    }

    if (!project.endDate) {
      errors.push('End date is required');
    }

    if (project.startDate && project.endDate && new Date(project.startDate) >= new Date(project.endDate)) {
      errors.push('End date must be after start date');
    }

    if (project.estimatedCost < 0) {
      errors.push('Estimated cost cannot be negative');
    }

    if (project.estimatedPanels < 0) {
      errors.push('Estimated panels cannot be negative');
    }

    project.errors = errors;
    project.isValid = errors.length === 0;
  };

  const updateProject = (index: number, field: keyof ImportedProject, value: any) => {
    const actualIndex = projects.findIndex(p => p.id === paginatedProjects[index].id);
    const updatedProjects = [...projects];
    (updatedProjects[actualIndex] as any)[field] = value;
    
    // Re-validate after update
    validateProject(updatedProjects[actualIndex]);
    
    // Update customer ID if customer name changed
    if (field === 'customer') {
      const matchedCustomer = customers.find(c => 
        c.name.toLowerCase().trim() === value.toLowerCase().trim()
      );
      updatedProjects[actualIndex].customerId = matchedCustomer?.id || '';
    }
    
    setProjects(updatedProjects);
  };

  const removeProject = (index: number) => {
    const projectToRemove = paginatedProjects[index];
    setProjects(prev => prev.filter(p => p.id !== projectToRemove.id));
  };

  const handleImport = async () => {
    const validProjects = projects.filter(p => p.isValid);
    if (validProjects.length === 0) {
      setErrors(['No valid projects to import. Please fix the errors and try again.']);
      return;
    }

    try {
      setImporting(true);
      setStep('importing');
      setImportProgress(0);

      let successful = 0;
      let failed = 0;

      for (let i = 0; i < validProjects.length; i++) {
        try {
          await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to show progress
          successful++;
        } catch (error) {
          console.error('Error importing project:', error);
          failed++;
        }

        setImportProgress(((i + 1) / validProjects.length) * 100);
      }

      // Call the parent import function with all valid projects
      await onImportProjects(validProjects.map(p => ({
        name: p.name,
        customer: p.customer,
        customerId: p.customerId,
        location: p.location,
        startDate: p.startDate,
        endDate: p.endDate,
        status: p.status,
        estimatedCost: p.estimatedCost,
        estimatedPanels: p.estimatedPanels
      })));

      setImportResults({ successful, failed });
      setStep('complete');
    } catch (error) {
      console.error('Bulk import error:', error);
      setErrors(['Failed to import projects. Please try again.']);
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Project Name': 'Sample Project 1',
        'Customer': 'ACME Corporation',
        'Location': 'New York, NY',
        'Start Date': '2024-01-15',
        'End Date': '2024-06-30',
        'Status': 'active',
        'Estimated Cost': 50000,
        'Estimated Panels': 25
      },
      {
        'Project Name': 'Sample Project 2',
        'Customer': 'TechCorp Inc',
        'Location': 'San Francisco, CA',
        'Start Date': '2024-02-01',
        'End Date': '2024-08-15',
        'Status': 'active',
        'Estimated Cost': 75000,
        'Estimated Panels': 40
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Projects Template');
    XLSX.writeFile(wb, 'projects_import_template.xlsx');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'on-hold': return 'destructive';
      default: return 'secondary';
    }
  };

  const validProjectsCount = projects.filter(p => p.isValid).length;
  const invalidProjectsCount = projects.length - validProjectsCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            Bulk Import Projects
          </h1>
          <p className="text-muted-foreground">Import multiple projects from an Excel file (.xlsx)</p>
        </div>
        
        {step === 'upload' && (
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
        )}
      </div>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-primary' : step === 'preview' || step === 'importing' || step === 'complete' ? 'text-green-600' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${step === 'upload' ? 'border-primary' : step === 'preview' || step === 'importing' || step === 'complete' ? 'border-green-600 bg-green-600 text-white' : 'border-muted-foreground'}`}>
                  {step === 'preview' || step === 'importing' || step === 'complete' ? <CheckCircle className="h-4 w-4" /> : '1'}
                </div>
                <span>Upload File</span>
              </div>
              
              <div className={`flex items-center gap-2 ${step === 'preview' ? 'text-primary' : step === 'importing' || step === 'complete' ? 'text-green-600' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${step === 'preview' ? 'border-primary' : step === 'importing' || step === 'complete' ? 'border-green-600 bg-green-600 text-white' : 'border-muted-foreground'}`}>
                  {step === 'importing' || step === 'complete' ? <CheckCircle className="h-4 w-4" /> : '2'}
                </div>
                <span>Preview & Edit</span>
              </div>
              
              <div className={`flex items-center gap-2 ${step === 'importing' ? 'text-primary' : step === 'complete' ? 'text-green-600' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${step === 'importing' ? 'border-primary' : step === 'complete' ? 'border-green-600 bg-green-600 text-white' : 'border-muted-foreground'}`}>
                  {step === 'complete' ? <CheckCircle className="h-4 w-4" /> : '3'}
                </div>
                <span>Import</span>
              </div>
              
              <div className={`flex items-center gap-2 ${step === 'complete' ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${step === 'complete' ? 'border-primary' : 'border-muted-foreground'}`}>
                  {step === 'complete' ? <CheckCircle className="h-4 w-4" /> : '4'}
                </div>
                <span>Complete</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Step */}
      {step === 'upload' && (
        <div className="space-y-6">
          {errors.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Upload Excel File</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const files = Array.from(e.dataTransfer.files);
                    const excelFile = files.find(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
                    if (excelFile) handleFileUpload(excelFile);
                  }}
                >
                  <Upload className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
                  <h4 className="text-xl font-medium mb-3">Drop your Excel file here</h4>
                  <p className="text-muted-foreground mb-4">or click to browse files</p>
                  <p className="text-sm text-muted-foreground">
                    Supports .xlsx files with the required project columns
                  </p>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Import Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Excel file must be in .xlsx format</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Required columns: Project Name, Customer, Location, Start Date, End Date</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Customer names must match existing customers exactly</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Dates should be in YYYY-MM-DD format or Excel date format</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Optional columns: Status, Estimated Cost, Estimated Panels</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Preview Step */}
      {step === 'preview' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Preview Import Data</h3>
              <p className="text-sm text-muted-foreground">
                Review and edit the imported projects before completing the import
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                {validProjectsCount} Valid
              </Badge>
              {invalidProjectsCount > 0 && (
                <Badge variant="destructive">
                  {invalidProjectsCount} Invalid
                </Badge>
              )}
            </div>
          </div>

          {/* Filters & Search */}
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
                      />
                    </div>
                  </div>

                  {/* Customer Filter */}
                  <div className="space-y-2">
                    <Label>Customer</Label>
                    <Select value={customerFilter} onValueChange={(value) => {
                      setCustomerFilter(value);
                      handleFilterChange();
                    }}>
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
                    <Select value={statusFilter} onValueChange={(value) => {
                      setStatusFilter(value);
                      handleFilterChange();
                    }}>
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
                    <Select value={locationFilter} onValueChange={(value) => {
                      setLocationFilter(value);
                      handleFilterChange();
                    }}>
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
                    <Select value={pageSize.toString()} onValueChange={(value) => {
                      setPageSize(parseInt(value));
                      setCurrentPage(1);
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 per page</SelectItem>
                        <SelectItem value="25">25 per page</SelectItem>
                        <SelectItem value="50">50 per page</SelectItem>
                        <SelectItem value="100">100 per page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Second row */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* Validity Filter */}
                  <div className="space-y-2">
                    <Label>Validation Status</Label>
                    <Select value={validityFilter} onValueChange={(value) => {
                      setValidityFilter(value);
                      handleFilterChange();
                    }}>
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

                  {/* Date Range Filter */}
                  <div className="space-y-2">
                    <Label>Start Date Range</Label>
                    <Select value={dateRangeFilter} onValueChange={(value) => {
                      setDateRangeFilter(value);
                      handleFilterChange();
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any time</SelectItem>
                        <SelectItem value="this-month">This month</SelectItem>
                        <SelectItem value="this-quarter">This quarter</SelectItem>
                        <SelectItem value="this-year">This year</SelectItem>
                        <SelectItem value="next-year">Next year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredProjects.length)} of {filteredProjects.length} projects
                </div>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          {filteredProjects.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead className="min-w-[200px]">Project Name</TableHead>
                        <TableHead className="min-w-[150px]">Customer</TableHead>
                        <TableHead className="min-w-[120px]">Location</TableHead>
                        <TableHead className="min-w-[120px]">Start Date</TableHead>
                        <TableHead className="min-w-[120px]">End Date</TableHead>
                        <TableHead className="min-w-[100px]">Status</TableHead>
                        <TableHead className="min-w-[120px]">Est. Cost</TableHead>
                        <TableHead className="min-w-[100px]">Est. Panels</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProjects.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                              <p className="text-muted-foreground">
                                No projects match your search criteria
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedProjects.map((project, index) => (
                          <TableRow key={project.id} className={!project.isValid ? 'bg-destructive/5' : ''}>
                            <TableCell>
                              {project.isValid ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                value={project.name}
                                onChange={(e) => updateProject(index, 'name', e.target.value)}
                                className={project.errors.some(e => e.includes('name')) ? 'border-destructive' : ''}
                                placeholder="Enter project name"
                              />
                            </TableCell>
                            <TableCell>
                              <Select 
                                value={project.customerId} 
                                onValueChange={(value) => {
                                  const customer = customers.find(c => c.id === value);
                                  updateProject(index, 'customer', customer?.name || '');
                                  updateProject(index, 'customerId', value);
                                }}
                              >
                                <SelectTrigger className={project.errors.some(e => e.includes('Customer')) ? 'border-destructive' : ''}>
                                  <SelectValue placeholder="Select customer" />
                                </SelectTrigger>
                                <SelectContent>
                                  {customers.map((customer) => (
                                    <SelectItem key={customer.id} value={customer.id}>
                                      {customer.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={project.location}
                                onChange={(e) => updateProject(index, 'location', e.target.value)}
                                className={project.errors.some(e => e.includes('location')) ? 'border-destructive' : ''}
                                placeholder="Enter location"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="date"
                                value={project.startDate}
                                onChange={(e) => updateProject(index, 'startDate', e.target.value)}
                                className={project.errors.some(e => e.includes('Start')) ? 'border-destructive' : ''}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="date"
                                value={project.endDate}
                                onChange={(e) => updateProject(index, 'endDate', e.target.value)}
                                className={project.errors.some(e => e.includes('End')) ? 'border-destructive' : ''}
                              />
                            </TableCell>
                            <TableCell>
                              <Select value={project.status} onValueChange={(value: any) => updateProject(index, 'status', value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="on-hold">On Hold</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="100"
                                value={project.estimatedCost}
                                onChange={(e) => updateProject(index, 'estimatedCost', parseInt(e.target.value) || 0)}
                                className={project.errors.some(e => e.includes('cost')) ? 'border-destructive' : ''}
                                placeholder="0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                value={project.estimatedPanels}
                                onChange={(e) => updateProject(index, 'estimatedPanels', parseInt(e.target.value) || 0)}
                                className={project.errors.some(e => e.includes('panels')) ? 'border-destructive' : ''}
                                placeholder="0"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeProject(index)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t">
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
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
          )}

          {invalidProjectsCount > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {invalidProjectsCount} project(s) have validation errors. Please fix them before importing.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep('upload')}>
              Back to Upload
            </Button>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={resetImport}>
                Start Over
              </Button>
              <Button onClick={handleImport} disabled={validProjectsCount === 0}>
                Import {validProjectsCount} Project{validProjectsCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Importing Step */}
      {step === 'importing' && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-6">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-medium">Importing Projects...</h3>
                <p className="text-muted-foreground">Please wait while we process your data</p>
              </div>
              <div className="space-y-4 max-w-md mx-auto">
                <Progress value={importProgress} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  {Math.round(importProgress)}% complete
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Step */}
      {step === 'complete' && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-medium">Import Complete!</h3>
                <p className="text-muted-foreground">
                  {importResults.successful} projects have been imported successfully.
                </p>
              </div>
              <div className="flex items-center justify-center gap-4">
                <Button onClick={resetImport}>
                  Import More Projects
                </Button>
                <Button variant="outline" onClick={onNavigateBack}>
                  Back to Projects
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Main HomePage component that combines Dashboard and BulkImportPage
interface HomePageProps {
  customers?: any[];
  projects?: any[];
  panels?: any[];
}

export function HomePage({ customers = [], projects = [], panels = [] }: HomePageProps) {
  const [currentView, setCurrentView] = useState<'dashboard' | 'bulk-import'>('dashboard');
  const [importedProjects, setImportedProjects] = useState<any[]>([]);

  const handleImportProjects = async (projects: any[]) => {
    // Simulate importing projects
    setImportedProjects(prev => [...prev, ...projects]);
    // In a real app, this would call an API
    return Promise.resolve();
  };

  const handleNavigateBack = () => {
    setCurrentView('dashboard');
  };

  return (
    <div className="container mx-auto p-6">
      {currentView === 'dashboard' ? (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <Button onClick={() => setCurrentView('bulk-import')}>
              Bulk Import Projects
            </Button>
          </div>
          <Dashboard customers={customers} projects={projects} panels={panels} />
        </div>
      ) : (
        <BulkImportPage 
          customers={customers}
          onImportProjects={handleImportProjects}
          onNavigateBack={handleNavigateBack}
        />
      )}
    </div>
  );
}