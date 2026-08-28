import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AirtelLogo, StarlinkLogo } from './Logos';
import { INTERNET_PLANS } from '../data/plans';
import { InternetPlan } from '../types';
import {
  Menu,
  Zap,
  Check,
  Shield,
  Wifi,
  ChevronRight,
  Sparkles,
  Award,
} from 'lucide-react';

interface PlansPageProps {
  onSelectPlan: (plan: InternetPlan) => void;
}

export const PlansPage: React.FC<PlansPageProps> = ({ onSelectPlan }) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [hoveredPlanId, setHoveredPlanId] = useState<string | null>(null);

  const filteredPlans = INTERNET_PLANS.filter((plan) => {
    if (selectedFilter === 'daily') return plan.validity.includes('1 Jour') || plan.validity.includes('3 Jours');
    if (selectedFilter === 'weekly') return plan.validity.includes('7 Jours') || plan.validity.includes('15 Jours');
    if (selectedFilter === 'monthly') return plan.validity.includes('30 Jours');
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e50000] via-[#c90000] to-[#990000] text-white flex flex-col selection:bg-amber-400 selection:text-neutral-900">
      {/* Top Header Bar */}
      <header className="w-full border-b border-white/15 bg-black/10 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[72px] py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 sm:gap-6">
            <AirtelLogo variant="white" className="h-8 sm:h-9" />
            <div className="hidden sm:block h-6 w-[1px] bg-white/30" />
            <StarlinkLogo className="hidden sm:inline-flex" />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-xs font-semibold text-white/90 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Réseau Starlink RDC : Opérationnel</span>
            </div>

            <button
              type="button"
              id="btn-main-menu"
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-white flex items-center justify-center cursor-pointer"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero & Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 flex flex-col items-center">
        {/* Badge Pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 shadow-lg mb-6 max-w-full text-center"
        >
          <Wifi className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="text-xs sm:text-sm font-bold tracking-wide text-white truncate">
            Forfaits Internet & Constellation Starlink
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-neutral-900 text-[10px] font-black tracking-wider uppercase shrink-0">
            Direct-to-Cell
          </span>
        </motion.div>

        {/* Hero Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center max-w-3xl mb-8"
        >
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.15] text-white">
            Restez Connecté <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-md">
              Sans Limites
            </span>
          </h1>
          <p className="mt-4 text-sm sm:text-base md:text-lg text-white/90 font-medium max-w-xl mx-auto leading-relaxed">
            Choisissez un forfait. Vous serez redirigé vers la page de connexion Airtel Lite pour
            procéder au paiement.
          </p>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex items-center justify-center p-1.5 rounded-2xl bg-black/20 backdrop-blur-md border border-white/20 mb-8 max-w-full overflow-x-auto"
        >
          {(['all', 'daily', 'weekly', 'monthly'] as const).map((filter) => {
            const labels = {
              all: 'Tous les forfaits',
              daily: 'Journalier',
              weekly: 'Hebdomadaire',
              monthly: 'Mensuel',
            };
            const isSelected = selectedFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                id={`filter-tab-${filter}`}
                onClick={() => setSelectedFilter(filter)}
                className={`px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-white text-[#E60000] shadow-md scale-105'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {labels[filter]}
              </button>
            );
          })}
        </motion.div>

        {/* Plans Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 w-full max-w-6xl"
        >
          {filteredPlans.map((plan, index) => {
            const isHovered = hoveredPlanId === plan.id;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                onMouseEnter={() => setHoveredPlanId(plan.id)}
                onMouseLeave={() => setHoveredPlanId(null)}
                className={`relative rounded-3xl bg-white text-neutral-900 overflow-hidden shadow-2xl transition-all duration-300 flex flex-col justify-between border-2 ${
                  plan.isPopular
                    ? 'border-amber-400 ring-4 ring-amber-400/20'
                    : isHovered
                    ? 'border-red-500 scale-[1.02]'
                    : 'border-transparent'
                }`}
              >
                {/* Popular / Best Value Ribbon */}
                {plan.isPopular && (
                  <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-neutral-950 text-center py-1.5 px-4 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>LE PLUS POPULAIRE • MEILLEURE VENTE</span>
                  </div>
                )}

                {/* Plan Content */}
                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 rounded-xl bg-red-100/70 text-[#E60000] font-black text-xs uppercase tracking-wider">
                        {plan.validity}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-500">
                        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>Réseau Starlink</span>
                      </div>
                    </div>

                    {/* Data Size Display */}
                    <div className="my-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl sm:text-5xl font-black tracking-tight text-neutral-900">
                          {plan.dataAmount}
                        </span>
                        <span className="text-2xl sm:text-3xl font-black text-[#E60000]">
                          {plan.dataUnit}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-neutral-500 mt-1">
                        Internet Très Haut Débit LEO
                      </p>
                    </div>

                    {/* Pricing */}
                    <div className="my-4 pt-3 border-t border-neutral-100 flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-neutral-900">
                        {plan.price}
                      </span>
                      <span className="text-xs font-medium text-neutral-400">/ forfait</span>
                    </div>

                    {/* Features List */}
                    <div className="space-y-2.5 my-4">
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-neutral-700 font-medium">
                          <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Bottom CTA Button */}
                <div className="p-5 sm:p-6 bg-neutral-50 border-t border-neutral-100">
                  <button
                    type="button"
                    id={`btn-select-plan-${plan.id}`}
                    onClick={() => onSelectPlan(plan)}
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#E60000] hover:bg-[#c40000] active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <span>CHOISIR CE FORFAIT</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Security & Starlink Guarantee Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 sm:mt-16 mb-6 max-w-3xl w-full bg-white/10 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-lg"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Sécurité Airtel NextGen & Starlink LEO</h4>
              <p className="text-xs text-white/80 leading-relaxed mt-0.5">
                Paiement instantané débité sur votre solde Airtel Money / Lite avec validation cryptée.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3.5 py-1.5 rounded-xl bg-white text-[#E60000] font-black text-xs uppercase tracking-wider shadow-sm">
              100% SÉCURISÉ
            </span>
          </div>
        </motion.div>
      </main>

      {/* Spacious Uncluttered Responsive Footer */}
      <footer className="w-full border-t border-white/15 bg-black/30 backdrop-blur-xl mt-16 sm:mt-24 pt-10 pb-12 sm:pt-12 sm:pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center gap-5 sm:gap-6">
          {/* Brand partnership line */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
            <AirtelLogo variant="white" size="sm" />
            <span className="text-white/40 text-xs hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5 text-xs font-black tracking-widest text-white uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>STARLINK™</span>
            </div>
          </div>

          {/* Clean metadata copy */}
          <div className="flex items-center justify-center gap-2.5 sm:gap-4 text-xs text-white/70 flex-wrap leading-relaxed">
            <span>© 2026 Airtel Congo</span>
            <span className="text-white/40 hidden sm:inline">•</span>
            <span>Réseau Satellite Direct-to-Cell</span>
            <span className="text-white/40 hidden sm:inline">•</span>
            <span>Tous droits réservés</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
