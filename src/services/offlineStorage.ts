import { FieldReport, GPSUpdate } from '../types';

const OFFLINE_REPORTS_KEY = 'pravaha_pending_field_reports';
const OFFLINE_GPS_KEY = 'pravaha_pending_gps_updates';

export const offlineStorage = {
  getPendingReports(): FieldReport[] {
    try {
      const data = localStorage.getItem(OFFLINE_REPORTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  savePendingReport(report: FieldReport): void {
    const reports = this.getPendingReports();
    reports.push(report);
    localStorage.setItem(OFFLINE_REPORTS_KEY, JSON.stringify(reports));
  },

  clearPendingReports(): void {
    localStorage.removeItem(OFFLINE_REPORTS_KEY);
  },

  getPendingGps(): GPSUpdate[] {
    try {
      const data = localStorage.getItem(OFFLINE_GPS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  savePendingGps(update: GPSUpdate): void {
    const gpsList = this.getPendingGps();
    gpsList.push(update);
    localStorage.setItem(OFFLINE_GPS_KEY, JSON.stringify(gpsList));
  },

  clearPendingGps(): void {
    localStorage.removeItem(OFFLINE_GPS_KEY);
  },
};
