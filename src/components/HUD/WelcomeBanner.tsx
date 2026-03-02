import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';
import { Sparkles } from 'lucide-react';

export function WelcomeBanner() {
  const user = useStore(state => state.user);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show after a short delay for cinematic effect
    const timer = setTimeout(() => {
      setVisible(true);
    }, 1500);

    // Hide after 5 seconds
    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, 6500);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!user) return null;

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: -20 }}
            transition={{ 
              type: "spring", 
              damping: 20, 
              stiffness: 100,
              duration: 0.8 
            }}
            className="relative"
          >
            {/* Background Glow */}
            <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full" />
            
            <div className="relative flex flex-col items-center">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.5, duration: 1 }}
                className="h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent mb-4"
              />
              
              <div className="flex items-center gap-4 px-12 py-6 bg-black/60 backdrop-blur-2xl border-y border-white/10">
                <Sparkles className="text-emerald-400 animate-pulse" size={32} />
                <div className="flex flex-col">
                  <motion.span 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-500/80"
                  >
                    Authentication Verified
                  </motion.span>
                  <motion.h1 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-4xl md:text-6xl font-black italic tracking-tighter text-white uppercase"
                  >
                    Welcome Back, <span className="text-emerald-400">{user.displayName || 'Driver'}</span>
                  </motion.h1>
                </div>
              </div>

              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.5, duration: 1 }}
                className="h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent mt-4"
              />
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-4 text-[10px] font-bold text-white/40 uppercase tracking-widest"
              >
                Initializing Neural Link... Optimal Performance Confirmed
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
