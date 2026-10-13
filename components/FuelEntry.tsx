import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Camera, MapPin, Loader2, Save, Scan, Gauge, Droplet, DollarSign, Receipt, AlertTriangle, CheckCircle, RefreshCw, Globe, Crosshair, X } from 'lucide-react';
import { FuelLog } from '../types';
import { analyzeImage } from '../services/geminiService';
import { compressImage, validateEntry } from '../utils';

interface FuelEntryProps {
  onAddLog: (log: Omit<FuelLog, 'id'>) => void;
  recentLocations: string[];
  logs: FuelLog[];
}

const DEFAULT_STATIONS = ['Sunoco', 'Stewarts'];

const FuelEntry: React.FC<FuelEntryProps> = ({ onAddLog, recentLocations, logs }) => {
  const [odometer, setOdometer] = useState<string>('');
  const [gallons, setGallons] = useState<string>('');
  const [pricePerGallon, setPricePerGallon] = useState<string>('');
  const [totalCost, setTotalCost] = useState<string>('');
  const [isFullTank, setIsFullTank] = useState<boolean>(true);
  const [showSummary, setShowSummary] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  
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

  const parsedOdometer = parseFloat(odometer.replace(/,/g, ''));
  const parsedGallons = parseFloat(gallons);

  const validation = useMemo(() => {
    if (!showSummary) return null;
    return validateEntry(logs, {
      odometer: isNaN(parsedOdometer) ? 0 : parsedOdometer,
      gallons: isNaN(parsedGallons) ? 0 : parsedGallons,
      isFullTank
    });
  }, [showSummary, logs, parsedOdometer, parsedGallons, isFullTank]);

  // Any edit to the flagged values requires a fresh acknowledgement
  useEffect(() => { setAcknowledged(false); }, [odometer, gallons, isFullTank]);

  // Step 1: validate required fields, then open the summary/confirmation screen
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!odometer || !gallons || !totalCost) {
      alert("Please fill in required fields (Odometer, Gallons, Total Cost)");
      return;
    }
    if (isNaN(parsedOdometer) || isNaN(parsedGallons) || parsedGallons <= 0) {
      alert("Invalid odometer or gallons value");
      return;
    }
    setShowSummary(true);
  };

  // Step 2: user confirmed on the summary screen
  const handleConfirmSave = async () => {
    if (isSaving) return;
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
      gallons: parsedGallons,
      pricePerGallon: parseFloat(pricePerGallon) || (parseFloat(totalCost) / parseFloat(gallons)),
      totalCost: parseFloat(totalCost),
      location: finalLocation,
      latitude: finalLat,
      longitude: finalLng,
      weatherTemp,
      weatherCode,
      isFullTank
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
    setIsFullTank(true);
    setShowSummary(false);
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
               inputMode="decimal"
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
               inputMode="decimal"
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
               inputMode="decimal"
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

        {/* Full Tank toggle */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div>
            <span className="block font-bold text-gray-700 dark:text-gray-200">Full Tank</span>
            <span className="block text-xs text-gray-400">Turn off for a partial top-off</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isFullTank}
            aria-label="Full Tank"
            onClick={() => setIsFullTank(v => !v)}
            className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${isFullTank ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${isFullTank ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="flex-1"></div>

        <button
          type="submit"
          className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xl rounded-xl shadow-lg shadow-brand-500/30 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <Save className="w-6 h-6" />
          Review Entry
        </button>
      </form>

      {showSummary && validation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800 dark:text-white">Confirm Entry</h3>
              <button onClick={() => setShowSummary(false)} disabled={isSaving} aria-label="Close" className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              {validation.hasIssue && (
                <div role="alert" className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-300 text-sm flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>Unusual data detected. Please verify your odometer or gallons.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Odometer</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={odometer}
                    onChange={handleOdometerChange}
                    aria-invalid={validation.odometerIssue}
                    className={`w-full p-3 text-lg rounded-xl outline-none focus:ring-2 dark:text-white ${validation.odometerIssue ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500 focus:ring-red-500' : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-brand-500'}`}
                  />
                  {validation.odometerIssue && <p className="text-xs text-red-600 mt-1">Lower than previous entry</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Gallons</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.001"
                    value={gallons}
                    onChange={(e) => setGallons(e.target.value)}
                    aria-invalid={validation.gallonsIssue}
                    className={`w-full p-3 text-lg rounded-xl outline-none focus:ring-2 dark:text-white ${validation.gallonsIssue ? 'bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500 focus:ring-orange-500' : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-brand-500'}`}
                  />
                  {validation.gallonsIssue && <p className="text-xs text-orange-600 mt-1">MPG out of range</p>}
                </div>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <div className="flex justify-between"><span>Type</span><span className="font-semibold">{isFullTank ? 'Full Tank' : 'Partial Fill'}</span></div>
                <div className="flex justify-between"><span>Total cost</span><span className="font-semibold">${(parseFloat(totalCost) || 0).toFixed(2)}</span></div>
                <div className="flex justify-between">
                  <span>MPG</span>
                  <span className={`font-semibold ${validation.gallonsIssue ? 'text-orange-600' : ''}`}>
                    {!isFullTank ? 'Partial Fill (Gallons Logged)' : validation.mpg !== null ? validation.mpg.toFixed(1) : '—'}
                  </span>
                </div>
              </div>

              {validation.hasIssue && (
                <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-1" />
                  <span>These values are correct, save anyway</span>
                </label>
              )}

              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isSaving || (validation.hasIssue && !acknowledged)}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelEntry;
