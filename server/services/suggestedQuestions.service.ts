/**
 * Suggested Questions Service
 * Generates context-aware suggested questions based on available data
 */

interface ProjectContext {
  project: any;
  assessmentsSummary: {
    total: number;
    byCondition: Record<string, number>;
    avgCondition: string;
  };
  deficienciesSummary: {
    total: number;
    byPriority: Record<string, number>;
  };
  costSummary: {
    totalEstimatedCost: number;
    totalActualCost: number;
  };
  recentAssessments: any[];
  criticalDeficiencies: any[];
}

interface AssetContext {
  asset: any;
  assessments: any[];
  deficiencies: any[];
  photos: any[];
  conditionHistory: any[];
}

interface CompanyContext {
  company: any;
  projectsSummary: {
    total: number;
    byStatus: Record<string, number>;
  };
  portfolioHealth: {
    avgCondition: string;
    totalDeficiencies: number;
    totalCost: number;
  };
  recentActivity: any[];
}

/**
 * Generate suggested questions for project-level chat
 */
export function generateProjectQuestions(context: ProjectContext): string[] {
  const questions: string[] = [];
  const { assessmentsSummary, deficienciesSummary, costSummary, criticalDeficiencies } = context;

  // Always available: basic project questions
  questions.push("What is the overall condition of this project?");
  questions.push("Give me a summary of this project's status");

  // If we have assessments
  if (assessmentsSummary.total > 0) {
    questions.push("What are the main issues found in the assessments?");
    
    // If we have condition data
    if (Object.keys(assessmentsSummary.byCondition).length > 0) {
      const poorCount = assessmentsSummary.byCondition['poor'] || 0;
      if (poorCount > 0) {
        questions.push(`What components are in poor condition?`);
      }
      
      if (assessmentsSummary.avgCondition === 'poor') {
        questions.push("What should be prioritized for immediate repair?");
      }
    }
  }

  // If we have deficiencies
  if (deficienciesSummary.total > 0) {
    questions.push("What are the most critical deficiencies?");
    
    const immediateCount = deficienciesSummary.byPriority['immediate'] || 0;
    if (immediateCount > 0) {
      questions.push(`What are the ${immediateCount} immediate priority deficiencies?`);
    }
  }

  // If we have cost data
  if (costSummary.totalEstimatedCost > 0) {
    questions.push("What is the estimated total repair cost?");
    questions.push("Which repairs are the most expensive?");
  }

  // If we have critical deficiencies
  if (criticalDeficiencies.length > 0) {
    questions.push("What safety issues need immediate attention?");
  }

  // If we have multiple assessments (can track trends)
  if (assessmentsSummary.total > 5) {
    questions.push("Are conditions improving or deteriorating over time?");
  }

  // Return up to 6 most relevant questions
  return questions.slice(0, 6);
}

/**
 * Generate suggested questions for asset-level chat
 */
export function generateAssetQuestions(context: AssetContext): string[] {
  const questions: string[] = [];
  const { asset, assessments, deficiencies, photos, conditionHistory } = context;

  // Always available: basic asset questions
  questions.push("What is the current condition of this asset?");
  questions.push(`Tell me about ${asset.name || 'this asset'}`);

  // If we have assessments
  if (assessments.length > 0) {
    questions.push("What issues have been found in assessments?");
    
    const latestAssessment = assessments[0];
    if (latestAssessment?.condition === 'poor') {
      questions.push("What repairs are needed?");
    }
    
    if (latestAssessment?.estimatedRepairCost > 0) {
      questions.push("How much will repairs cost?");
    }
  }

  // If we have condition history (multiple assessments)
  if (conditionHistory.length > 1) {
    questions.push("How has the condition changed over time?");
    questions.push("When was this asset last assessed?");
  }

  // If we have deficiencies
  if (deficiencies.length > 0) {
    questions.push("What deficiencies need to be addressed?");
    
    const immediateDeficiencies = deficiencies.filter(d => d.priority === 'immediate');
    if (immediateDeficiencies.length > 0) {
      questions.push("What are the urgent safety concerns?");
    }
  }

  // If we have photos
  if (photos.length > 0) {
    questions.push("What do the inspection photos show?");
  }

  // If asset has location data
  if (asset.streetAddress || asset.city) {
    questions.push("Where is this asset located?");
  }

  // If we have maintenance recommendations
  if (assessments.some((a: any) => a.recommendations)) {
    questions.push("What maintenance is recommended?");
  }

  // Return up to 6 most relevant questions
  return questions.slice(0, 6);
}

/**
 * Generate suggested questions for company-level chat
 */
export function generateCompanyQuestions(context: CompanyContext): string[] {
  const questions: string[] = [];
  const { projectsSummary, portfolioHealth, recentActivity } = context;

  // Always available: basic company questions
  questions.push("Give me an overview of our portfolio");
  questions.push("What is our company's overall building condition?");

  // If we have projects
  if (projectsSummary.total > 0) {
    questions.push(`What is the status of our ${projectsSummary.total} projects?`);
    
    // If we have project status breakdown
    const activeCount = projectsSummary.byStatus['active'] || 0;
    const completedCount = projectsSummary.byStatus['completed'] || 0;
    
    if (activeCount > 0) {
      questions.push(`What are our ${activeCount} active projects?`);
    }
    
    if (completedCount > 0) {
      questions.push("What projects have been completed recently?");
    }
  }

  // If we have portfolio health data
  if (portfolioHealth.totalDeficiencies > 0) {
    questions.push(`What are the ${portfolioHealth.totalDeficiencies} deficiencies across all projects?`);
    questions.push("Which projects have the most critical issues?");
  }

  // If we have cost data
  if (portfolioHealth.totalCost > 0) {
    questions.push("What is our total estimated repair cost?");
    questions.push("Which projects require the most investment?");
  }

  // If we have recent activity
  if (recentActivity.length > 0) {
    questions.push("What assessments were completed recently?");
  }

  // Portfolio-level insights
  if (projectsSummary.total > 3) {
    questions.push("Which buildings are in the worst condition?");
    questions.push("What are our top maintenance priorities?");
  }

  // Return up to 6 most relevant questions
  return questions.slice(0, 6);
}
