import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CountryInfo, AIRTEL_COUNTRIES } from '../data/countries';
import { useApp } from '../context/AppContext';
import { ChevronDown, Search, Check, Globe2, AlertCircle } from 'lucide-react';

interface CountryDropdownProps {
  selectedCountry: CountryInfo;
  onSelectCountry: (country: CountryInfo) => void;
  hasError?: boolean;
  isRequired?: boolean;
}

export const CountryDropdown: React.FC<CountryDropdownProps> = ({
  selectedCountry,
  onSelectCountry,
  hasError = false,
  isRequired = true,
}) => {
  const { language, t } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredCountries = AIRTEL_COUNTRIES.filter((country) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      country.nameEn.toLowerCase().includes(q) ||
      country.nameFr.toLowerCase().includes(q) ||
      country.dialCode.toLowerCase().includes(q) ||
      country.airtelBrand.toLowerCase().includes(q) ||
      country.id.toLowerCase().includes(q)
    );
  });

  const getCountryName = (c: CountryInfo) => {
    return language === 'fr' ? c.nameFr : c.nameEn;
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Label and Compulsory Indicator */}
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor="btn-country-dropdown"
          className="block text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5"
        >
          <span>{t('countryLabel')}</span>
          {isRequired && (
            <span className="px-1.5 py-0.2 rounded bg-red-100 text-[#E60000] text-[10px] font-black uppercase tracking-wider">
              {language === 'fr' ? 'Obligatoire' : 'Required'}
            </span>
          )}
        </label>
        <span className="text-[11px] text-neutral-400 font-medium">14 {language === 'fr' ? 'pays Airtel' : 'Airtel countries'}</span>
      </div>

      {/* Main Dropdown Button */}
      <button
        type="button"
        id="btn-country-dropdown"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-3.5 rounded-2xl bg-white border-2 transition-all text-left shadow-sm cursor-pointer ${
          hasError
            ? 'border-rose-400 ring-4 ring-rose-500/10'
            : isOpen
            ? 'border-[#0055FF] ring-4 ring-blue-500/10 shadow-md'
            : 'border-neutral-300 hover:border-neutral-400'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xl shrink-0 shadow-inner">
            {selectedCountry.flag}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-neutral-900 truncate flex items-center gap-2">
              <span className="truncate">{getCountryName(selectedCountry)}</span>
              <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-xs font-black shrink-0">
                {selectedCountry.dialCode}
              </span>
            </div>
            <div className="text-[11px] font-semibold text-[#E60000] truncate mt-0.5">
              {selectedCountry.airtelBrand}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className="text-[11px] font-bold text-neutral-400 hidden xs:inline">
            {isOpen ? (language === 'fr' ? 'Fermer' : 'Close') : (language === 'fr' ? 'Modifier' : 'Change')}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-6 h-6 rounded-md bg-neutral-100 flex items-center justify-center text-neutral-600"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 right-0 z-50 rounded-2xl bg-white border border-neutral-200 shadow-2xl overflow-hidden p-2 text-neutral-900 mt-1 max-h-[360px] flex flex-col"
          >
            {/* Search Input Box */}
            <div className="relative mb-2 shrink-0">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchCountryPlaceholder')}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-bold text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#0055FF] focus:bg-white"
              />
            </div>

            {/* Countries List */}
            <div className="overflow-y-auto space-y-1 flex-1 pr-1 overscroll-contain">
              {filteredCountries.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-500 font-medium">
                  {language === 'fr' ? 'Aucun pays trouvé' : 'No country found'}
                </div>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected = selectedCountry.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelectCountry(c);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-red-50 text-[#E60000] font-bold border border-red-200'
                          : 'hover:bg-neutral-100 text-neutral-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0">{c.flag}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate flex items-center gap-1.5">
                            <span className="truncate">{getCountryName(c)}</span>
                            <span className="text-[11px] font-black text-neutral-500">
                              ({c.dialCode})
                            </span>
                          </div>
                          <div className="text-[10px] text-neutral-500 truncate">
                            {c.airtelBrand} • {c.defaultLang.toUpperCase()}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 ml-2">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-[#E60000] text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <span className="text-[10px] font-semibold text-neutral-400">
                            {c.minDigits} {language === 'fr' ? 'chiffres' : 'digits'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
