// Mock API service with fallback to sample data
class ApiService {
  private baseUrl = 'https://api.qatarpanels.com'; // Mock API URL
  private fallbackMode = false;
  private initialized = false;

  // Sample data for fallback mode
  private sampleCustomers = [
    { id: '1', name: 'Al Rayyan Construction', email: 'contact@alrayyan.qa', phone: '+974 4444 5555', address: 'Doha, Qatar', status: 'active', projects: 3, totalValue: 2500000 },
    { id: '2', name: 'Qatar Building Solutions', email: 'info@qbs.qa', phone: '+974 4444 6666', address: 'Al Wakrah, Qatar', status: 'active', projects: 2, totalValue: 1800000 },
    { id: '3', name: 'Doha Development Corp', email: 'projects@ddc.qa', phone: '+974 4444 7777', address: 'West Bay, Qatar', status: 'active', projects: 1, totalValue: 3200000 },
    { id: '4', name: 'Arabian Gulf Contractors', email: 'business@agc.qa', phone: '+974 4444 8888', address: 'Industrial Area, Qatar', status: 'inactive', projects: 0, totalValue: 0 }
  ];

  private sampleProjects = [
    { 
      id: '1', 
      name: 'Al Rayyan Sports Complex', 
      customer: 'Al Rayyan Construction', 
      customerId: '1',
      location: 'Al Rayyan, Qatar', 
      startDate: '2024-01-15', 
      endDate: '2024-08-30', 
      status: 'active' as const, 
      estimatedCost: 1200000, 
      estimatedPanels: 450, 
      panels: 280,
      description: 'A state-of-the-art sports complex featuring multiple athletic facilities including swimming pools, basketball courts, and fitness centers.',
      buildings: 3,
      facades: 12
    },
    { 
      id: '2', 
      name: 'Doha Marina Towers', 
      customer: 'Qatar Building Solutions', 
      customerId: '2',
      location: 'West Bay, Doha', 
      startDate: '2024-02-01', 
      endDate: '2024-12-15', 
      status: 'active' as const, 
      estimatedCost: 2800000, 
      estimatedPanels: 820, 
      panels: 156,
      description: 'Luxury residential towers overlooking the marina with premium amenities and modern architectural design.',
      buildings: 2,
      facades: 45
    },
    { 
      id: '3', 
      name: 'Qatar Education Hub', 
      customer: 'Doha Development Corp', 
      customerId: '3',
      location: 'Education City, Qatar', 
      startDate: '2024-03-10', 
      endDate: '2024-11-20', 
      status: 'on-hold' as const, 
      estimatedCost: 1850000, 
      estimatedPanels: 680, 
      panels: 95,
      description: 'Modern educational facility housing multiple schools and research centers with advanced learning technologies.',
      buildings: 1,
      facades: 8
    },
    { 
      id: '4', 
      name: 'Al Wakrah Shopping Center', 
      customer: 'Qatar Building Solutions', 
      customerId: '2',
      location: 'Al Wakrah, Qatar', 
      startDate: '2024-01-20', 
      endDate: '2024-07-10', 
      status: 'completed' as const, 
      estimatedCost: 950000, 
      estimatedPanels: 320, 
      panels: 320,
      description: 'Regional shopping center featuring retail stores, restaurants, and entertainment facilities for the local community.',
      buildings: 1,
      facades: 3
    },
    { 
      id: '5', 
      name: 'Industrial Park Phase 1', 
      customer: 'Al Rayyan Construction', 
      customerId: '1',
      location: 'Mesaieed Industrial Area', 
      startDate: '2024-04-01', 
      endDate: '2025-01-30', 
      status: 'active' as const, 
      estimatedCost: 3200000, 
      estimatedPanels: 1200, 
      panels: 240,
      description: 'Large-scale industrial development with manufacturing facilities, warehouses, and office buildings.',
      buildings: 8,
      facades: 24
    }
  ];

  private samplePanels = [
    { id: '1', projectId: '1', type: 'Wall Panel', width: 2.4, height: 3.0, thickness: 0.15, material: 'Concrete', status: 'manufactured', qrCode: 'QP001', location: 'Warehouse A' },
    { id: '2', projectId: '1', type: 'Facade Panel', width: 3.0, height: 6.0, thickness: 0.20, material: 'Concrete', status: 'installed', qrCode: 'QP002', location: 'Building 1 - Facade 2' },
    { id: '3', projectId: '2', type: 'Wall Panel', width: 2.4, height: 3.0, thickness: 0.15, material: 'Concrete', status: 'in-production', qrCode: 'QP003', location: 'Production Line 1' }
  ];

  constructor() {
    console.log('API Service initialized');
    // Initialize in fallback mode by default for better UX
    this.initializeFallbackMode();
  }

  // Initialize fallback mode immediately
  private initializeFallbackMode(): void {
    this.fallbackMode = true;
    this.initialized = true;
    console.log('API Service running in fallback mode with sample data');
  }

  // Check if we're in fallback mode
  isInFallbackMode(): boolean {
    return this.fallbackMode;
  }

  // Reset connection state
  resetConnection(): void {
    this.fallbackMode = false;
    this.initialized = false;
    console.log('API Service connection reset');
  }

  // Initialize with sample data
  async initializeSampleData(): Promise<void> {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulate very rare connection failure (5% chance instead of 30%)
      if (!this.initialized && Math.random() < 0.05) {
        throw new Error('Simulated connection failure');
      }

      console.log('Sample data initialized successfully');
      this.initialized = true;
      this.fallbackMode = false; // Switch to online mode
    } catch (error) {
      console.warn('Failed to connect to server, enabling fallback mode:', error);
      this.fallbackMode = true;
      this.initialized = true;
      // Don't throw error, just enable fallback mode
    }
  }

  // Simulate network delay
  private async simulateDelay(): Promise<void> {
    const delay = this.fallbackMode ? 50 + Math.random() * 100 : 200 + Math.random() * 300;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Simulate potential network errors (much less frequent)
  private simulateNetworkError(): void {
    if (!this.fallbackMode && Math.random() < 0.02) { // 2% chance of error when online (reduced from 10%)
      throw new Error('Network timeout');
    }
  }

  // Safe API call wrapper
  private async safeApiCall<T>(operation: () => Promise<T>, fallbackData: T): Promise<T> {
    try {
      await this.simulateDelay();
      this.simulateNetworkError();
      return await operation();
    } catch (error) {
      console.warn('API call failed, using fallback data:', error);
      this.fallbackMode = true;
      return fallbackData;
    }
  }

  // Get all customers
  async getCustomers(): Promise<any[]> {
    return this.safeApiCall(
      async () => {
        if (this.fallbackMode) {
          console.log('Returning sample customers (fallback mode)');
          return [...this.sampleCustomers];
        }
        console.log('Returning sample customers (online mode)');
        return [...this.sampleCustomers];
      },
      [...this.sampleCustomers]
    );
  }

  // Get all projects
  async getProjects(): Promise<any[]> {
    return this.safeApiCall(
      async () => {
        if (this.fallbackMode) {
          console.log('Returning sample projects (fallback mode)');
          return [...this.sampleProjects];
        }
        console.log('Returning sample projects (online mode)');
        return [...this.sampleProjects];
      },
      [...this.sampleProjects]
    );
  }

  // Get a single project by ID
  async getProject(id: string): Promise<any | null> {
    return this.safeApiCall(
      async () => {
        const project = this.sampleProjects.find(p => p.id === id);
        if (this.fallbackMode) {
          console.log(`Returning project ${id} (fallback mode)`);
          return project || null;
        }
        console.log(`Returning project ${id} (online mode)`);
        return project || null;
      },
      this.sampleProjects.find(p => p.id === id) || null
    );
  }

  // Get all panels
  async getPanels(): Promise<any[]> {
    return this.safeApiCall(
      async () => {
        if (this.fallbackMode) {
          console.log('Returning sample panels (fallback mode)');
          return [...this.samplePanels];
        }
        console.log('Returning sample panels (online mode)');
        return [...this.samplePanels];
      },
      [...this.samplePanels]
    );
  }

  // Create a new customer
  async createCustomer(customerData: any): Promise<any> {
    const newCustomer = {
      id: Date.now().toString(),
      ...customerData,
      projects: 0,
      totalValue: 0
    };

    return this.safeApiCall(
      async () => {
        this.sampleCustomers.push(newCustomer);
        console.log('Customer created:', newCustomer);
        return newCustomer;
      },
      newCustomer
    );
  }

  // Create a new project
  async createProject(projectData: any): Promise<any> {
    const newProject = {
      id: Date.now().toString(),
      ...projectData,
      panels: 0
    };

    return this.safeApiCall(
      async () => {
        this.sampleProjects.push(newProject);
        console.log('Project created:', newProject);
        return newProject;
      },
      newProject
    );
  }

  // Update a customer
  async updateCustomer(id: string, updates: any): Promise<any> {
    const customerIndex = this.sampleCustomers.findIndex(c => c.id === id);
    if (customerIndex === -1) {
      throw new Error('Customer not found');
    }

    const updatedCustomer = { ...this.sampleCustomers[customerIndex], ...updates };

    return this.safeApiCall(
      async () => {
        this.sampleCustomers[customerIndex] = updatedCustomer;
        console.log('Customer updated:', updatedCustomer);
        return updatedCustomer;
      },
      updatedCustomer
    );
  }

  // Update a project
  async updateProject(id: string, updates: any): Promise<any> {
    const projectIndex = this.sampleProjects.findIndex(p => p.id === id);
    if (projectIndex === -1) {
      throw new Error('Project not found');
    }

    const updatedProject = { ...this.sampleProjects[projectIndex], ...updates };

    return this.safeApiCall(
      async () => {
        this.sampleProjects[projectIndex] = updatedProject;
        console.log('Project updated:', updatedProject);
        return updatedProject;
      },
      updatedProject
    );
  }

  // Delete a customer
  async deleteCustomer(id: string): Promise<void> {
    const customerIndex = this.sampleCustomers.findIndex(c => c.id === id);
    if (customerIndex === -1) {
      throw new Error('Customer not found');
    }

    return this.safeApiCall(
      async () => {
        this.sampleCustomers.splice(customerIndex, 1);
        console.log('Customer deleted:', id);
      },
      undefined
    );
  }

  // Delete a project
  async deleteProject(id: string): Promise<void> {
    const projectIndex = this.sampleProjects.findIndex(p => p.id === id);
    if (projectIndex === -1) {
      throw new Error('Project not found');
    }

    return this.safeApiCall(
      async () => {
        this.sampleProjects.splice(projectIndex, 1);
        console.log('Project deleted:', id);
      },
      undefined
    );
  }
}

export const apiService = new ApiService();