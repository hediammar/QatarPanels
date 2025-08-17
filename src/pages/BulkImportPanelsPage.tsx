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
  Loader2,
  Edit,
  Plus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission, UserRole } from '../utils/rolePermissions';
import * as XLSX from 'xlsx';
import { crudOperations } from '../utils/userTracking';

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
  dimension?: string;
  building_name?: string;
  facade_name?: string;
  customer_name?: string;
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

interface Building {
  id: string;
  name: string;
  project_id: string;
}

interface Facade {
  id: string;
  name: string;
  building_id?: string;
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
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [facades, setFacades] = useState<Facade[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingPanels, setExistingPanels] = useState<{ [key: string]: any }>({});

  // RBAC Permission check
  const canCreatePanels = currentUser?.role ? hasPermission(currentUser.role as UserRole, 'panels', 'canCreate') : false;

  useEffect(() => {
    fetchProjects();
    fetchBuildings();
    fetchFacades();
    fetchCustomers();
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

  const fetchBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name, project_id')
        .order('name');

      if (error) throw error;
      setBuildings(data || []);
    } catch (err: any) {
      console.error('Failed to fetch buildings:', err);
    }
  };

  const fetchFacades = async () => {
    try {
      const { data, error } = await supabase
        .from('facades')
        .select('id, name, building_id')
        .order('name');

      if (error) throw error;
      setFacades(data || []);
    } catch (err: any) {
      console.error('Failed to fetch facades:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (err: any) {
      console.error('Failed to fetch customers:', err);
    }
  };

  // Helper functions for finding and creating projects, buildings, and facades
  const normalizeName = (value?: string) => (value || "").trim().toLowerCase();

  const findProjectIdByName = (name?: string): string | undefined => {
    if (!name) return undefined;
    const target = normalizeName(name);
    const match = projects.find((p) => normalizeName(p.name) === target);
    return match?.id;
  };

  const findBuildingIdByName = (name?: string, projectId?: string): string | undefined => {
    if (!name || !projectId) return undefined;
    const target = normalizeName(name);
    const match = buildings.find((b) => normalizeName(b.name) === target && b.project_id === projectId);
    return match?.id;
  };

  const findFacadeIdByName = (name?: string, buildingId?: string): string | undefined => {
    if (!name || !buildingId) return undefined;
    const target = normalizeName(name);
    const match = facades.find((f) => normalizeName(f.name) === target && f.building_id === buildingId);
    return match?.id;
  };

  // New function to find existing panel by name
  const findExistingPanelByName = async (panelName: string): Promise<any | null> => {
    if (!panelName?.trim()) return null;
    
    try {
      const { data, error } = await supabase
        .from('panels')
        .select(`
          *,
          projects!inner(name, customer_id),
          buildings(name),
          facades(name)
        `)
        .eq('name', panelName.trim())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - panel doesn't exist
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error finding existing panel:', error);
      return null;
    }
  };

  const createProjectIfNotExists = async (projectName: string, customerId: string): Promise<string | null> => {
    if (!projectName) return null;
    
    // First check if project already exists
    const existingProjectId = findProjectIdByName(projectName);
    if (existingProjectId) {
      return existingProjectId;
    }

    // Create new project with default values
    try {
      const projectData = {
        name: projectName,
        customer_id: customerId, // Set the customer_id
        location: 'Unknown Location',
        status: 'active',
        start_date: new Date().toISOString().split('T')[0], // Default to today
      };

      console.log('Creating new project:', projectData);
      const newProject = await crudOperations.create("projects", projectData);
      
      // Add to local state
      setProjects(prev => [...prev, { id: newProject.id, name: projectName }]);
      
      console.log('Project created successfully:', newProject.id);
      return newProject.id;
    } catch (error) {
      console.error('Error creating project:', error);
      throw new Error(`Failed to create project "${projectName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const createBuildingIfNotExists = async (buildingName: string, projectId: string): Promise<string | null> => {
    if (!buildingName || !projectId) return null;
    
    // First check if building already exists in this project
    const existingBuildingId = findBuildingIdByName(buildingName, projectId);
    if (existingBuildingId) {
      return existingBuildingId;
    }

    // Create new building
    try {
      const buildingData = {
        name: buildingName,
        project_id: projectId,
        status: 0, // Default status
        description: `Building created during bulk import for project ${projectId}`,
      };

      console.log('Creating new building:', buildingData);
      const newBuilding = await crudOperations.create("buildings", buildingData);
      
      // Add to local state
      setBuildings(prev => [...prev, { id: newBuilding.id, name: buildingName, project_id: projectId }]);
      
      console.log('Building created successfully:', newBuilding.id);
      return newBuilding.id;
    } catch (error) {
      console.error('Error creating building:', error);
      throw new Error(`Failed to create building "${buildingName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const createFacadeIfNotExists = async (facadeName: string, buildingId: string): Promise<string | null> => {
    if (!facadeName || !buildingId) return null;
    
    // First check if facade already exists in this building
    const existingFacadeId = findFacadeIdByName(facadeName, buildingId);
    if (existingFacadeId) {
      return existingFacadeId;
    }

    // Create new facade
    try {
      const facadeData = {
        name: facadeName,
        building_id: buildingId,
        status: 0, // Default status
        description: `Facade created during bulk import for building ${buildingId}`,
      };

      console.log('Creating new facade:', facadeData);
      const newFacade = await crudOperations.create("facades", facadeData);
      
      // Add to local state
      setFacades(prev => [...prev, { id: newFacade.id, name: facadeName, building_id: buildingId }]);
      
      console.log('Facade created successfully:', newFacade.id);
      return newFacade.id;
    } catch (error) {
      console.error('Error creating facade:', error);
      throw new Error(`Failed to create facade "${facadeName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const findCustomerIdByName = (name?: string): string | undefined => {
    if (!name) return undefined;
    const target = normalizeName(name);
    const match = customers.find((c) => normalizeName(c.name) === target);
    return match?.id;
  };

  const createCustomerIfNotExists = async (customerName: string): Promise<string | null> => {
    if (!customerName) return null;
    
    // First check if customer already exists
    const existingCustomerId = findCustomerIdByName(customerName);
    if (existingCustomerId) {
      return existingCustomerId;
    }

    // Create new customer
    try {
      const customerData = {
        name: customerName,
        email: `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`, // Generate default email
        phone: '+974-0000-0000', // Default Qatar phone number
      };

      console.log('Creating new customer:', customerData);
      const newCustomer = await crudOperations.create("customers", customerData);
      
      // Add to local state
      setCustomers(prev => [...prev, { id: newCustomer.id, name: customerName }]);
      
      console.log('Customer created successfully:', newCustomer.id);
      return newCustomer.id;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw new Error(`Failed to create customer "${customerName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const resolveProjectBuildingAndFacadeIds = async (row: PanelImportData): Promise<{ 
    project_id?: string, 
    building_id?: string, 
    facade_id?: string 
  }> => {
    let resolvedProjectId = findProjectIdByName(row.project_name);
    let resolvedBuildingId: string | undefined;
    let resolvedFacadeId: string | undefined;

    // If project doesn't exist, create it
    if (!resolvedProjectId) {
      try {
        // First resolve customer if provided, or create a default one
        let customerId: string | null = null;
        
        if (row.customer_name && row.customer_name.trim()) {
          const customer = await createCustomerIfNotExists(row.customer_name);
          customerId = customer;
        } else {
          // Create a default customer for the project
          const defaultCustomerName = `${row.project_name} Customer`;
          const customer = await createCustomerIfNotExists(defaultCustomerName);
          customerId = customer;
        }

        if (!customerId) {
          throw new Error(`Failed to create or find customer for project "${row.project_name}"`);
        }

        const projectId = await createProjectIfNotExists(row.project_name, customerId);
        resolvedProjectId = projectId || undefined;
      } catch (error) {
        console.error('Error resolving project:', error);
        throw error;
      }
    }

    // If building name is provided, find or create building
    if (row.building_name && resolvedProjectId) {
      try {
        const buildingId = await createBuildingIfNotExists(row.building_name, resolvedProjectId);
        resolvedBuildingId = buildingId || undefined;
      } catch (error) {
        console.error('Error resolving building:', error);
        throw error;
      }
    }

    // If facade name is provided, find or create facade
    if (row.facade_name && resolvedBuildingId) {
      try {
        const facadeId = await createFacadeIfNotExists(row.facade_name, resolvedBuildingId);
        resolvedFacadeId = facadeId || undefined;
      } catch (error) {
        console.error('Error resolving facade:', error);
        throw error;
      }
    }

    return {
      project_id: resolvedProjectId,
      building_id: resolvedBuildingId,
      facade_id: resolvedFacadeId,
    };
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
          ifp_qty: '52.5',
          dimension: '1000x500x100',
          building_name: 'Building A',
          facade_name: 'North Facade',
          customer_name: 'Al Rayyan Construction'
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
          ifp_qty: '24.0',
          dimension: '500x300x50',
          building_name: 'Main Tower',
          facade_name: 'East Facade',
          customer_name: 'Qatar Building Solutions'
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
          ifp_qty: '30.0',
          dimension: '2000x1000x150',
          building_name: 'Office Complex',
          facade_name: 'South Facade',
          customer_name: 'Doha Development Corp'
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
      'ifp_qty',
      'dimension',
      'building_name',
      'facade_name',
      'customer_name'
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
      { wch: 10 }, // ifp_qty
      { wch: 15 }, // dimension
      { wch: 15 }, // building_name
      { wch: 15 }, // facade_name
      { wch: 20 }  // customer_name
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
          
                     // Convert to JSON - keep raw values to handle dates properly
           const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
             header: 1,
             raw: true // Keep raw values to handle dates properly
           });
          
          // Skip header row and convert to our format
          const panels: PanelImportData[] = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            
            // Check if row has any data (not completely empty)
            const hasData = row && row.some((cell: any) => cell !== null && cell !== undefined && cell !== '');
            
            if (hasData) {
                             // Helper function to convert Excel date to proper date string
               const convertExcelDate = (cell: any): string => {
                 if (!cell) return '';
                 
                 // If it's already a string, return as is
                 if (typeof cell === 'string') {
                   return cell.trim();
                 }
                 
                 // If it's a number (Excel serial date), convert it
                 if (typeof cell === 'number' && cell > 0) {
                   // Excel serial date: number of days since January 1, 1900
                   // Use the XLSX library's built-in date conversion
                   const date = XLSX.SSF.parse_date_code(cell);
                   if (date) {
                     const day = String(date.d).padStart(2, '0');
                     const month = String(date.m).padStart(2, '0');
                     const year = date.y;
                     return `${day}/${month}/${year}`;
                   }
                 }
                 
                 return cell.toString().trim();
               };
              
              panels.push({
                project_name: row[0]?.toString().trim() || '',
                name: row[1]?.toString().trim() || '',
                type: row[2]?.toString().trim() || '',
                status: row[3]?.toString().trim() || '',
                date: convertExcelDate(row[4]),
                issue_transmittal_no: row[5]?.toString().trim() || '',
                dwg_no: row[6]?.toString().trim() || '',
                description: row[7]?.toString().trim() || '',
                panel_tag: row[8]?.toString().trim() || '',
                unit_qty: row[9]?.toString().trim() || '',
                ifp_qty_nos: row[10]?.toString().trim() || '',
                ifp_qty: row[11]?.toString().trim() || '',
                dimension: row[12]?.toString().trim() || undefined,
                building_name: row[13]?.toString().trim() || undefined,
                facade_name: row[14]?.toString().trim() || undefined,
                customer_name: row[15]?.toString().trim() || undefined,
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

      // Project name validation - removed since projects will be created automatically
      // Note: Project validation errors are removed since they will be created automatically during import

      // Date validation - only validate if date is provided
       if (row.date && row.date.trim()) {
         const dateStr = row.date.trim();
         
         // Helper function to parse date in different formats (same as import function)
         const parseDateForValidation = (dateStr: string): Date | null => {
           if (!dateStr.trim()) return null;
           
           const str = dateStr.trim();
           
           // Handle 0000-00-00 format - convert to earliest valid date
           if (str === '0000-00-00' || str === '00/00/0000' || str === '00.00.0000') {
             return new Date('1900-01-01T00:00:00.000Z'); // Use UTC to avoid timezone issues
           }
           
           try {
             // Try different date formats
             if (str.includes('/')) {
               // Format: DD/MM/YYYY
               const parts = str.split('/');
               if (parts.length === 3) {
                 // Check for invalid date parts (00/00/YYYY or DD/00/YYYY or DD/MM/0000)
                 if (parts[0] === '00' || parts[1] === '00' || parts[2] === '0000') {
                   return new Date('1900-01-01T00:00:00.000Z'); // Use UTC to avoid timezone issues
                 }
                 const year = parseInt(parts[2]);
                 const month = parseInt(parts[1]) - 1;
                 const day = parseInt(parts[0]);
                 
                 // Create date using UTC to avoid timezone issues
                 const date = new Date(Date.UTC(year, month, day));
                 if (!isNaN(date.getTime())) {
                   return date;
                 }
               }
             } else if (str.includes('.')) {
               // Format: DD.MM.YYYY
               const parts = str.split('.');
               if (parts.length === 3) {
                 // Check for invalid date parts (00.00.YYYY or DD.00.YYYY or DD.MM.0000)
                 if (parts[0] === '00' || parts[1] === '00' || parts[2] === '0000') {
                   return new Date('1900-01-01T00:00:00.000Z'); // Use UTC to avoid timezone issues
                 }
                 const year = parseInt(parts[2]);
                 const month = parseInt(parts[1]) - 1;
                 const day = parseInt(parts[0]);
                 
                 // Create date using UTC to avoid timezone issues
                 const date = new Date(Date.UTC(year, month, day));
                 if (!isNaN(date.getTime())) {
                   return date;
                 }
               }
             } else if (str.includes('-')) {
               // Format: YYYY-MM-DD
               const parts = str.split('-');
               if (parts.length === 3) {
                 // Check for invalid date parts (0000-MM-DD or YYYY-00-DD or YYYY-MM-00)
                 if (parts[0] === '0000' || parts[1] === '00' || parts[2] === '00') {
                   return new Date('1900-01-01T00:00:00.000Z'); // Use UTC to avoid timezone issues
                 }
                 const year = parseInt(parts[0]);
                 const month = parseInt(parts[1]) - 1;
                 const day = parseInt(parts[2]);
                 
                 // Create date using UTC to avoid timezone issues
                 const date = new Date(Date.UTC(year, month, day));
                 if (!isNaN(date.getTime())) {
                   return date;
                 }
               }
             }
             
             // Try parsing as ISO string
             const parsedDate = new Date(str);
             if (!isNaN(parsedDate.getTime())) {
               return parsedDate;
             }
             
             // If all else fails, return 1900-01-01
             return new Date('1900-01-01T00:00:00.000Z');
           } catch (error) {
             // If any error occurs, return 1900-01-01
             return new Date('1900-01-01T00:00:00.000Z');
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
    setExistingPanels({});

    try {
      const data = await parseExcel(file);
      setParsedData(data);
      
      // Check for existing panels
      const existingPanelsMap: { [key: string]: any } = {};
      for (const row of data) {
        if (row.name?.trim()) {
          const existingPanel = await findExistingPanelByName(row.name);
          if (existingPanel) {
            existingPanelsMap[row.name.trim()] = existingPanel;
          }
        }
      }
      setExistingPanels(existingPanelsMap);
      
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
        // Resolve project, building, and facade IDs
        const { project_id, building_id, facade_id } = await resolveProjectBuildingAndFacadeIds(row);

        if (!project_id) {
          results.push({
            success: false,
            message: `Failed to resolve project for "${row.name}". Project "${row.project_name}" not found and could not be created.`,
            errors: [`Project "${row.project_name}" not found.`]
          });
          errorCount++;
          continue;
        }

        // Helper function to parse date in different formats
        const parseDate = (dateStr: string): Date | null => {
          if (!dateStr.trim()) return null;
          
          const str = dateStr.trim();
          
          // Handle 0000-00-00 format - convert to earliest valid date
          if (str === '0000-00-00' || str === '00/00/0000' || str === '00.00.0000') {
            return new Date('1900-01-01T00:00:00.000Z'); // Use UTC to avoid timezone issues
          }
          
          try {
            // Try different date formats
            if (str.includes('/')) {
              // Format: DD/MM/YYYY
              const parts = str.split('/');
              if (parts.length === 3) {
                // Check for invalid date parts (00/00/YYYY or DD/00/YYYY or DD/MM/0000)
                if (parts[0] === '00' || parts[1] === '00' || parts[2] === '0000') {
                  return new Date('1900-01-01T00:00:00.000Z'); // Use UTC to avoid timezone issues
                }
                const year = parseInt(parts[2]);
                const month = parseInt(parts[1]) - 1;
                const day = parseInt(parts[0]);
                
                // Create date using UTC to avoid timezone issues
                const date = new Date(Date.UTC(year, month, day));
                if (!isNaN(date.getTime())) {
                  return date;
                }
              }
            } else if (str.includes('.')) {
              // Format: DD.MM.YYYY
              const parts = str.split('.');
              if (parts.length === 3) {
                // Check for invalid date parts (00.00.YYYY or DD.00.YYYY or DD.MM.0000)
                if (parts[0] === '00' || parts[1] === '00' || parts[2] === '0000') {
                  return new Date('1900-01-01T00:00:00.000Z'); // Use UTC to avoid timezone issues
                }
                const year = parseInt(parts[2]);
                const month = parseInt(parts[1]) - 1;
                const day = parseInt(parts[0]);
                
                // Create date using UTC to avoid timezone issues
                const date = new Date(Date.UTC(year, month, day));
                if (!isNaN(date.getTime())) {
                  return date;
                }
              }
            } else if (str.includes('-')) {
              // Format: YYYY-MM-DD
              const parts = str.split('-');
              if (parts.length === 3) {
                // Check for invalid date parts (0000-MM-DD or YYYY-00-DD or YYYY-MM-00)
                if (parts[0] === '0000' || parts[1] === '00' || parts[2] === '00') {
                  return new Date('1900-01-01T00:00:00.000Z'); // Use UTC to avoid timezone issues
                }
                const year = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const day = parseInt(parts[2]);
                
                // Create date using UTC to avoid timezone issues
                const date = new Date(Date.UTC(year, month, day));
                if (!isNaN(date.getTime())) {
                  return date;
                }
              }
            }
            
            // Try parsing as ISO string
            const parsedDate = new Date(str);
            if (!isNaN(parsedDate.getTime())) {
              return parsedDate;
            }
            
            // If all else fails, return 1900-01-01
            return new Date('1900-01-01T00:00:00.000Z');
          } catch (error) {
            // If any error occurs, return 1900-01-01
            return new Date('1900-01-01T00:00:00.000Z');
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

        // Check if panel already exists
        const existingPanel = await findExistingPanelByName(row.name);

        if (existingPanel) {
          console.log(`Panel "${row.name}" already exists. Updating...`);
                     const updateData = {
             name: row.name.trim(),
             type: row.type?.trim() ? mapTypeToNumber(row.type) : null,
             status: row.status?.trim() ? mapStatusToNumber(row.status) : null,
             project_id: project_id,
             building_id: building_id || null,
             facade_id: facade_id || null,
             issue_transmittal_no: row.issue_transmittal_no?.trim() || null,
             drawing_number: row.dwg_no?.trim() || null,
             unit_rate_qr_m2: row.unit_qty?.trim() ? parseFloat(row.unit_qty) : null,
             ifp_qty_area_sm: row.ifp_qty?.trim() ? parseFloat(row.ifp_qty) : null,
             ifp_qty_nos: row.ifp_qty_nos?.trim() ? parseInt(row.ifp_qty_nos) : null,
             dimension: row.dimension?.trim() || null,
             issued_for_production_date: row.date?.trim() ? (() => {
               const parsedDate = parseDate(row.date);
               if (!parsedDate) return null;
               // Format as YYYY-MM-DD string for Supabase
               const year = parsedDate.getUTCFullYear();
               const month = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
               const day = String(parsedDate.getUTCDate()).padStart(2, '0');
               return `${year}-${month}-${day}`;
             })() : null,
             user_id: currentUser?.id || null
           };

          const { data: updatedPanel, error: updateError } = await supabase
            .from('panels')
            .update(updateData)
            .eq('id', existingPanel.id)
            .select()
            .single();

          if (updateError) {
            results.push({
              success: false,
              message: `Failed to update panel "${row.name}". ${updateError.message}`,
              errors: [updateError.message]
            });
            errorCount++;
          } else {
            results.push({
              success: true,
              message: `Successfully updated panel "${row.name}"`,
              data: updatedPanel
            });
            successCount++;
          }
        } else {
          // Prepare panel data for new panel
          const panelData = {
            name: row.name.trim(),
            type: row.type?.trim() ? mapTypeToNumber(row.type) : null, // Map text to number
            status: row.status?.trim() ? mapStatusToNumber(row.status) : null,
            project_id: project_id,
            building_id: building_id || null,
            facade_id: facade_id || null,
            issue_transmittal_no: row.issue_transmittal_no?.trim() || null,
            drawing_number: row.dwg_no?.trim() || null,
            unit_rate_qr_m2: row.unit_qty?.trim() ? parseFloat(row.unit_qty) : null,
            ifp_qty_area_sm: row.ifp_qty?.trim() ? parseFloat(row.ifp_qty) : null,
            ifp_qty_nos: row.ifp_qty_nos?.trim() ? parseInt(row.ifp_qty_nos) : null,
            dimension: row.dimension?.trim() || null,
            issued_for_production_date: row.date?.trim() ? (() => {
              const parsedDate = parseDate(row.date);
              if (!parsedDate) return null;
              // Format as YYYY-MM-DD string for Supabase
              const year = parsedDate.getUTCFullYear();
              const month = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
              const day = String(parsedDate.getUTCDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            })() : null,
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
  const existingPanelsCount = Object.keys(existingPanels).length;
  const newPanelsCount = validRows - existingPanelsCount;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bulk Import Panels</h1>
          <p className="text-gray-600 mt-2">
            Import multiple panels from an Excel file. Each field is in a separate column for easy editing. 
            Existing panels with the same name will be updated automatically.
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
                    <TableHead>dimension</TableHead>
                    <TableHead>building_name</TableHead>
                    <TableHead>facade_name</TableHead>
                    <TableHead>customer_name</TableHead>
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
                     <TableCell>1000x500x100</TableCell>
                     <TableCell>Building A</TableCell>
                     <TableCell>North Facade</TableCell>
                     <TableCell>Al Rayyan Construction</TableCell>
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
             
             <div className="mt-4 p-4 bg-blue-50 rounded-lg">
               <p className="text-sm text-blue-800 mb-2">
                 <strong>Automatic Creation & Updates:</strong> 
                 - Existing panels with the same name will be updated automatically
                 - New panels will be created if they don't exist
                 - Customers will be created automatically if they don't exist
                 - Projects will be created automatically if they don't exist
                 - Buildings will be created automatically if they don't exist in the project
                 - Facades will be created automatically if they don't exist in the building
                 - All relationships will be properly maintained
                 - Panel status history will be preserved during updates
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
                {newPanelsCount > 0 && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <Plus className="h-3 w-3" />
                    {newPanelsCount} New
                  </Badge>
                )}
                {existingPanelsCount > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Edit className="h-3 w-3" />
                    {existingPanelsCount} Update
                  </Badge>
                )}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Panel Name</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Facade</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((row, index) => {
                    const validation = validationResults[index];
                    const isExisting = existingPanels[row.name?.trim() || ''];
                    return (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.project_name}</TableCell>
                        <TableCell>{row.customer_name || '—'}</TableCell>
                        <TableCell>{row.building_name || '—'}</TableCell>
                        <TableCell>{row.facade_name || '—'}</TableCell>
                        <TableCell>
                          {isExisting ? (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Edit className="h-3 w-3" />
                              Update
                            </Badge>
                          ) : (
                            <Badge variant="default" className="flex items-center gap-1">
                              <Plus className="h-3 w-3" />
                              Create
                            </Badge>
                          )}
                        </TableCell>
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
              Import {validRows} valid panels to the database. Existing panels with the same name will be updated.
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
                  Import/Update {validRows} Panels
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