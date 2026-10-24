import React from 'react';
import { GameEngine } from '../game/GameEngine';
import { sound } from '../audio/SoundSystem';
import { PWAInstallButton } from './PWAInstallButton';
import { Settings, Sliders, Smartphone, Volume2, X } from 'lucide-react';

interface SettingsModalProps {
  engine: GameEngine | null;
  isOpen: boolean;
  onClose: () => void;
  sfxVolume: number;
  setSfxVolume: (v: number) => void;
  musicVolume: number;
  setMusicVolume: (v: number) => void;
  sensitivity: number;
  setSensitivity: (v: number) => void;
  isMobileMode: boolean;
  setIsMobileMode: (v: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  engine,
  isOpen,
  onClose,
  sfxVolume,
  setSfxVolume,
  musicVolume,
  setMusicVolume,
  sensitivity,
  setSensitivity,
  isMobileMode,
  setIsMobileMode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 font-mono text-white select-none">
      <div className="relative w-full max-w-lg border-2 border-yellow-400 bg-black/95 p-6 drop-shadow-[0_0_25px_rgba(252,238,10,0.4)]">
        <div className="flex items-center justify-between pb-3 border-b border-white/15 mb-6">
          <div className="flex items-center gap-2 text-yellow-400 font-black text-lg tracking-wider">
            <Settings className="w-5 h-5 text-yellow-400" />
            OPERATIVE SETTINGS & CALIBRATION
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sliders & Mobile Toggle */}
        <div className="space-y-4 text-xs mb-6">
          {/* Mobile Touch Mode Switch */}
          <div className="flex items-center justify-between p-2.5 bg-gray-900 border border-yellow-400/40">
            <div>
              <div className="font-bold text-yellow-400 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-yellow-400" />
                TOUCH CONTROLS (ANDROID / MOBILE)
              </div>
              <div className="text-[10px] text-gray-400">
                Virtual analog joystick, drag-to-aim, and on-screen action buttons
              </div>
            </div>
            <button
              onClick={() => {
                const next = !isMobileMode;
                setIsMobileMode(next);
                if (engine) engine.isMobileMode = next;
              }}
              className={`px-3 py-1.5 font-black text-xs border transition-colors cursor-pointer ${
                isMobileMode
                  ? 'bg-yellow-400 text-black border-yellow-400'
                  : 'bg-black text-gray-400 border-gray-700 hover:text-white'
              }`}
            >
              {isMobileMode ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          {/* Mouse / Touch Sensitivity */}
          <div>
            <div className="flex justify-between font-bold mb-1.5">
              <span className="text-gray-300">LOOK & AIM SENSITIVITY:</span>
              <span className="text-yellow-400">{(sensitivity * 1000).toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.0008"
              max="0.005"
              step="0.0002"
              value={sensitivity}
              onChange={e => {
                const val = parseFloat(e.target.value);
                setSensitivity(val);
                if (engine) engine.mouseSensitivity = val;
              }}
              className="w-full accent-yellow-400 cursor-pointer"
            />
          </div>

          {/* SFX Volume */}
          <div>
            <div className="flex justify-between font-bold mb-1.5">
              <span className="text-gray-300">WEAPONS & COMBAT SFX VOLUME:</span>
              <span className="text-cyan-400">{Math.round(sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfxVolume}
              onChange={e => {
                const val = parseFloat(e.target.value);
                setSfxVolume(val);
                sound.setSfxVolume(val);
              }}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Music Volume */}
          <div>
            <div className="flex justify-between font-bold mb-1.5">
              <span className="text-gray-300">CYBER SYNTH BGM VOLUME:</span>
              <span className="text-purple-400">{Math.round(musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={e => {
                const val = parseFloat(e.target.value);
                setMusicVolume(val);
                sound.setMusicVolume(val);
              }}
              className="w-full accent-purple-400 cursor-pointer"
            />
          </div>
        </div>

        {/* PWA Install Banner */}
        <div className="mb-6 flex justify-center">
          <PWAInstallButton />
        </div>

        {/* Controls Reference */}
        <div className="p-3 bg-gray-950 border border-white/10 text-[11px] text-gray-400 mb-6">
          <div className="font-bold text-yellow-400 mb-2 uppercase text-[10px]">
            {isMobileMode ? 'ANDROID TOUCH CONTROLS SCHEME:' : 'DESKTOP KEYBINDS SCHEME:'}
          </div>
          {isMobileMode ? (
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div><span className="text-white font-bold">LEFT THUMB:</span> Virtual Movement Stick</div>
              <div><span className="text-white font-bold">RIGHT THUMB:</span> Swipe Screen to Aim</div>
              <div><span className="text-white font-bold">FIRE BUTTON:</span> Shoot / Slash Attack</div>
              <div><span className="text-white font-bold">RELOAD:</span> Rapid Mag Reload</div>
              <div><span className="text-white font-bold">JUMP:</span> Hydraulic Vertical Leap</div>
              <div><span className="text-white font-bold">SUPPLY BUTTON:</span> Open Air Drops</div>
              <div><span className="text-white font-bold">SANDEV BUTTON:</span> Bullet-time Slow-mo</div>
              <div><span className="text-white font-bold">HACK BUTTON:</span> Netrunner EMP Stun</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              <div><span className="text-white font-bold">W, A, S, D:</span> Movement</div>
              <div><span className="text-white font-bold">SHIFT:</span> Sprint (Consumes Stamina)</div>
              <div><span className="text-white font-bold">SPACE:</span> Hydraulic Jump</div>
              <div><span className="text-white font-bold">LEFT CLICK:</span> Fire / Attack</div>
              <div><span className="text-white font-bold">R:</span> Reload Ammo Magazine</div>
              <div><span className="text-white font-bold">E:</span> Inspect Trauma Air Drop</div>
              <div><span className="text-white font-bold">Q:</span> Sandevistan Bullet-time</div>
              <div><span className="text-white font-bold">F:</span> Netrunner Quickhack</div>
              <div><span className="text-white font-bold">1, 2, 3, 4:</span> Switch Weapon</div>
              <div><span className="text-white font-bold">ESC:</span> Release Mouse Aim</div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs tracking-widest cursor-pointer border border-black"
        >
          CONFIRM & RESUME
        </button>
      </div>
    </div>
  );
};
