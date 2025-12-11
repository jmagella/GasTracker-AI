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
         if (result.odometer) setOdometer(result.odometer.toString());
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!odometer || !gallons || !totalCost) {
      alert("Please fill in required fields (Odometer, Gallons, Total Cost)");
      return;
    }

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
    
    // Automatically use current time
    const now = new Date();

    onAddLog({
      date: now.toISOString(),
      odometer: parseFloat(odometer),
      gallons: parseFloat(gallons),
      pricePerGallon: parseFloat(pricePerGallon) || (parseFloat(totalCost) / parseFloat(gallons)),
      totalCost: parseFloat(totalCost),
      location: finalLocation,
      latitude: finalLat,
      longitude: finalLng
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
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 pb-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
          <Scan className="w-5 h-5 text-brand-500" />
          Quick Scan
        </h2>
        
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
          className="w-full py-4 border-2 border-dashed border-brand-200 dark:border-brand-900 rounded-xl flex flex-col items-center justify-center gap-2 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors disabled:opacity-50"
        >
          {isScanning ? (
            <>
              <Loader2 className="animate-spin w-8 h-8" />
              <span className="text-sm">Analyzing image...</span>
            </>
          ) : (
            <>
              <Camera className="w-8 h-8" />
              <span className="text-sm font-medium">Take Photo of Pump or Odometer</span>
            </>
          )}
        </button>

        {/* Scan Feedback UI */}
        {scanFeedback && (
          <div className={`mt-4 p-3 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${
            scanFeedback.confidence > 0.7 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
          }`}>
            {scanFeedback.confidence > 0.7 ? (
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-medium text-sm">{scanFeedback.message}</p>
              <p className="text-xs opacity-80 mt-1">
                Confidence: {(scanFeedback.confidence * 100).toFixed(0)}%
                {scanFeedback.confidence <= 0.7 && " - You may want to check values or rescan."}
              </p>
            </div>
            {scanFeedback.confidence <= 0.7 && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-lg transition-colors"
                title="Rescan"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Details</h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
            <Gauge className="w-4 h-4" /> Odometer (mi)
          </label>
          <input
            type="number"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
            className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all dark:text-white"
            placeholder="e.g. 45000"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
              <Droplet className="w-4 h-4" /> Gallons
            </label>
            <input
              type="number"
              step="0.001"
              value={gallons}
              onChange={(e) => setGallons(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all dark:text-white"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Total Cost
            </label>
            <input
              type="number"
              step="0.01"
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all dark:text-white"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
            <Receipt className="w-4 h-4" /> Price/Gallon ($)
          </label>
          <input
            type="number"
            step="0.001"
            value={pricePerGallon}
            onChange={(e) => setPricePerGallon(e.target.value)}
            className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all dark:text-white"
            placeholder="Optional (Calculated)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Location
          </label>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <select
                value={stationType}
                onChange={(e) => setStationType(e.target.value)}
                className="flex-1 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all dark:text-white appearance-none"
              >
                {combinedOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              
              <button
                type="button"
                onClick={getLocation}
                disabled={isLocating}
                className="p-3 bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-400 rounded-xl hover:bg-brand-200 dark:hover:bg-brand-800 transition-colors flex items-center gap-1 min-w-[70px] justify-center"
                title="Use GPS"
              >
                {isLocating ? <Loader2 className="animate-spin w-5 h-5" /> : <Crosshair className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={toggleManualCoords}
                className={`p-3 rounded-xl transition-colors flex items-center justify-center min-w-[50px] ${showManualCoords ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                title="Enter Coordinates Manually"
              >
                <Globe className="w-5 h-5" />
              </button>
            </div>
            
            {/* Manual Coordinates Input */}
            {showManualCoords && (
               <div className="flex gap-2 animate-in slide-in-from-top-2">
                 <input 
                   type="number"
                   step="any"
                   placeholder="Latitude"
                   value={manualLat}
                   onChange={e => setManualLat(e.target.value)}
                   className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white text-sm"
                 />
                 <input 
                   type="number"
                   step="any"
                   placeholder="Longitude"
                   value={manualLng}
                   onChange={e => setManualLng(e.target.value)}
                   className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white text-sm"
                 />
               </div>
            )}
            
            {stationType === 'Other' && (
              <input
                type="text"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all dark:text-white"
                placeholder="Enter station name..."
              />
            )}
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 transition-all flex justify-center items-center gap-2 mt-4"
        >
          <Save className="w-5 h-5" />
          Save Entry
        </button>
      </form>
    </div>
  );
};

export default FuelEntry;