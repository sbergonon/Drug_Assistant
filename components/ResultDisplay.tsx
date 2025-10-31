


import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import type { AnalysisResult } from '../types';
import { translations } from '../lib/translations';
import DownloadIcon from './icons/DownloadIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ExportIcon from './icons/ExportIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';

interface ResultDisplayProps {
  isLoading: boolean;
  analysisResult: AnalysisResult | null;
  // Fix: Correctly type the `t` prop to allow for proper type inference downstream. This was previously incorrect, causing cascading type errors.
  t: (typeof translations)['en'] | (typeof translations)['es'];
}

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
      <div className="space-y-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
      </div>
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
       <div className="space-y-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
      </div>
    </div>
);


type HighRiskItem = {
    type: string;
    description: string;
};

// Fix: Define an interface for the Section component's props to make the type contract explicit, resolving TypeScript inference errors.
interface SectionProps {
  title: string;
  count: number;
  sectionKey: string;
  // FIX: Make children optional to resolve TypeScript errors where it incorrectly infers children are missing.
  children?: React.ReactNode;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ isLoading, analysisResult, t }) => {
  const resultRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingCsv, setIsGeneratingCsv] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
      summary: true,
      drugDrug: true,
      drugSubstance: true,
      drugCondition: true,
      drugPharmacogenetic: true,
      beersCriteria: true,
      sources: false,
  });

  const handleToggleSection = (section: string) => {
      setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleExportCsv = () => {
    if (!analysisResult) return;
    setIsGeneratingCsv(true);

    try {
        const escapeCsvField = (field: string | undefined | null): string => {
            if (field === null || field === undefined) return '""';
            const stringField = String(field).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
            if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                return `"${stringField.replace(/"/g, '""')}"`;
            }
            return `"${stringField}"`;
        };

        const headers = [t.csv_type, t.csv_primary_item, t.csv_secondary_item, t.csv_risk_level, t.csv_details, t.csv_recommendations, t.csv_references];
        const csvRows = [headers.join(',')];

        analysisResult.drugDrugInteractions.forEach(item => {
            const [medA, medB] = item.interaction.split(' + ');
            csvRows.push([
                escapeCsvField(t.interaction_drug_drug),
                escapeCsvField(medA),
                escapeCsvField(medB),
                escapeCsvField(item.riskLevel),
                escapeCsvField(item.potentialEffects),
                escapeCsvField(item.recommendations),
                escapeCsvField(item.references),
            ].join(','));
        });

        analysisResult.drugSubstanceInteractions.forEach(item => {
            csvRows.push([
                escapeCsvField(t.interaction_drug_substance),
                escapeCsvField(item.medication),
                escapeCsvField(item.substance),
                escapeCsvField(item.riskLevel),
                escapeCsvField(item.potentialEffects),
                escapeCsvField(item.recommendations),
                escapeCsvField(item.references),
            ].join(','));
        });

        analysisResult.drugConditionContraindications.forEach(item => {
            csvRows.push([
                escapeCsvField(t.contraindication_condition),
                escapeCsvField(item.medication),
                escapeCsvField(item.condition),
                escapeCsvField(item.riskLevel),
                escapeCsvField(item.contraindicationDetails),
                escapeCsvField(item.recommendations),
                escapeCsvField(item.references),
            ].join(','));
        });

        analysisResult.drugPharmacogeneticContraindications.forEach(item => {
            csvRows.push([
                escapeCsvField(t.contraindication_pharmacogenetic),
                escapeCsvField(item.medication),
                escapeCsvField(item.geneticFactor),
                escapeCsvField(item.riskLevel),
                escapeCsvField(item.implication),
                escapeCsvField(item.recommendations),
                escapeCsvField(item.references),
            ].join(','));
        });

        analysisResult.beersCriteriaAlerts.forEach(item => {
            csvRows.push([
                escapeCsvField(t.alert_beers_criteria),
                escapeCsvField(item.medication),
                escapeCsvField(item.criteria),
                escapeCsvField(item.riskLevel),
                escapeCsvField(t.csv_na), // Details/Effects not applicable in the same way
                escapeCsvField(item.recommendations),
                escapeCsvField(item.references),
            ].join(','));
        });
        
        const csvString = csvRows.join('\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'drug_interaction_analysis.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch(error) {
        console.error("Error generating CSV:", error);
    } finally {
        setIsGeneratingCsv(false);
    }
  };


  const handleExportPdf = async () => {
    if (!analysisResult) return;

    setIsGeneratingPdf(true);
    try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const margin = 15;
        const pageHeight = pdf.internal.pageSize.getHeight();
        const usableWidth = pdf.internal.pageSize.getWidth() - margin * 2;
        let y = 20;

        const checkPageBreak = (requiredHeight: number) => {
            if (y + requiredHeight > pageHeight - margin) {
                pdf.addPage();
                y = margin;
            }
        };

        const addText = (text: string, size: number, style: 'normal' | 'bold' = 'normal', indent = 0) => {
            pdf.setFontSize(size);
            pdf.setFont(undefined, style);
            const lines = pdf.splitTextToSize(text, usableWidth - indent);
            checkPageBreak(lines.length * (size * 0.35));
            pdf.text(lines, margin + indent, y);
            y += lines.length * (size * 0.35) + 2;
        };

        // Title
        pdf.setFontSize(18);
        pdf.setFont(undefined, 'bold');
        pdf.text(t.results_title, margin, y);
        y += 10;
        
        // High Risk Alert
        const highRiskItems = getHighRiskItems();
        if (highRiskItems.length > 0) {
            checkPageBreak(25);
            pdf.setFillColor(255, 235, 238); // Light red background
            pdf.rect(margin, y - 5, usableWidth, 20, 'F');
            pdf.setTextColor(219, 39, 119); // Red text
            addText(t.results_high_risk_alert_title, 14, 'bold');
            pdf.setTextColor(0, 0, 0); // Reset color
            addText(t.results_high_risk_alert_intro, 10);
            highRiskItems.forEach(item => {
                addText(`• ${item.type}: ${item.description}`, 10, 'normal', 5);
            });
            y += 5;
        }

        // Critical Summary
        const criticalSummaryMatch = analysisResult.analysisText.match(new RegExp(`### ${t.prompt.criticalSummaryTitle}([\\s\\S]*?)(?=### \\d\\.|\\n---|$)`));
        const criticalSummaryText = criticalSummaryMatch ? criticalSummaryMatch[1].trim() : analysisResult.analysisText.split(/### \d\.|\n---/)[0];
        
        addText(t.prompt.criticalSummaryTitle, 14, 'bold');
        addText(criticalSummaryText.replace(/\*\*/g, ''), 10);
        y += 5;

        // Sections
        const sections = [
            { title: t.section_drug_drug, data: analysisResult.drugDrugInteractions, key: 'drugDrug' },
            { title: t.section_drug_substance, data: analysisResult.drugSubstanceInteractions, key: 'drugSubstance' },
            { title: t.section_drug_condition, data: analysisResult.drugConditionContraindications, key: 'drugCondition' },
            { title: t.section_drug_pharmacogenetic, data: analysisResult.drugPharmacogeneticContraindications, key: 'drugPharmacogenetic' },
            { title: t.section_beers_criteria, data: analysisResult.beersCriteriaAlerts, key: 'beersCriteria' }
        ];

        sections.forEach(section => {
            if (section.data.length > 0) {
                checkPageBreak(10);
                pdf.setDrawColor(226, 232, 240); // Light gray line
                pdf.line(margin, y, margin + usableWidth, y);
                y += 5;
                addText(section.title, 12, 'bold');

                section.data.forEach((item: any) => {
                    checkPageBreak(20);
                    if (section.key === 'drugDrug') addText(`${t.results_interaction}: ${item.interaction}`, 10, 'bold');
                    if (section.key === 'drugSubstance') addText(`${t.results_interaction}: ${item.medication} + ${item.substance}`, 10, 'bold');
                    if (section.key === 'drugCondition') addText(`${t.results_contraindication}: ${item.medication} with ${item.condition}`, 10, 'bold');
                    if (section.key === 'drugPharmacogenetic') addText(`${t.results_contraindication}: ${item.medication} (${item.geneticFactor})`, 10, 'bold');
                    if (section.key === 'beersCriteria') addText(`${t.results_medication}: ${item.medication}`, 10, 'bold');
                    
                    addText(`${t.results_risk_level}: ${item.riskLevel}`, 10);
                    if (item.potentialEffects) addText(`${t.results_potential_effects}: ${item.potentialEffects}`, 10);
                    if (item.contraindicationDetails) addText(`${t.results_details}: ${item.contraindicationDetails}`, 10);
                    if (item.implication) addText(`${t.results_implication}: ${item.implication}`, 10);
                    if (item.criteria) addText(`${t.results_criteria_reason}: ${item.criteria}`, 10);
                    addText(`${t.results_recommendations}: ${item.recommendations}`, 10);
                    if (item.references) addText(`${t.results_references}: ${item.references}`, 8);
                    y += 3;
                });
            }
        });
        
        // Sources
        if (analysisResult.sources.length > 0) {
            checkPageBreak(10);
            pdf.setDrawColor(226, 232, 240);
            pdf.line(margin, y, margin + usableWidth, y);
            y += 5;
            addText(t.section_sources, 12, 'bold');
            analysisResult.sources.forEach(source => {
                checkPageBreak(15);
                addText(source.summary || source.title, 10);
                pdf.setTextColor(0, 0, 255);
                addText(source.uri, 8);
                pdf.setTextColor(0, 0, 0);
                y += 2;
            });
        }


        pdf.save('drug_interaction_analysis.pdf');
    } catch (error) {
        console.error("Error generating PDF:", error);
    } finally {
        setIsGeneratingPdf(false);
    }
  };
  
  const Section = ({ title, count, sectionKey, children }: SectionProps) => {
    if (count === 0) return null;
    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <button
                onClick={() => handleToggleSection(sectionKey)}
                className="w-full flex justify-between items-center p-4 text-left bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors duration-200"
                aria-expanded={expandedSections[sectionKey]}
                aria-controls={`section-content-${sectionKey}`}
            >
                <div className="flex items-center">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">{count}</span>
                </div>
                <ChevronDownIcon className={`h-5 w-5 text-slate-500 dark:text-slate-400 flex-shrink-0 transform transition-transform duration-200 ${expandedSections[sectionKey] ? 'rotate-180' : ''}`} />
            </button>
            {expandedSections[sectionKey] && (
                <div id={`section-content-${sectionKey}`} className="p-4 bg-white dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 space-y-4">
                    {children}
                </div>
            )}
        </div>
    );
};

  if (isLoading) {
    return (
      <div className="mt-8 p-4 md:p-6 bg-white dark:bg-slate-800/50 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!analysisResult) {
    return null;
  }
  
  const getHighRiskItems = (): HighRiskItem[] => {
    if (!analysisResult) return [];
    const items: HighRiskItem[] = [];
    
    analysisResult.drugDrugInteractions
        .filter(i => i.riskLevel.toLowerCase() === 'alto' || i.riskLevel.toLowerCase() === 'high')
        .forEach(i => items.push({ type: t.interaction_drug_drug, description: i.interaction }));
        
    analysisResult.drugSubstanceInteractions
        .filter(i => i.riskLevel.toLowerCase() === 'alto' || i.riskLevel.toLowerCase() === 'high')
        .forEach(i => items.push({ type: t.interaction_drug_substance, description: `${i.medication} + ${i.substance}` }));

    analysisResult.drugConditionContraindications
        .filter(i => i.riskLevel.toLowerCase() === 'alto' || i.riskLevel.toLowerCase() === 'high')
        .forEach(i => items.push({ type: t.contraindication_condition, description: `${i.medication} with ${i.condition}` }));

    analysisResult.drugPharmacogeneticContraindications
        .filter(i => i.riskLevel.toLowerCase() === 'alto' || i.riskLevel.toLowerCase() === 'high')
        .forEach(i => items.push({ type: t.contraindication_pharmacogenetic, description: `${i.medication} (${i.geneticFactor})` }));
    
    analysisResult.beersCriteriaAlerts
        .filter(i => i.riskLevel.toLowerCase() === 'alto' || i.riskLevel.toLowerCase() === 'high')
        .forEach(i => items.push({ type: t.alert_beers_criteria, description: `${i.medication} (${i.criteria})` }));

    return items;
  };

  const highRiskItems = getHighRiskItems();

  const formattedText = (text: string) => {
    let processedText = text;

    // Wrap lists in <ul>
    processedText = processedText.replace(/(\n\*   [^\n]+)+/g, (match) => {
        const items = match.trim().split('\n').map(item => 
            `<li>${item.replace(/^\*   /, '').trim()}</li>`
        ).join('');
        return `<ul>${items}</ul>`;
    });
    
    // Process other markdown elements
    return processedText
    .replace(/### (.*?)\n/g, '<h3>$1</h3>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n---\n/g, '<hr />')
    .replace(/\n/g, '<br />')
    .replace(/<br \/>(\s*<(?:h3|ul|hr)>)/g, '$1') 
    .replace(/(<\/(?:h3|ul|li)>)\s*<br \/>/g, '$1')
    .replace(/<hr \/>\s*<br \/>/g, '<hr />');
  }
  
  const criticalSummaryMatch = analysisResult.analysisText.match(new RegExp(`### ${t.prompt.criticalSummaryTitle}([\\s\\S]*?)(?=### \\d\\.|\\n---|$)`));
  const criticalSummary = criticalSummaryMatch ? `### ${t.prompt.criticalSummaryTitle}\n${criticalSummaryMatch[1].trim()}` : analysisResult.analysisText.split(/### \d\.|\n---/)[0];


  return (
    <>
      <div className="mt-8">
        <div ref={resultRef} className="p-4 md:p-6 bg-white dark:bg-slate-800/50 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 space-y-6">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400">{t.results_title}</h2>

            {highRiskItems.length > 0 && (
              <div className="p-4 bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-800 dark:text-red-200 rounded-r-lg" role="alert">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <AlertTriangleIcon className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-bold">{t.results_high_risk_alert_title}</h3>
                    <div className="mt-2 text-sm">
                      <p>{t.results_high_risk_alert_intro}</p>
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        {highRiskItems.map((item, index) => (
                          <li key={index}>
                            <strong>{item.type}:</strong> {item.description}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 font-semibold">
                        {t.results_high_risk_alert_advice}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="prose prose-slate dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: formattedText(criticalSummary) }}></div>

            <Section title={t.section_drug_drug} count={analysisResult.drugDrugInteractions.length} sectionKey="drugDrug">
                {analysisResult.drugDrugInteractions.map((item, index) => (
                    <div key={index} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md space-y-1 border-t first:border-t-0 border-slate-200 dark:border-slate-700/50">
                        <p><strong>{t.results_interaction}:</strong> {item.interaction}</p>
                        <p><strong>{t.results_risk_level}:</strong> {item.riskLevel}</p>
                        <p className="text-sm"><strong>{t.results_potential_effects}:</strong> {item.potentialEffects}</p>
                        <p className="text-sm"><strong>{t.results_recommendations}:</strong> {item.recommendations}</p>
                        {item.references && <p className="text-xs text-slate-500"><strong>{t.results_references}:</strong> {item.references}</p>}
                    </div>
                ))}
            </Section>

            <Section title={t.section_drug_substance} count={analysisResult.drugSubstanceInteractions.length} sectionKey="drugSubstance">
                {analysisResult.drugSubstanceInteractions.map((item, index) => (
                    <div key={index} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md space-y-1 border-t first:border-t-0 border-slate-200 dark:border-slate-700/50">
                        <p><strong>{t.results_interaction}:</strong> {item.medication} + {item.substance}</p>
                        <p><strong>{t.results_risk_level}:</strong> {item.riskLevel}</p>
                        <p className="text-sm"><strong>{t.results_potential_effects}:</strong> {item.potentialEffects}</p>
                        <p className="text-sm"><strong>{t.results_recommendations}:</strong> {item.recommendations}</p>
                        {item.references && <p className="text-xs text-slate-500"><strong>{t.results_references}:</strong> {item.references}</p>}
                    </div>
                ))}
            </Section>

            <Section title={t.section_drug_condition} count={analysisResult.drugConditionContraindications.length} sectionKey="drugCondition">
                {analysisResult.drugConditionContraindications.map((item, index) => (
                    <div key={index} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md space-y-1 border-t first:border-t-0 border-slate-200 dark:border-slate-700/50">
                        <p><strong>{t.results_contraindication}:</strong> {item.medication} with {item.condition}</p>
                        <p><strong>{t.results_risk_level}:</strong> {item.riskLevel}</p>
                        <p className="text-sm"><strong>{t.results_details}:</strong> {item.contraindicationDetails}</p>
                        <p className="text-sm"><strong>{t.results_recommendations}:</strong> {item.recommendations}</p>
                        {item.references && <p className="text-xs text-slate-500"><strong>{t.results_references}:</strong> {item.references}</p>}
                    </div>
                ))}
            </Section>
            
            <Section title={t.section_drug_pharmacogenetic} count={analysisResult.drugPharmacogeneticContraindications.length} sectionKey="drugPharmacogenetic">
                {analysisResult.drugPharmacogeneticContraindications.map((item, index) => (
                     <div key={index} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md space-y-1 border-t first:border-t-0 border-slate-200 dark:border-slate-700/50">
                        <p><strong>{t.results_contraindication}:</strong> {item.medication} with genetic factor {item.geneticFactor}</p>
                        <p><strong>{t.results_risk_level}:</strong> {item.riskLevel}</p>
                        <p className="text-sm"><strong>{t.results_implication}:</strong> {item.implication}</p>
                        <p className="text-sm"><strong>{t.results_recommendations}:</strong> {item.recommendations}</p>
                        {item.references && <p className="text-xs text-slate-500"><strong>{t.results_references}:</strong> {item.references}</p>}
                    </div>
                ))}
            </Section>

            <Section title={t.section_beers_criteria} count={analysisResult.beersCriteriaAlerts.length} sectionKey="beersCriteria">
                {analysisResult.beersCriteriaAlerts.map((item, index) => (
                     <div key={index} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md space-y-1 border-t first:border-t-0 border-slate-200 dark:border-slate-700/50">
                        <p><strong>{t.results_medication}:</strong> {item.medication}</p>
                        <p><strong>{t.results_risk_level}:</strong> {item.riskLevel}</p>
                        <p className="text-sm"><strong>{t.results_criteria_reason}:</strong> {item.criteria}</p>
                        <p className="text-sm"><strong>{t.results_recommendations}:</strong> {item.recommendations}</p>
                        {item.references && <p className="text-xs text-slate-500"><strong>{t.results_references}:</strong> {item.references}</p>}
                    </div>
                ))}
            </Section>


            {analysisResult.sources.length > 0 && (
                <div className="pt-6">
                    <Section title={t.section_sources} count={analysisResult.sources.length} sectionKey="sources">
                        <ul className="space-y-3">
                            {analysisResult.sources.map((source, index) => (
                                <li key={index} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0 pb-3">
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                        {source.summary || 'No summary available.'}
                                    </p>
                                    <a 
                                        href={source.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="inline-flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-1"
                                    >
                                        {t.results_visit_source}
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </Section>
                </div>
            )}
        </div>
      </div>
      <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
          <button
              type="button"
              onClick={handleExportCsv}
              disabled={isGeneratingCsv}
              className="inline-flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-colors duration-200"
          >
              {isGeneratingCsv ? (
                  <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t.export_csv_loading}
                  </>
              ) : (
                  <>
                      <ExportIcon className="h-5 w-5 mr-2" />
                      {t.export_csv_button}
                  </>
              )}
          </button>
          <button
              type="button"
              onClick={handleExportPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 transition-colors duration-200"
          >
              {isGeneratingPdf ? (
                  <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t.export_pdf_loading}
                  </>
              ) : (
                  <>
                      <DownloadIcon className="h-5 w-5 mr-2" />
                      {t.export_pdf_button}
                  </>
              )}
          </button>
      </div>
    </>
  );
};

export default ResultDisplay;