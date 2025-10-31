
import React from 'react';
import type { HistoryItem } from '../types';
import HistoryIcon from './icons/HistoryIcon';
import TrashIcon from './icons/TrashIcon';

interface HistoryPanelProps {
  history: HistoryItem[];
  onLoadHistory: (id: string) => void;
  onClearHistory: () => void;
  t: any;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onLoadHistory, onClearHistory, t }) => {
  return (
    <div className="bg-white dark:bg-slate-800/50 p-4 md:p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 h-full">
      <div className="flex items-center mb-4">
        <HistoryIcon className="h-6 w-6 mr-3 text-blue-500" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">{t.history_title}</h2>
      </div>
      
      {history.length > 0 ? (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {history.map((item) => (
            <button
              key={item.id}
              onClick={() => onLoadHistory(item.id)}
              className="w-full text-left p-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
            >
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                {item.medications.join(', ')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {item.timestamp}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
          {t.history_empty}
        </p>
      )}

      {history.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
                type="button"
                onClick={onClearHistory}
                className="w-full inline-flex justify-center items-center py-2 px-4 border border-red-300 dark:border-red-700 rounded-md shadow-sm bg-white dark:bg-slate-800 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
            >
                <TrashIcon className="h-4 w-4 mr-2" />
                {t.history_clear_button}
            </button>
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;