
import { GoogleGenAI } from "@google/genai";
import type { 
    GroundingChunk, 
    AnalysisResult, 
    Source, 
    DrugDrugInteraction,
    DrugSubstanceInteraction,
    DrugConditionContraindication,
    DrugPharmacogeneticContraindication,
    BeersCriteriaAlert
} from '../types';
import { translations } from '../lib/translations';

let ai: GoogleGenAI | null = null;

export const initializeAi = (apiKey: string) => {
  if (!apiKey) {
    ai = null;
    throw new Error("API Key cannot be empty.");
  }
  ai = new GoogleGenAI({ apiKey });
};

const buildPrompt = (medications: string[], otherSubstances: string, conditions: string, dateOfBirth: string, pharmacogenetics: string, lang: 'es' | 'en'): string => {
  const medList = medications.join(', ');
  const t = translations[lang].prompt;
  
  const substanceText = otherSubstances.trim() ? `${t.otherSubstances}: ${otherSubstances}.` : t.noOtherSubstances;
  const pharmacogeneticsText = pharmacogenetics.trim() ? `${t.pharmacogeneticsInfo}: ${pharmacogenetics}.` : t.noPharmacogeneticsInfo;
  const conditionsText = conditions.trim() ? `${t.preexistingConditions}: ${conditions}.` : t.noPreexistingConditions;
  const dobText = dateOfBirth.trim() ? `${t.dob}: ${dateOfBirth}. ${t.dobNote}` : t.noDob;

  return `
    ${t.role}

    ${t.masterInstruction}
    ${t.part1}
    ${t.part2}

    ${t.jsonExampleTitle}
    [INTERACTION_DATA_START]
    {
      "drugDrugInteractions": [
        {
          "interaction": "${t.jsonExample.drugDrug.interaction}",
          "riskLevel": "${t.jsonExample.drugDrug.riskLevel}",
          "potentialEffects": "${t.jsonExample.drugDrug.potentialEffects}",
          "recommendations": "${t.jsonExample.drugDrug.recommendations}",
          "references": "${t.jsonExample.drugDrug.references}"
        }
      ],
      "drugSubstanceInteractions": [
        {
          "medication": "${t.jsonExample.drugSubstance.medication}",
          "substance": "${t.jsonExample.drugSubstance.substance}",
          "riskLevel": "${t.jsonExample.drugSubstance.riskLevel}",
          "potentialEffects": "${t.jsonExample.drugSubstance.potentialEffects}",
          "recommendations": "${t.jsonExample.drugSubstance.recommendations}",
          "references": "${t.jsonExample.drugSubstance.references}"
        }
      ],
      "drugConditionContraindications": [
        {
          "medication": "${t.jsonExample.drugCondition.medication}",
          "condition": "${t.jsonExample.drugCondition.condition}",
          "riskLevel": "${t.jsonExample.drugCondition.riskLevel}",
          "contraindicationDetails": "${t.jsonExample.drugCondition.contraindicationDetails}",
          "recommendations": "${t.jsonExample.drugCondition.recommendations}",
          "references": "${t.jsonExample.drugCondition.references}"
        }
      ],
      "drugPharmacogeneticContraindications": [
        {
          "medication": "${t.jsonExample.drugPharmacogenetic.medication}",
          "geneticFactor": "${t.jsonExample.drugPharmacogenetic.geneticFactor}",
          "riskLevel": "${t.jsonExample.drugPharmacogenetic.riskLevel}",
          "implication": "${t.jsonExample.drugPharmacogenetic.implication}",
          "recommendations": "${t.jsonExample.drugPharmacogenetic.recommendations}",
          "references": "${t.jsonExample.drugPharmacogenetic.references}"
        }
      ],
      "beersCriteriaAlerts": [
        {
          "medication": "${t.jsonExample.beersCriteria.medication}",
          "criteria": "${t.jsonExample.beersCriteria.criteria}",
          "riskLevel": "${t.jsonExample.beersCriteria.riskLevel}",
          "recommendations": "${t.jsonExample.beersCriteria.recommendations}",
          "references": "${t.jsonExample.beersCriteria.references}"
        }
      ]
    }
    [INTERACTION_DATA_END]

    ${t.readableAnalysisTitle}

    ### ${t.criticalSummaryTitle}
    ${t.criticalSummaryInstruction1}
    ${t.criticalSummaryInstruction2}
    ${t.criticalSummaryInstruction3}

    ${t.detailedAnalysisTitle}
    ${t.detailedAnalysisIntro}
    - ${t.medications}: ${medList}
    - ${substanceText}
    - ${pharmacogeneticsText}
    - ${conditionsText}
    - ${dobText}

    ${t.detailedAnalysisInstruction}

    ---
    ### 1. ${t.section1Title}
    *(${t.section1Description})*

    ---
    ### 2. ${t.section2Title}
    *(${t.section2Description})*

    ---
    ### 3. ${t.section3Title}
    *(${t.section3Description})*

    ---
    ### 4. ${t.section4Title}
    *(${t.section4Description})*
    
    ---
    ### 5. ${t.section5Title}
    *(${t.section5Description})*

    ${t.finalDisclaimer}

    ### ${t.sourcesSummaryTitle}
    ${t.sourcesSummaryInstruction}
    [SOURCE_START]
    URI: [${t.sourcesSummaryURI}]
    TITLE: [${t.sourcesSummaryTITLE}]
    SUMMARY: [${t.sourcesSummarySUMMARY}]
    PREVIEW: [${t.sourcesSummaryPREVIEW}]
    [SOURCE_END]
  `;
};

export const analyzeInteractions = async (medications: string[], otherSubstances: string, conditions: string, dateOfBirth: string, pharmacogenetics: string, lang: 'es' | 'en'): Promise<AnalysisResult> => {
  const t = translations[lang];
  
  if (!ai) {
    throw new Error(t.error_api_key_not_set);
  }

  try {
    const prompt = buildPrompt(medications, otherSubstances, conditions, dateOfBirth, pharmacogenetics, lang);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const fullText = response.text;
    
    if (!fullText) {
      if (response?.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error(t.error_safety_block);
      }
      throw new Error(t.error_no_response);
    }

    let drugDrugInteractions: DrugDrugInteraction[] = [];
    let drugSubstanceInteractions: DrugSubstanceInteraction[] = [];
    let drugConditionContraindications: DrugConditionContraindication[] = [];
    let drugPharmacogeneticContraindications: DrugPharmacogeneticContraindication[] = [];
    let beersCriteriaAlerts: BeersCriteriaAlert[] = [];
    let textForDisplay = fullText;

    const jsonStartMarker = '[INTERACTION_DATA_START]';
    const jsonEndMarker = '[INTERACTION_DATA_END]';
    const jsonStartIndex = fullText.indexOf(jsonStartMarker);
    const jsonEndIndex = fullText.indexOf(jsonEndMarker);

    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
        const jsonString = fullText.substring(jsonStartIndex + jsonStartMarker.length, jsonEndIndex).trim();
        try {
            const parsedJson = JSON.parse(jsonString);
            drugDrugInteractions = parsedJson.drugDrugInteractions || [];
            drugSubstanceInteractions = parsedJson.drugSubstanceInteractions || [];
            drugConditionContraindications = parsedJson.drugConditionContraindications || [];
            drugPharmacogeneticContraindications = parsedJson.drugPharmacogeneticContraindications || [];
            beersCriteriaAlerts = parsedJson.beersCriteriaAlerts || [];

        } catch (e) {
            console.error("Failed to parse structured interaction data:", e);
        }
        textForDisplay = fullText.substring(jsonEndIndex + jsonEndMarker.length).trim();
    }

    const sourceSectionMarker = `### ${t.prompt.sourcesSummaryTitle}`;
    const parts = textForDisplay.split(sourceSectionMarker);
    const analysisText = parts[0].trim();
    const sourcesText = parts.length > 1 ? parts[1] : '';
    
    let sources: Source[] = [];
    
    if (sourcesText) {
        const sourceRegex = /\[SOURCE_START\]\s*URI: ([\s\S]*?)\s*TITLE: ([\s\S]*?)\s*SUMMARY: ([\s\S]*?)\s*PREVIEW: ([\s\S]*?)\s*\[SOURCE_END\]/gs;
        let match;
        while ((match = sourceRegex.exec(sourcesText)) !== null) {
            sources.push({
                uri: match[1].trim(),
                title: match[2].trim(),
                summary: match[3].trim(),
                preview: match[4].trim(),
            });
        }
    }

    if (sources.length === 0) {
        const groundingChunks: GroundingChunk[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        sources = groundingChunks
          .filter(chunk => chunk.web && chunk.web.uri && chunk.web.title)
          .map(chunk => ({
            uri: chunk.web!.uri!,
            title: chunk.web!.title!,
          }));
    }
      
    return { 
        analysisText, 
        sources,
        drugDrugInteractions,
        drugSubstanceInteractions,
        drugConditionContraindications,
        drugPharmacogeneticContraindications,
        beersCriteriaAlerts
    };

  } catch (error: any) {
    console.error("Gemini API call failed:", error);
    if (error instanceof Error && (error.message.includes(t.error_safety_block_check) || error.message.includes(t.error_no_response_check))) {
      throw error;
    }
    // Check for specific API key error messages from Google's services
    if (error.message && (error.message.toLowerCase().includes('api key not valid') || error.message.toLowerCase().includes('invalid api key'))) {
        throw new Error(t.error_api_key);
    }
    throw new Error(t.error_service_unavailable);
  }
};
