import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { AirDropLoot, WeaponType } from './types/game';
import { sound } from './audio/SoundSystem';
import { HUD } from './components/HUD';
import { MobileControls } from './components/MobileControls';
import { LoadoutModal } from './components/LoadoutModal';
import { AirDropModal } from './components/AirDropModal';
import { GameOverModal } from './components/GameOverModal';
import { SettingsModal } from './components/SettingsModal';
import { Settings, Smartphone, Volume2, VolumeX } from 'lucide-react';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Auto-detect mobile / Android touchscreen
  const isTouchDevice = typeof window !== 'undefined' && (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  );

  // App UI State
  const [gameState, setGameState] = useState<'loadout' | 'playing' | 'gameover'>('loadout');
  const [activeAirDropLoot, setActiveAirDropLoot] = useState<AirDropLoot | null>(null);
  const [isGameOverVictory, setIsGameOverVictory] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isMobileMode, setIsMobileMode] = useState<boolean>(isTouchDevice);

  // Audio & Settings State
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [sfxVolume, setSfxVolume] = useState<number>(0.8);
  const [musicVolume, setMusicVolume] = useState<number>(0.35);
  const [sensitivity, setSensitivity] = useState<number>(0.0022);

  // Initialize 3D Game Engine once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new GameEngine(canvasMountRef.current);
    engineRef.current = engine;

    engine.onAirDropInteract = (loot: AirDropLoot) => {
      setActiveAirDropLoot(loot);
    };

    engine.onGameOver = (victory: boolean) => {
      setIsGameOverVictory(victory);
      setGameState('gameover');
      sound.stopBGM();
    };

    return () => {
      engine.dispose();
      sound.stopBGM();
    };
  }, []);

  // Keep engine mobile mode in sync
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.isMobileMode = isMobileMode;
    }
  }, [isMobileMode]);

  const handleStartGame = (chosenWeapon: WeaponType) => {
    if (!engineRef.current) return;

    setGameState('playing');
    engineRef.current.restartGame(chosenWeapon);
    engineRef.current.isMobileMode = isMobileMode;

    // Start background synth music & voice
    sound.startBGM();
    sound.speak('Neural link established. Hostile cyber forces approaching.', 1.0, 1.1);

    // Request pointer lock only on desktop mode
    if (!isMobileMode) {
      setTimeout(() => {
        if (engineRef.current && canvasMountRef.current) {
          canvasMountRef.current.requestPointerLock();
        }
      }, 150);
    }
  };

  const handleClaimAirDrop = (implantIdToEquip?: string) => {
    if (engineRef.current) {
      engineRef.current.claimAirDrop(implantIdToEquip);
    }
    setActiveAirDropLoot(null);

    // Re-lock pointer on desktop mode
    if (!isMobileMode) {
      setTimeout(() => {
        if (canvasMountRef.current) {
          canvasMountRef.current.requestPointerLock();
        }
      }, 150);
    }
  };

  const handleRestart = () => {
    setGameState('loadout');
    setIsGameOverVictory(false);
    setActiveAirDropLoot(null);
  };

  const toggleMute = () => {
    if (isMuted) {
      sound.setSfxVolume(sfxVolume);
      sound.setMusicVolume(musicVolume);
      setIsMuted(false);
    } else {
      sound.setSfxVolume(0);
      sound.setMusicVolume(0);
      setIsMuted(true);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-mono">
      {/* 1. THREE.JS 3D VIEWPORT CONTAINER */}
      <div
        ref={canvasMountRef}
        className="w-full h-full cursor-crosshair"
      />

      {/* 2. PERSISTENT TOP-RIGHT UTILITY CONTROLS */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
        {/* Quick Mobile Touch Toggle */}
        <button
          onClick={() => {
            const next = !isMobileMode;
            setIsMobileMode(next);
            if (engineRef.current) engineRef.current.isMobileMode = next;
          }}
          title={isMobileMode ? 'Switch to Desktop (Mouse/WASD)' : 'Switch to Android (Touch Controls)'}
          className={`p-2.5 bg-black/80 hover:bg-black border cursor-pointer transition-colors flex items-center gap-1.5 text-xs font-bold ${
            isMobileMode
              ? 'border-yellow-400 text-yellow-400 drop-shadow-[0_0_10px_#fcee0a]'
              : 'border-white/20 text-gray-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span className="hidden sm:inline">{isMobileMode ? 'TOUCH ON' : 'TOUCH OFF'}</span>
        </button>

        <button
          onClick={toggleMute}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          className="p-2.5 bg-black/80 hover:bg-black text-gray-300 hover:text-yellow-400 border border-white/20 cursor-pointer transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
        </button>

        <button
          onClick={() => {
            if (document.pointerLockElement) document.exitPointerLock();
            setIsSettingsOpen(true);
          }}
          title="Settings & Keybinds"
          className="p-2.5 bg-black/80 hover:bg-black text-gray-300 hover:text-yellow-400 border border-white/20 cursor-pointer transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* 3. IN-GAME HUD & MOBILE CONTROLS (When playing) */}
      {gameState === 'playing' && (
        <>
          <HUD
            engine={engineRef.current}
            onOpenSettings={() => {
              if (document.pointerLockElement) document.exitPointerLock();
              setIsSettingsOpen(true);
            }}
          />
          {isMobileMode && <MobileControls engine={engineRef.current} />}
        </>
      )}

      {/* 4. PRE-MATCH LOADOUT SELECTION MODAL */}
      {gameState === 'loadout' && (
        <LoadoutModal
          onStart={handleStartGame}
          isMobileMode={isMobileMode}
          setIsMobileMode={setIsMobileMode}
        />
      )}

      {/* 5. AIR DROP GACHA / SUPPLY CLAIM MODAL */}
      {activeAirDropLoot && (
        <AirDropModal
          loot={activeAirDropLoot}
          onClaim={handleClaimAirDrop}
        />
      )}

      {/* 6. GAME OVER / VICTORY MODAL */}
      {gameState === 'gameover' && engineRef.current && (
        <GameOverModal
          isVictory={isGameOverVictory}
          waveReached={engineRef.current.currentWave}
          stats={engineRef.current.playerStats}
          implantIds={engineRef.current.equippedImplantIds}
          onRestart={handleRestart}
        />
      )}

      {/* 7. SETTINGS & CALIBRATION MODAL */}
      <SettingsModal
        engine={engineRef.current}
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          if (gameState === 'playing' && !isMobileMode && canvasMountRef.current) {
            canvasMountRef.current.requestPointerLock();
          }
        }}
        sfxVolume={sfxVolume}
        setSfxVolume={setSfxVolume}
        musicVolume={musicVolume}
        setMusicVolume={setMusicVolume}
        sensitivity={sensitivity}
        setSensitivity={setSensitivity}
        isMobileMode={isMobileMode}
        setIsMobileMode={setIsMobileMode}
      />
    </div>
  );
}
