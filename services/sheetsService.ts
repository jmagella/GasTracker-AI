import { FuelLog } from '../types';

export const SHEETS_URL_KEY = 'sheets_webhook_url';

export const getSheetsUrl = (): string => {
  try { return localStorage.getItem(SHEETS_URL_KEY) || ''; } catch { return ''; }
};

/** JSON row sent to the Google Apps Script Web App. Keys map 1:1 to spreadsheet columns. */
export const buildSheetPayload = (log: FuelLog) => ({
  id: log.id,
  date: log.date,
  odometer: log.odometer,
  gallons: log.gallons,
  pricePerGallon: log.pricePerGallon,
  totalCost: log.totalCost,
  location: log.location || '',
  latitude: log.latitude ?? null,
  longitude: log.longitude ?? null,
  weatherTemp: log.weatherTemp ?? null,
  isFullTank: log.isFullTank !== false // boolean
});

/**
 * Fire-and-forget POST. Content-Type text/plain avoids a CORS preflight, which Apps Script
 * cannot answer; no-cors means the response is opaque, so failures are only logged.
 */
export const syncLogToSheet = async (log: FuelLog): Promise<void> => {
  const url = getSheetsUrl();
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(buildSheetPayload(log))
    });
  } catch (err) {
    console.error('Google Sheets sync failed', err);
  }
};
