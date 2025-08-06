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
  Building,
  Calendar,
  Hash,
  Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission, UserRole } from '../utils/rolePermissions';
import * as XLSX from 'xlsx';

interface PanelImportData {
  project_name: string;
  name: string;
  type: string;
  status: string;
  date: string;
  issue_transmittal_no: string;
  dwg_no: string;
  description: string;
  panel_tag: string;
  unit_qty: string;
  ifp_qty_nos: string;
  ifp_qty: string;
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

export function BulkImportPanelsPage() {
  const { user: currentUser } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<PanelImportData[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // RBAC Permission check
  const canCreatePanels = currentUser?.role ? hasPermission(currentUser.role as UserRole, 'panels', 'canCreate') : false;

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (err: any) {
      setError('Failed to fetch projects: ' + err.message);
    }
  };

  const downloadTemplate = () => {
        // Create sample data
    const sampleData = [
             {
          project_name: 'Project Alpha',
          name: 'Panel A-001',
          type: 'UHPC',
          status: 'Issued for Production',
          date: '15/01/2024',
          issue_transmittal_no: 'IT-001',
          dwg_no: 'DWG-001',
          description: 'Exterior wall panel',
          panel_tag: 'A-001',
          unit_qty: '10.5',
          ifp_qty_nos: '5',
          ifp_qty: '52.5'
        },
        {
          project_name: 'Project Beta',
          name: 'Panel B-002',
          type: 'GRC',
          status: 'Produced',
          date: '01.02.2024',
          issue_transmittal_no: 'IT-002',
          dwg_no: 'DWG-002',
          description: 'Interior partition panel',
          panel_tag: 'B-002',
          unit_qty: '8.0',
          ifp_qty_nos: '3',
          ifp_qty: '24.0'
        },
        {
          project_name: 'Project Gamma',
          name: 'Panel C-003',
          type: 'EIFS',
          status: 'Proceed for Delivery',
          date: '2024-03-01',
          issue_transmittal_no: 'IT-003',
          dwg_no: 'DWG-003',
          description: 'Roof panel',
          panel_tag: 'C-003',
          unit_qty: '15.0',
          ifp_qty_nos: '2',
          ifp_qty: '30.0'
        }
     ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);

    // Set column headers
    const headers = [
      'project_name',
      'name',
      'type',
      'status',
      'date',
      'issue_transmittal_no',
      'dwg_no',
      'description',
      'panel_tag',
      'unit_qty',
      'ifp_qty_nos',
      'ifp_qty'
    ];

    // Add headers to the first row
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A1' });

    // Set column widths
    const colWidths = [
      { wch: 20 }, // project_name
      { wch: 15 }, // name
      { wch: 8 },  // type
      { wch: 8 },  // status
      { wch: 12 }, // date
      { wch: 18 }, // issue_transmittal_no
      { wch: 12 }, // dwg_no
      { wch: 25 }, // description
      { wch: 12 }, // panel_tag
      { wch: 10 }, // unit_qty
      { wch: 12 }, // ifp_qty_nos
      { wch: 10 }  // ifp_qty
    ];
    ws['!cols'] = colWidths;

    // Add the worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Panels');

    // Generate and download the file
    XLSX.writeFile(wb, 'panels_import_template.xlsx');
  };

  const parseExcel = (file: File): Promise<PanelImportData[]> => {
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
          const panels: PanelImportData[] = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            
            // Check if row has any data (not completely empty)
            const hasData = row && row.some((cell: any) => cell !== null && cell !== undefined && cell !== '');
            
            if (hasData) {
              panels.push({
                project_name: row[0]?.toString().trim() || '',
                name: row[1]?.toString().trim() || '',
                type: row[2]?.toString().trim() || '',
                status: row[3]?.toString().trim() || '',
                date: row[4]?.toString().trim() || '',
                issue_transmittal_no: row[5]?.toString().trim() || '',
                dwg_no: row[6]?.toString().trim() || '',
                description: row[7]?.toString().trim() || '',
                panel_tag: row[8]?.toString().trim() || '',
                unit_qty: row[9]?.toString().trim() || '',
                ifp_qty_nos: row[10]?.toString().trim() || '',
                ifp_qty: row[11]?.toString().trim() || ''
              });
            }
          }
          
          resolve(panels);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const validateData = (data: PanelImportData[]): ValidationResult[] => {
    return data.map((row, index) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Required field validation
      if (!row.name?.trim()) {
        errors.push('Panel name is required');
      }

      // Project name validation - only validate if provided
      if (row.project_name && row.project_name.trim()) {
        const projectExists = projects.find(p => 
          p.name.toLowerCase() === row.project_name?.toLowerCase()
        );
        if (!projectExists) {
          errors.push(`Project "${row.project_name}" not found in database`);
        }
      }

      // Date validation - only validate if date is provided
      if (row.date && row.date.trim()) {
        const dateStr = row.date.trim();
        
        // Helper function to parse date in different formats (same as import function)
        const parseDateForValidation = (dateStr: string): Date | null => {
          if (!dateStr.trim()) return null;
          
          const str = dateStr.trim();
          
          // Handle 0000-00-00 format - convert to earliest valid date
          if (str === '0000-00-00' || str === '00/00/0000' || str === '00.00.0000') {
            return new Date('1900-01-01'); // Use 1900 instead of 0001 for better compatibility
          }
          
          try {
            // Try different date formats
            if (str.includes('/')) {
              // Format: DD/MM/YYYY
              const parts = str.split('/');
              if (parts.length === 3) {
                // Check for invalid date parts (00/00/YYYY or DD/00/YYYY or DD/MM/0000)
                if (parts[0] === '00' || parts[1] === '00' || parts[2] === '0000') {
                  return new Date('1900-01-01'); // Convert to 1900 for better compatibility
                }
                const year = parseInt(parts[2]);
                const month = parseInt(parts[1]) - 1;
                const day = parseInt(parts[0]);
                
                // Validate date components
                if (year < 1900 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) {
                  return new Date('1900-01-01');
                }
                
                return new Date(year, month, day);
              }
            } else if (str.includes('.')) {
              // Format: DD.MM.YYYY
              const parts = str.split('.');
              if (parts.length === 3) {
                // Check for invalid date parts (00.00.YYYY or DD.00.YYYY or DD.MM.0000)
                if (parts[0] === '00' || parts[1] === '00' || parts[2] === '0000') {
                  return new Date('1900-01-01'); // Convert to 1900 for better compatibility
                }
                const year = parseInt(parts[2]);
                const month = parseInt(parts[1]) - 1;
                const day = parseInt(parts[0]);
                
                // Validate date components
                if (year < 1900 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) {
                  return new Date('1900-01-01');
                }
                
                return new Date(year, month, day);
              }
            } else if (str.includes('-')) {
              // Format: YYYY-MM-DD
              const parts = str.split('-');
              if (parts.length === 3) {
                // Check for invalid date parts (0000-MM-DD or YYYY-00-DD or YYYY-MM-00)
                if (parts[0] === '0000' || parts[1] === '00' || parts[2] === '00') {
                  return new Date('1900-01-01'); // Convert to 1900 for better compatibility
                }
                const year = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const day = parseInt(parts[2]);
                
                // Validate date components
                if (year < 1900 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) {
                  return new Date('1900-01-01');
                }
                
                return new Date(year, month, day);
              }
            }
            
            // Try parsing as ISO string
            const parsedDate = new Date(str);
            if (!isNaN(parsedDate.getTime())) {
              // Validate the parsed date is within reasonable range
              const year = parsedDate.getFullYear();
              if (year >= 1900 && year <= 2100) {
                return parsedDate;
              }
            }
            
            // If all else fails, return 1900-01-01
            return new Date('1900-01-01');
          } catch (error) {
            // If any error occurs, return 1900-01-01
            return new Date('1900-01-01');
          }
        };
        
        const panelDate = parseDateForValidation(dateStr);
        
        if (!panelDate || isNaN(panelDate.getTime())) {
          errors.push('Invalid date format (use DD/MM/YYYY, DD.MM.YYYY, or YYYY-MM-DD)');
        }
      }

      // Type validation - only validate if type is provided
      if (row.type && row.type.trim()) {
        const typeText = row.type.toUpperCase().trim();
        
        // Check for valid panel types
        const validTypes = ['GRC', 'GRG', 'GRP', 'EIFS', 'UHPC'];
        
        if (!validTypes.includes(typeText)) {
          errors.push(`Invalid panel type "${row.type}". Valid types are: GRC, GRG, GRP, EIFS, UHPC`);
        }
      }

      // Status validation - only validate if status is provided
      if (row.status && row.status.trim()) {
        const statusText = row.status.toLowerCase().trim();
        
        // Check for common typos and variations
        const statusVariations: { [key: string]: string } = {
          'issued for production': 'issued for production',
          'produced': 'produced',
          'inspected': 'inspected',
          'approved material': 'approved material',
          'rejected material': 'rejected material',
          'issued': 'issued',
          'proceed for delivery': 'proceed for delivery',
          'procced for delivery': 'proceed for delivery', // Handle typo
          'delivered': 'delivered',
          'installed': 'installed',
          'approved final': 'approved final',
          'broken at site': 'broken at site',
          'on hold': 'on hold',
          'cancelled': 'cancelled'
        };
        
        if (!statusVariations[statusText]) {
          warnings.push(`Status "${row.status}" is not a standard value (did you mean "Proceed for Delivery" or "Issued for Production"?)`);
        }
      }

      // Numeric validation - only validate if values are provided
      if (row.unit_qty && row.unit_qty.trim()) {
        const unitQty = Number(row.unit_qty);
        if (isNaN(unitQty)) {
          errors.push('Unit quantity must be a number');
        }
      }

      if (row.ifp_qty_nos && row.ifp_qty_nos.trim()) {
        const ifpQtyNos = Number(row.ifp_qty_nos);
        if (isNaN(ifpQtyNos)) {
          errors.push('IFP quantity numbers must be a number');
        }
      }

      if (row.ifp_qty && row.ifp_qty.trim()) {
        const ifpQty = Number(row.ifp_qty);
        if (isNaN(ifpQty)) {
          errors.push('IFP quantity must be a number');
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

  const importPanels = async () => {
    if (!canCreatePanels) {
      setError('You do not have permission to create panels');
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
        // Find project ID
        const project = row.project_name && row.project_name.trim() 
          ? projects.find(p => p.name.toLowerCase() === row.project_name.toLowerCase())
          : null;

        // Helper function to parse date in different formats
        const parseDate = (dateStr: string): Date | null => {
          if (!dateStr.trim()) return null;
          
          const str = dateStr.trim();
          
          // Handle 0000-00-00 format - convert to earliest valid date
          if (str === '0000-00-00' || str === '00/00/0000' || str === '00.00.0000') {
            return new Date('1900-01-01'); // Use 1900 instead of 0001 for better compatibility
          }
          
          try {
            // Try different date formats
            if (str.includes('/')) {
              // Format: DD/MM/YYYY
              const parts = str.split('/');
              if (parts.length === 3) {
                // Check for invalid date parts (00/00/YYYY or DD/00/YYYY or DD/MM/0000)
                if (parts[0] === '00' || parts[1] === '00' || parts[2] === '0000') {
                  return new Date('1900-01-01'); // Convert to 1900 for better compatibility
                }
                const year = parseInt(parts[2]);
                const month = parseInt(parts[1]) - 1;
                const day = parseInt(parts[0]);
                
                // Validate date components
                if (year < 1900 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) {
                  return new Date('1900-01-01');
                }
                
                return new Date(year, month, day);
              }
            } else if (str.includes('.')) {
              // Format: DD.MM.YYYY
              const parts = str.split('.');
              if (parts.length === 3) {
                // Check for invalid date parts (00.00.YYYY or DD.00.YYYY or DD.MM.0000)
                if (parts[0] === '00' || parts[1] === '00' || parts[2] === '0000') {
                  return new Date('1900-01-01'); // Convert to 1900 for better compatibility
                }
                const year = parseInt(parts[2]);
                const month = parseInt(parts[1]) - 1;
                const day = parseInt(parts[0]);
                
                // Validate date components
                if (year < 1900 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) {
                  return new Date('1900-01-01');
                }
                
                return new Date(year, month, day);
              }
            } else if (str.includes('-')) {
              // Format: YYYY-MM-DD
              const parts = str.split('-');
              if (parts.length === 3) {
                // Check for invalid date parts (0000-MM-DD or YYYY-00-DD or YYYY-MM-00)
                if (parts[0] === '0000' || parts[1] === '00' || parts[2] === '00') {
                  return new Date('1900-01-01'); // Convert to 1900 for better compatibility
                }
                const year = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const day = parseInt(parts[2]);
                
                // Validate date components
                if (year < 1900 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) {
                  return new Date('1900-01-01');
                }
                
                return new Date(year, month, day);
              }
            }
            
            // Try parsing as ISO string
            const parsedDate = new Date(str);
            if (!isNaN(parsedDate.getTime())) {
              // Validate the parsed date is within reasonable range
              const year = parsedDate.getFullYear();
              if (year >= 1900 && year <= 2100) {
                return parsedDate;
              }
            }
            
            // If all else fails, return 1900-01-01
            return new Date('1900-01-01');
          } catch (error) {
            // If any error occurs, return 1900-01-01
            return new Date('1900-01-01');
          }
        };

        // Helper function to map status text to numeric value
        const mapStatusToNumber = (statusText: string): number | null => {
          if (!statusText.trim()) return null;
          
          const status = statusText.toLowerCase().trim();
          
          // Map common status texts to numeric values (including typos)
          const statusMap: { [key: string]: number } = {
            'issued for production': 1,
            'produced': 2,
            'inspected': 3,
            'approved material': 4,
            'rejected material': 5,
            'issued': 6,
            'proceed for delivery': 7,
            'procced for delivery': 7, // Handle typo
            'delivered': 8,
            'installed': 9,
            'approved final': 10,
            'broken at site': 11,
            'on hold': 12,
            'cancelled': 13
          };
          
          return statusMap[status] || null;
        };

        // Helper function to map panel type text to numeric value
        const mapTypeToNumber = (typeText: string): number | null => {
          if (!typeText.trim()) return null;
          
          const type = typeText.toUpperCase().trim();
          
          // Map panel type texts to numeric values
          const typeMap: { [key: string]: number } = {
            'GRC': 1,
            'GRG': 2,
            'GRP': 3,
            'EIFS': 4,
            'UHPC': 5
          };
          
          return typeMap[type] || null;
        };

        // Prepare panel data
        const panelData = {
          name: row.name.trim(),
          type: row.type?.trim() ? mapTypeToNumber(row.type) : null, // Map text to number
          status: row.status?.trim() ? mapStatusToNumber(row.status) : null,
          project_id: project?.id || null,
          issue_transmittal_no: row.issue_transmittal_no?.trim() || null,
          drawing_number: row.dwg_no?.trim() || null,
          unit_rate_qr_m2: row.unit_qty?.trim() ? parseFloat(row.unit_qty) : null,
          ifp_qty_area_sm: row.ifp_qty?.trim() ? parseFloat(row.ifp_qty) : null,
          ifp_qty_nos: row.ifp_qty_nos?.trim() ? parseInt(row.ifp_qty_nos) : null,
          issued_for_production_date: row.date?.trim() ? parseDate(row.date)?.toISOString().split('T')[0] || null : null,
          user_id: currentUser?.id || null
        };

        // Insert panel
        const { data: newPanel, error } = await supabase
          .from('panels')
          .insert(panelData)
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
            data: newPanel
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
          <h1 className="text-3xl font-bold text-gray-900">Bulk Import Panels</h1>
          <p className="text-gray-600 mt-2">
            Import multiple panels from an Excel file. Each field is in a separate column for easy editing.
          </p>
        </div>
      </div>

      {!canCreatePanels && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to create panels. Please contact your administrator.
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
              Download the Excel template with each field in a separate column. Perfect for editing panel data.
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
              Select an Excel file (.xlsx or .xls) with your panel data. Each field should be in a separate column.
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
                  disabled={!canCreatePanels}
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
                 - Empty rows are automatically ignored
                 - Supports multiple date formats (DD/MM/YYYY, DD.MM.YYYY, YYYY-MM-DD)
                 - Handles invalid dates like 0000-00-00 (converts to 0001-01-01)
               </p>
             </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>project_name</TableHead>
                    <TableHead>name</TableHead>
                    <TableHead>type</TableHead>
                    <TableHead>status</TableHead>
                    <TableHead>date</TableHead>
                    <TableHead>issue_transmittal_no</TableHead>
                    <TableHead>dwg_no</TableHead>
                    <TableHead>description</TableHead>
                    <TableHead>panel_tag</TableHead>
                    <TableHead>unit_qty</TableHead>
                    <TableHead>ifp_qty_nos</TableHead>
                    <TableHead>ifp_qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                                     <TableRow>
                     <TableCell>Project Alpha</TableCell>
                     <TableCell>Panel A-001</TableCell>
                     <TableCell>UHPC</TableCell>
                     <TableCell>Issued for Production</TableCell>
                     <TableCell>15/01/2024</TableCell>
                     <TableCell>IT-001</TableCell>
                     <TableCell>DWG-001</TableCell>
                     <TableCell>Exterior wall panel</TableCell>
                     <TableCell>A-001</TableCell>
                     <TableCell>10.5</TableCell>
                     <TableCell>5</TableCell>
                     <TableCell>52.5</TableCell>
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
             
                           <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800 mb-2">
                  <strong>Available Panel Types:</strong>
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div>• GRC</div>
                  <div>• GRG</div>
                  <div>• GRP</div>
                  <div>• EIFS</div>
                  <div>• UHPC</div>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800 mb-2">
                  <strong>Available Status Values:</strong>
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div>• Issued for Production</div>
                  <div>• Produced</div>
                  <div>• Inspected</div>
                  <div>• Approved Material</div>
                  <div>• Rejected Material</div>
                  <div>• Issued</div>
                  <div>• Proceed for Delivery</div>
                  <div>• Procced for Delivery (typo)</div>
                  <div>• Delivered</div>
                  <div>• Installed</div>
                  <div>• Approved Final</div>
                  <div>• Broken at Site</div>
                  <div>• On Hold</div>
                  <div>• Cancelled</div>
                </div>
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
                    <TableHead>Panel Name</TableHead>
                    <TableHead>Project</TableHead>
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
                        <TableCell>{row.project_name}</TableCell>
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
              Import {validRows} valid panels to the database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing panels...
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={importPanels} 
                  disabled={!canCreatePanels || isImporting || validRows === 0}
                  className="flex items-center gap-2"
                >
                  {isImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Import {validRows} Panels
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

      {/* Available Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Available Projects
          </CardTitle>
          <CardDescription>
            These are the projects available in the database. Use exact names in your Excel file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {projects.map((project) => (
              <Badge key={project.id} variant="outline" className="justify-start">
                {project.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 