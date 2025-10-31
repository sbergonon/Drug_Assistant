
import React, { useState, useCallback, useEffect } from 'react';
import { analyzeInteractions } from './services/geminiService';
import type { AnalysisResult, HistoryItem } from './types';
import Header from './components/Header';
import Disclaimer from './components/Disclaimer';
import InteractionForm from './components/InteractionForm';
import ResultDisplay from './components/ResultDisplay';
import HistoryPanel from './components/HistoryPanel';
import TabSelector from './components/TabSelector';
import TermsModal from './components/TermsModal';
import { translations } from './lib/translations';

const App: React.FC = () => {
  const [medications, setMedications] = useState<string[]>([]);
  const [otherSubstances, setOtherSubstances] = useState('');
  const [pharmacogenetics, setPharmacogenetics] = useState('');
  const [conditions, setConditions] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  const [lang] = useState<'es' | 'en'>(
    navigator.language.split('-')[0] === 'es' ? 'es' : 'en'
  );
  const t = translations[lang];


  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('drugInteractionHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error("Failed to load history from localStorage:", error);
      localStorage.removeItem('drugInteractionHistory');
    }
  }, []);

  const handleClear = useCallback(() => {
    setMedications([]);
    setOtherSubstances('');
    setPharmacogenetics('');
    setConditions('');
    setDateOfBirth('');
    setAnalysisResult(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (medications.length === 0) {
      setError(t.error_add_medication);
      return;
    }
    
    if (conditions.trim() === '') {
      setError(t.error_add_conditions);
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await analyzeInteractions(medications, otherSubstances, conditions, dateOfBirth, pharmacogenetics, lang);
      setAnalysisResult(result);

      const newHistoryItem: HistoryItem = {
        id: new Date().toISOString(),
        timestamp: new Date().toLocaleString(),
        medications,
        otherSubstances,
        pharmacogenetics,
        conditions,
        dateOfBirth,
        analysisResult: result,
        lang,
      };
      
      setHistory(prevHistory => {
        const updatedHistory = [newHistoryItem, ...prevHistory];
        localStorage.setItem('drugInteractionHistory', JSON.stringify(updatedHistory));
        return updatedHistory;
      });

    } catch (e: any) {
      setError(e.message || t.error_unexpected);
    } finally {
      setIsLoading(false);
    }
  }, [medications, otherSubstances, conditions, dateOfBirth, pharmacogenetics, lang, t]);

  const handleLoadHistory = useCallback((id: string) => {
    const item = history.find(h => h.id === id);
    if (item) {
      setMedications(item.medications);
      setOtherSubstances(item.otherSubstances);
      setPharmacogenetics(item.pharmacogenetics || '');
      setConditions(item.conditions);
      setDateOfBirth(item.dateOfBirth || '');
      setAnalysisResult({
        ...item.analysisResult,
        drugDrugInteractions: item.analysisResult.drugDrugInteractions || [],
        drugSubstanceInteractions: item.analysisResult.drugSubstanceInteractions || [],
        drugConditionContraindications: item.analysisResult.drugConditionContraindications || [],
        drugPharmacogeneticContraindications: item.analysisResult.drugPharmacogeneticContraindications || [],
      });
      setError(null);
      setIsLoading(false);
      setActiveTab('form'); // Switch to form view after loading
    }
  }, [history]);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('drugInteractionHistory');
  }, []);


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <div className="container mx-auto max-w-4xl px-4 py-6 sm:py-10">
        <Header appName={t.appName} appDescription={t.appDescription} />
        <Disclaimer t={t} />
        
        <div className="mt-8">
            <TabSelector activeTab={activeTab} setActiveTab={setActiveTab} t={t} />
        </div>

        <main className="mt-6">
            {activeTab === 'form' && (
                <div>
                    <div className="bg-white dark:bg-slate-800/50 p-4 md:p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <InteractionForm
                            medications={medications}
                            setMedications={setMedications}
                            otherSubstances={otherSubstances}
                            setOtherSubstances={setOtherSubstances}
                            pharmacogenetics={pharmacogenetics}
                            setPharmacogenetics={setPharmacogenetics}
                            conditions={conditions}
                            setConditions={setConditions}
                            dateOfBirth={dateOfBirth}
                            setDateOfBirth={setDateOfBirth}
                            onAnalyze={handleAnalyze}
                            onClear={handleClear}
                            isLoading={isLoading}
                            t={t}
                        />
                    </div>

                    {error && (
                       <div className="mt-8 p-4 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 rounded-lg">
                         <p className="font-bold">{t.error_title}</p>
                         <p>{error}</p>
                       </div>
                    )}

                    <ResultDisplay
                      isLoading={isLoading}
                      analysisResult={analysisResult}
                      t={t}
                    />
                </div>
            )}
            
            {activeTab === 'history' && (
                <HistoryPanel
                    history={history}
                    onLoadHistory={handleLoadHistory}
                    onClearHistory={handleClearHistory}
                    t={t}
                 />
            )}
        </main>

        <footer className="mt-12 text-center text-sm text-slate-500 dark:text-slate-400">
            <p>{t.footer_disclaimer}</p>
            <p className="mt-2">
              <button 
                  onClick={() => setIsTermsModalOpen(true)} 
                  className="underline hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                  {t.terms_and_conditions}
              </button>
            </p>
        </footer>

        {isTermsModalOpen && <TermsModal onClose={() => setIsTermsModalOpen(false)} t={t} />}
      </div>
    </div>
  );
};

export default App;