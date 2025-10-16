import api from '../api';

export interface RouteBin {
  binId: string;
  requestId?: string;
  priority: 'normal' | 'high' | 'urgent';
  estimatedTime: number;
  sequence: number;
  customerInfo: {
    name: string;
    email: string;
    collectionType: string;
    cost: number;
  };
  completedAt?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  binDetails?: any;
  requestDetails?: any;
}

export interface Route {
  _id: string;
  routeId: string;
  collectorId: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  assignedDate: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  bins: RouteBin[];
  startTime?: Date;
  endTime?: Date;
  estimatedDuration: number;
  actualDuration?: number;
  completedBins: number;
  totalBins: number;
  area: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BinsByArea {
  area: string;
  bins: {
    binId: string;
    location: {
      address: string;
      coordinates: { lat: number; lng: number };
      area: string;
    };
    fillLevel: number;
    battery: number;
    status: string;
    requests: any[];
  }[];
  totalRequests: number;
  estimatedDuration: number;
}

export interface Worker {
  _id: string;
  name: string;
  email: string;
  role: 'wc1' | 'wc2' | 'wc3';
}

export interface RouteStats {
  totalRoutes: number;
  routesByStatus: {
    assigned: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  totalBins: number;
  completedBins: number;
  totalWorkers: number;
  estimatedDuration: number;
  actualDuration: number;
  areas: string[];
  workerTypes: {
    wc1: number;
    wc2: number;
    wc3: number;
  };
  completionRate: number;
  efficiency: number;
}

class RouteAPI {
  // Get bins grouped by area for route creation
  async getBinsByArea(date?: string) {
    const params = date ? { date } : {};
    const response = await api.get('/routes/bins-by-area', { params });
    return response.data;
  }

  // Get available workers for assignment
  async getAvailableWorkers(date?: string) {
    const params = date ? { date } : {};
    const response = await api.get('/routes/available-workers', { params });
    return response.data;
  }

  // Create a new route
  async createRoute(routeData: {
    collectorId: string;
    assignedDate: string;
    area: string;
    selectedBins: string[];
    notes?: string;
  }) {
    const response = await api.post('/routes/create', routeData);
    return response.data;
  }

  // Get all routes with filters
  async getRoutes(params?: {
    date?: string;
    status?: string;
    collectorId?: string;
    area?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await api.get('/routes', { params });
    return response.data;
  }

  // Get single route by ID
  async getRouteById(id: string) {
    const response = await api.get(`/routes/${id}`);
    return response.data;
  }

  // Update route status
  async updateRouteStatus(id: string, status: string, notes?: string) {
    const response = await api.put(`/routes/${id}/status`, { status, notes });
    return response.data;
  }

  // Delete/cancel route
  async deleteRoute(id: string, reason?: string) {
    const response = await api.delete(`/routes/${id}`, { data: { reason } });
    return response.data;
  }

  // Get route statistics
  async getRouteStats(date?: string) {
    const params = date ? { date } : {};
    const response = await api.get('/routes/stats', { params });
    return response.data;
  }

  // Generate PDF report for route management
  async generatePDFReport(data: {
    startDate: string;
    endDate: string;
    statusFilter?: string;
    areaFilter?: string;
  }) {
    const response = await api.post('/routes/generate-pdf', data, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
    });
    return response;
  }
}

export const routeAPI = new RouteAPI();