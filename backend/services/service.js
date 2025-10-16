const Bin = require('../models/Bin');
const WasteRequest = require('../models/WasteRequest');
const Collection = require('../models/Collection');
const Route = require('../models/Route');

class BinService {
  // Find nearest available bin to user location
  static async findNearestBin(userLat, userLng, collectionType = 'food', maxDistance = 5) {
    try {
      const bins = await Bin.find({
        isActive: true,
        type: collectionType,
        fillLevel: { $lt: 90 } // Not almost full
      });

      const binsWithDistance = bins.map(bin => {
        const distance = this.calculateDistance(
          userLat, userLng,
          bin.location.coordinates.lat,
          bin.location.coordinates.lng
        );
        
        return {
          ...bin.toObject(),
          distance
        };
      });

      // Filter by max distance and sort by distance
      const nearbyBins = binsWithDistance
        .filter(bin => bin.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance);

      return nearbyBins;
    } catch (error) {
      throw new Error(`Error finding nearest bin: ${error.message}`);
    }
  }

  // Calculate distance between two coordinates using Haversine formula
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  static toRadians(degrees) {
    return degrees * (Math.PI/180);
  }

  // Update bin fill level (simulate sensor data)
  static async updateBinFillLevel(binId, fillLevel) {
    try {
      const bin = await Bin.findOne({ binId });
      if (!bin) {
        throw new Error('Bin not found');
      }

      bin.fillLevel = fillLevel;
      await bin.save();

      return bin;
    } catch (error) {
      throw new Error(`Error updating bin fill level: ${error.message}`);
    }
  }

  // Get bins requiring attention (low battery, overflow, etc.)
  static async getBinsRequiringAttention() {
    try {
      const criticalBins = await Bin.find({
        $or: [
          { fillLevel: { $gt: 90 } }, // Almost full or overflow
          { battery: { $lt: 20 } },   // Low battery
          { maintenanceRequired: true }
        ],
        isActive: true
      }).sort({ fillLevel: -1, battery: 1 });

      return criticalBins;
    } catch (error) {
      throw new Error(`Error getting bins requiring attention: ${error.message}`);
    }
  }
}

class RouteService {
  // Generate optimal collection route for worker
  static async generateOptimalRoute(workerId, date, binIds = []) {
    try {
      // If no specific bins provided, get bins that need collection
      if (binIds.length === 0) {
        const binsNeedingCollection = await Bin.find({
          fillLevel: { $gt: 70 }, // More than 70% full
          isActive: true
        }).limit(15); // Max 15 bins per route

        binIds = binsNeedingCollection.map(bin => bin.binId);
      }

      // Get bin details
      const bins = await Bin.find({ binId: { $in: binIds } });

      // Simple route optimization - group by area and sort by coordinates
      const groupedByArea = this.groupBinsByArea(bins);
      const optimizedBins = this.optimizeRouteOrder(groupedByArea);

      const route = new Route({
        collectorId: workerId,
        assignedDate: date,
        bins: optimizedBins.map((bin, index) => ({
          binId: bin.binId,
          sequence: index + 1,
          estimatedTime: 10, // 10 minutes per bin
          priority: bin.fillLevel > 90 ? 'urgent' : 'normal'
        })),
        totalBins: optimizedBins.length,
        estimatedDuration: optimizedBins.length * 10, // 10 minutes per bin
        area: this.getMostCommonArea(bins)
      });

      await route.save();
      return route;
    } catch (error) {
      throw new Error(`Error generating route: ${error.message}`);
    }
  }

  static groupBinsByArea(bins) {
    const grouped = {};
    bins.forEach(bin => {
      const area = bin.location.area;
      if (!grouped[area]) {
        grouped[area] = [];
      }
      grouped[area].push(bin);
    });
    return grouped;
  }

  static optimizeRouteOrder(groupedBins) {
    const optimized = [];
    
    // Process each area separately
    Object.keys(groupedBins).forEach(area => {
      const areaBins = groupedBins[area];
      
      // Sort by coordinates (simple nearest neighbor)
      areaBins.sort((a, b) => {
        const latDiff = a.location.coordinates.lat - b.location.coordinates.lat;
        if (Math.abs(latDiff) > 0.001) return latDiff;
        return a.location.coordinates.lng - b.location.coordinates.lng;
      });
      
      optimized.push(...areaBins);
    });

    return optimized;
  }

  static getMostCommonArea(bins) {
    const areaCounts = {};
    bins.forEach(bin => {
      const area = bin.location.area;
      areaCounts[area] = (areaCounts[area] || 0) + 1;
    });

    return Object.keys(areaCounts).reduce((a, b) => 
      areaCounts[a] > areaCounts[b] ? a : b
    );
  }
}

class NotificationService {
  // Send real-time notification to user
  static async notifyUser(userId, message, type = 'info') {
    try {
      // In a real app, this would send push notifications, emails, or SMS
      console.log(`📱 Notification to User ${userId}: ${message} (${type})`);
      
      // Here you could integrate with:
      // - Firebase Cloud Messaging for push notifications
      // - SendGrid for emails
      // - Twilio for SMS
      // - WebSocket for real-time browser notifications
      
      return {
        success: true,
        message: 'Notification sent successfully'
      };
    } catch (error) {
      throw new Error(`Error sending notification: ${error.message}`);
    }
  }

  // Notify admin of critical alerts
  static async notifyAdmin(alertType, binId, details) {
    try {
      console.log(`🚨 Admin Alert: ${alertType} for bin ${binId} - ${details}`);
      
      return {
        success: true,
        message: 'Admin notification sent successfully'
      };
    } catch (error) {
      throw new Error(`Error sending admin notification: ${error.message}`);
    }
  }
}

// Simulate sensor data updates
class SensorSimulator {
  static startSimulation() {
    console.log('📡 Starting sensor data simulation...');
    
    setInterval(async () => {
      try {
        // Get random bins to update
        const bins = await Bin.aggregate([{ $sample: { size: 5 } }]);
        
        for (const bin of bins) {
          // Simulate fill level increase
          const currentFill = bin.fillLevel;
          const increase = Math.random() * 2; // 0-2% increase
          const newFillLevel = Math.min(currentFill + increase, 150);
          
          // Simulate battery decrease
          const batteryDecrease = Math.random() * 0.1; // 0-0.1% decrease
          const newBatteryLevel = Math.max(bin.battery - batteryDecrease, 0);
          
          await Bin.findByIdAndUpdate(bin._id, {
            fillLevel: newFillLevel,
            battery: newBatteryLevel,
            lastUpdated: new Date()
          });
        }
        
        console.log(`📊 Updated ${bins.length} bins with sensor data`);
      } catch (error) {
        console.error('Error in sensor simulation:', error);
      }
    }, 30000); // Update every 30 seconds
  }
}

module.exports = {
  BinService,
  RouteService,
  NotificationService,
  SensorSimulator
};
