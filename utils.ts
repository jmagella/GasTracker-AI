import { FuelLog, ThemeColor } from './types';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export const compressImage = (file: File, maxWidth = 1024): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 (JPEG 0.8 quality for good compression)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const exportToCSV = (logs: FuelLog[]) => {
  if (logs.length === 0) return;

  const headers = ['Date', 'Odometer', 'Gallons', 'Price/Gal', 'Total Cost', 'Location', 'Latitude', 'Longitude', 'Full Tank'];
  const csvContent = [
    headers.join(','),
    ...logs.map(log => [
      `"${new Date(log.date).toLocaleString()}"`,
      log.odometer,
      log.gallons,
      log.pricePerGallon,
      log.totalCost,
      `"${log.location || ''}"`,
      log.latitude || '',
      log.longitude || '',
      log.isFullTank === false ? 'false' : 'true'
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fuel_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const parseCSV = (csvText: string): Omit<FuelLog, 'id'>[] => {
  const lines = csvText.split(/\r?\n/);
  // Expect headers on first line
  if (lines.length < 2) return [];

  const results: Omit<FuelLog, 'id'>[] = [];

  // Quote-aware split that preserves empty fields (so column positions stay stable)
  const splitCSVLine = (line: string) => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  // Start from 1 to skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = splitCSVLine(line);
    // Basic validation: Must have at least Odometer, Gallons, Cost (cols 1, 2, 4 based on export format)
    // Export format: Date, Odometer, Gallons, Price/Gal, Total Cost, Location, Lat, Lng
    if (cols.length < 5) continue;

    const dateStr = cols[0];
    const odometer = parseFloat(cols[1]);
    const gallons = parseFloat(cols[2]);
    const pricePerGallon = parseFloat(cols[3]);
    const totalCost = parseFloat(cols[4]);
    const location = cols[5] || '';
    const latitude = cols[6] ? parseFloat(cols[6]) : undefined;
    const longitude = cols[7] ? parseFloat(cols[7]) : undefined;
    const isFullTank = (cols[8] || '').toLowerCase() !== 'false';

    // Validate numbers
    if (isNaN(odometer) || isNaN(gallons) || isNaN(totalCost)) continue;
    
    // Attempt to parse date, fallback to now if invalid
    const parsedDate = new Date(dateStr);
    const date = (isNaN(parsedDate.getTime()) ? new Date() : parsedDate).toISOString();

    results.push({
      date,
      odometer,
      gallons,
      pricePerGallon: isNaN(pricePerGallon) ? (totalCost/gallons) : pricePerGallon,
      totalCost,
      location,
      latitude,
      longitude,
      isFullTank
    });
  }
  return results;
};

export const MPG_MIN = 5.0;
export const MPG_MAX = 100.0;

const isFull = (log: FuelLog) => log.isFullTank !== false;

/** Oldest-first ordering used for all MPG math. */
export const sortLogsAscending = (logs: FuelLog[]): FuelLog[] =>
  [...logs].sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    return diff !== 0 ? diff : a.odometer - b.odometer;
  });

/**
 * MPG for the entry at `index` of an oldest-first list.
 * Partial fills return null. Full fills use the most recent previous full tank as the
 * baseline: distance = odometer delta, gallons = everything pumped since that baseline
 * (partials in between, plus this fill).
 */
export const calculateMPGAt = (ascLogs: FuelLog[], index: number): number | null => {
  const current = ascLogs[index];
  if (!current || !isFull(current)) return null;

  let gallons = current.gallons;
  for (let i = index - 1; i >= 0; i--) {
    const prev = ascLogs[i];
    if (isFull(prev)) {
      const distance = current.odometer - prev.odometer;
      if (distance <= 0 || gallons <= 0) return null;
      return distance / gallons;
    }
    gallons += prev.gallons;
  }
  return null; // no earlier full tank to measure from
};

/** MPG per log id (null when not computable or partial). */
export const computeMpgById = (logs: FuelLog[]): Map<string, number | null> => {
  const asc = sortLogsAscending(logs);
  const map = new Map<string, number | null>();
  asc.forEach((log, i) => map.set(log.id, calculateMPGAt(asc, i)));
  return map;
};

export interface EntryValidation {
  mpg: number | null;
  odometerIssue: boolean;
  gallonsIssue: boolean;
  hasIssue: boolean;
}

/** Validate a not-yet-saved entry against existing history. */
export const validateEntry = (
  existing: FuelLog[],
  candidate: { odometer: number; gallons: number; isFullTank: boolean; date?: string }
): EntryValidation => {
  const asc = sortLogsAscending(existing);
  const prev = asc[asc.length - 1];
  const odometerIssue = !!prev && candidate.odometer < prev.odometer;

  const temp: FuelLog = {
    id: '__candidate__',
    date: candidate.date || new Date().toISOString(),
    odometer: candidate.odometer,
    gallons: candidate.gallons,
    pricePerGallon: 0,
    totalCost: 0,
    isFullTank: candidate.isFullTank
  };
  // Candidate is always the newest entry
  const mpg = calculateMPGAt([...asc, temp], asc.length);
  const gallonsIssue = mpg !== null && (mpg < MPG_MIN || mpg > MPG_MAX);

  return { mpg, odometerIssue, gallonsIssue, hasIssue: odometerIssue || gallonsIssue };
};

// Theme Utilities
export const colorPalettes: Record<ThemeColor, Record<number, string>> = {
  blue: { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 900: '#1e3a8a' },
  green: { 50: '#f0fdf4', 100: '#dcfce7', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 900: '#14532d' },
  orange: { 50: '#fff7ed', 100: '#ffedd5', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 900: '#7c2d12' },
  purple: { 50: '#faf5ff', 100: '#f3e8ff', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 900: '#581c87' },
  red: { 50: '#fef2f2', 100: '#fee2e2', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 900: '#7f1d1d' },
};

export const applyThemeColor = (color: string) => {
  const palette = colorPalettes[color as ThemeColor] || colorPalettes.blue;
  const root = document.documentElement;
  Object.entries(palette).forEach(([key, value]) => {
    root.style.setProperty(`--brand-${key}`, value);
  });
  
  // Also update meta theme-color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', palette[500]);
  }
};