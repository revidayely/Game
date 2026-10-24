import React, { useState } from 'react';
import { WeaponType } from '../types/game';
import { WEAPON_CONFIGS } from '../game/Weapons';
import { PWAInstallButton } from './PWAInstallButton';
import { Crosshair, Scissors, ShieldAlert, Zap, Skull, Shield, Activity, Smartphone } from 'lucide-react';

interface LoadoutModalProps {
  onStart: (chosenWeapon: WeaponType) => void;
  isMobileMode: boolean;
  setIsMobileMode: (val: boolean) => void;
}

export const LoadoutModal: React.FC<LoadoutModalProps> = ({
  onStart,
  isMobileMode,
  setIsMobileMode,
}) => {
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>('magnum');

  const weaponIcons: Record<WeaponType, React.ReactNode> = {
    magnum: <Crosshair className="w-8 h-8 text-yellow-400" />,
    knife: <Scissors className="w-8 h-8 text-yellow-400" />,
    shotgun: <Zap className="w-8 h-8 text-yellow-400" />,
    rifle: <ShieldAlert className="w-8 h-8 text-yellow-400" />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 font-mono text-white select-none">
      <div className="relative w-full max-w-4xl max-h-[94vh] overflow-y-auto border-2 border-yellow-400 bg-black/95 p-6 md:p-8 drop-shadow-[0_0_35px_rgba(252,238,10,0.35)]">
        {/* Cyberpunk Decorative Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-white/15">
          <div className="text-[10px] text-yellow-400 font-black tracking-widest flex items-center gap-1.5">
            ARASAKA OS // ANDROID & WEB 2.077
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMode(!isMobileMode)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold border transition-colors cursor-pointer ${
                isMobileMode
                  ? 'border-yellow-400 text-yellow-400 bg-yellow-950/40'
                  : 'border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>TOUCH CONTROLS: {isMobileMode ? 'ON (ANDROID)' : 'OFF (DESKTOP)'}</span>
            </button>
            <PWAInstallButton variant="compact" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-widest text-yellow-400 drop-shadow-[0_0_15px_#fcee0a]">
            EDGERUNNER // LOADOUT PROTOCOL
          </h1>
          <p className="text-gray-400 text-xs mt-2 uppercase tracking-wider">
            Select your primary operative weapon before deployment to the Night City rooftop
          </p>
        </div>

        {/* Weapon Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {(Object.keys(WEAPON_CONFIGS) as WeaponType[]).map(key => {
            const config = WEAPON_CONFIGS[key];
            const isSelected = selectedWeapon === key;

            return (
              <div
                key={key}
                onClick={() => setSelectedWeapon(key)}
                className={`relative p-5 border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-yellow-400 bg-yellow-950/40 drop-shadow-[0_0_15px_rgba(252,238,10,0.5)] scale-105'
                    : 'border-white/15 bg-gray-950/60 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  {weaponIcons[key]}
                  <span className="text-[10px] uppercase font-bold text-gray-400">
                    {config.category}
                  </span>
                </div>

                <div className="font-black text-sm tracking-wide text-white mb-1">
                  {config.name}
                </div>
                <p className="text-[11px] text-gray-400 leading-tight mb-4 min-h-[40px]">
                  {config.description}
                </p>

                {/* Stat bars */}
                <div className="space-y-1.5 text-[10px] text-gray-300 pt-2 border-t border-white/10">
                  <div className="flex justify-between">
                    <span>DAMAGE:</span>
                    <span className="font-bold text-yellow-400">{config.damage * config.pellets}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>FIRE RATE:</span>
                    <span className="font-bold text-cyan-400">{config.fireRate}/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MAGAZINE:</span>
                    <span className="font-bold text-white">{key === 'knife' ? 'INFINITE' : config.magSize}</span>
                  </div>
                </div>

                {isSelected && (
                  <div className="absolute -top-3 right-3 bg-yellow-400 text-black font-black text-[9px] px-2 py-0.5 tracking-wider">
                    EQUIPPED
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Combat Intelligence Briefing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-gray-950 border border-white/10 text-xs mb-8">
          <div className="flex items-start gap-2.5">
            <Skull className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-red-400 text-[11px]">LETHAL HITBOX SYSTEM</div>
              <div className="text-gray-400 text-[10px] leading-relaxed">
                Headshots are guaranteed one-shot instant kills on regular enemies. Aim for the chrome optics.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Activity className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-purple-400 text-[11px]">CYBERPSYCHOSIS WARNING</div>
              <div className="text-gray-400 text-[10px] leading-relaxed">
                Installing chrome reduces sanity capacity. Abilities fill the meter. If filled, suffer neural paralysis!
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Shield className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-cyan-400 text-[11px]">AIR DROPS & BOSS PHASES</div>
              <div className="text-gray-400 text-[10px] leading-relaxed">
                MaxTac arrives at Wave 5/15/25/35/45. Adam Smasher strikes every 10 Waves. Open Air Drops for high-tier chrome!
              </div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="flex justify-center">
          <button
            onClick={() => onStart(selectedWeapon)}
            className="px-12 py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-base tracking-widest cursor-pointer transition-all border-2 border-black drop-shadow-[0_0_20px_#fcee0a]"
          >
            JACK IN // START SURVIVAL WAVE 1
          </button>
        </div>
      </div>
    </div>
  );
};
