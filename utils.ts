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

  const headers = ['Date', 'Odometer', 'Gallons', 'Price/Gal', 'Total Cost', 'Location', 'Latitude', 'Longitude'];
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
      log.longitude || ''
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

  // Robust split function to handle commas inside quotes
  const splitCSVLine = (line: string) => {
    // Matches fields in quotes OR fields without commas
    const pattern = /(".*?"|[^",]+)(?=\s*,|\s*$)/g;
    return line.match(pattern)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
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

    // Validate numbers
    if (isNaN(odometer) || isNaN(gallons) || isNaN(totalCost)) continue;
    
    // Attempt to parse date, fallback to now if invalid
    let date = new Date(dateStr).toISOString();
    if(date === 'Invalid Date') date = new Date().toISOString();

    results.push({
      date,
      odometer,
      gallons,
      pricePerGallon: isNaN(pricePerGallon) ? (totalCost/gallons) : pricePerGallon,
      totalCost,
      location,
      latitude,
      longitude
    });
  }
  return results;
};

export const calculateMPG = (current: FuelLog, previous: FuelLog): number | null => {
  if (current.odometer <= previous.odometer) return null;
  const distance = current.odometer - previous.odometer;
  return distance / current.gallons;
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