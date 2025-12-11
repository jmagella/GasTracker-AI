import React, { useState, useRef, useMemo } from 'react';
import { Camera, MapPin, Loader2, Save, Scan, Gauge, Droplet, DollarSign, Receipt, AlertTriangle, CheckCircle, RefreshCw, Globe, Crosshair } from 'lucide-react';
import { FuelLog } from '../types';
import { analyzeImage } from '../services/geminiService';
import { compressImage } from '../utils';

interface FuelEntryProps {
  onAddLog: (log: Omit<FuelLog, 'id'>) => void;
  recentLocations: string[];
}

const DEFAULT_STATIONS = ['Sunoco', 'Stewarts'];

const FuelEntry: React.FC<FuelEntryProps> = ({ onAddLog, recentLocations }) => {
  const [odometer, setOdometer] = useState<string>('');
  const [gallons, setGallons] = useState<string>('');
  const [pricePerGallon, setPricePerGallon] = useState<string>('');
  const [totalCost, setTotalCost] = useState<string>('');
  
  // Location state
  const combinedOptions = useMemo(() => {
    // Filter out DEFAULT_STATIONS from recentLocations to avoid duplicates, then combine
    const uniqueRecent = recentLocations.filter(loc => !DEFAULT_STATIONS.includes(loc));
    // Order: Defaults first, then Recents, then Other
    return [...DEFAULT_STATIONS, ...uniqueRecent, 'Other'];
  }, [recentLocations]);

  const [stationType, setStationType] = useState<string>(combinedOptions[0]);
  const [customLocation, setCustomLocation] = useState<string>('');
  
  // Coordinates
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  const [isScanning, setIsScanning] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{type: string, confidence: number, message: string} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanFeedback(null); // Clear previous feedback
    try {
      // Compress image before sending to avoid payload size issues
      const base64 = await compressImage(file);
      // We force jpeg mimeType because compressImage outputs jpeg
      const result = await analyzeImage(base64, 'image/jpeg');
      
      const type = result.imageType || 'unknown';
      const conf = result.confidence || 0;
      
      let message = '';
      if (type === 'pump') {
         message = 'Detected Gas Pump';
         if (result.gallons) setGallons(result.gallons.toString());
         if (result.pricePerGallon) setPricePerGallon(result.pricePerGallon.toString());
         if (result.totalCost) setTotalCost(result.totalCost.toString());
         
         // Auto-calculate missing fields if possible
         if (result.totalCost && result.gallons && !result.pricePerGallon) {
            setPricePerGallon((result.totalCost / result.gallons).toFixed(3));
         }
      } else if (type === 'odometer') {
         message = 'Detected Odometer';
         // Format odometer with commas if valid
         if (result.odometer) {
            setOdometer(result.odometer.toLocaleString());
         }
      } else {
         message = 'Could not clearly identify pump or odometer.';
      }

      setScanFeedback({
        type,
        confidence: conf,
        message
      });

    } catch (error: any) {
      console.error("Scan failed:", error);
      const msg = error?.message || "Unknown error";
      alert(`Failed to analyze image: ${msg}. Please try entering manually.`);
    } finally {
      setIsScanning(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleOdometerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Remove all non-numeric and non-decimal characters
    const cleanValue = value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleanValue.split('.');
    if (parts.length > 2) return;
    
    // Format integer part with commas
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    
    setOdometer(parts.join('.'));
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    // Turn off manual mode if GPS is requested
    setShowManualCoords(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        setIsLocating(false);
      },
      (error) => {
        console.error(error);
        alert("Unable to retrieve location.");
        setIsLocating(false);
      }
    );
  };

  const toggleManualCoords = () => {
    const nextState = !showManualCoords;
    setShowManualCoords(nextState);
    
    // If enabling manual mode and we have GPS coords, prefill them
    if (nextState && coords && !manualLat && !manualLng) {
      setManualLat(coords.lat.toFixed(6));
      setManualLng(coords.lng.toFixed(6));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!odometer || !gallons || !totalCost) {
      alert("Please fill in required fields (Odometer, Gallons, Total Cost)");
      return;
    }

    // Parse odometer, removing commas
    const parsedOdometer = parseFloat(odometer.replace(/,/g, ''));
    if (isNaN(parsedOdometer)) {
        alert("Invalid odometer value");
        return;
    }

    setIsSaving(true);

    const finalLocation = stationType === 'Other' ? customLocation : stationType;
    
    // Determine final coordinates
    let finalLat = coords?.lat;
    let finalLng = coords?.lng;

    if (showManualCoords && manualLat && manualLng) {
      const parsedLat = parseFloat(manualLat);
      const parsedLng = parseFloat(manualLng);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        finalLat = parsedLat;
        finalLng = parsedLng;
      }
    }

    // Fetch Weather if we have coordinates
    let weatherTemp: number | undefined;
    let weatherCode: number | undefined;

    if (finalLat && finalLng) {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${finalLat}&longitude=${finalLng}&current_weather=true&temperature_unit=fahrenheit`
        );
        const data = await response.json();
        if (data.current_weather) {
          weatherTemp = data.current_weather.temperature;
          weatherCode = data.current_weather.weathercode;
        }
      } catch (err) {
        console.error("Failed to fetch weather", err);
        // Continue saving even if weather fails
      }
    }
    
    // Automatically use current time
    const now = new Date();

    onAddLog({
      date: now.toISOString(),
      odometer: parsedOdometer,
      gallons: parseFloat(gallons),
      pricePerGallon: parseFloat(pricePerGallon) || (parseFloat(totalCost) / parseFloat(gallons)),
      totalCost: parseFloat(totalCost),
      location: finalLocation,
      latitude: finalLat,
      longitude: finalLng,
      weatherTemp,
      weatherCode
    });

    // Reset fields
    setOdometer('');
    setGallons('');
    setPricePerGallon('');
    setTotalCost('');
    setStationType(combinedOptions[0]);
    setCustomLocation('');
    setCoords(null);
    setManualLat('');
    setManualLng('');
    setShowManualCoords(false);
    setScanFeedback(null);
    setIsSaving(false);
  };

  return (
    <div className="max-w-md mx-auto p-4 flex flex-col h-full gap-3">
      {/* Quick Scan Section - Compacted */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 shrink-0">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={fileInputRef}
          onChange={handleScan}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isScanning}
          className="w-full h-32 border-2 border-dashed border-brand-200 dark:border-brand-900 rounded-xl flex flex-col items-center justify-center gap-2 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors disabled:opacity-50"
        >
          {isScanning ? (
            <>
              <Loader2 className="animate-spin w-8 h-8" />
              <span className="text-lg font-medium">Scanning...</span>
            </>
          ) : (
            <>
              <Camera className="w-8 h-8" />
              <span className="text-lg font-medium">Scan Pump / Odometer</span>
            </>
          )}
        </button>

        {/* Compact Feedback */}
        {scanFeedback && (
          <div className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 ${
            scanFeedback.confidence > 0.7 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
              : 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300'
          }`}>
             {scanFeedback.confidence > 0.7 ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
             <span className="truncate flex-1">{scanFeedback.message}</span>
             {scanFeedback.confidence <= 0.7 && (
                <RefreshCw onClick={() => fileInputRef.current?.click()} className="w-3 h-3 cursor-pointer" />
             )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-4 flex-1 overflow-y-auto no-scrollbar">
        {/* Row 1: Odometer & Gallons */}
        <div className="grid grid-cols-2 gap-4">
           <div>
             <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
               <Gauge className="w-4 h-4" /> Odometer
             </label>
             <input
               type="text"
               inputMode="decimal"
               value={odometer}
               onChange={handleOdometerChange}
               className="w-full p-4 text-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white"
               placeholder="45,000"
             />
           </div>
           <div>
             <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
               <Droplet className="w-4 h-4" /> Gallons
             </label>
             <input
               type="number"
               step="0.001"
               value={gallons}
               onChange={(e) => setGallons(e.target.value)}
               className="w-full p-4 text-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white"
               placeholder="0.00"
             />
           </div>
        </div>

        {/* Row 2: Price & Cost */}
        <div className="grid grid-cols-2 gap-4">
           <div>
             <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
               <Receipt className="w-4 h-4" /> $/Gal
             </label>
             <input
               type="number"
               step="0.001"
               value={pricePerGallon}
               onChange={(e) => setPricePerGallon(e.target.value)}
               className="w-full p-4 text-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white"
               placeholder="Auto"
             />
           </div>
           <div>
             <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
               <DollarSign className="w-4 h-4" /> Cost
             </label>
             <input
               type="number"
               step="0.01"
               value={totalCost}
               onChange={(e) => setTotalCost(e.target.value)}
               className="w-full p-4 text-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white"
               placeholder="0.00"
             />
           </div>
        </div>

        {/* Row 3: Location */}
        <div>
          <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
            <MapPin className="w-4 h-4" /> Location
          </label>
          <div className="flex gap-2 h-[60px]"> {/* Fixed height matching big inputs */}
            <select
              value={stationType}
              onChange={(e) => setStationType(e.target.value)}
              className="flex-1 px-4 text-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white"
            >
              {combinedOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            
            <button
              type="button"
              onClick={getLocation}
              disabled={isLocating}
              className="px-4 bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-400 rounded-xl hover:bg-brand-200 dark:hover:bg-brand-800 transition-colors flex items-center justify-center min-w-[60px]"
            >
              {isLocating ? <Loader2 className="animate-spin w-6 h-6" /> : <Crosshair className="w-6 h-6" />}
            </button>
            <button
               type="button"
               onClick={toggleManualCoords}
               className={`px-4 rounded-xl transition-colors min-w-[60px] flex items-center justify-center ${showManualCoords ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
             >
               <Globe className="w-6 h-6" />
             </button>
          </div>
          
          {stationType === 'Other' && (
            <input
              type="text"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              className="w-full p-4 text-xl mt-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white"
              placeholder="Enter station name..."
            />
          )}

           {/* Manual Coordinates Input */}
           {showManualCoords && (
               <div className="flex gap-2 mt-3 animate-in slide-in-from-top-1">
                 <input 
                   type="number"
                   step="any"
                   placeholder="Lat"
                   value={manualLat}
                   onChange={e => setManualLat(e.target.value)}
                   className="w-full p-4 text-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white"
                 />
                 <input 
                   type="number"
                   step="any"
                   placeholder="Lng"
                   value={manualLng}
                   onChange={e => setManualLng(e.target.value)}
                   className="w-full p-4 text-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white"
                 />
               </div>
            )}
        </div>

        <div className="flex-1"></div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xl rounded-xl shadow-lg shadow-brand-500/30 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
          {isSaving ? 'Saving...' : 'Save Entry'}
        </button>
      </form>
    </div>
  );
};

export default FuelEntry;