import React, { useState, useEffect, useRef } from 'react';
import { drugNames } from '../data/drugNames';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import SparklesIcon from './icons/SparklesIcon';

interface InteractionFormProps {
  medications: string[];
  setMedications: React.Dispatch<React.SetStateAction<string[]>>;
  otherSubstances: string;
  setOtherSubstances: (value: string) => void;
  pharmacogenetics: string;
  setPharmacogenetics: (value: string) => void;
  conditions: string;
  setConditions: (value: string) => void;
  dateOfBirth: string;
  setDateOfBirth: (value: string) => void;
  onAnalyze: () => void;
  onClear: () => void;
  isLoading: boolean;
  t: any; // Translation object
}

const InteractionForm: React.FC<InteractionFormProps> = ({
  medications,
  setMedications,
  otherSubstances,
  setOtherSubstances,
  pharmacogenetics,
  setPharmacogenetics,
  conditions,
  setConditions,
  dateOfBirth,
  setDateOfBirth,
  onAnalyze,
  onClear,
  isLoading,
  t,
}) => {
  const [currentMedication, setCurrentMedication] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [dobError, setDobError] = useState<string | null>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAddMedication = () => {
    const medToAdd = currentMedication.trim();
    if (medToAdd && !medications.includes(medToAdd)) {
      setMedications([...medications, medToAdd]);
      setCurrentMedication('');
      setSuggestions([]);
    }
  };
  
  const handleMedicationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCurrentMedication(value);
    if (value.length > 0) {
      const filteredSuggestions = drugNames.filter(
        drug =>
          drug.toLowerCase().startsWith(value.toLowerCase()) &&
          !medications.includes(drug)
      );
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
    setActiveSuggestionIndex(0);
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion && !medications.includes(suggestion)) {
      setMedications([...medications, suggestion]);
    }
    setCurrentMedication('');
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSuggestionClick(suggestions[activeSuggestionIndex]);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveSuggestionIndex(prev => (prev === 0 ? suggestions.length - 1 : prev - 1));
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveSuggestionIndex(prev => (prev === suggestions.length - 1 ? 0 : prev + 1));
        } else if (e.key === 'Escape') {
            setSuggestions([]);
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        handleAddMedication();
    }
  };


  const handleRemoveMedication = (medToRemove: string) => {
    setMedications(medications.filter(med => med !== medToRemove));
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDateOfBirth(value);

    if (value.trim() === '') {
      setDobError(null);
      return;
    }

    const regex = /^\d{2}-\d{2}-\d{4}$/;
    if (!regex.test(value)) {
      setDobError(t.form_dob_error_format);
      return;
    }

    const [day, month, year] = value.split('-').map(Number);
    // JavaScript months are 0-indexed, so subtract 1 from month.
    const date = new Date(year, month - 1, day);
    
    // Check if the constructed date is valid and matches the input parts.
    if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
      setDobError(t.form_dob_error_invalid);
    } else if (date > new Date()) {
      setDobError(t.form_dob_error_future);
    } else {
      setDobError(null);
    }
  };

  return (
    <div className="space-y-6">
      <div ref={autocompleteRef}>
        <label htmlFor="medication-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {t.form_medications_label}
        </label>
        <div className="flex items-center space-x-2 relative">
          <input
            id="medication-input"
            type="text"
            value={currentMedication}
            onChange={handleMedicationInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t.form_medications_placeholder}
            className="flex-grow block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-200"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={handleAddMedication}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
            disabled={!currentMedication.trim()}
          >
            <PlusIcon className="h-5 w-5" />
            <span className="ml-2 hidden sm:inline">{t.form_add_button}</span>
          </button>
          {suggestions.length > 0 && (
            <ul className="absolute top-full left-0 right-0 z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion}
                  className={`relative cursor-default select-none py-2 px-4 transition-colors duration-150 ${
                    index === activeSuggestionIndex 
                    ? 'bg-blue-500 text-white' 
                    : 'text-slate-900 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <span className="block truncate font-normal">{suggestion}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {medications.map((med) => (
            <span key={med} className="inline-flex items-center py-1 pl-3 pr-2 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              {med}
              <button
                type="button"
                onClick={() => handleRemoveMedication(med)}
                className="ml-1.5 flex-shrink-0 inline-flex items-center justify-center h-4 w-4 rounded-full text-red-500 hover:bg-red-200 dark:hover:bg-red-800 focus:outline-none focus:bg-red-500 focus:text-white transition-colors duration-200"
              >
                <span className="sr-only">{t.form_remove_med_sr.replace('{med}', med)}</span>
                <TrashIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>
      
      <div>
        <label htmlFor="date-of-birth" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {t.form_dob_label}
        </label>
        <input
          id="date-of-birth"
          type="text"
          value={dateOfBirth}
          onChange={handleDobChange}
          placeholder={t.form_dob_placeholder}
          className={`block w-full px-3 py-2 bg-white dark:bg-slate-900 border ${
            dobError ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
          } rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-200`}
          aria-describedby="dob-error"
          aria-invalid={!!dobError}
        />
        {dobError && (
          <p id="dob-error" className="mt-2 text-sm text-red-600 dark:text-red-400">
            {dobError}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {t.form_dob_note}
        </p>
      </div>

      <div>
        <label htmlFor="other-substances" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {t.form_substances_label}
        </label>
        <textarea
          id="other-substances"
          rows={3}
          value={otherSubstances}
          onChange={(e) => setOtherSubstances(e.target.value)}
          placeholder={t.form_substances_placeholder}
          className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-200"
        />
      </div>

      <div>
        <label htmlFor="pharmacogenetics" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {t.form_pharmacogenetics_label}
        </label>
        <textarea
          id="pharmacogenetics"
          rows={3}
          value={pharmacogenetics}
          onChange={(e) => setPharmacogenetics(e.target.value)}
          placeholder={t.form_pharmacogenetics_placeholder}
          className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-200"
        />
      </div>

      <div>
        <label htmlFor="conditions" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {t.form_conditions_label} <span className="text-red-500">*</span>
        </label>
        <textarea
          id="conditions"
          rows={3}
          value={conditions}
          onChange={(e) => setConditions(e.target.value)}
          placeholder={t.form_conditions_placeholder}
          className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-200"
          required
          aria-required="true"
        />
      </div>
      
      <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-4 space-y-3 sm:space-y-0 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
            type="button"
            onClick={onClear}
            disabled={isLoading}
            className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 transition-colors duration-200"
        >
            {t.form_clear_button}
        </button>
        <button
            type="button"
            onClick={onAnalyze}
            disabled={isLoading || !!dobError}
            className="w-full sm:w-auto inline-flex justify-center items-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
            {isLoading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t.form_analyzing_button}
                </>
            ) : (
                <>
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    {t.form_analyze_button}
                </>
            )}
        </button>
      </div>
    </div>
  );
};

export default InteractionForm;