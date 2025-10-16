import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Route, RouteStats } from '../services/route/api';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface PDFData {
  startDate: Date;
  endDate: Date;
  routes: Route[];
  stats: RouteStats;
}

export class ClientPDFService {
  private formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  private formatDateTime(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private capitalizeFirst(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ');
  }

  async generateRouteReport(data: PDFData): Promise<void> {
    const { startDate, endDate, routes, stats } = data;
    
    // Create new PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = 20;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235); // Blue color
    doc.text('UrbanCleanse', 20, yPosition);
    
    yPosition += 10;
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55); // Dark gray
    doc.text('Route Management Report', 20, yPosition);
    
    yPosition += 8;
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // Gray
    doc.text(`Report Period: ${this.formatDate(startDate)} to ${this.formatDate(endDate)}`, 20, yPosition);
    
    yPosition += 5;
    doc.text(`Generated on: ${this.formatDateTime(new Date())}`, 20, yPosition);
    
    yPosition += 15;

    // Summary Statistics
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text('Summary Statistics', 20, yPosition);
    yPosition += 10;

    // Create summary boxes
    const boxWidth = 40;
    const boxHeight = 20;
    let currentX = 20;

    const summaryItems = [
      { label: 'Total Routes', value: stats.totalRoutes.toString() },
      { label: 'Completed', value: stats.routesByStatus.completed.toString() },
      { label: 'In Progress', value: stats.routesByStatus.in_progress.toString() },
      { label: 'Completion Rate', value: `${stats.completionRate}%` }
    ];

    summaryItems.forEach((item, index) => {
      if (index === 2) {
        currentX = 20;
        yPosition += 25;
      }

      // Draw box
      doc.setDrawColor(229, 231, 235);
      doc.setFillColor(249, 250, 251);
      doc.rect(currentX, yPosition, boxWidth, boxHeight, 'FD');

      // Value
      doc.setFontSize(12);
      doc.setTextColor(59, 130, 246);
      const textWidth = doc.getTextWidth(item.value);
      doc.text(item.value, currentX + (boxWidth - textWidth) / 2, yPosition + 8);

      // Label
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      const labelWidth = doc.getTextWidth(item.label);
      doc.text(item.label, currentX + (boxWidth - labelWidth) / 2, yPosition + 15);

      currentX += boxWidth + 10;
    });

    yPosition += 35;

    // Routes Overview
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text('Routes Overview', 20, yPosition);
    yPosition += 10;

    // Worker Types Distribution
    doc.setFontSize(10);
    doc.text('Worker Types Distribution:', 20, yPosition);
    yPosition += 6;

    const workerTypes = [
      { type: 'Residential (WC1)', count: stats.workerTypes.wc1 },
      { type: 'Commercial (WC2)', count: stats.workerTypes.wc2 },
      { type: 'Industrial (WC3)', count: stats.workerTypes.wc3 }
    ];

    workerTypes.forEach(worker => {
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      doc.text(`• ${worker.type}: ${worker.count} routes`, 30, yPosition);
      yPosition += 5;
    });

    yPosition += 5;

    // Areas Covered
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text('Areas Covered:', 20, yPosition);
    yPosition += 6;

    if (stats.areas && stats.areas.length > 0) {
      const areasText = stats.areas.join(', ');
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      
      // Handle text wrapping
      const lines = doc.splitTextToSize(areasText, pageWidth - 50);
      lines.forEach((line: string) => {
        doc.text(line, 30, yPosition);
        yPosition += 5;
      });
    }

    yPosition += 10;

    // Performance Metrics
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text('Performance Metrics:', 20, yPosition);
    yPosition += 6;

    const metrics = [
      `Total Bins Assigned: ${stats.totalBins}`,
      `Bins Completed: ${stats.completedBins}`,
      `Efficiency Rate: ${stats.efficiency || 0}%`
    ];

    metrics.forEach(metric => {
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      doc.text(`• ${metric}`, 30, yPosition);
      yPosition += 5;
    });

    yPosition += 15;

    // Detailed Routes Table
    if (yPosition > pageHeight - 100) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text('Detailed Routes', 20, yPosition);
    yPosition += 10;

    // Prepare table data
    const tableData = routes.map(route => [
      route.routeId || 'N/A',
      route.collectorId?.name || 'Unassigned',
      route.area || 'Unknown',
      this.capitalizeFirst(route.status || ''),
      `${route.completedBins || 0}/${route.totalBins || 0}`,
      `${route.actualDuration || route.estimatedDuration || 0}m`,
      this.formatDate(route.assignedDate)
    ]);

    // Create table
    doc.autoTable({
      startY: yPosition,
      head: [['Route ID', 'Worker', 'Area', 'Status', 'Bins', 'Duration', 'Date']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [243, 244, 246],
        textColor: [55, 65, 81],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [55, 65, 81]
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      columnStyles: {
        0: { cellWidth: 25 }, // Route ID
        1: { cellWidth: 30 }, // Worker
        2: { cellWidth: 25 }, // Area
        3: { cellWidth: 20 }, // Status
        4: { cellWidth: 20 }, // Bins
        5: { cellWidth: 20 }, // Duration
        6: { cellWidth: 25 }  // Date
      },
      margin: { left: 20, right: 20 }
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Footer line
      doc.setDrawColor(229, 231, 235);
      doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
      
      // Footer text
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text('UrbanCleanse Route Management System', 20, pageHeight - 12);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 40, pageHeight - 12);
      doc.text(`Generated on ${this.formatDateTime(new Date())}`, 20, pageHeight - 6);
    }

    // Generate filename and save
    const filename = `route-report-${this.formatDate(startDate).replace(/\s/g, '-')}-to-${this.formatDate(endDate).replace(/\s/g, '-')}.pdf`;
    doc.save(filename);
  }
}

export const clientPDFService = new ClientPDFService();