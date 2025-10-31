// Fix: The properties `uri` and `title` on the `web` object are optional in the type returned by the Gemini API.
// Making them optional here aligns our local type definition with the library's type, resolving the TypeScript error.
export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface Source {
  uri: string;
  title: string;
  summary?: string;
  preview?: string;
}

// New specific types for structured analysis
export interface DrugDrugInteraction {
  interaction: string; // e.g., "Medication A + Medication B"
  riskLevel: string;
  potentialEffects: string;
  recommendations: string;
  references: string;
}

export interface DrugSubstanceInteraction {
  medication: string;
  substance: string;
  riskLevel: string;
  potentialEffects: string;
  recommendations: string;
  references: string;
}

export interface DrugConditionContraindication {
  medication: string;
  condition: string;
  riskLevel: string;
  contraindicationDetails: string;
  recommendations: string;
  references: string;
}

export interface DrugPharmacogeneticContraindication {
  medication: string;
  geneticFactor: string;
  riskLevel: string;
  implication: string;
  recommendations: string;
  references: string;
}

export interface BeersCriteriaAlert {
  medication: string;
  criteria: string;
  riskLevel: string;
  recommendations: string;
  references: string;
}


export interface AnalysisResult {
  analysisText: string;
  sources: Source[];
  drugDrugInteractions: DrugDrugInteraction[];
  drugSubstanceInteractions: DrugSubstanceInteraction[];
  drugConditionContraindications: DrugConditionContraindication[];
  drugPharmacogeneticContraindications: DrugPharmacogeneticContraindication[];
  beersCriteriaAlerts: BeersCriteriaAlert[];
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  medications: string[];
  otherSubstances: string;
  conditions: string;
  dateOfBirth?: string;
  pharmacogenetics?: string;
  analysisResult: AnalysisResult;
  lang?: 'es' | 'en';
}