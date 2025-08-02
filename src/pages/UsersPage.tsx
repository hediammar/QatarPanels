import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Plus, Edit, Trash2, MoreHorizontal, UserPlus, Search, Filter, Users, Shield, Clock, Mail, Phone, Calendar, Eye, EyeOff, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Users2 } from "lucide-react";

// User roles and statuses
const USER_ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full system access', color: 'destructive' },
  { value: 'manager', label: 'Manager', description: 'Manage projects and users', color: 'default' },
  { value: 'user', label: 'User', description: 'Standard user access', color: 'secondary' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access', color: 'outline' }
] as const;

type UserRole = typeof USER_ROLES[number]['value'];

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  loginCount?: number;
  department?: string;
}



export function UsersPage() {
  const users: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@company.com',
    phone: '+1-555-123-4567',
    role: 'admin',
    isActive: true,
    lastLogin: '2025-07-27T10:30:00Z',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2025-07-27T10:30:00Z',
    loginCount: 150,
    department: 'IT'
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@company.com',
    phone: '+1-555-987-6543',
    role: 'manager',
    isActive: true,
    lastLogin: '2025-07-25T14:20:00Z',
    createdAt: '2024-03-22T11:00:00Z',
    updatedAt: '2025-07-25T14:20:00Z',
    loginCount: 95,
    department: 'Marketing'
  },
  {
    id: '3',
    name: 'Robert Johnson',
    email: 'robert.j@company.com',
    role: 'user',
    isActive: false,
    lastLogin: '2025-06-01T08:15:00Z',
    createdAt: '2023-11-10T13:30:00Z',
    updatedAt: '2025-06-01T08:15:00Z',
    loginCount: 45,
    department: 'Sales'
  },
  {
    id: '4',
    name: 'Emily Davis',
    email: 'emily.davis@company.com',
    phone: '+1-555-456-7890',
    role: 'viewer',
    isActive: true,
    lastLogin: undefined,
    createdAt: '2025-07-20T16:00:00Z',
    updatedAt: '2025-07-20T16:00:00Z',
    loginCount: 0,
    department: 'HR'
  },
  {
    id: '5',
    name: 'Michael Brown',
    email: 'michael.b@company.com',
    role: 'user',
    isActive: true,
    lastLogin: '2025-07-28T09:00:00Z',
    createdAt: '2024-06-05T10:00:00Z',
    updatedAt: '2025-07-28T09:00:00Z',
    loginCount: 30,
    department: 'Engineering'
  },
  {
    id: '6',
    name: 'Sarah Wilson',
    email: 'sarah.wilson@company.com',
    phone: '+1-555-321-6547',
    role: 'manager',
    isActive: true,
    lastLogin: '2025-07-26T12:45:00Z',
    createdAt: '2023-09-18T14:20:00Z',
    updatedAt: '2025-07-26T12:45:00Z',
    loginCount: 120,
    department: 'Marketing'
  },
  {
    id: '7',
    name: 'David Lee',
    email: 'david.lee@company.com',
    role: 'admin',
    isActive: false,
    lastLogin: '2025-05-15T11:10:00Z',
    createdAt: '2023-12-01T09:30:00Z',
    updatedAt: '2025-05-15T11:10:00Z',
    loginCount: 80,
    department: 'IT'
  },
  {
    id: '8',
    name: 'Lisa Anderson',
    email: 'lisa.anderson@company.com',
    phone: '+1-555-654-3210',
    role: 'user',
    isActive: true,
    lastLogin: '2025-07-27T15:25:00Z',
    createdAt: '2024-02-14T12:00:00Z',
    updatedAt: '2025-07-27T15:25:00Z',
    loginCount: 65,
    department: 'Sales'
  },
  {
    id: '9',
    name: 'Thomas Clark',
    email: 'thomas.clark@company.com',
    role: 'viewer',
    isActive: true,
    lastLogin: '2025-07-10T17:00:00Z',
    createdAt: '2024-04-30T08:45:00Z',
    updatedAt: '2025-07-10T17:00:00Z',
    loginCount: 25,
    department: 'Finance'
  },
  {
    id: '10',
    name: 'Anna Martinez',
    email: 'anna.martinez@company.com',
    phone: '+1-555-789-1234',
    role: 'manager',
    isActive: true,
    lastLogin: '2025-07-28T08:30:00Z',
    createdAt: '2023-08-25T10:15:00Z',
    updatedAt: '2025-07-28T08:30:00Z',
    loginCount: 200,
    department: 'HR'
  }
];

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [loginActivityFilter, setLoginActivityFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [createdDateFrom, setCreatedDateFrom] = useState('');
  const [createdDateTo, setCreatedDateTo] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user' as UserRole,
    isActive: true,
    department: ''
  });

  // Get unique values for filters
  const uniqueDepartments = Array.from(new Set(users.map(u => u.department).filter((dept): dept is string => Boolean(dept)))).sort();

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'user',
      isActive: true,
      department: ''
    });
  };

  const handleFilterChange = () => {
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setLoginActivityFilter('all');
    setDateRangeFilter('all');
    setCreatedDateFrom('');
    setCreatedDateTo('');
    setCurrentPage(1);
  };

  // Calculate active filters count
  const activeFiltersCount = [
    searchTerm,
    roleFilter !== 'all' ? roleFilter : '',
    statusFilter !== 'all' ? statusFilter : '',
    departmentFilter !== 'all' ? departmentFilter : '',
    loginActivityFilter !== 'all' ? loginActivityFilter : '',
    dateRangeFilter !== 'all' ? dateRangeFilter : ''
  ].filter(Boolean).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUser) {
      setEditingUser(null);
    } else {

      setIsAddDialogOpen(false);
    }
    resetForm();
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setOpenPopover(null);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      isActive: user.isActive,
      department: user.department || ''
    });
  };

  const handleDelete = (user: User) => {
    setDeletingUser(user);
    setOpenPopover(null);
  };

  const confirmDelete = () => {
    if (deletingUser) {
      setDeletingUser(null);
    }
  };

  const toggleUserStatus = (user: User) => {
    setOpenPopover(null);
  };

  const getRoleInfo = (role: UserRole) => {
    return USER_ROLES.find(r => r.value === role) || USER_ROLES[2];
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    
    const date = new Date(lastLogin);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Filter users based on all criteria
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);
    
    const matchesDepartment = departmentFilter === 'all' || user.department === departmentFilter;
    
    const matchesLoginActivity = (() => {
      if (loginActivityFilter === 'all') return true;
      if (!user.lastLogin && loginActivityFilter === 'never-logged') return true;
      if (!user.lastLogin) return false;
      
      const daysSinceLogin = (new Date().getTime() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
      
      switch (loginActivityFilter) {
        case 'recent': return daysSinceLogin <= 7;
        case 'this-month': return daysSinceLogin <= 30;
        case 'inactive': return daysSinceLogin > 30;
        case 'never-logged': return false; // handled above
        default: return true;
      }
    })();
    
    const matchesDateRange = (() => {
      if (dateRangeFilter === 'all') return true;
      
      const createdDate = new Date(user.createdAt);
      const now = new Date();
      
      switch (dateRangeFilter) {
        case 'this-month': {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          return createdDate >= monthStart;
        }
        case 'this-quarter': {
          const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          return createdDate >= quarterStart;
        }
        case 'this-year': {
          const yearStart = new Date(now.getFullYear(), 0, 1);
          return createdDate >= yearStart;
        }
        case 'custom': {
          if (!createdDateFrom && !createdDateTo) return true;
          const fromDate = createdDateFrom ? new Date(createdDateFrom) : new Date(0);
          const toDate = createdDateTo ? new Date(createdDateTo) : new Date();
          return createdDate >= fromDate && createdDate <= toDate;
        }
        default: return true;
      }
    })();
    
    return matchesSearch && matchesRole && matchesStatus && matchesDepartment && matchesLoginActivity && matchesDateRange;
  });

  // Sort users by last login (most recent first), then by name
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (a.lastLogin && b.lastLogin) {
      return new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime();
    }
    if (a.lastLogin && !b.lastLogin) return -1;
    if (!a.lastLogin && b.lastLogin) return 1;
    return a.name.localeCompare(b.name);
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedUsers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  const activeUsersCount = users.filter(u => u.isActive).length;
  const recentLoginCount = users.filter(u => {
    if (!u.lastLogin) return false;
    const daysSinceLogin = (new Date().getTime() - new Date(u.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceLogin <= 7;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Users2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Users</h2>
          <Badge variant="secondary" className="ml-2">
            {filteredUsers.length}
          </Badge>
        </div>
      </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>Create a new user account with appropriate role and permissions.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Enter department"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{role.label}</div>
                              <div className="text-xs text-muted-foreground">{role.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Add User</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      handleFilterChange();
                    }}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Role Filter */}
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={roleFilter} onValueChange={(value) => {
                  setRoleFilter(value);
                  handleFilterChange();
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    {USER_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
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
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Department Filter */}
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={departmentFilter} onValueChange={(value) => {
                  setDepartmentFilter(value);
                  handleFilterChange();
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {uniqueDepartments.map((department) => (
                      <SelectItem key={department} value={department}>
                        {department}
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Login Activity Filter */}
              <div className="space-y-2">
                <Label>Login Activity</Label>
                <Select value={loginActivityFilter} onValueChange={(value) => {
                  setLoginActivityFilter(value);
                  handleFilterChange();
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any activity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any activity</SelectItem>
                    <SelectItem value="recent">Recent (7 days)</SelectItem>
                    <SelectItem value="this-month">This month</SelectItem>
                    <SelectItem value="inactive">Inactive (30+ days)</SelectItem>
                    <SelectItem value="never-logged">Never logged in</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label>Created Date</Label>
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
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date From */}
              {dateRangeFilter === "custom" && (
                <>
                  <div className="space-y-2">
                    <Label>Created From</Label>
                    <Input
                      type="date"
                      value={createdDateFrom}
                      onChange={(e) => {
                        setCreatedDateFrom(e.target.value);
                        handleFilterChange();
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Created To</Label>
                    <Input
                      type="date"
                      value={createdDateTo}
                      onChange={(e) => {
                        setCreatedDateTo(e.target.value);
                        handleFilterChange();
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, sortedUsers.length)} of {sortedUsers.length} users
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage user accounts and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Login Count</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' || departmentFilter !== 'all' || loginActivityFilter !== 'all' || dateRangeFilter !== 'all'
                            ? 'No users match your search criteria'
                            : 'No users found. Add your first user to get started.'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => {
                    const roleInfo = getRoleInfo(user.role);
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="text-xs">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </div>
                              {user.phone && (
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {user.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={roleInfo.color as any} className="flex items-center gap-1 w-fit">
                            <Shield className="h-3 w-3" />
                            {roleInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{user.department || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.isActive ? (
                              <>
                                <div className="h-2 w-2 bg-green-500 rounded-full" />
                                <span className="text-sm text-green-600">Active</span>
                              </>
                            ) : (
                              <>
                                <div className="h-2 w-2 bg-gray-400 rounded-full" />
                                <span className="text-sm text-gray-600">Inactive</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {formatLastLogin(user.lastLogin)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{user.loginCount || 0}</span>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEdit(user)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleUserStatus(user)}
                                >
                                  {user.isActive ? (
                                    <>
                                      <EyeOff className="h-4 w-4" />
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-4 w-4" />
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(user)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
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

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={true} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information and permissions.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-email">Email Address</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-phone">Phone Number</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-department">Department</Label>
                  <Input
                    id="edit-department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select value={formData.role} onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{role.label}</div>
                              <div className="text-xs text-muted-foreground">{role.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Update User</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account for
              "{deletingUser?.name}" and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}