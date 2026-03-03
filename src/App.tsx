/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameMap } from './components/Map/GameMap';
import { HUD } from './components/HUD/Overlay';
import { SessionManager } from './components/Session/SessionManager';
import { RunManager } from './components/Run/RunManager';
import { SettingsPanel } from './components/Settings/SettingsPanel';

export default function App() {
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans select-none">
      <SessionManager />
      <RunManager />
      <GameMap />
      <HUD />
      <SettingsPanel />
      
      {/* Vignette & Grain Overlay for Cinematic Feel */}
      <div className="absolute inset-0 pointer-events-none z-20 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      <div className="absolute inset-0 pointer-events-none z-20 opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  );
}
