import React, { useEffect, useRef } from 'react';
import { FuelLog } from '../types';

interface FuelMapProps {
  logs: FuelLog[];
}

declare global {
  interface Window {
    L: any;
  }
}

const FuelMap: React.FC<FuelMapProps> = ({ logs }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);

  // Filter logs with valid coordinates
  const validLogs = logs.filter(log => log.latitude && log.longitude);

  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    if (leafletMap.current) {
        leafletMap.current.remove();
    }

    // Default center (USA-ish) if no logs, or center on first log
    const initialCenter = validLogs.length > 0 
      ? [validLogs[0].latitude, validLogs[0].longitude] 
      : [39.8283, -98.5795];
    
    const initialZoom = validLogs.length > 0 ? 12 : 4;

    const map = window.L.map(mapRef.current).setView(initialCenter, initialZoom);
    leafletMap.current = map;

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add markers
    validLogs.forEach(log => {
      const marker = window.L.marker([log.latitude, log.longitude]).addTo(map);
      marker.bindPopup(`
        <div class="p-1">
          <strong class="text-sm font-bold block">${log.location || 'Unknown Location'}</strong>
          <span class="text-xs text-gray-600">${new Date(log.date).toLocaleDateString()}</span><br/>
          <span class="text-xs">$${log.totalCost} - ${log.gallons} gal</span>
        </div>
      `);
    });

    // Fit bounds if multiple points
    if (validLogs.length > 1) {
      const bounds = validLogs.map(l => [l.latitude, l.longitude]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, [logs]); // Re-render when logs change

  return (
    <div className="h-[calc(100vh-140px)] w-full relative z-0">
      {validLogs.length === 0 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[400] bg-white/90 px-4 py-2 rounded-full shadow-md text-sm text-gray-600 backdrop-blur-sm">
          No entries with GPS data yet.
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

export default FuelMap;