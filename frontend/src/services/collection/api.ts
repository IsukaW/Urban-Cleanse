import api from '../api';
import type {
  CollectionRoute,
  Collection,
  ScanCollectionData,
  ManualCollectionData,
  ReportIssueData,
  CollectionHistoryParams,
  LocationData,
  CollectorRouteResponse,
  CollectionResponse,
  IssueReportResponse,
  CollectionHistoryResponse
} from './type';

class CollectionService {
  // Get collector's assigned route for the day
  async getCollectorRoute(
    collectorId: string,
    date?: string
  ): Promise<CollectorRouteResponse> {
    try {
      const params = date ? { date } : {};
      const response = await api.get(`/collection/collectors/${collectorId}/route`, { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching collector route:', error);
      throw new Error(error.message || 'Failed to fetch collection route');
    }
  }

  // Mark bin as collected via QR scan
  async scanBinCollection(data: ScanCollectionData): Promise<CollectionResponse> {
    try {
      const response = await api.post('/collection/scan', data);
      return response.data;
    } catch (error: any) {
      console.error('Error scanning bin collection:', error);
      throw new Error(error.message || 'Failed to record bin collection');
    }
  }

  // Mark bin as collected manually
  async manualBinCollection(data: ManualCollectionData): Promise<CollectionResponse> {
    try {
      const response = await api.post('/collection/manual', data);
      return response.data;
    } catch (error: any) {
      console.error('Error recording manual collection:', error);
      throw new Error(error.message || 'Failed to record manual collection');
    }
  }

  // Report collection issue
  async reportIssue(data: ReportIssueData): Promise<IssueReportResponse> {
    try {
      const response = await api.post('/collection/report-issue', data);
      return response.data;
    } catch (error: any) {
      console.error('Error reporting issue:', error);
      throw new Error(error.message || 'Failed to report issue');
    }
  }

  // Get collection history for the worker
  async getCollectionHistory(params?: CollectionHistoryParams): Promise<CollectionHistoryResponse> {
    try {
      const response = await api.get('/collection/history', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching collection history:', error);
      throw new Error(error.message || 'Failed to fetch collection history');
    }
  }

  // Get user's current location using browser geolocation API
  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          let errorMessage = 'Failed to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
            default:
              errorMessage = `Location error: ${error.message}`;
              break;
          }
          
          console.error('Geolocation error:', errorMessage);
          reject(new Error(errorMessage));
        },
        options
      );
    });
  }

  // Watch position for real-time tracking
  watchPosition(
    onSuccess: (position: LocationData) => void,
    onError: (error: string) => void
  ): number | null {
    if (!navigator.geolocation) {
      onError('Geolocation is not supported by this browser');
      return null;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 5000
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        onSuccess({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let errorMessage = 'Position watch failed';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location timeout';
            break;
          default:
            errorMessage = error.message;
            break;
        }
        
        onError(errorMessage);
      },
      options
    );

    return watchId;
  }

  // Stop watching position
  clearWatch(watchId: number): void {
    if (navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  // Calculate distance between two coordinates
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  // Convert degrees to radians
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Validate if user is within collection area
  async validateCollectionLocation(
    userLocation: LocationData,
    binLocation: { lat: number; lng: number },
    maxDistance: number = 0.1 // 100 meters
  ): Promise<{ isValid: boolean; distance: number }> {
    const distance = this.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      binLocation.lat,
      binLocation.lng
    );

    return {
      isValid: distance <= maxDistance,
      distance
    };
  }

  // Format location data for API submission
  formatLocationData(locationData: LocationData): {
    coordinates: { lat: number; lng: number };
    accuracy: number;
    timestamp: string;
  } {
    return {
      coordinates: {
        lat: locationData.latitude,
        lng: locationData.longitude
      },
      accuracy: locationData.accuracy,
      timestamp: new Date().toISOString()
    };
  }
}

export default new CollectionService();
