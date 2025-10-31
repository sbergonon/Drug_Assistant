
import React from 'react';
import DocumentTextIcon from './icons/DocumentTextIcon';
import HistoryIcon from './icons/HistoryIcon';

interface TabSelectorProps {
  activeTab: 'form' | 'history';
  setActiveTab: (tab: 'form' | 'history') => void;
  t: any;
}

const TabSelector: React.FC<TabSelectorProps> = ({ activeTab, setActiveTab, t }) => {
  const tabs = [
    { id: 'form', name: t.tab_new_analysis, icon: DocumentTextIcon },
    { id: 'history', name: t.tab_history, icon: HistoryIcon },
  ];

  const getButtonClass = (tabId: 'form' | 'history') => {
    const baseClass = "w-full sm:w-auto flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-3 font-medium text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900 focus:ring-blue-500";
    if (activeTab === tabId) {
      return `${baseClass} bg-white dark:bg-slate-800 shadow text-blue-600 dark:text-blue-400`;
    }
    return `${baseClass} text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50`;
  };

  return (
    <div className="p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as 'form' | 'history')}
          className={getButtonClass(tab.id as 'form' | 'history')}
        >
          <tab.icon className="h-5 w-5 mr-2" />
          {tab.name}
        </button>
      ))}
    </div>
  );
};

export default TabSelector;