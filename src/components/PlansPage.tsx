import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AirtelLogo, StarlinkLogo } from './Logos';
import { INTERNET_PLANS } from '../data/plans';
import { InternetPlan } from '../types';
import { LanguageSwitch } from './LanguageSwitch';
import { useApp } from '../context/AppContext';
import { AIRTEL_COUNTRIES, CountryInfo } from '../data/countries';
import {
  Menu,
  Zap,
  Check,
  Shield,
  Wifi,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Layers,
  Calendar,
  CalendarRange,
  Clock,
  Radio,
  RotateCcw,
  Globe2,
} from 'lucide-react';

interface PlansPageProps {
  onSelectPlan: (plan: InternetPlan) => void;
}

export type PlanCategoryFilter =
  | 'all'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'thirty_days'
  | 'starlink';

interface FilterOptionConfig {
  id: PlanCategoryFilter;
  labelKey: 'filterAll' | 'filterDaily' | 'filterWeekly' | 'filterMonthly' | 'filter30Days' | 'filterStarlink';
  sublabelKey: 'filterAllSub' | 'filterDailySub' | 'filterWeeklySub' | 'filterMonthlySub' | 'filter30DaysSub' | 'filterStarlinkSub';
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FILTER_CONFIGS: FilterOptionConfig[] = [
  {
    id: 'all',
    labelKey: 'filterAll',
    sublabelKey: 'filterAllSub',
    icon: Layers,
  },
  {
    id: 'daily',
    labelKey: 'filterDaily',
    sublabelKey: 'filterDailySub',
    icon: Zap,
  },
  {
    id: 'weekly',
    labelKey: 'filterWeekly',
    sublabelKey: 'filterWeeklySub',
    icon: Calendar,
  },
  {
    id: 'monthly',
    labelKey: 'filterMonthly',
    sublabelKey: 'filterMonthlySub',
    icon: CalendarRange,
  },
  {
    id: 'thirty_days',
    labelKey: 'filter30Days',
    sublabelKey: 'filter30DaysSub',
    icon: Clock,
  },
  {
    id: 'starlink',
    labelKey: 'filterStarlink',
    sublabelKey: 'filterStarlinkSub',
    badge: 'LEO',
    icon: Radio,
  },
];

export const PlansPage: React.FC<PlansPageProps> = ({ onSelectPlan }) => {
  const { country, setCountry, language, t } = useApp();
  const [selectedFilter, setSelectedFilter] = useState<PlanCategoryFilter>('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState<boolean>(false);
  const [hoveredPlanId, setHoveredPlanId] = useState<string | null>(null);

  // Filter logic covering all options requested
  const getPlansForFilter = (filter: PlanCategoryFilter): InternetPlan[] => {
    return INTERNET_PLANS.filter((plan) => {
      if (filter === 'daily') {
        return plan.validity.includes('1 Jour') || plan.validity.includes('3 Jours');
      }
      if (filter === 'weekly') {
        return plan.validity.includes('7 Jours') || plan.validity.includes('15 Jours');
      }
      if (filter === 'monthly') {
        return plan.validity.includes('30 Jours');
      }
      if (filter === 'thirty_days') {
        return plan.validity.includes('30 Jours');
      }
      if (filter === 'starlink') {
        return (
          plan.networkType.toLowerCase().includes('starlink') ||
          plan.features.some((f) => f.toLowerCase().includes('starlink')) ||
          plan.isPopular
        );
      }
      return true;
    });
  };

  const filteredPlans = getPlansForFilter(selectedFilter);
  const activeConfig =
    FILTER_CONFIGS.find((cfg) => cfg.id === selectedFilter) || FILTER_CONFIGS[0];
  const ActiveIcon = activeConfig.icon;
  const activeLabel = t(activeConfig.labelKey);

  // Helper to translate plan validity
  const formatValidity = (validity: string) => {
    if (language === 'en') {
      return validity
        .replace('Valide', 'Valid')
        .replace('Jours', 'Days')
        .replace('Jour', 'Day');
    }
    return validity;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e50000] via-[#c90000] to-[#990000] text-white flex flex-col selection:bg-amber-400 selection:text-neutral-900 overflow-x-hidden w-full">
      {/* Top Header Bar */}
      <header className="w-full border-b border-white/15 bg-black/15 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-[68px] py-2.5 flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-3 sm:gap-5">
            <AirtelLogo variant="white" className="h-7 sm:h-8" />
            <div className="hidden sm:block h-6 w-[1px] bg-white/30" />
            <StarlinkLogo className="hidden sm:inline-flex" />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Country Selector in Header */}
            <div className="relative">
              <button
                type="button"
                id="btn-header-country-select"
                onClick={() => setIsCountryPickerOpen(!isCountryPickerOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all cursor-pointer shadow-sm active:scale-95"
                title={t('selectCountry')}
              >
                <span className="text-base">{country.flag}</span>
                <span className="hidden xs:inline truncate max-w-[100px] sm:max-w-none">
                  {language === 'fr' ? country.nameFr : country.nameEn}
                </span>
                <span className="text-[10px] text-amber-300 font-mono">({country.dialCode})</span>
                <ChevronDown className="w-3 h-3 text-white/70 ml-0.5" />
              </button>

              {/* Country dropdown popup in header */}
              <AnimatePresence>
                {isCountryPickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 4, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    className="absolute right-0 top-full mt-1 w-64 rounded-2xl bg-neutral-900/95 backdrop-blur-xl border border-white/20 shadow-2xl p-2 z-50 max-h-[340px] overflow-y-auto space-y-1 text-white"
                  >
                    <div className="px-2.5 py-1 text-[10px] font-bold text-white/50 uppercase tracking-widest border-b border-white/10 mb-1">
                      {t('selectCountry')}
                    </div>
                    {AIRTEL_COUNTRIES.map((c) => {
                      const isSelected = country.id === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCountry(c, true);
                            setIsCountryPickerOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#E60000] text-white font-bold'
                              : 'hover:bg-white/10 text-white/90'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{c.flag}</span>
                            <span className="truncate">{language === 'fr' ? c.nameFr : c.nameEn}</span>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-white/70 ml-1">
                            {c.dialCode}
                          </span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Language Switcher */}
            <LanguageSwitch variant="transparent" />

            {/* Status indicator on desktop */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-xs font-semibold text-white/90 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t('starlinkStatusGlobal')}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Hero & Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 flex flex-col items-center">
        {/* Badge Pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 shadow-lg mb-5 max-w-full text-center"
        >
          <Wifi className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="text-xs sm:text-sm font-bold tracking-wide text-white truncate">
            {t('badgeTag')}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-neutral-900 text-[10px] font-black tracking-wider uppercase shrink-0">
            {t('directToCell')}
          </span>
        </motion.div>

        {/* Hero Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center max-w-3xl mb-6 sm:mb-8 px-2"
        >
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.15] text-white">
            {t('heroTitle1')} <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-md">
              {t('heroTitle2')}
            </span>
          </h1>
          <p className="mt-3 sm:mt-4 text-xs sm:text-base md:text-lg text-white/90 font-medium max-w-xl mx-auto leading-relaxed">
            {t('heroSubtitle')}
          </p>
        </motion.div>

        {/* ========================================================================= */}
        {/* MOBILE COLLAPSIBLE CATEGORY SELECTOR (Zero horizontal scroll on small screens) */}
        {/* ========================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="w-full max-w-md md:hidden mb-6 px-1"
        >
          {/* Collapsible Accordion Header Card */}
          <button
            type="button"
            id="mobile-category-accordion-trigger"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-black/30 backdrop-blur-lg border border-white/25 shadow-xl text-left transition-all active:scale-[0.99] cursor-pointer"
            aria-expanded={isMobileMenuOpen}
            aria-label={t('selectOfferPrompt')}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-amber-300 shrink-0 border border-white/20 shadow-inner">
                <ActiveIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                  <span>{t('categorySelected')}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-sm font-black text-white truncate flex items-center gap-2 mt-0.5">
                  <span className="truncate">{activeLabel}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black shrink-0">
                    {filteredPlans.length}{' '}
                    {filteredPlans.length > 1 ? t('plansWord') : t('planWordSingular')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-xs font-bold text-white/90 bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
                {isMobileMenuOpen ? t('closeCategory') : t('changeCategory')}
              </span>
              <motion.div
                animate={{ rotate: isMobileMenuOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </div>
          </button>

          {/* Collapsible Accordion Drawer */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden rounded-2xl bg-neutral-900/95 backdrop-blur-xl border border-white/20 p-2 shadow-2xl space-y-1.5"
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-white/50 uppercase tracking-widest border-b border-white/10 mb-1">
                  {t('selectOfferPrompt')}
                </div>
                {FILTER_CONFIGS.map((cfg) => {
                  const isSelected = selectedFilter === cfg.id;
                  const count = getPlansForFilter(cfg.id).length;
                  const OptIcon = cfg.icon;
                  const label = t(cfg.labelKey);
                  const sublabel = t(cfg.sublabelKey);

                  return (
                    <button
                      key={cfg.id}
                      type="button"
                      id={`mobile-filter-opt-${cfg.id}`}
                      onClick={() => {
                        setSelectedFilter(cfg.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-[#E60000] text-white shadow-md ring-1 ring-white/30'
                          : 'bg-white/5 hover:bg-white/10 text-white/90 active:bg-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-white/10 text-amber-300'
                          }`}
                        >
                          <OptIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-xs sm:text-sm truncate flex items-center gap-1.5">
                            <span>{label}</span>
                            {cfg.badge && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-400 text-neutral-950 text-[9px] font-black uppercase">
                                {cfg.badge}
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-[10px] truncate mt-0.5 ${
                              isSelected ? 'text-white/80' : 'text-white/60'
                            }`}
                          >
                            {sublabel}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSelected ? 'bg-white text-[#E60000]' : 'bg-white/15 text-white/80'
                          }`}
                        >
                          {count}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ========================================================================= */}
        {/* DESKTOP & TABLET FILTER BAR (Responsive wrap, strictly NO side-scrolling) */}
        {/* ========================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="hidden md:flex flex-wrap items-center justify-center gap-2 p-2 rounded-2xl bg-black/20 backdrop-blur-md border border-white/20 mb-8 max-w-4xl w-full"
        >
          {FILTER_CONFIGS.map((cfg) => {
            const isSelected = selectedFilter === cfg.id;
            const count = getPlansForFilter(cfg.id).length;
            const OptIcon = cfg.icon;
            const label = t(cfg.labelKey);

            return (
              <button
                key={cfg.id}
                type="button"
                id={`desktop-filter-tab-${cfg.id}`}
                onClick={() => setSelectedFilter(cfg.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-[#E60000] shadow-md scale-105 ring-2 ring-white/40'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <OptIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#E60000]' : 'text-amber-300'}`} />
                <span>{label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    isSelected ? 'bg-red-100 text-[#E60000]' : 'bg-white/15 text-white/80'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* Active Filter Helper Sub-bar (Showing on both Mobile & Desktop) */}
        <div className="w-full max-w-6xl flex items-center justify-between gap-3 mb-6 px-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>
              {t('showingPlans')}{' '}
              <strong className="text-white font-black">{filteredPlans.length}</strong>{' '}
              {filteredPlans.length > 1 ? t('plansWord') : t('planWordSingular')} {t('forFilter')}{' '}
              <span className="text-amber-200 underline underline-offset-2">{activeLabel}</span>
            </span>
          </div>

          {selectedFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-[11px] font-bold text-white transition-all cursor-pointer border border-white/15 shrink-0"
            >
              <RotateCcw className="w-3 h-3 text-amber-300" />
              <span>{t('seeAll')}</span>
            </button>
          )}
        </div>

        {/* Plans Grid (100% responsive, no side-scroll, perfectly fits mobile screens) */}
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8 w-full max-w-6xl"
        >
          {filteredPlans.map((plan, index) => {
            const isHovered = hoveredPlanId === plan.id;
            return (
              <motion.div
                key={plan.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                onMouseEnter={() => setHoveredPlanId(plan.id)}
                onMouseLeave={() => setHoveredPlanId(null)}
                className={`relative rounded-3xl bg-white text-neutral-900 overflow-hidden shadow-2xl transition-all duration-300 flex flex-col justify-between border-2 ${
                  plan.isPopular
                    ? 'border-amber-400 ring-4 ring-amber-400/20'
                    : isHovered
                    ? 'border-red-500 scale-[1.01]'
                    : 'border-transparent'
                }`}
              >
                {/* Popular / Best Value Ribbon */}
                {plan.isPopular && (
                  <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-neutral-950 text-center py-1.5 px-4 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>{t('popularRibbon')}</span>
                  </div>
                )}

                {/* Plan Content */}
                <div className="p-5 sm:p-7 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 rounded-xl bg-red-100/70 text-[#E60000] font-black text-xs uppercase tracking-wider">
                        {formatValidity(plan.validity)}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-500">
                        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>{t('starlinkNetwork')}</span>
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
                        {t('highSpeedLeo')}
                      </p>
                    </div>

                    {/* Pricing */}
                    <div className="my-4 pt-3 border-t border-neutral-100 flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-neutral-900">
                        {plan.price}
                      </span>
                      <span className="text-xs font-medium text-neutral-400">{t('perPlan')}</span>
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
                <div className="p-4 sm:p-6 bg-neutral-50 border-t border-neutral-100">
                  <button
                    type="button"
                    id={`btn-select-plan-${plan.id}`}
                    onClick={() => onSelectPlan(plan)}
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#E60000] hover:bg-[#c40000] active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <span>{t('choosePlan')}</span>
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
          className="mt-10 sm:mt-16 mb-6 max-w-3xl w-full bg-white/10 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-lg"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">{t('securityTitle')}</h4>
              <p className="text-xs text-white/80 leading-relaxed mt-0.5">
                {t('securityDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3.5 py-1.5 rounded-xl bg-white text-[#E60000] font-black text-xs uppercase tracking-wider shadow-sm">
              {t('securityBadge')}
            </span>
          </div>
        </motion.div>
      </main>

      {/* Spacious Uncluttered Responsive Footer */}
      <footer className="w-full border-t border-white/15 bg-black/30 backdrop-blur-xl mt-12 sm:mt-24 pt-8 pb-10 sm:pt-12 sm:pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center gap-4 sm:gap-6">
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
            <span>© 2026 {country.airtelBrand}</span>
            <span className="text-white/40 hidden sm:inline">•</span>
            <span>{t('satellitePartner')}</span>
            <span className="text-white/40 hidden sm:inline">•</span>
            <span>{t('copyright')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
