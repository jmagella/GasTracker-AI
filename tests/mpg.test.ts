import { describe, it, expect } from 'vitest';
import { FuelLog } from '../types';
import { computeMpgById, validateEntry, parseCSV } from '../utils';

let n = 0;
const log = (odometer: number, gallons: number, isFullTank?: boolean): FuelLog => ({
  id: `l${++n}`,
  date: new Date(2025, 0, n).toISOString(),
  odometer,
  gallons,
  pricePerGallon: 3,
  totalCost: gallons * 3,
  isFullTank
});

describe('computeMpgById', () => {
  it('uses previous full tank for consecutive full fills', () => {
    const a = log(1000, 10, true), b = log(1300, 10, true);
    const m = computeMpgById([a, b]);
    expect(m.get(a.id)).toBeNull();
    expect(m.get(b.id)).toBeCloseTo(30);
  });

  it('sums partial fills back to the last full tank', () => {
    const a = log(1000, 10, true);
    const p = log(1100, 4, false);
    const c = log(1300, 6, true);
    const m = computeMpgById([a, p, c]);
    expect(m.get(p.id)).toBeNull();
    expect(m.get(c.id)).toBeCloseTo(300 / 10); // 300 mi / (4 + 6) gal
  });

  it('returns null when no earlier full tank exists', () => {
    const p = log(1000, 4, false), c = log(1200, 6, true);
    expect(computeMpgById([p, c]).get(c.id)).toBeNull();
  });

  it('treats legacy records (no flag) as full tank', () => {
    const a = log(1000, 10), b = log(1250, 10);
    expect(computeMpgById([a, b]).get(b.id)).toBeCloseTo(25);
  });
});

describe('validateEntry', () => {
  const history = [log(1000, 10, true)];
  it('accepts realistic data', () => {
    expect(validateEntry(history, { odometer: 1300, gallons: 10, isFullTank: true }).hasIssue).toBe(false);
  });
  it('flags MPG below 5 and above 100', () => {
    expect(validateEntry(history, { odometer: 1020, gallons: 10, isFullTank: true }).gallonsIssue).toBe(true);
    expect(validateEntry(history, { odometer: 3000, gallons: 10, isFullTank: true }).gallonsIssue).toBe(true);
  });
  it('flags odometer lower than previous entry', () => {
    expect(validateEntry(history, { odometer: 900, gallons: 10, isFullTank: true }).odometerIssue).toBe(true);
  });
  it('does not MPG-check partial fills', () => {
    expect(validateEntry(history, { odometer: 1005, gallons: 10, isFullTank: false }).gallonsIssue).toBe(false);
  });
});

describe('parseCSV', () => {
  it('keeps column positions with empty lat/lng and reads Full Tank', () => {
    const csv = 'Date,Odometer,Gallons,Price/Gal,Total Cost,Location,Latitude,Longitude,Full Tank\n"1/1/2025",1000,10,3,30,"Sunoco",,,false';
    const [r] = parseCSV(csv);
    expect(r.location).toBe('Sunoco');
    expect(r.isFullTank).toBe(false);
  });
  it('defaults old files without the column to full tank', () => {
    const csv = 'h\n"1/1/2025",1000,10,3,30,"Sunoco",,';
    expect(parseCSV(csv)[0].isFullTank).toBe(true);
  });
});
