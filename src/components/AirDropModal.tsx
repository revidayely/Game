import React, { useState } from 'react';
import { AirDropLoot, ChromeImplant } from '../types/game';
import { getImplantById } from '../game/Cyberware';
import { Activity, AlertTriangle, CheckCircle2, Cpu, Flame, Package, Shield, Sparkles, Zap } from 'lucide-react';

interface AirDropModalProps {
  loot: AirDropLoot;
  onClaim: (implantIdToEquip?: string) => void;
}

export const AirDropModal: React.FC<AirDropModalProps> = ({ loot, onClaim }) => {
  const [selectedImplantId, setSelectedImplantId] = useState<string | undefined>(
    loot.implant ? loot.implant.id : undefined
  );

  const cyberskeleton = getImplantById('special_cyberskeleton');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 font-mono text-white select-none">
      <div className="relative w-full max-w-3xl border-2 border-yellow-400 bg-black/95 p-6 drop-shadow-[0_0_35px_rgba(252,238,10,0.5)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/15 mb-6">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-yellow-400 animate-bounce" />
            <div>
              <h2 className="text-2xl font-black tracking-widest text-yellow-400">
                TRAUMA TEAM // SUPPLY CRATE
              </h2>
              <p className="text-xs text-cyan-400 font-semibold">
                NEURAL INTEGRATION & LOGISTICS PAYLOAD
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-yellow-400 text-black px-2.5 py-1 font-black uppercase">
            GACHA CHROME UNLOCKED
          </span>
        </div>

        {/* 1. Standard Guaranteed Supply Loot */}
        <div className="mb-6">
          <div className="text-xs font-bold text-gray-400 uppercase mb-2">
            Standard Field Supplies (Auto-Applied to Inventory):
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-gray-950 p-2.5 border border-cyan-500/40 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="font-bold text-white text-[11px]">ALL AMMO REFILLED</div>
                <div className="text-[9px] text-gray-400">Magnum, Shotgun, Rifle</div>
              </div>
            </div>

            <div className="bg-gray-950 p-2.5 border border-emerald-500/40 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="font-bold text-white text-[11px]">+{loot.healthKits} HEALTH PACK</div>
                <div className="text-[9px] text-gray-400">Trauma vital nanites</div>
              </div>
            </div>

            <div className="bg-gray-950 p-2.5 border border-cyan-500/40 flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="font-bold text-white text-[11px]">+{loot.armorShards} ARMOR SHARDS</div>
                <div className="text-[9px] text-gray-400">Carbon plating repair</div>
              </div>
            </div>

            <div className="bg-gray-950 p-2.5 border border-purple-500/40 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <div>
                <div className="font-bold text-purple-300 text-[11px]">IMMUNOSUPPRESSANT</div>
                <div className="text-[9px] text-gray-400">Resets Cyberpsychosis to 0%</div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Randomized Chrome Implant Drop (Gacha) */}
        <div className="mb-6">
          <div className="text-xs font-bold text-yellow-400 uppercase mb-2 flex items-center justify-between">
            <span>Available Cyberware Chrome Upgrade:</span>
            <span className="text-[10px] text-gray-400">Select which implant to install</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loot.implant ? (
              <div
                onClick={() => setSelectedImplantId(loot.implant!.id)}
                className={`p-4 border-2 cursor-pointer transition-all ${
                  selectedImplantId === loot.implant.id
                    ? 'border-yellow-400 bg-yellow-950/40 drop-shadow-[0_0_15px_rgba(252,238,10,0.4)]'
                    : 'border-white/15 bg-gray-950 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 border ${
                    loot.implant.rarity === 'mythic' ? 'border-red-500 text-red-400' :
                    loot.implant.rarity === 'legendary' ? 'border-yellow-400 text-yellow-400' :
                    loot.implant.rarity === 'rare' ? 'border-cyan-400 text-cyan-400' : 'border-gray-600 text-gray-400'
                  }`}>
                    {loot.implant.rarity} // {loot.implant.slot} T{loot.implant.tier}
                  </span>
                  {selectedImplantId === loot.implant.id && (
                    <CheckCircle2 className="w-4 h-4 text-yellow-400" />
                  )}
                </div>

                <div className="text-base font-black text-white mb-1">
                  {loot.implant.name}
                </div>
                <p className="text-xs text-gray-300 mb-3">
                  {loot.implant.description}
                </p>

                <div className="flex items-center gap-1.5 text-[10px] text-purple-400 font-bold bg-purple-950/30 p-1.5 border border-purple-500/30">
                  <AlertTriangle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Sanity Max Cap Penalty: -{loot.implant.sanityReduction}%</span>
                </div>
              </div>
            ) : (
              <div className="p-4 border border-dashed border-gray-700 bg-gray-950/40 text-center flex flex-col items-center justify-center text-gray-500 text-xs">
                <span>No standard chrome dropped this drop</span>
                <span className="text-[10px] text-gray-600 mt-1">Full medical & ammo supplies provided</span>
              </div>
            )}

            {/* Cyberskeleton option on Wave 9, 19, 29, 39, 49 */}
            {loot.cyberskeletonAvailable && cyberskeleton && (
              <div
                onClick={() => setSelectedImplantId(cyberskeleton.id)}
                className={`p-4 border-2 cursor-pointer transition-all ${
                  selectedImplantId === cyberskeleton.id
                    ? 'border-red-500 bg-red-950/50 drop-shadow-[0_0_20px_rgba(255,0,60,0.6)]'
                    : 'border-red-900 bg-gray-950 hover:border-red-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 border border-red-500 text-red-400 bg-red-950/60 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-red-500" /> EXPERIMENTAL PROTOTYPE // SPECIAL
                  </span>
                  {selectedImplantId === cyberskeleton.id && (
                    <CheckCircle2 className="w-4 h-4 text-red-400" />
                  )}
                </div>

                <div className="text-base font-black text-red-400 mb-1">
                  {cyberskeleton.name}
                </div>
                <p className="text-xs text-gray-300 mb-3">
                  {cyberskeleton.description}
                </p>

                <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-black bg-red-950/60 p-1.5 border border-red-500">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>EXTREME RISK: Rapidly builds up Cyberpsychosis!</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Claim Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <button
            onClick={() => onClaim(undefined)}
            className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs font-bold tracking-wider cursor-pointer border border-white/20 transition-colors"
          >
            TAKE SUPPLIES ONLY (SKIP CHROME)
          </button>

          <button
            onClick={() => onClaim(selectedImplantId)}
            className="px-8 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm tracking-widest cursor-pointer border-2 border-black drop-shadow-[0_0_15px_#fcee0a] transition-all"
          >
            INTEGRATE CHROME & RESUME COMBAT
          </button>
        </div>
      </div>
    </div>
  );
};
