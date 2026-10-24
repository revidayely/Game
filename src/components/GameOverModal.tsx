import React from 'react';
import { PlayerStats } from '../types/game';
import { getImplantById } from '../game/Cyberware';
import { Award, Crosshair, RotateCcw, Skull, Trophy } from 'lucide-react';

interface GameOverModalProps {
  isVictory: boolean;
  waveReached: number;
  stats: PlayerStats;
  implantIds: string[];
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isVictory,
  waveReached,
  stats,
  implantIds,
  onRestart,
}) => {
  const headshotRatio = stats.kills > 0 ? Math.round((stats.headshots / stats.kills) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 font-mono text-white select-none">
      <div className={`relative w-full max-w-2xl border-4 bg-black/95 p-8 ${
        isVictory
          ? 'border-yellow-400 drop-shadow-[0_0_40px_rgba(252,238,10,0.6)]'
          : 'border-red-600 drop-shadow-[0_0_40px_rgba(255,0,60,0.6)]'
      }`}>
        {/* Banner */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            {isVictory ? (
              <Trophy className="w-16 h-16 text-yellow-400 animate-bounce" />
            ) : (
              <Skull className="w-16 h-16 text-red-500 animate-pulse" />
            )}
          </div>

          <h1 className={`text-4xl md:text-5xl font-black tracking-widest uppercase ${
            isVictory ? 'text-yellow-400 drop-shadow-[0_0_20px_#fcee0a]' : 'text-red-500 drop-shadow-[0_0_20px_#ff003c]'
          }`}>
            {isVictory ? 'NIGHT CITY LEGEND' : 'FLATLINED // NEURAL FAILURE'}
          </h1>

          <p className="text-gray-400 text-xs mt-2 uppercase tracking-widest">
            {isVictory
              ? 'WAVE 50 CONQUERED // ADAM SMASHER REDUCED TO SCRAP METAL'
              : `TRAUMA TEAM CONTRACT TERMINATED ON WAVE ${waveReached}`}
          </p>
        </div>

        {/* Combat Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-gray-950 p-4 border border-white/15 text-center">
            <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">WAVE REACHED</div>
            <div className="text-2xl font-black text-white">{waveReached} <span className="text-xs text-gray-500">/ 50</span></div>
          </div>

          <div className="bg-gray-950 p-4 border border-white/15 text-center">
            <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">TOTAL KILLS</div>
            <div className="text-2xl font-black text-cyan-400">{stats.kills}</div>
          </div>

          <div className="bg-gray-950 p-4 border border-white/15 text-center">
            <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">HEADSHOTS</div>
            <div className="text-2xl font-black text-red-400">{stats.headshots}</div>
          </div>

          <div className="bg-gray-950 p-4 border border-white/15 text-center">
            <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">HEADSHOT RATIO</div>
            <div className="text-2xl font-black text-yellow-400">{headshotRatio}%</div>
          </div>
        </div>

        {/* Installed Cyberware Chronicle */}
        <div className="mb-8 p-4 bg-gray-950 border border-white/10">
          <div className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-yellow-400" />
            <span>Installed Cyberware Chronicle ({implantIds.length} Implants):</span>
          </div>

          {implantIds.length === 0 ? (
            <div className="text-xs text-gray-500 italic">No cyberware installed during this run. Pure organic flesh.</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {implantIds.map(id => {
                const imp = getImplantById(id);
                if (!imp) return null;
                return (
                  <span
                    key={id}
                    className={`text-[10px] px-2.5 py-1 font-bold uppercase border ${
                      imp.rarity === 'mythic' ? 'border-red-500 text-red-400 bg-red-950/40' :
                      imp.rarity === 'legendary' ? 'border-yellow-400 text-yellow-300 bg-yellow-950/40' :
                      imp.rarity === 'rare' ? 'border-cyan-400 text-cyan-300 bg-cyan-950/40' : 'border-gray-600 text-gray-300'
                    }`}
                  >
                    {imp.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Play Again Button */}
        <div className="flex justify-center">
          <button
            onClick={onRestart}
            className="flex items-center gap-2 px-10 py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-base tracking-widest cursor-pointer transition-all border-2 border-black drop-shadow-[0_0_20px_#fcee0a]"
          >
            <RotateCcw className="w-5 h-5 text-black" />
            RELOAD NEURAL INTERFACE // PLAY AGAIN
          </button>
        </div>
      </div>
    </div>
  );
};
