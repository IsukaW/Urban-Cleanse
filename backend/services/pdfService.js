const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// PDF Service for generating route management reports
class PDFService {
  constructor() {
    this.pageMargin = 50;
    this.lineHeight = 20;
  }

  // Generate Route Management Report PDF
  async generateRouteReport(data, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          size: 'A4', 
          margin: this.pageMargin,
          info: {
            Title: 'Route Management Report',
            Author: 'UrbanCleanse Admin',
            Subject: 'Route Management Statistics and Details',
            Keywords: 'routes, waste collection, management, report'
          }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
        doc.on('error', reject);

        // Generate PDF content
        this.generateReportContent(doc, data, options);
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  generateReportContent(doc, data, options) {
    const { startDate, endDate, routes, stats, summary } = data;
    
    // Header
    this.addHeader(doc, startDate, endDate);
    
    // Summary Statistics
    this.addSummarySection(doc, stats);
    
    // Routes Overview
    this.addRoutesOverview(doc, summary);
    
    // Detailed Routes Table
    this.addRoutesTable(doc, routes);
    
    // Footer removed as per request
  }

  addHeader(doc, startDate, endDate) {
    // Modern header with gradient background
    doc.rect(0, 0, doc.page.width, 120)
       .fillAndStroke('#1e40af', '#1e40af');
    
    // White content area
    doc.rect(0, 120, doc.page.width, 60)
       .fillAndStroke('#ffffff', '#ffffff');
    
    // Company branding
    doc.fontSize(32)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .text('UrbanCleanse', 50, 25);
    
    // Professional subtitle
    doc.fontSize(18)
       .font('Helvetica')
       .fillColor('#e0e7ff')
       .text('Route Management Report', 50, 65);
    
    // Report details in organized layout
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor('#1f2937');
    
    // Left side info
    doc.text('Report Period:', 50, 135);
    doc.font('Helvetica')
       .fillColor('#4b5563')
       .text(`${this.formatDate(startDate)} to ${this.formatDate(endDate)}`, 50, 150);
    
    // Center info
    doc.font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text('Generated:', 250, 135);
    doc.font('Helvetica')
       .fillColor('#4b5563')
       .text(this.formatDateTime(new Date()), 250, 150);
    
    // Right side info
    doc.font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text('Classification:', 400, 135);
    doc.font('Helvetica')
       .fillColor('#dc2626')
       .text('CONFIDENTIAL', 400, 150);
    
    // Divider line
    doc.moveTo(50, 170)
       .lineTo(545, 170)
       .strokeColor('#e5e7eb')
       .lineWidth(1)
       .stroke();
    
    doc.y = 190;
  }

  addSummarySection(doc, stats) {
    // Section title with underline
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text('Executive Summary', 50, doc.y);
    
    doc.moveTo(50, doc.y + 25)
       .lineTo(200, doc.y + 25)
       .strokeColor('#3b82f6')
       .lineWidth(2)
       .stroke();
    
    doc.y += 40;
    
    // Professional metric cards in 2x2 grid
    const cardWidth = 235;
    const cardHeight = 80;
    const spacing = 20;
    
    const summaryItems = [
      { 
        label: 'Total Routes', 
        value: stats.totalRoutes || 0, 
        color: '#3b82f6', 
        bgColor: '#eff6ff',
        symbol: 'ROUTES'
      },
      { 
        label: 'Completed Routes', 
        value: stats.routesByStatus?.completed || 0, 
        color: '#059669', 
        bgColor: '#ecfdf5',
        symbol: 'DONE'
      },
      { 
        label: 'In Progress', 
        value: stats.routesByStatus?.in_progress || 0, 
        color: '#d97706', 
        bgColor: '#fffbeb',
        symbol: 'ACTIVE'
      },
      { 
        label: 'Completion Rate', 
        value: `${stats.completionRate || 0}%`, 
        color: '#7c3aed', 
        bgColor: '#f5f3ff',
        symbol: 'RATE'
      }
    ];
    
    let currentX = 50;
    let currentY = doc.y;
    
    summaryItems.forEach((item, index) => {
      if (index === 2) {
        currentX = 50;
        currentY += cardHeight + spacing;
      }
      
      // Card shadow effect
      doc.rect(currentX + 2, currentY + 2, cardWidth, cardHeight)
         .fillAndStroke('#f1f5f9', '#f1f5f9');
      
      // Main card
      doc.rect(currentX, currentY, cardWidth, cardHeight)
         .fillAndStroke('#ffffff', '#e5e7eb');
      
      // Colored left border
      doc.rect(currentX, currentY, 4, cardHeight)
         .fillAndStroke(item.color, item.color);
      
      // Symbol indicator (top right)
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor(item.color)
         .text(item.symbol, currentX + cardWidth - 60, currentY + 10);
      
      // Value - large and prominent
      doc.fontSize(32)
         .font('Helvetica-Bold')
         .fillColor(item.color)
         .text(item.value.toString(), currentX + 20, currentY + 20);
      
      // Label
      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#6b7280')
         .text(item.label, currentX + 20, currentY + 55);
      
      currentX += cardWidth + spacing;
    });
    
    doc.y = currentY + cardHeight + 40;
  }

  addRoutesOverview(doc, summary) {
    // Check if we need a new page before adding content
    if (doc.y > 550) {
      doc.addPage();
      doc.y = 50;
    }
    
    // Section header
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text('Routes Overview', 50, doc.y);
    
    doc.moveTo(50, doc.y + 25)
       .lineTo(180, doc.y + 25)
       .strokeColor('#3b82f6')
       .lineWidth(2)
       .stroke();
    
    doc.y += 45;
    
    // Two-column professional layout
    const leftBox = { x: 50, y: doc.y, width: 235, height: 160 };
    const rightBox = { x: 305, y: doc.y, width: 240, height: 160 };
    
    // Left column - Worker Distribution
    doc.rect(leftBox.x, leftBox.y, leftBox.width, leftBox.height)
       .fillAndStroke('#ffffff', '#e5e7eb');
    
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text('Worker Type Distribution', leftBox.x + 15, leftBox.y + 15);
    
    const workerTypes = [
      { type: 'Residential Collection', count: summary.workerTypes?.wc1 || 0, color: '#3b82f6' },
      { type: 'Commercial Collection', count: summary.workerTypes?.wc2 || 0, color: '#059669' },
      { type: 'Industrial Collection', count: summary.workerTypes?.wc3 || 0, color: '#d97706' }
    ];
    
    let yPos = leftBox.y + 45;
    workerTypes.forEach(worker => {
      // Color dot
      doc.circle(leftBox.x + 25, yPos + 4, 4)
         .fillAndStroke(worker.color, worker.color);
      
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#374151')
         .text(worker.type, leftBox.x + 40, yPos);
      
      doc.font('Helvetica-Bold')
         .fillColor('#1f2937')
         .text(`${worker.count} routes`, leftBox.x + 160, yPos);
      
      yPos += 25;
    });
    
    // Right column - Performance Metrics
    doc.rect(rightBox.x, rightBox.y, rightBox.width, rightBox.height)
       .fillAndStroke('#ffffff', '#e5e7eb');
    
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text('Performance Metrics', rightBox.x + 15, rightBox.y + 15);
    
    const metrics = [
      { label: 'Total Bins Assigned', value: summary.totalBins || 0, unit: '' },
      { label: 'Bins Completed', value: summary.completedBins || 0, unit: '' },
      { label: 'Average Duration', value: summary.avgDuration || 0, unit: ' min' },
      { label: 'Efficiency Rate', value: summary.efficiency || 0, unit: '%' }
    ];
    
    yPos = rightBox.y + 45;
    metrics.forEach(metric => {
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#374151')
         .text(metric.label, rightBox.x + 15, yPos);
      
      doc.font('Helvetica-Bold')
         .fillColor('#059669')
         .text(`${metric.value}${metric.unit}`, rightBox.x + 160, yPos);
      
      yPos += 25;
    });
    
    doc.y = leftBox.y + leftBox.height + 30;
    
    // Areas covered section
    if (summary.areas && summary.areas.length > 0) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#1f2937')
         .text('Areas Covered', 50, doc.y);
      
      doc.y += 25;
      
      // Professional area tags
      let currentX = 50;
      let tagY = doc.y;
      
      summary.areas.forEach((area, index) => {
        const tagWidth = doc.widthOfString(area) + 20;
        
        if (currentX + tagWidth > 520) {
          currentX = 50;
          tagY += 30;
        }
        
        // Tag background
        doc.roundedRect(currentX, tagY, tagWidth, 20, 10)
           .fillAndStroke('#e0f2fe', '#0891b2');
        
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#0e7490')
           .text(area, currentX + 10, tagY + 6);
        
        currentX += tagWidth + 10;
      });
      
      doc.y = tagY + 35;
    }
  }

  addRoutesTable(doc, routes) {
    // Check if we need a new page - more conservative check
    if (doc.y > 650) {
      doc.addPage();
      doc.y = 50;
    }
    
    // Section header
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text('Route Details', 50, doc.y);
    
    doc.moveTo(50, doc.y + 25)
       .lineTo(150, doc.y + 25)
       .strokeColor('#3b82f6')
       .lineWidth(2)
       .stroke();
    
    doc.y += 40;
    
    if (!routes || routes.length === 0) {
      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#6b7280')
         .text('No routes found for the selected period.', 50, doc.y);
      return;
    }
    
    // Modern table design with better column widths
    const tableStartY = doc.y;
    const rowHeight = 35;
    const headerHeight = 35;
    
    // Improved column definitions with better widths
    const columns = [
      { header: 'Route ID', x: 50, width: 90 },
      { header: 'Worker', x: 140, width: 85 },
      { header: 'Area', x: 225, width: 85 },
      { header: 'Status', x: 310, width: 75 },
      { header: 'Progress', x: 385, width: 55 },
      { header: 'Duration', x: 440, width: 55 },
      { header: 'Date', x: 495, width: 50 }
    ];
    
    // Helper function to draw table header
    const drawTableHeader = (y) => {
      doc.rect(50, y, 495, headerHeight)
         .fillAndStroke('#1e40af', '#1e40af');
      
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor('#ffffff');
      
      columns.forEach(col => {
        doc.text(col.header, col.x + 6, y + 12, {
          width: col.width - 12,
          align: 'left'
        });
      });
    };
    
    // Draw initial header
    drawTableHeader(tableStartY);
    let currentY = tableStartY + headerHeight;
    
    // Table rows with better styling
    routes.forEach((route, index) => {
      // Check if we need a new page - leave space for footer
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
        drawTableHeader(currentY);
        currentY += headerHeight;
      }
      
      // Alternating row colors
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(50, currentY, 495, rowHeight)
         .fillAndStroke(bgColor, '#e5e7eb');
      
      // Status indicators
      const statusConfig = {
        'completed': { color: '#059669', bg: '#ecfdf5', text: 'Complete' },
        'in_progress': { color: '#d97706', bg: '#fffbeb', text: 'In Progress' },
        'assigned': { color: '#3b82f6', bg: '#eff6ff', text: 'Assigned' },
        'cancelled': { color: '#dc2626', bg: '#fef2f2', text: 'Cancelled' }
      };
      
      const status = statusConfig[route.status] || { color: '#6b7280', bg: '#f9fafb', text: 'Unknown' };
      
      // Helper function to truncate text intelligently
      const truncateText = (text, maxLength) => {
        if (!text) return '';
        text = text.toString();
        if (text.length <= maxLength) return text;
        
        // For route IDs, show first part and last part
        if (text.includes('ROUTE-')) {
          const parts = text.split('-');
          if (parts.length >= 2) {
            return `${parts[0]}-${parts[1].substring(0, 4)}...`;
          }
        }
        
        // For areas with parentheses, prioritize the main area name
        if (text.includes('(')) {
          const mainPart = text.split('(')[0].trim();
          if (mainPart.length <= maxLength) return mainPart;
          return mainPart.substring(0, maxLength - 3) + '...';
        }
        
        return text.substring(0, maxLength - 3) + '...';
      };
      
      // Row data with intelligent truncation
      const rowData = [
        truncateText(route.routeId || 'N/A', 12),
        truncateText(route.collectorId?.name || 'Unassigned', 11),
        truncateText(route.area || 'Unknown', 11),
        status.text,
        `${route.completedBins || 0}/${route.totalBins || 0}`,
        `${route.actualDuration || route.estimatedDuration || 0}m`,
        this.formatDateShort(route.assignedDate)
      ];
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#374151');
      
      columns.forEach((col, colIndex) => {
        let text = rowData[colIndex];
        
        // Special formatting for status column
        if (colIndex === 3) {
          // Status badge with better sizing
          const badgeWidth = Math.min(col.width - 8, 65);
          doc.roundedRect(col.x + 4, currentY + 9, badgeWidth, 18, 9)
             .fillAndStroke(status.bg, status.color);
          
          doc.fillColor(status.color)
             .font('Helvetica-Bold')
             .fontSize(8)
             .text(text, col.x + 8, currentY + 13, {
               width: badgeWidth - 8,
               align: 'center'
             });
        } else {
          // Regular text with better positioning
          doc.fillColor('#374151')
             .font('Helvetica')
             .fontSize(9)
             .text(text, col.x + 6, currentY + 12, {
               width: col.width - 12,
               align: 'left'
             });
        }
      });
      
      currentY += rowHeight;
    });
    
    doc.y = currentY + 20;
  }

  addFooter(doc) {
    // Footer removed - no longer needed
    return;
  }

  // Utility functions
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ');
  }

  getTextHeight(doc, text, width) {
    const height = doc.heightOfString(text, { width });
    return height;
  }

  // Add a helper method for short date formatting
  formatDateShort(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    });
  }
}

module.exports = new PDFService();