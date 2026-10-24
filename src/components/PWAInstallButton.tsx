import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC<{ variant?: 'compact' | 'full' }> = ({ variant = 'full' }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed as standalone Android app, hide button
  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono bg-emerald-950/40 px-2 py-1 border border-emerald-500/30">
        <Smartphone className="w-3.5 h-3.5" />
        <span>ANDROID APP INSTALLED</span>
      </div>
    );
  }

  // Android / Chromium direct install prompt
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-black font-mono transition-all border-2 border-black drop-shadow-[0_0_12px_#fcee0a] cursor-pointer ${
          variant === 'compact' ? 'px-3 py-1.5 text-xs' : 'px-5 py-2.5 text-sm tracking-wider'
        }`}
      >
        <Download className="w-4 h-4 text-black" />
        <span>{isAndroid ? 'INSTALL ANDROID APK / APP' : 'INSTALL PWA APP'}</span>
      </button>
    );
  }

  // iOS Safari fallback
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 bg-black/80 hover:bg-black text-cyan-400 font-bold font-mono transition-all border border-cyan-400 cursor-pointer ${
            variant === 'compact' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs tracking-wider'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
          <span>INSTALL ON MOBILE</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 font-mono text-white select-none">
            <div className="w-full max-w-sm border-2 border-yellow-400 bg-black/95 p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-black text-yellow-400">INSTALL ON HOME SCREEN</h3>
                <button onClick={() => setShowIOSGuide(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed space-y-2">
                1. Tap the <strong>Share</strong> button in your browser toolbar.<br />
                2. Select <strong>Add to Home Screen</strong> to install the full-screen Cyberpunk app!
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2 bg-yellow-400 text-black font-bold text-xs uppercase cursor-pointer"
              >
                GOT IT
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
