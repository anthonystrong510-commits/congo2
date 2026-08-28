import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AirtelLogo, StarlinkLogo } from './Logos';
import { InternetPlan } from '../types';
import {
  CheckCircle2,
  RotateCcw,
  Wifi,
  Radio,
  Zap,
  ShieldCheck,
  Activity,
  Smartphone,
  Calendar,
} from 'lucide-react';

interface SuccessPageProps {
  phone: string;
  selectedPlan: InternetPlan;
  sessionId: string;
  onReset: () => void;
}

export const SuccessPage: React.FC<SuccessPageProps> = ({
  phone,
  selectedPlan,
  sessionId,
  onReset,
}) => {
  const [speedTestRunning, setSpeedTestRunning] = useState(false);
  const [testedSpeed, setTestedSpeed] = useState<number | null>(null);
  const [testedPing, setTestedPing] = useState<number | null>(null);

  const txDate = new Date().toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const txRef = 'AIR-STL-' + Math.floor(100000 + Math.random() * 900000) + '-CD';

  const runSpeedTest = () => {
    setSpeedTestRunning(true);
    setTestedSpeed(null);
    setTestedPing(null);

    setTimeout(() => {
      setTestedSpeed(Math.floor(140 + Math.random() * 80));
      setTestedPing(Math.floor(18 + Math.random() * 12));
      setSpeedTestRunning(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e50000] via-[#c90000] to-[#990000] text-white flex flex-col justify-between selection:bg-amber-400 selection:text-neutral-900">
      {/* Top Header */}
      <header className="w-full border-b border-white/15 bg-black/10 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between flex-wrap gap-2">
          <AirtelLogo variant="white" className="h-8" />
          <StarlinkLogo className="hidden sm:inline-flex" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col items-center">
        {/* Animated Checkmark and Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="flex flex-col items-center text-center mb-8"
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-2xl mb-4 relative">
            <CheckCircle2 className="w-12 h-12 sm:w-14 sm:h-14" />
            <motion.div
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.4, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.8 }}
              className="absolute inset-0 rounded-full border-4 border-white"
            />
          </div>

          <span className="px-3.5 py-1 rounded-full bg-emerald-500 text-white font-black text-xs uppercase tracking-wider mb-2 shadow-sm">
            Validation Réussie
          </span>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Forfait Internet Activé !
          </h1>
          <p className="text-sm sm:text-base text-white/90 font-medium mt-1 max-w-md">
            Votre forfait Starlink x Airtel est maintenant immédiatement utilisable sur votre ligne.
          </p>
        </motion.div>

        {/* Digital Receipt Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="w-full max-w-xl bg-white text-neutral-900 rounded-3xl shadow-2xl p-5 sm:p-8 border border-white/20 relative overflow-hidden"
        >
          {/* Header of receipt */}
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-5 flex-wrap gap-2">
            <AirtelLogo variant="nextgen" className="h-8" />
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                RÉF TRANSACTION
              </span>
              <span className="font-mono font-bold text-xs text-neutral-800">{txRef}</span>
            </div>
          </div>

          {/* Details list */}
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 gap-2">
              <span className="text-neutral-500 font-medium flex items-center gap-1.5 shrink-0">
                <Smartphone className="w-4 h-4 text-[#E60000]" /> Ligne Airtel
              </span>
              <span className="font-bold text-neutral-900 truncate">+243 {phone}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 gap-2">
              <span className="text-neutral-500 font-medium flex items-center gap-1.5 shrink-0">
                <Zap className="w-4 h-4 text-[#E60000]" /> Forfait souscrit
              </span>
              <span className="font-extrabold text-[#E60000] text-right truncate">
                {selectedPlan.dataAmount} {selectedPlan.dataUnit} ({selectedPlan.validity})
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 gap-2">
              <span className="text-neutral-500 font-medium flex items-center gap-1.5 shrink-0">
                <Radio className="w-4 h-4 text-neutral-400" /> Technologie Réseau
              </span>
              <span className="font-bold text-neutral-800 text-right truncate">Direct Starlink Constellation LEO</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 gap-2">
              <span className="text-neutral-500 font-medium flex items-center gap-1.5 shrink-0">
                <Calendar className="w-4 h-4 text-neutral-400" /> Date d'activation
              </span>
              <span className="font-medium text-neutral-700">{txDate}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 gap-2">
              <span className="text-neutral-500 font-medium flex items-center gap-1.5 shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Mode de Paiement
              </span>
              <span className="font-bold text-neutral-800">Airtel Lite / Money</span>
            </div>

            <div className="flex justify-between items-center pt-2 text-base">
              <span className="font-black text-neutral-900">Montant Débité</span>
              <span className="font-black text-xl text-[#E60000]">{selectedPlan.price}</span>
            </div>
          </div>

          {/* Speed & Network Test Widget */}
          <div className="mt-6 p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#E60000]" />
                <span className="font-bold text-xs text-neutral-800">
                  Test de Débit Starlink Satellite
                </span>
              </div>
              <button
                type="button"
                id="btn-run-speed-test"
                onClick={runSpeedTest}
                disabled={speedTestRunning}
                className="text-[11px] font-bold text-[#E60000] hover:underline cursor-pointer flex items-center gap-1"
              >
                <Wifi className={`w-3 h-3 ${speedTestRunning ? 'animate-bounce' : ''}`} />
                <span>{speedTestRunning ? 'Test en cours...' : 'Tester le signal'}</span>
              </button>
            </div>

            {speedTestRunning && (
              <div className="py-3 text-center">
                <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-gradient-to-r from-red-500 to-amber-400 animate-pulse w-3/4 rounded-full" />
                </div>
                <span className="text-[11px] text-neutral-500">
                  Mesure du ping vers la constellation Starlink...
                </span>
              </div>
            )}

            {testedSpeed !== null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 gap-2 pt-2 text-center"
              >
                <div className="p-2 bg-white rounded-xl border border-neutral-200">
                  <span className="text-[10px] text-neutral-400 font-bold block uppercase">
                    Débit descendant
                  </span>
                  <span className="font-black text-lg text-emerald-600">{testedSpeed} Mbps</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-neutral-200">
                  <span className="text-[10px] text-neutral-400 font-bold block uppercase">
                    Latence (Ping)
                  </span>
                  <span className="font-black text-lg text-neutral-800">{testedPing} ms</span>
                </div>
              </motion.div>
            )}

            {!speedTestRunning && testedSpeed === null && (
              <p className="text-[11px] text-neutral-500">
                Liaison satellite opérationnelle avec une couverture optimale 4G & LEO.
              </p>
            )}
          </div>
        </motion.div>

        {/* Bottom Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3.5 w-full max-w-xl">
          <button
            type="button"
            id="btn-new-recharge"
            onClick={onReset}
            className="w-full py-4 px-6 rounded-2xl bg-white text-[#E60000] hover:bg-neutral-100 font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Souscrire un autre forfait</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/15 bg-black/20 backdrop-blur-md px-4 py-6 text-center text-xs text-white/80">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-2">
          <p className="leading-relaxed">© 2026 Airtel Congo. Partenaire officiel Starlink Direct-to-Cell.</p>
        </div>
      </footer>
    </div>
  );
};
