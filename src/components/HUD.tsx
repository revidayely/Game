import React, { useEffect, useState } from 'react';
import { GameEngine } from '../game/GameEngine';
import { getImplantById } from '../game/Cyberware';
import { WEAPON_CONFIGS } from '../game/Weapons';
import { Activity, AlertTriangle, BatteryCharging, Crosshair, Cpu, FastForward, Flame, Footprints, Hammer, Radio, Scissors, Shield, ShieldAlert, Skull, Volume2, VolumeX, Zap } from 'lucide-react';

interface HUDProps {
  engine: GameEngine | null;
  onOpenSettings: () => void;
}

export const HUD: React.FC<HUDProps> = ({ engine, onOpenSettings }) => {
  const [, setTick] = useState(0);
  const [hitmarkerState, setHitmarkerState] = useState<{ active: boolean; isHeadshot: boolean }>({
    active: false,
    isHeadshot: false,
  });

  useEffect(() => {
    if (!engine) return;

    engine.onStateChange = () => {
      setTick(t => t + 1);
    };

    engine.onHitMarker = (isHeadshot: boolean) => {
      setHitmarkerState({ active: true, isHeadshot });
      setTimeout(() => {
        setHitmarkerState({ active: false, isHeadshot: false });
      }, 140);
    };

    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 100);

    return () => clearInterval(interval);
  }, [engine]);

  if (!engine) return null;

  const stats = engine.playerStats;
  const currentWeaponType = engine.weaponManager?.currentType || 'magnum';
  const curAmmo = engine.ammoInventory[currentWeaponType];
  const weaponConfig = WEAPON_CONFIGS[currentWeaponType];

  // Dist to Air Drop
  const distToAirDrop = engine.airDropAvailable
    ? engine.playerPosition.distanceTo(engine.airDropPosition)
    : 999;

  // Cyberpsychosis percentage relative to current max sanity
  const sanityPercent = Math.min(100, Math.round((stats.sanity / stats.maxSanity) * 100));

  // Quickhack tier equipped
  let quickhackTier = 0;
  if (engine.equippedImplantIds.includes('special_quickhack_t3')) quickhackTier = 3;
  else if (engine.equippedImplantIds.includes('special_quickhack_t2')) quickhackTier = 2;
  else if (engine.equippedImplantIds.includes('special_quickhack_t1')) quickhackTier = 1;

  const hasSandevistan = engine.equippedImplantIds.includes('special_sandevistan');
  const hasCyberskeleton = engine.equippedImplantIds.includes('special_cyberskeleton');

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden font-mono text-white">
      {/* 1. SCREEN EFFECTS (Sandevistan Bullet-time & Cyberpsychosis Glitch) */}
      {engine.isSandevistanActive && (
        <div className="absolute inset-0 border-8 border-cyan-400/40 bg-cyan-950/20 mix-blend-screen transition-opacity">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-cyan-300 font-black tracking-widest text-lg drop-shadow-[0_0_12px_#00f0ff]">
            ⚡ SANDEVISTAN OVERCLOCK ACTIVE [TIME DILATION 85%] ⚡
          </div>
        </div>
      )}

      {stats.isPsychotic && (
        <div className="absolute inset-0 bg-red-950/40 border-8 border-red-600/70 mix-blend-hard-light animate-pulse">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(255,0,60,0.4)_100%)]" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-center">
            <div className="text-red-500 font-black text-3xl tracking-widest drop-shadow-[0_0_20px_#ff003c]">
              ⚠ CYBERPSYCHIC EPISODE ⚠
            </div>
            <div className="text-red-300 font-bold text-sm tracking-widest mt-2 bg-black/80 px-4 py-1 border border-red-500">
              NEURAL PARALYSIS ACTIVE // LOSING HP CONTINUOUSLY
            </div>
          </div>
        </div>
      )}

      {/* 2. TOP HEADER (Wave Counter, Enemies Remaining, Boss Bar) */}
      <div className="absolute top-4 left-0 right-0 flex flex-col items-center">
        <div className="flex items-center gap-4 bg-black/80 px-6 py-2 border-2 border-yellow-400 drop-shadow-[0_0_15px_rgba(252,238,10,0.3)]">
          <div className="text-yellow-400 font-black tracking-wider text-xl">
            WAVE <span className="text-white">{engine.currentWave}</span> / {engine.maxWaves}
          </div>
          <div className="w-px h-6 bg-yellow-400/50" />
          <div className="text-cyan-400 text-sm font-semibold tracking-wider">
            ENEMIES: <span className="text-white">{engine.enemies.filter(e => !e.isDead).length + engine.enemiesRemainingToSpawn}</span>
          </div>
          <div className="w-px h-6 bg-yellow-400/50" />
          <div className="text-yellow-400 text-sm font-semibold tracking-wider">
            KILLS: <span className="text-white">{stats.kills}</span> (HEADSHOTS: <span className="text-red-400">{stats.headshots}</span>)
          </div>
        </div>

        {/* BOSS HEALTH BAR IF ACTIVE */}
        {engine.activeBoss && !engine.activeBoss.isDead && (
          <div className="mt-3 w-full max-w-xl bg-black/90 p-3 border-2 border-red-600 drop-shadow-[0_0_20px_rgba(255,0,60,0.6)]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-red-500 font-black tracking-widest text-base flex items-center gap-2">
                <Skull className="w-5 h-5 text-red-500 animate-spin" /> {engine.activeBoss.name}
              </span>
              <span className="text-white text-xs font-bold">
                {engine.activeBoss.hp} / {engine.activeBoss.maxHp} HP
              </span>
            </div>
            <div className="w-full h-4 bg-gray-900 border border-red-500/50 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-700 via-red-500 to-yellow-400 transition-all duration-100"
                style={{ width: `${Math.max(0, (engine.activeBoss.hp / engine.activeBoss.maxHp) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. CENTER CROSSHAIR & HITMARKERS */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative w-10 h-10 flex items-center justify-center">
          {/* Default Crosshair reticle */}
          <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
          <div className="absolute -top-3 w-0.5 h-2 bg-yellow-400/70" />
          <div className="absolute -bottom-3 w-0.5 h-2 bg-yellow-400/70" />
          <div className="absolute -left-3 w-2 h-0.5 bg-yellow-400/70" />
          <div className="absolute -right-3 w-2 h-0.5 bg-yellow-400/70" />

          {/* Hitmarker Flash */}
          {hitmarkerState.active && (
            <div className="absolute inset-0 flex items-center justify-center">
              {hitmarkerState.isHeadshot ? (
                <div className="flex flex-col items-center">
                  <Skull className="w-8 h-8 text-red-500 drop-shadow-[0_0_10px_#ff003c]" />
                  <span className="text-red-500 font-black text-[10px] tracking-widest bg-black/80 px-1">
                    HEADSHOT
                  </span>
                </div>
              ) : (
                <div className="w-6 h-6 border-2 border-cyan-400 rotate-45 scale-125 transition-transform" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. INTERACTION PROMPT FOR AIR DROP */}
      {engine.airDropAvailable && distToAirDrop <= 5.5 && (
        <div className="absolute bottom-40 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-6 py-2 font-black text-sm tracking-widest border-2 border-black drop-shadow-[0_0_15px_#fcee0a] animate-bounce">
          [PRESS E] OPEN TRAUMA SUPPLY DROP & CHROME
        </div>
      )}

      {/* 5. BOTTOM-LEFT: HEALTH, ARMOR, STAMINA & CYBERPSYCHOSIS METERS */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-2 w-80">
        {/* HP Bar */}
        <div className="bg-black/85 p-2.5 border-l-4 border-yellow-400 border border-white/10">
          <div className="flex justify-between text-xs font-bold mb-1">
            <span className="text-yellow-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> VITALS / HP
            </span>
            <span className="text-white">
              {Math.max(0, Math.round(stats.hp))} / {stats.maxHp}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-900 border border-white/20">
            <div
              className={`h-full transition-all duration-150 ${
                stats.hp < 40 ? 'bg-red-600' : 'bg-yellow-400'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100))}%` }}
            />
          </div>
        </div>

        {/* Armor Bar */}
        <div className="bg-black/85 p-2 border-l-4 border-cyan-400 border border-white/10">
          <div className="flex justify-between text-xs font-bold mb-1">
            <span className="text-cyan-400 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> SUBDERMAL ARMOR
            </span>
            <span className="text-white">{Math.round(stats.armor)} / {stats.maxArmor}</span>
          </div>
          <div className="w-full h-2 bg-gray-900 border border-white/20">
            <div
              className="h-full bg-cyan-400 transition-all duration-150"
              style={{ width: `${Math.max(0, Math.min(100, (stats.armor / stats.maxArmor) * 100))}%` }}
            />
          </div>
        </div>

        {/* Stamina Bar */}
        <div className="bg-black/85 p-2 border-l-4 border-emerald-400 border border-white/10">
          <div className="flex justify-between text-[11px] font-bold mb-1">
            <span className="text-emerald-400 flex items-center gap-1">
              <BatteryCharging className="w-3 h-3" /> STAMINA
            </span>
            <span className="text-white">{Math.round(stats.stamina)} / {stats.maxStamina}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-900 border border-white/20">
            <div
              className="h-full bg-emerald-400 transition-all duration-100"
              style={{ width: `${Math.max(0, Math.min(100, (stats.stamina / stats.maxStamina) * 100))}%` }}
            />
          </div>
        </div>

        {/* CYBERPSYCHOSIS RISK BAR */}
        <div className={`p-2.5 border-l-4 transition-colors ${
          sanityPercent >= 80 ? 'bg-red-950/90 border-red-600 border border-red-500' : 'bg-black/85 border-purple-500 border border-white/10'
        }`}>
          <div className="flex justify-between text-xs font-black mb-1">
            <span className="text-purple-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-purple-400" /> CYBERPSYCHOSIS RISK
            </span>
            <span className={sanityPercent >= 80 ? 'text-red-400 font-black' : 'text-purple-300'}>
              {Math.round(stats.sanity)} / {stats.maxSanity}% {stats.maxSanity < 100 && `(CAP -${100 - stats.maxSanity}%)`}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-900 border border-white/20">
            <div
              className={`h-full transition-all duration-200 ${
                sanityPercent >= 80
                  ? 'bg-gradient-to-r from-red-600 to-purple-600 animate-pulse'
                  : 'bg-purple-500'
              }`}
              style={{ width: `${Math.min(100, sanityPercent)}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
            <span>{hasCyberskeleton ? '🔥 CYBERSKELETON DRAINING SANITY' : 'STABILITY BUFFER'}</span>
            <span className={sanityPercent >= 80 ? 'text-red-400 font-bold' : 'text-gray-400'}>
              {sanityPercent >= 80 ? 'CRITICAL IMMINENT' : 'NOMINAL'}
            </span>
          </div>
        </div>
      </div>

      {/* 6. BOTTOM-RIGHT: AMMO, WEAPON SELECTOR & ABILITIES */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3">
        {/* SPECIAL ABILITIES BUTTONS / TIMERS */}
        <div className="flex gap-2">
          {/* Sandevistan [Q] */}
          {hasSandevistan && (
            <div className={`p-2.5 bg-black/85 border-2 flex items-center gap-2 ${
              engine.isSandevistanActive
                ? 'border-cyan-400 bg-cyan-950/60 drop-shadow-[0_0_12px_#00f0ff]'
                : engine.sandevistanCooldown > 0
                ? 'border-gray-700 text-gray-500'
                : 'border-cyan-400 text-cyan-300'
            }`}>
              <Zap className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-[10px] font-bold text-gray-400">[Q] SANDEVISTAN</div>
                <div className="text-xs font-black">
                  {engine.isSandevistanActive
                    ? `${engine.sandevistanTimer.toFixed(1)}s ACTIVE`
                    : engine.sandevistanCooldown > 0
                    ? `${engine.sandevistanCooldown.toFixed(1)}s CD`
                    : 'READY'}
                </div>
              </div>
            </div>
          )}

          {/* Quickhack [F] */}
          {quickhackTier > 0 && (
            <div className={`p-2.5 bg-black/85 border-2 flex items-center gap-2 ${
              engine.quickhackCooldown > 0
                ? 'border-gray-700 text-gray-500'
                : 'border-yellow-400 text-yellow-300'
            }`}>
              <Cpu className="w-4 h-4 text-yellow-400" />
              <div>
                <div className="text-[10px] font-bold text-gray-400">
                  [F] QUICKHACK T{quickhackTier}
                </div>
                <div className="text-xs font-black">
                  {engine.quickhackCooldown > 0
                    ? `${engine.quickhackCooldown.toFixed(1)}s CD`
                    : quickhackTier === 3
                    ? 'EXECUTE READY'
                    : 'EMP STUN READY'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ACTIVE WEAPON AMMO PANEL */}
        <div className="bg-black/85 p-3 border-r-4 border-yellow-400 border border-white/10 w-72">
          <div className="flex justify-between items-center mb-1">
            <span className="text-yellow-400 font-bold text-sm tracking-wider">
              {weaponConfig.name}
            </span>
            <span className="text-gray-400 text-[10px] uppercase">{weaponConfig.category}</span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-black text-white">
              {currentWeaponType === 'knife' ? '∞' : curAmmo.current}
              <span className="text-sm font-normal text-gray-400 ml-2">
                / {currentWeaponType === 'knife' ? '∞' : curAmmo.reserve}
              </span>
            </div>

            {engine.weaponManager.isReloading && (
              <span className="text-cyan-400 text-xs font-bold animate-pulse">RELOADING...</span>
            )}
          </div>

          {/* Quick switch icons */}
          <div className="grid grid-cols-4 gap-1 mt-2 pt-2 border-t border-white/10 text-center text-[10px]">
            <div className={`p-1 border ${currentWeaponType === 'magnum' ? 'border-yellow-400 text-yellow-400 font-bold bg-yellow-950/40' : 'border-gray-700 text-gray-500'}`}>
              [1] MAGNUM
            </div>
            <div className={`p-1 border ${currentWeaponType === 'knife' ? 'border-yellow-400 text-yellow-400 font-bold bg-yellow-950/40' : 'border-gray-700 text-gray-500'}`}>
              [2] KNIFE
            </div>
            <div className={`p-1 border ${currentWeaponType === 'shotgun' ? 'border-yellow-400 text-yellow-400 font-bold bg-yellow-950/40' : 'border-gray-700 text-gray-500'}`}>
              [3] SHOTGUN
            </div>
            <div className={`p-1 border ${currentWeaponType === 'rifle' ? 'border-yellow-400 text-yellow-400 font-bold bg-yellow-950/40' : 'border-gray-700 text-gray-500'}`}>
              [4] RIFLE
            </div>
          </div>
        </div>
      </div>

      {/* 7. BOTTOM-CENTER: COLLAPSIBLE INSTALLED CHROME DOCK */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/80 px-4 py-1.5 border border-white/15 drop-shadow-md">
        <span className="text-[10px] font-bold text-gray-400 mr-1">CYBERWARE:</span>
        {engine.equippedImplantIds.length === 0 ? (
          <span className="text-[10px] text-gray-500 italic">No implants installed (Collect Air Drops)</span>
        ) : (
          engine.equippedImplantIds.map(id => {
            const imp = getImplantById(id);
            if (!imp) return null;
            return (
              <span
                key={id}
                title={`${imp.name} - ${imp.description}`}
                className={`text-[9px] px-2 py-0.5 font-bold uppercase border ${
                  imp.rarity === 'mythic'
                    ? 'border-red-500 text-red-400 bg-red-950/40'
                    : imp.rarity === 'legendary'
                    ? 'border-yellow-400 text-yellow-300 bg-yellow-950/40'
                    : imp.rarity === 'rare'
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-950/40'
                    : 'border-gray-600 text-gray-300'
                }`}
              >
                {imp.slot.toUpperCase()} T{imp.tier}
              </span>
            );
          })
        )}
      </div>

      {/* 8. POINTER LOCK CLICK-TO-PLAY OVERLAY (Desktop only) */}
      {!engine.isLocked && !engine.isMobileMode && engine.waveState !== 'game_over' && engine.waveState !== 'victory' && (
        <div className="pointer-events-auto absolute inset-0 bg-black/75 flex flex-col items-center justify-center backdrop-blur-xs">
          <div className="bg-black/90 p-8 border-2 border-yellow-400 max-w-lg text-center drop-shadow-[0_0_25px_rgba(252,238,10,0.4)]">
            <div className="text-yellow-400 font-black text-2xl tracking-widest mb-2">
              EDGERUNNER // NEURAL LINK PAUSED
            </div>
            <p className="text-gray-300 text-xs mb-6 leading-relaxed">
              Click anywhere inside the window to capture mouse aim and engage Night City combat.
            </p>

            <button
              onClick={() => {
                engine.canvasMount.requestPointerLock();
              }}
              className="px-8 py-3 bg-yellow-400 text-black font-black text-sm tracking-widest hover:bg-yellow-300 transition-colors cursor-pointer border-2 border-black"
            >
              RESUME LINK [CLICK TO AIM]
            </button>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400 text-left mt-6 pt-4 border-t border-white/10">
              <div><span className="text-yellow-400">WASD:</span> Move / Strafe</div>
              <div><span className="text-yellow-400">MOUSE:</span> Look & Aim</div>
              <div><span className="text-yellow-400">LEFT CLICK:</span> Fire Weapon</div>
              <div><span className="text-yellow-400">R:</span> Reload Magazine</div>
              <div><span className="text-yellow-400">SHIFT:</span> Sprint</div>
              <div><span className="text-yellow-400">E:</span> Pick Trauma Air Drop</div>
              <div><span className="text-yellow-400">Q:</span> Sandevistan Bullet-time</div>
              <div><span className="text-yellow-400">F:</span> Quickhack Netrunner</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
