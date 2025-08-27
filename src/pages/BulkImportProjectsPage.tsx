import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Users,
  Calendar,
  MapPin,
  DollarSign,
  Hash,
  Loader2,
  Sparkles,
  BarChart3,
  Settings,
  Zap,
  ArrowRight,
  CheckSquare,
  Clock,
  TrendingUp,
  Building2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission, UserRole } from '../utils/rolePermissions';
import * as XLSX from 'xlsx';

interface ProjectImportData {
  name: string;
  customer_name: string;
  location: string;
  start_date: string;
  end_date: string;
  status: string;
  estimated_cost: number;
  estimated_panels: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ImportResult {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
}

export function BulkImportProjectsPage() {
  const { user: currentUser } = useAuth();
  
  // Check if user has permission to bulk import projects
  const canBulkImportProjects = currentUser?.role ? hasPermission(currentUser.role as UserRole, 'projects', 'canBulkImport') : false;
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ProjectImportData[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // RBAC Permission check
  const canCreateProjects = currentUser?.role ? hasPermission(currentUser.role as UserRole, 'projects', 'canCreate') : false;

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (err: any) {
      setError('Failed to fetch customers: ' + err.message);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Check if user has permission to bulk import projects
  if (!canBulkImportProjects) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <Card className="border-0 shadow-2xl bg-card">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold text-card-foreground mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to bulk import projects.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const downloadTemplate = () => {
    // Create sample data
    const sampleData = [
      {
        name: 'Project Alpha',
        customer_name: 'Al Rayyan Construction',
        location: 'Doha, Qatar',
        start_date: '2024-01-15',
        end_date: '2024-06-30',
        status: 'active',
        estimated_cost: 500000,
        estimated_panels: 1200
      },
      {
        name: 'Project Beta',
        customer_name: 'Qatar Building Solutions',
        location: 'Al Wakrah, Qatar',
        start_date: '2024-02-01',
        end_date: '2024-08-15',
        status: 'active',
        estimated_cost: 750000,
        estimated_panels: 1800
      },
      {
        name: 'Project Gamma',
        customer_name: 'Doha Development Corp',
        location: 'West Bay, Qatar',
        start_date: '2024-03-01',
        end_date: '2024-09-30',
        status: 'active',
        estimated_cost: 300000,
        estimated_panels: 800
      }
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);

    // Set column headers
    const headers = [
      'name',
      'customer_name', 
      'location',
      'start_date',
      'end_date',
      'status',
      'estimated_cost',
      'estimated_panels'
    ];

    // Add headers to the first row
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A1' });

    // Set column widths
    const colWidths = [
      { wch: 20 }, // name
      { wch: 25 }, // customer_name
      { wch: 20 }, // location
      { wch: 12 }, // start_date
      { wch: 12 }, // end_date
      { wch: 10 }, // status
      { wch: 15 }, // estimated_cost
      { wch: 15 }  // estimated_panels
    ];
    ws['!cols'] = colWidths;

    // Add the worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Projects');

    // Generate and download the file
    XLSX.writeFile(wb, 'projects_import_template.xlsx');
  };

  const parseExcel = (file: File): Promise<ProjectImportData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first worksheet
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Skip header row and convert to our format
          const projects: ProjectImportData[] = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (row && row.length > 0 && row[0]) { // Check if row exists and has data
              projects.push({
                name: row[0]?.toString().trim() || '',
                customer_name: row[1]?.toString().trim() || '',
                location: row[2]?.toString().trim() || '',
                start_date: row[3]?.toString().trim() || '',
                end_date: row[4]?.toString().trim() || '',
                status: row[5]?.toString().trim() || '',
                estimated_cost: row[6] && row[6] !== '' ? Number(row[6]) : 0,
                estimated_panels: row[7] && row[7] !== '' ? Number(row[7]) : 0
              });
            }
          }
          
          resolve(projects);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const validateData = (data: ProjectImportData[]): ValidationResult[] => {
    return data.map((row, index) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Required field validation
      if (!row.name?.trim()) {
        errors.push('Project name is required');
      }

      // Customer name validation - only validate if provided
      if (row.customer_name && row.customer_name.trim()) {
        const customerExists = customers.find(c => 
          c.name.toLowerCase() === row.customer_name?.toLowerCase()
        );
        if (!customerExists) {
          errors.push(`Customer "${row.customer_name}" not found in database`);
        }
      }

      // Date validation - only validate if dates are provided
      if (row.start_date && row.start_date.trim()) {
        const startDate = new Date(row.start_date);
        if (isNaN(startDate.getTime())) {
          errors.push('Invalid start date format (use YYYY-MM-DD)');
        }
      }
      if (row.end_date && row.end_date.trim()) {
        const endDate = new Date(row.end_date);
        if (isNaN(endDate.getTime())) {
          errors.push('Invalid end date format (use YYYY-MM-DD)');
        }
      }

      // Status validation - only validate if status is provided
      if (row.status && row.status.trim()) {
        const validStatuses = ['active', 'inactive', 'completed', 'on-hold'];
        if (!validStatuses.includes(row.status.toLowerCase())) {
          warnings.push(`Status "${row.status}" is not a standard value`);
        }
      }

      // Numeric validation - only validate if values are provided
      if (row.estimated_cost && row.estimated_cost > 0) {
        if (isNaN(Number(row.estimated_cost))) {
          errors.push('Estimated cost must be a number');
        }
      }
      if (row.estimated_panels && row.estimated_panels > 0) {
        if (isNaN(Number(row.estimated_panels))) {
          errors.push('Estimated panels must be a number');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setFile(file);
    setError(null);
    setParsedData([]);
    setValidationResults([]);
    setImportResults([]);

    try {
      const data = await parseExcel(file);
      setParsedData(data);
      const validation = validateData(data);
      setValidationResults(validation);
    } catch (err: any) {
      setError('Failed to parse Excel file: ' + err.message);
    }
  };

  const importProjects = async () => {
    if (!canCreateProjects) {
      setError('You do not have permission to create projects');
      return;
    }

    const validData = parsedData.filter((_, index) => validationResults[index]?.isValid);
    if (validData.length === 0) {
      setError('No valid data to import');
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setImportResults([]);

    const results: ImportResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < validData.length; i++) {
      const row = validData[i];
      try {
        // Find customer ID
        const customer = row.customer_name && row.customer_name.trim() 
          ? customers.find(c => c.name.toLowerCase() === row.customer_name.toLowerCase())
          : null;

        // Prepare project data
        const projectData = {
          name: row.name.trim(),
          customer_id: customer?.id || null,
          location: row.location?.trim() || null,
          start_date: row.start_date?.trim() ? new Date(row.start_date).toISOString().split('T')[0] : null,
          end_date: row.end_date?.trim() ? new Date(row.end_date).toISOString().split('T')[0] : null,
          status: row.status?.toLowerCase().trim() || 'active',
          estimated_cost: row.estimated_cost && row.estimated_cost > 0 ? parseInt(row.estimated_cost.toString()) : null,
          estimated_panels: row.estimated_panels && row.estimated_panels > 0 ? parseInt(row.estimated_panels.toString()) : null,
          user_id: currentUser?.id || null
        };

        // Insert project
        const { data: newProject, error } = await supabase
          .from('projects')
          .insert(projectData)
          .select()
          .single();

        if (error) {
          results.push({
            success: false,
            message: `Failed to import "${row.name}"`,
            errors: [error.message]
          });
          errorCount++;
        } else {
          results.push({
            success: true,
            message: `Successfully imported "${row.name}"`,
            data: newProject
          });
          successCount++;
        }
      } catch (err: any) {
        results.push({
          success: false,
          message: `Failed to import "${row.name}"`,
          errors: [err.message]
        });
        errorCount++;
      }

      setProgress(((i + 1) / validData.length) * 100);
      setImportResults([...results]);
    }

    setIsImporting(false);
    setProgress(100);

    // Show summary
    const summary = `Import completed: ${successCount} successful, ${errorCount} failed`;
    if (errorCount > 0) {
      setError(summary);
    } else {
      setError(null);
    }
  };

  const resetForm = () => {
    setFile(null);
    setParsedData([]);
    setValidationResults([]);
    setImportResults([]);
    setProgress(0);
    setError(null);
  };

  const totalRows = parsedData.length;
  const validRows = validationResults.filter(r => r.isValid).length;
  const invalidRows = totalRows - validRows;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            Bulk Import System
          </div>
          <h1 className="text-4xl font-bold text-foreground">
            Bulk Import Projects
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Import multiple projects from an Excel file with intelligent validation and automatic relationship management. 
            Each field is in a separate column for seamless editing.
          </p>
        </div>

        {!canCreateProjects && (
          <Alert className="border-destructive bg-destructive/10 backdrop-blur-sm">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              You do not have permission to create projects. Please contact your administrator.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Template Download */}
          <Card className="border-0 shadow-xl bg-card hover:shadow-2xl transition-all duration-300 group">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Download className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-card-foreground">Download Template</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Get the Excel template with proper formatting
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={downloadTemplate} 
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-12 text-base font-semibold"
              >
                <Download className="h-5 w-5 mr-2" />
                Download Excel Template
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckSquare className="h-4 w-4 text-green-500" />
                <span>Perfect formatting and data validation</span>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card className="border-0 shadow-xl bg-card hover:shadow-2xl transition-all duration-300 group">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Upload className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-card-foreground">Upload File</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Select your Excel file to import
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="excel-file" className="text-sm font-medium text-card-foreground">Excel File (.xlsx or .xls)</Label>
                <Input
                  id="excel-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={!canCreateProjects}
                  className="border-2 border-dashed border-border hover:border-primary transition-colors duration-300 bg-input"
                />
              </div>
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions Card */}
        <Card className="border-0 shadow-xl bg-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-card-foreground">Excel Format Guide</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Each field in its own column for optimal editing experience
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Benefits Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-card-foreground">Excel Benefits</h3>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Each field in its own column
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Better formatting and data validation
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    No issues with commas or special characters
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Supports multiple date formats
                  </li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-card-foreground">Auto Creation</h3>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    Projects created automatically
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    Customer relationships maintained
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    Proper date formatting
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    Status validation
                  </li>
                </ul>
              </div>
            </div>

            {/* Sample Table */}
            <div className="space-y-4">
              <h3 className="font-semibold text-card-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                Sample Data Structure
              </h3>
              <div className="overflow-x-auto rounded-xl border border-border bg-muted">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/50">
                      <TableHead className="font-semibold text-card-foreground">name</TableHead>
                      <TableHead className="font-semibold text-card-foreground">customer_name</TableHead>
                      <TableHead className="font-semibold text-card-foreground">location</TableHead>
                      <TableHead className="font-semibold text-card-foreground">start_date</TableHead>
                      <TableHead className="font-semibold text-card-foreground">status</TableHead>
                      <TableHead className="font-semibold text-card-foreground">estimated_cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-secondary/30 transition-colors">
                      <TableCell className="font-medium text-card-foreground">Project Alpha</TableCell>
                      <TableCell>Al Rayyan Construction</TableCell>
                      <TableCell>Doha, Qatar</TableCell>
                      <TableCell>2024-01-15</TableCell>
                      <TableCell><Badge variant="default">active</Badge></TableCell>
                      <TableCell>500,000 QAR</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Project Status Values */}
            <div className="space-y-3">
              <h4 className="font-semibold text-card-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-500" />
                Available Status Values
              </h4>
              <div className="flex flex-wrap gap-2">
                {['active', 'inactive', 'completed', 'on-hold'].map((status) => (
                  <Badge key={status} variant="outline" className="bg-secondary/50 border-border text-card-foreground">
                    {status}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validation Results */}
        {parsedData.length > 0 && (
          <Card className="border-0 shadow-xl bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-card-foreground">Validation Results</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {validRows} of {totalRows} rows are valid for import
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Badge variant="default" className="bg-status-complete text-status-complete-foreground">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {validRows} Valid
                  </Badge>
                  {invalidRows > 0 && (
                    <Badge variant="destructive" className="bg-status-rejected text-status-rejected-foreground">
                      <XCircle className="h-3 w-3 mr-1" />
                      {invalidRows} Invalid
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-border bg-muted">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/50">
                      <TableHead className="font-semibold text-card-foreground">Row</TableHead>
                      <TableHead className="font-semibold text-card-foreground">Project Name</TableHead>
                      <TableHead className="font-semibold text-card-foreground">Customer</TableHead>
                      <TableHead className="font-semibold text-card-foreground">Status</TableHead>
                      <TableHead className="font-semibold text-card-foreground">Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((row, index) => {
                      const validation = validationResults[index];
                      return (
                        <TableRow key={index} className="hover:bg-secondary/30 transition-colors">
                          <TableCell className="font-medium text-card-foreground">{index + 1}</TableCell>
                          <TableCell className="font-medium text-card-foreground">{row.name}</TableCell>
                          <TableCell>{row.customer_name}</TableCell>
                          <TableCell>
                            {validation?.isValid ? (
                              <Badge variant="default" className="bg-status-complete text-status-complete-foreground">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Valid
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="bg-status-rejected text-status-rejected-foreground">
                                <XCircle className="h-3 w-3 mr-1" />
                                Invalid
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {validation?.errors.map((error, i) => (
                                <div key={i} className="text-sm text-destructive">{error}</div>
                              ))}
                              {validation?.warnings.map((warning, i) => (
                                <div key={i} className="text-sm text-status-onhold-foreground">{warning}</div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Actions */}
        {parsedData.length > 0 && validRows > 0 && (
          <Card className="border-0 shadow-xl bg-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-card-foreground">Import Actions</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Import {validRows} valid projects to the database
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isImporting && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="font-medium text-card-foreground">Importing projects...</span>
                  </div>
                  <Progress value={progress} className="w-full h-3" />
                </div>
              )}

              <div className="flex gap-4">
                <Button 
                  onClick={importProjects} 
                  disabled={!canCreateProjects || isImporting || validRows === 0}
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-12 px-8 text-base font-semibold"
                >
                  {isImporting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                  Import {validRows} Projects
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  onClick={resetForm}
                  className="h-12 px-6 border-2 hover:bg-secondary transition-all duration-300 text-card-foreground border-border"
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Results */}
        {importResults.length > 0 && (
          <Card className="border-0 shadow-xl bg-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-card-foreground">Import Results</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Results from the latest import operation
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {importResults.map((result, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-xl border-2 ${
                      result.success 
                        ? 'bg-status-complete/10 border-status-complete' 
                        : 'bg-status-rejected/10 border-status-rejected'
                    } backdrop-blur-sm`}
                  >
                    <div className="flex items-center gap-3">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-status-complete" />
                      ) : (
                        <XCircle className="h-5 w-5 text-status-rejected" />
                      )}
                      <span className={`font-medium ${result.success ? 'text-status-complete-foreground' : 'text-status-rejected-foreground'}`}>
                        {result.message}
                      </span>
                    </div>
                    {result.errors && result.errors.length > 0 && (
                      <div className="mt-3 text-sm text-destructive space-y-1">
                        {result.errors.map((error, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-destructive rounded-full"></div>
                            {error}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert className="border-destructive bg-destructive/10 backdrop-blur-sm">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {/* Available Customers */}
        <Card className="border-0 shadow-xl bg-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-card-foreground">Available Customers</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Use exact names in your Excel file for existing customers
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {customers.map((customer) => (
                <Badge 
                  key={customer.id} 
                  variant="outline" 
                  className="justify-start bg-secondary/50 border-border text-card-foreground hover:bg-secondary transition-colors duration-200"
                >
                  {customer.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}