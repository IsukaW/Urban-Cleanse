export interface BinLocation {
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  area: string;
}

export interface Bin {
  _id: string;
  binId: string;
  location: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
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
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  _id: string;
  binId: string;
  type: 'overflow' | 'low_battery' | 'maintenance' | 'offline';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  isActive: boolean;
  acknowledgedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  acknowledgedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BinWithDistance extends Bin {
  distance: number;
}

export interface BinStatusFilters {
  status?: string;
  area?: string;
  maintenance?: boolean;
}

export interface AlertFilters {
  type?: string;
  severity?: string;
  binId?: string;
}

export interface BinStatusResponse {
  success: boolean;
  count: number;
  data: {
    bins: Bin[];
    areas: string[];
  };
}

export interface BinDetailsResponse {
  success: boolean;
  data: {
    bin: Bin;
    alerts: Alert[];
  };
}

export interface AlertsResponse {
  success: boolean;
  count: number;
  data: {
    alerts: Alert[];
    alertCounts: Array<{ _id: string; count: number }>;
  };
}

export interface NearestBinsResponse {
  success: boolean;
  count: number;
  data: {
    bins: BinWithDistance[];
  };
}

export interface CreateBinData {
  binId: string;
  location: {
    address: string;
    coordinates: { lat: number; lng: number };
    area: string;
  };
  capacity?: number;
  type?: 'food' | 'polythene' | 'paper' | 'hazardous' | 'ewaste';
  fillLevel?: number;
  battery?: number;
}

export interface UpdateBinData {
  binId: string;
  fillLevel: number;
  battery: number;
  timestamp?: string;
}

export interface CreateBinResponse {
  success: boolean;
  message: string;
  data: {
    bin: Bin;
  };
}

export interface UpdateBinResponse {
  success: boolean;
  message: string;
  data: {
    bin: Bin;
  };
}

export interface AcknowledgeAlertResponse {
  success: boolean;
  message: string;
  data: {
    alert: Alert;
  };
}

export interface BinStats {
  totalBins: number;
  activeBins: number;
  inactiveBins: number;
  binsByStatus: Array<{ _id: string; count: number }>;
  binsByType: Array<{ _id: string; count: number }>;
  binsByArea: Array<{ _id: string; count: number }>;
  averageFillLevel: number;
  averageBatteryLevel: number;
  binsRequiringMaintenance: number;
  recentAlerts: Alert[];
}

export interface BinStatsResponse {
  success: boolean;
  data: BinStats;
}
