export enum PlotStatus {
  AVAILABLE = 'Available',
  BOOKED = 'Booked',
  SOLD = 'Sold'
}

// Represents a geometric plot detected by AI or defined manually
export interface PlotGeometry {
  id: string; // The detected text label (e.g., "101")
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
}

// Represents the business data from CSV/Excel
export interface InventoryItem {
  plotId: string;
  status: PlotStatus;
  price?: number;
  sqFt?: number;
  customerName?: string;
  [key: string]: any;
}

// Merged data for the dashboard
export interface EnrichedPlot extends PlotGeometry {
  inventory?: InventoryItem;
}

export interface DashboardData {
  id: string;
  name: string;
  createdAt: number;
  layoutImage: string; // Base64 data URI
  plots: EnrichedPlot[];
}

export type ViewState = 'DIRECTORY' | 'WIZARD' | 'DASHBOARD';

export interface FileUploadState {
  imageFile: File | null;
  inventoryFile: File | null;
}
