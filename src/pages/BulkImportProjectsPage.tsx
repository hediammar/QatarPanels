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
  Loader2
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

  useEffect(() => {
    fetchCustomers();
  }, []);

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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bulk Import Projects</h1>
          <p className="text-gray-600 mt-2">
            Import multiple projects from an Excel file. Each field is in a separate column for easy editing.
          </p>
        </div>
      </div>

      {!canCreateProjects && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to create projects. Please contact your administrator.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Download */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Excel Template
            </CardTitle>
            <CardDescription>
              Download the Excel template with each field in a separate column. Perfect for editing project data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button onClick={downloadTemplate} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Excel Template (.xlsx)
              </Button>
              <div className="text-xs text-gray-600 text-center">
                Excel files provide better formatting and data validation
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Excel File
            </CardTitle>
            <CardDescription>
              Select an Excel file (.xlsx or .xls) with your project data. Each field should be in a separate column.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="excel-file">Excel File (.xlsx or .xls)</Label>
                <Input
                  id="excel-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={!canCreateProjects}
                />
              </div>
              {file && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Excel Format Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Excel Format Instructions
          </CardTitle>
          <CardDescription>
            Each field should be in a separate column. The template includes sample data and proper formatting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Excel Benefits:</strong> 
                - Each field in its own column
                - Better formatting and data validation
                - Easy to edit and maintain
                - No issues with commas or special characters
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>name</TableHead>
                    <TableHead>customer_name</TableHead>
                    <TableHead>location</TableHead>
                    <TableHead>start_date</TableHead>
                    <TableHead>end_date</TableHead>
                    <TableHead>status</TableHead>
                    <TableHead>estimated_cost</TableHead>
                    <TableHead>estimated_panels</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Project Alpha</TableCell>
                    <TableCell>Al Rayyan Construction</TableCell>
                    <TableCell>Doha, Qatar</TableCell>
                    <TableCell>2024-01-15</TableCell>
                    <TableCell>2024-06-30</TableCell>
                    <TableCell>active</TableCell>
                    <TableCell>500000</TableCell>
                    <TableCell>1200</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>How to use:</strong> 
                1. Download the Excel template → 2. Edit the data → 3. Save as .xlsx → 4. Upload back
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {parsedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Validation Results
            </CardTitle>
            <CardDescription>
              {validRows} of {totalRows} rows are valid for import.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {validRows} Valid
                </Badge>
                {invalidRows > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    {invalidRows} Invalid
                  </Badge>
                )}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((row, index) => {
                    const validation = validationResults[index];
                    return (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.customer_name}</TableCell>
                        <TableCell>
                          {validation?.isValid ? (
                            <Badge variant="default" className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              Invalid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {validation?.errors.map((error, i) => (
                              <div key={i} className="text-sm text-red-600">{error}</div>
                            ))}
                            {validation?.warnings.map((warning, i) => (
                              <div key={i} className="text-sm text-yellow-600">{warning}</div>
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
        <Card>
          <CardHeader>
            <CardTitle>Import Actions</CardTitle>
            <CardDescription>
              Import {validRows} valid projects to the database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing projects...
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={importProjects} 
                  disabled={!canCreateProjects || isImporting || validRows === 0}
                  className="flex items-center gap-2"
                >
                  {isImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Import {validRows} Projects
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
            <CardDescription>
              Results from the latest import operation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {importResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={result.success ? 'text-green-800' : 'text-red-800'}>
                      {result.message}
                    </span>
                  </div>
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-2 text-sm text-red-600">
                      {result.errors.map((error, i) => (
                        <div key={i}>• {error}</div>
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
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Available Customers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Available Customers
          </CardTitle>
          <CardDescription>
            These are the customers available in the database. Use exact names in your Excel file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {customers.map((customer) => (
              <Badge key={customer.id} variant="outline" className="justify-start">
                {customer.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}