import React, { useRef, useState, useEffect } from 'react';
import { GameEngine } from '../game/GameEngine';
import { WeaponType } from '../types/game';
import { WEAPON_CONFIGS } from '../game/Weapons';
import { ArrowUp, Crosshair, Cpu, FastForward, Package, RotateCw, Scissors, ShieldAlert, Sparkles, Zap } from 'lucide-react';

interface MobileControlsProps {
  engine: GameEngine | null;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ engine }) => {
  // Joystick State
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickCenter, setJoystickCenter] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joystickDelta, setJoystickDelta] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const joystickTouchIdRef = useRef<number | null>(null);

  // Look Aim State
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  if (!engine) return null;

  // Dist to Air Drop
  const distToAirDrop = engine.airDropAvailable
    ? engine.playerPosition.distanceTo(engine.airDropPosition)
    : 999;

  const currentWeapon = engine.weaponManager?.currentType || 'magnum';
  const hasSandevistan = engine.equippedImplantIds.includes('special_sandevistan');
  const hasQuickhack = engine.equippedImplantIds.some(id => id.startsWith('special_quickhack_'));

  // Touch Handlers for Movement (Left Half)
  const handleMoveTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (joystickTouchIdRef.current !== null) return;

    const touch = e.changedTouches[0];
    joystickTouchIdRef.current = touch.identifier;
    const startX = touch.clientX;
    const startY = touch.clientY;

    setJoystickCenter({ x: startX, y: startY });
    setJoystickDelta({ x: 0, y: 0 });
    setJoystickActive(true);
  };

  const handleMoveTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (joystickTouchIdRef.current === null || !engine) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        const dx = touch.clientX - joystickCenter.x;
        const dy = touch.clientY - joystickCenter.y;
        const maxRadius = 45;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clampedDist = Math.min(dist, maxRadius);
        const angle = Math.atan2(dy, dx);

        const nx = Math.cos(angle) * (clampedDist / maxRadius);
        const ny = Math.sin(angle) * (clampedDist / maxRadius);

        setJoystickDelta({ x: Math.cos(angle) * clampedDist, y: Math.sin(angle) * clampedDist });

        // Forward in 3D is -dy, Strafe right is +dx
        const forward = -ny;
        const strafe = nx;
        const isSprint = dist > maxRadius * 0.85;

        engine.setMobileMove(strafe, forward, isSprint);
        break;
      }
    }
  };

  const handleMoveTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setJoystickActive(false);
        setJoystickDelta({ x: 0, y: 0 });
        if (engine) engine.setMobileMove(0, 0, false);
        break;
      }
    }
  };

  // Touch Handlers for Aiming / Look (Right Half)
  const handleLookTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // Only capture if not touching buttons
    if (lookTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    lookTouchIdRef.current = touch.identifier;
    lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (lookTouchIdRef.current === null || !engine) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        const dx = touch.clientX - lastLookPosRef.current.x;
        const dy = touch.clientY - lastLookPosRef.current.y;
        lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };

        engine.addMobileLook(dx, dy);
        break;
      }
    }
  };

  const handleLookTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        break;
      }
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-30 select-none overflow-hidden touch-none">
      {/* 1. LEFT HALF: VIRTUAL JOYSTICK TOUCH ZONE */}
      <div
        className="pointer-events-auto absolute left-0 top-0 bottom-0 w-1/2 touch-none"
        onTouchStart={handleMoveTouchStart}
        onTouchMove={handleMoveTouchMove}
        onTouchEnd={handleMoveTouchEnd}
        onTouchCancel={handleMoveTouchEnd}
      >
        {/* Visual Joystick UI */}
        {joystickActive && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: joystickCenter.x, top: joystickCenter.y }}
          >
            {/* Outer Base Ring */}
            <div className="relative w-28 h-28 rounded-full border-2 border-cyan-400/60 bg-black/50 backdrop-blur-xs flex items-center justify-center drop-shadow-[0_0_15px_#00f0ff]">
              <div className="absolute inset-1 rounded-full border border-cyan-300/30 border-dashed animate-spin-slow" />
              {/* Inner Nub */}
              <div
                className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 border-2 border-black drop-shadow-[0_0_10px_#fcee0a]"
                style={{
                  transform: `translate(${joystickDelta.x}px, ${joystickDelta.y}px)`,
                }}
              />
            </div>
          </div>
        )}

        {/* Subtle helper text when idle */}
        {!joystickActive && (
          <div className="absolute bottom-28 left-10 text-[10px] text-cyan-400/60 font-mono tracking-widest uppercase border border-cyan-500/20 px-3 py-1 bg-black/40">
            🕹️ TOUCH & DRAG TO MOVE
          </div>
        )}
      </div>

      {/* 2. RIGHT HALF: SWIPE TO AIM ZONE */}
      <div
        className="pointer-events-auto absolute right-0 top-0 bottom-0 w-1/2 touch-none"
        onTouchStart={handleLookTouchStart}
        onTouchMove={handleLookTouchMove}
        onTouchEnd={handleLookTouchEnd}
        onTouchCancel={handleLookTouchEnd}
      />

      {/* 3. RIGHT SIDE: ON-SCREEN ACTION BUTTONS */}
      <div className="pointer-events-auto absolute right-5 bottom-6 flex flex-col items-end gap-3 z-40">
        {/* INTERACT AIR DROP BUTTON (Pop up when near crate) */}
        {engine?.airDropAvailable && distToAirDrop <= 5.5 && (
          <button
            onTouchStart={e => {
              e.stopPropagation();
              engine.tryInteractAirDrop();
            }}
            onClick={() => engine?.tryInteractAirDrop()}
            className="px-6 py-3 bg-yellow-400 text-black font-black text-xs tracking-widest border-2 border-black drop-shadow-[0_0_20px_#fcee0a] animate-bounce flex items-center gap-2 cursor-pointer"
          >
            <Package className="w-4 h-4" />
            OPEN TRAUMA SUPPLY [E]
          </button>
        )}

        {/* WEAPON SWITCH BAR */}
        <div className="flex gap-1.5 bg-black/85 p-1 border border-white/20">
          {(['magnum', 'knife', 'shotgun', 'rifle'] as WeaponType[]).map(wKey => {
            const isCurrent = currentWeapon === wKey;
            return (
              <button
                key={wKey}
                onTouchStart={e => {
                  e.stopPropagation();
                  engine?.switchWeapon(wKey);
                }}
                onClick={() => engine?.switchWeapon(wKey)}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase transition-all ${
                  isCurrent
                    ? 'bg-yellow-400 text-black border border-black'
                    : 'bg-gray-900 text-gray-400 hover:text-white'
                }`}
              >
                {wKey.slice(0, 4)}
              </button>
            );
          })}
        </div>

        {/* ABILITY BUTTONS (Sandevistan & Quickhack) */}
        <div className="flex gap-2">
          {hasSandevistan && (
            <button
              onTouchStart={e => {
                e.stopPropagation();
                engine.activateSandevistan();
              }}
              onClick={() => engine.activateSandevistan()}
              disabled={engine.sandevistanCooldown > 0 || engine.isSandevistanActive}
              className={`w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center transition-all ${
                engine.isSandevistanActive
                  ? 'border-cyan-400 bg-cyan-900 drop-shadow-[0_0_15px_#00f0ff] animate-pulse text-cyan-300'
                  : engine.sandevistanCooldown > 0
                  ? 'border-gray-700 bg-black/80 text-gray-600'
                  : 'border-cyan-400 bg-black/90 text-cyan-400 drop-shadow-[0_0_10px_#00f0ff]'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span className="text-[8px] font-black">
                {engine.isSandevistanActive ? 'WARP' : engine.sandevistanCooldown > 0 ? `${Math.ceil(engine.sandevistanCooldown)}s` : 'SANDEV'}
              </span>
            </button>
          )}

          {hasQuickhack && (
            <button
              onTouchStart={e => {
                e.stopPropagation();
                engine.activateQuickhack();
              }}
              onClick={() => engine.activateQuickhack()}
              disabled={engine.quickhackCooldown > 0}
              className={`w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center transition-all ${
                engine.quickhackCooldown > 0
                  ? 'border-gray-700 bg-black/80 text-gray-600'
                  : 'border-yellow-400 bg-black/90 text-yellow-400 drop-shadow-[0_0_10px_#fcee0a]'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span className="text-[8px] font-black">
                {engine.quickhackCooldown > 0 ? `${Math.ceil(engine.quickhackCooldown)}s` : 'HACK'}
              </span>
            </button>
          )}
        </div>

        {/* PRIMARY ACTIONS: FIRE, RELOAD, JUMP */}
        <div className="flex items-center gap-3">
          {/* Reload Button */}
          <button
            onTouchStart={e => {
              e.stopPropagation();
              engine?.tryReload();
            }}
            onClick={() => engine?.tryReload()}
            className="w-13 h-13 rounded-full border-2 border-white/40 bg-black/80 flex flex-col items-center justify-center text-white active:scale-95 transition-transform"
          >
            <RotateCw className="w-4 h-4 text-cyan-400" />
            <span className="text-[8px] font-bold text-gray-300">RELOAD</span>
          </button>

          {/* Jump Button */}
          <button
            onTouchStart={e => {
              e.stopPropagation();
              engine?.triggerMobileJump();
            }}
            onClick={() => engine?.triggerMobileJump()}
            className="w-13 h-13 rounded-full border-2 border-white/40 bg-black/80 flex flex-col items-center justify-center text-white active:scale-95 transition-transform"
          >
            <ArrowUp className="w-4 h-4 text-emerald-400" />
            <span className="text-[8px] font-bold text-gray-300">JUMP</span>
          </button>

          {/* MAIN FIRE BUTTON */}
          <button
            onTouchStart={e => {
              e.stopPropagation();
              e.preventDefault();
              engine?.setMobileShoot(true);
            }}
            onTouchEnd={e => {
              e.stopPropagation();
              e.preventDefault();
              engine?.setMobileShoot(false);
            }}
            onMouseDown={() => engine?.setMobileShoot(true)}
            onMouseUp={() => engine?.setMobileShoot(false)}
            className="w-20 h-20 rounded-full border-4 border-yellow-400 bg-gradient-to-br from-red-600 to-yellow-500 flex flex-col items-center justify-center text-black font-black drop-shadow-[0_0_20px_#fcee0a] active:scale-90 transition-transform cursor-pointer"
          >
            <Crosshair className="w-7 h-7 text-black stroke-[3]" />
            <span className="text-[9px] tracking-wider text-black font-black uppercase">FIRE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
