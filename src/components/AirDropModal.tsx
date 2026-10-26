import React, { useState } from 'react';
import { AirDropLoot } from '../types/game';
import { getImplantById } from '../game/Cyberware';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Flame,
  Heart,
  Package,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';

interface AirDropModalProps {
  loot: AirDropLoot;
  onClaim: (choice: 'chrome' | 'human_supplies', implantIdToEquip?: string) => void;
}

export const AirDropModal: React.FC<AirDropModalProps> = ({ loot, onClaim }) => {
  const cyberskeleton = getImplantById('special_cyberskeleton');
  const defaultImplantId = loot.implant ? loot.implant.id : (loot.cyberskeletonAvailable && cyberskeleton ? cyberskeleton.id : undefined);
  const [selectedChromeId, setSelectedChromeId] = useState<string | undefined>(defaultImplantId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 font-mono text-white select-none backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl border-2 border-yellow-400 bg-black/95 p-5 md:p-6 drop-shadow-[0_0_35px_rgba(252,238,10,0.5)] my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-white/15 mb-4 gap-2">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-yellow-400 shrink-0 animate-bounce" />
            <div>
              <h2 className="text-xl md:text-2xl font-black tracking-widest text-yellow-400">
                TRAUMA TEAM // ORBITAL SUPPLY DROP
              </h2>
              <p className="text-xs text-cyan-400 font-semibold tracking-wide">
                TACTICAL DECISION: EMBRACE CYBERWARE CHROME OR PRESERVE PURE HUMAN SANITY
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-yellow-400 text-black px-2.5 py-1 font-black uppercase tracking-wider shrink-0">
            CHOOSE YOUR BUILD PATH
          </span>
        </div>

        {/* Two-Column Build Choice Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* OPTION A: INSTALL CYBERWARE CHROME */}
          <div className="border-2 border-yellow-400/80 bg-gradient-to-b from-yellow-950/20 to-black/90 p-4 flex flex-col justify-between relative group hover:border-yellow-400 transition-all">
            <div className="absolute -top-3 left-4 bg-yellow-400 text-black text-[10px] font-black uppercase px-2 py-0.5 tracking-wider shadow">
              OPTION A // CYBERWARE UPGRADE
            </div>

            <div>
              <div className="flex items-center justify-between mt-1 mb-2">
                <span className="text-sm font-black text-yellow-400 tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-yellow-400" /> EMBRACE THE CHROME
                </span>
                <span className="text-[10px] text-purple-400 font-bold bg-purple-950/60 border border-purple-500/40 px-2 py-0.5">
                  RISKS CYBERPSYCHOSIS
                </span>
              </div>
              <p className="text-[11px] text-gray-300 mb-3">
                Implant cybernetic chrome to push your physical firepower beyond human limits. Permanently reduces your Sanity capacity buffer.
              </p>

              {/* Chrome Options inside Option A */}
              <div className="space-y-3 mb-4">
                {loot.implant ? (
                  <div
                    onClick={() => setSelectedChromeId(loot.implant!.id)}
                    className={`p-3 border-2 cursor-pointer transition-all ${
                      selectedChromeId === loot.implant.id
                        ? 'border-yellow-400 bg-yellow-950/40 drop-shadow-[0_0_12px_rgba(252,238,10,0.3)]'
                        : 'border-white/15 bg-black hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 border ${
                        loot.implant.rarity === 'mythic' ? 'border-red-500 text-red-400 bg-red-950/40' :
                        loot.implant.rarity === 'legendary' ? 'border-yellow-400 text-yellow-400 bg-yellow-950/40' :
                        loot.implant.rarity === 'rare' ? 'border-cyan-400 text-cyan-400 bg-cyan-950/40' : 'border-gray-600 text-gray-400'
                      }`}>
                        {loot.implant.rarity} // {loot.implant.slot} T{loot.implant.tier}
                      </span>
                      {selectedChromeId === loot.implant.id && (
                        <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0" />
                      )}
                    </div>
                    <div className="text-sm font-black text-white mb-0.5">{loot.implant.name}</div>
                    <p className="text-[11px] text-gray-300 mb-2">{loot.implant.description}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-purple-300 font-bold bg-purple-950/50 p-1.5 border border-purple-500/30">
                      <AlertTriangle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>Sanity Buffer Cut: -{loot.implant.sanityReduction}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 border border-dashed border-gray-700 bg-black/50 text-center text-xs text-gray-400">
                    No standard chrome dropped this supply crate.
                  </div>
                )}

                {/* Cyberskeleton Special High-Risk Choice (Waves 9, 19, 29, 39, 49) */}
                {loot.cyberskeletonAvailable && cyberskeleton && (
                  <div
                    onClick={() => setSelectedChromeId(cyberskeleton.id)}
                    className={`p-3 border-2 cursor-pointer transition-all ${
                      selectedChromeId === cyberskeleton.id
                        ? 'border-red-500 bg-red-950/50 drop-shadow-[0_0_15px_rgba(255,0,60,0.5)]'
                        : 'border-red-900 bg-black hover:border-red-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 border border-red-500 text-red-400 bg-red-950/60 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-red-500" /> WAVE SPECIAL // EXPERIMENTAL
                      </span>
                      {selectedChromeId === cyberskeleton.id && (
                        <CheckCircle2 className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                    </div>
                    <div className="text-sm font-black text-red-400 mb-0.5">{cyberskeleton.name}</div>
                    <p className="text-[11px] text-gray-300 mb-2">{cyberskeleton.description}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-black bg-red-950/60 p-1.5 border border-red-500">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>EXTREME RISK: Rapidly drains sanity per second!</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => onClaim('chrome', selectedChromeId)}
              disabled={!selectedChromeId}
              className={`w-full py-3 px-4 font-black text-xs md:text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                selectedChromeId === 'special_cyberskeleton'
                  ? 'bg-red-600 hover:bg-red-500 text-white border-2 border-red-400 drop-shadow-[0_0_15px_#ff003c]'
                  : selectedChromeId
                  ? 'bg-yellow-400 hover:bg-yellow-300 text-black border-2 border-yellow-300 drop-shadow-[0_0_15px_#fcee0a]'
                  : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
              }`}
            >
              <Cpu className="w-4 h-4" />
              {selectedChromeId === 'special_cyberskeleton'
                ? 'INSTALL CYBERSKELETON PROTOTYPE'
                : 'INSTALL SELECTED CHROME & RESUPPLY'}
            </button>
          </div>

          {/* OPTION B: PURE HUMAN RESUPPLY (REFUSE CHROME) */}
          <div className="border-2 border-cyan-400/80 bg-gradient-to-b from-cyan-950/20 to-black/90 p-4 flex flex-col justify-between relative group hover:border-cyan-400 transition-all">
            <div className="absolute -top-3 left-4 bg-cyan-400 text-black text-[10px] font-black uppercase px-2 py-0.5 tracking-wider shadow">
              OPTION B // PURE HUMAN RESUPPLY
            </div>

            <div>
              <div className="flex items-center justify-between mt-1 mb-2">
                <span className="text-sm font-black text-cyan-400 tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-cyan-400" /> REFUSE CHROME // PURE HUMAN
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5">
                  0% SANITY PENALTY
                </span>
              </div>
              <p className="text-[11px] text-gray-300 mb-3">
                Reject cyberware modification. Preserve your full 100% natural neural sanity buffer and receive an enhanced tactical resupply package instead.
              </p>

              {/* Pure Human Resupply Rewards */}
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <div className="bg-black/80 p-2.5 border border-cyan-500/40 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <div className="font-bold text-white text-[11px]">100% AMMO REFILL</div>
                    <div className="text-[9px] text-gray-400">All weapons fully stocked</div>
                  </div>
                </div>

                <div className="bg-black/80 p-2.5 border border-emerald-500/40 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold text-white text-[11px]">+80 HEALTH VIALS</div>
                    <div className="text-[9px] text-gray-400">Emergency cellular repair</div>
                  </div>
                </div>

                <div className="bg-black/80 p-2.5 border border-cyan-500/40 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <div className="font-bold text-white text-[11px]">+75 ARMOR SHARDS</div>
                    <div className="text-[9px] text-gray-400">Reinforced ballistic plating</div>
                  </div>
                </div>

                <div className="bg-black/80 p-2.5 border border-purple-500/40 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <div className="font-bold text-purple-300 text-[11px]">PENEKAN IMUN</div>
                    <div className="text-[9px] text-gray-400">Resets Psychosis Bar to 0%</div>
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/40 text-[10px] text-emerald-300 font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero chrome capacity lockout. Your brain stays 100% organic and resilient!</span>
              </div>
            </div>

            <button
              onClick={() => onClaim('human_supplies')}
              className="w-full py-3 px-4 bg-cyan-400 hover:bg-cyan-300 text-black font-black text-xs md:text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-2 cursor-pointer border-2 border-cyan-300 drop-shadow-[0_0_15px_#00f0ff]"
            >
              <Shield className="w-4 h-4" />
              REFUSE CHROME & TAKE PURE SUPPLIES
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-[10px] text-gray-500 font-semibold">
          TIP: Pure Human / Sandevistan-Only builds can avoid cyberpsychosis entirely by refusing additional chrome!
        </div>
      </div>
    </div>
  );
};
