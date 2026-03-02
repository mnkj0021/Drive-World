import React, { useEffect, useState } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Thermometer } from 'lucide-react';
import { useLocation } from '../../hooks/useLocation';
import { motion, AnimatePresence } from 'framer-motion';

interface WeatherData {
  temp: number;
  condition: string;
  code: number;
}

export function WeatherWidget() {
  const location = useLocation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!location) return;

    const fetchWeather = async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lng}&current_weather=true`
        );
        const data = await res.json();
        
        if (data.current_weather) {
          setWeather({
            temp: data.current_weather.temperature,
            condition: getWeatherDescription(data.current_weather.weathercode),
            code: data.current_weather.weathercode
          });
        }
      } catch (err) {
        console.error("Weather fetch failed", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    // Refresh every 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [location?.lat, location?.lng]);

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="text-yellow-400" size={16} />;
    if (code <= 3) return <Cloud className="text-gray-400" size={16} />;
    if (code <= 48) return <Wind className="text-gray-300" size={16} />;
    if (code <= 67) return <CloudRain className="text-blue-400" size={16} />;
    if (code <= 77) return <CloudSnow className="text-white" size={16} />;
    if (code <= 82) return <CloudRain className="text-blue-500" size={16} />;
    if (code <= 99) return <CloudLightning className="text-purple-400" size={16} />;
    return <Cloud size={16} />;
  };

  const getWeatherDescription = (code: number) => {
    if (code === 0) return 'Clear';
    if (code <= 3) return 'Partly Cloudy';
    if (code <= 48) return 'Foggy';
    if (code <= 67) return 'Rainy';
    if (code <= 77) return 'Snowy';
    if (code <= 82) return 'Showers';
    if (code <= 99) return 'Stormy';
    return 'Unknown';
  };

  if (loading || !weather) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full shadow-lg pointer-events-auto"
    >
      <div className="flex items-center gap-1.5">
        {getWeatherIcon(weather.code)}
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
          {weather.condition}
        </span>
      </div>
      <div className="h-3 w-px bg-white/20" />
      <div className="flex items-center gap-1">
        <Thermometer size={12} className="text-emerald-400" />
        <span className="text-xs font-mono font-bold text-white">
          {Math.round(weather.temp)}°C
        </span>
      </div>
    </motion.div>
  );
}
