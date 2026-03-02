import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Download, Camera } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';

interface ShareStatsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareStats({ isOpen, onClose }: ShareStatsProps) {
  const { currentRunStats, mapStyle, user } = useStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const speed = currentRunStats?.speed || 0;
  const distance = currentRunStats?.distance || 0;
  const duration = currentRunStats?.duration || 0;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2, // High res
        useCORS: true,
        logging: false
      });
      
      const link = document.createElement('a');
      link.download = `run-stats-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error("Failed to generate image", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const file = new File([blob], 'stats.png', { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'My Run Stats',
            text: `Just crushed a ${distance.toFixed(1)}km run! 🏃‍♂️💨`,
            files: [file]
          });
        } else {
          // Fallback to download if Web Share API not supported
          handleDownload();
        }
      });
    } catch (e) {
      console.error("Share failed", e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative w-full max-w-sm"
          >
            <button 
              onClick={onClose}
              className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            {/* The Card to Capture */}
            <div 
              ref={cardRef}
              className="rounded-3xl overflow-hidden border shadow-2xl relative aspect-[4/5] flex flex-col justify-between p-8"
              style={{
                background: mapStyle === 'game-night' 
                  ? 'linear-gradient(to bottom right, #0f172a, #1e293b, #000000)' 
                  : 'linear-gradient(to bottom right, #ffffff, #f3f4f6, #e5e7eb)',
                borderColor: mapStyle === 'game-night' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)',
                color: mapStyle === 'game-night' ? '#ffffff' : '#0f172a'
              }}
            >
              {/* Background Texture */}
              <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
              
              {/* Header */}
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest opacity-60">Session Report</div>
                  <h2 className="text-3xl font-black italic tracking-tighter">
                    {user?.displayName || 'Racer'}
                  </h2>
                </div>
                <div 
                  className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border"
                  style={{
                    backgroundColor: mapStyle === 'game-night' ? 'rgba(16, 185, 129, 0.2)' : '#10b981',
                    borderColor: mapStyle === 'game-night' ? '#10b981' : '#059669',
                    color: mapStyle === 'game-night' ? '#34d399' : '#ffffff'
                  }}
                >
                  {distance > 5 ? "Elite Run" : "Daily Grind"}
                </div>
              </div>

              {/* Main Stat */}
              <div className="relative z-10 flex flex-col items-center justify-center py-8">
                <div className="text-8xl font-black italic tracking-tighter leading-none">
                  {distance.toFixed(1)}
                </div>
                <div className="text-sm font-bold uppercase tracking-[0.5em] opacity-60 mt-2">
                  Kilometers
                </div>
              </div>

              {/* Grid Stats */}
              <div className="relative z-10 grid grid-cols-2 gap-4">
                <div 
                  className="p-4 rounded-2xl border backdrop-blur-sm"
                  style={{
                    backgroundColor: mapStyle === 'game-night' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)',
                    borderColor: mapStyle === 'game-night' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'
                  }}
                >
                  <div className="text-xs font-bold uppercase opacity-50 mb-1">Avg Speed</div>
                  <div className="text-2xl font-mono font-bold">{speed.toFixed(1)} <span className="text-sm opacity-60">km/h</span></div>
                </div>
                <div 
                  className="p-4 rounded-2xl border backdrop-blur-sm"
                  style={{
                    backgroundColor: mapStyle === 'game-night' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)',
                    borderColor: mapStyle === 'game-night' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'
                  }}
                >
                  <div className="text-xs font-bold uppercase opacity-50 mb-1">Duration</div>
                  <div className="text-2xl font-mono font-bold">{formatDuration(duration)}</div>
                </div>
              </div>

              {/* Footer */}
              <div className="relative z-10 mt-6 pt-6 border-t border-white/10 flex justify-between items-center opacity-60">
                <div className="text-xs font-mono">{new Date().toLocaleDateString()}</div>
                <div className="text-xs font-bold uppercase tracking-widest">Run Crew App</div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleShare}
                disabled={isGenerating}
                className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isGenerating ? <Camera className="animate-pulse" /> : <Share2 />}
                Share Stats
              </button>
              <button
                onClick={handleDownload}
                disabled={isGenerating}
                className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all disabled:opacity-50"
              >
                <Download />
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
