export interface FuelLog {
  id: string;
  date: string; // ISO string
  odometer: number;
  gallons: number;
  pricePerGallon: number;
  totalCost: number;
  location?: string;
  latitude?: number;
  longitude?: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export enum Tab {
  ENTRY = 'ENTRY',
  HISTORY = 'HISTORY',
  STATS = 'STATS',
  MAP = 'MAP'
}

export interface ScanResult {
  odometer: number | null;
  gallons: number | null;
  pricePerGallon: number | null;
  totalCost: number | null;
}