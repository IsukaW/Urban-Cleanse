export interface CollectionRoute {
  _id?: string;
  routeId: string;
  collectorId: string;
  assignedDate: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  bins: Array<{
    binId: string;
    priority: 'normal' | 'high' | 'urgent';
    estimatedTime: number;
    sequence: number;
    binData?: {
      _id: string;
      binId: string;
      location: {
        address: string;
        coordinates: { lat: number; lng: number };
        area: string;
      };
      fillLevel: number;
      battery: number;
      status: 'Empty' | 'Half-Full' | 'Full' | 'Overflow';
      capacity: number;
      type: 'food' | 'polythene' | 'paper' | 'hazardous' | 'ewaste';
      isActive: boolean;
      maintenanceRequired: boolean;
      lastUpdated: string;
      lastMaintenance: string;
    };
    wasteRequest?: {
      requestId: string;
      userId: {
        _id: string;
        name: string;
        email: string;
      };
      collectionType: string;
      cost: number;
      status: string;
      notes?: string;
    };
    customerInfo?: {
      name: string;
      email: string;
      phone?: string;
      requestId: string;
      collectionType: string;
      cost: number;
      notes?: string;
      requestNotes?: string;
      paymentStatus?: string;
      requestStatus?: string;
    };
    collectionStatus?: 'pending' | 'collected' | 'failed';
    collectionId?: string;
    lastUpdated?: string;
    fillLevel?: number;
    battery?: number;
    location?: {
      address: string;
      coordinates: { lat: number; lng: number };
      area: string;
    };
  }>;
  startTime?: string;
  endTime?: string;
  estimatedDuration: number;
  actualDuration?: number;
  completedBins: number;
  totalBins: number;
  area: string;
  notes?: string;
  approvedRequestsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  _id: string;
  collectionId: string;
  collectorId: string;
  binId: string;
  routeId: string;
  status: 'pending' | 'collected' | 'failed' | 'priority';
  collectionMethod?: 'scan' | 'manual';
  timestamp: string;
  collectedAt?: string;
  issue?: {
    issueType: 'damaged_bin' | 'blocked_access' | 'qr_damaged' | 'overflow' | 'hazardous_material' | 'other';
    description: string;
    requiresAdmin: boolean;
    reportedAt: string;
  };
  locationData?: {
    coordinates: { lat: number; lng: number };
    accuracy: number;
    timestamp: string;
  };
  notificationSent: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RouteProgress {
  completed: number;
  total: number;
  percentage?: number;
  routeStatus?: string;
}

export interface ScanCollectionData {
  binId: string;
  routeId: string;
  locationData?: {
    coordinates: { lat: number; lng: number };
    accuracy: number;
    timestamp: string;
  };
  notes?: string;
}

export interface ManualCollectionData {
  binId: string;
  routeId: string;
  reason: string;
  locationData?: {
    coordinates: { lat: number; lng: number };
    accuracy: number;
    timestamp: string;
  };
  notes?: string;
}

export interface ReportIssueData {
  binId: string;
  routeId: string;
  issueType: 'damaged_bin' | 'blocked_access' | 'qr_damaged' | 'overflow' | 'hazardous_material' | 'other';
  description: string;
  requiresAdmin: boolean;
  locationData?: {
    coordinates: { lat: number; lng: number };
    accuracy: number;
    timestamp: string;
  };
}

export interface CollectionHistoryParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface BinRegistrationData {
  address: string;
  area: string;
  coordinates: Coordinates;
  capacity: number;
  type: 'food' | 'polythene' | 'paper' | 'hazardous' | 'ewaste';
}

export interface LocationData {
  coordinates: Coordinates;
  address?: string;
  area?: string;
}

export interface MapClickEvent {
  coordinates: Coordinates;
  address?: string;
}

export interface GeolocationData {
  coordinates: Coordinates;
  accuracy: number;
  timestamp: number;
}

export interface CollectorRouteResponse {
  success: boolean;
  data: {
    route: CollectionRoute;
  };
}

export interface CollectionResponse {
  success: boolean;
  message: string;
  data: {
    collection: Collection;
    routeProgress: RouteProgress;
    wasteRequestStatus?: string;
    completedTask?: {
      binId: string;
      requestId: string;
      customerName: string;
      completedAt: string;
    };
  };
}

export interface IssueReportResponse {
  success: boolean;
  message: string;
  data: {
    collection: Collection;
    adminNotified: boolean;
  };
}

export interface CollectionHistoryResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: {
    collections: Collection[];
  };
}

export interface BinLocationInfo {
  binId: string;
  location: {
    address: string;
    coordinates: { lat: number; lng: number };
    area: string;
  };
  fillLevel: number;
  battery: number;
  status: string;
  collectionStatus: 'pending' | 'collected' | 'failed' | 'priority';
  lastUpdated: string;
}
