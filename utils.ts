import { FuelLog } from './types';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,") to get raw base64
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
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

export const calculateMPG = (current: FuelLog, previous: FuelLog): number | null => {
  if (current.odometer <= previous.odometer) return null;
  const distance = current.odometer - previous.odometer;
  return distance / current.gallons;
};
