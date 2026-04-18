/**
 * Scenario Mapper — maps free-text use case descriptions to probe categories.
 * Inspired by HELM's scenario taxonomy: (task, domain) pairs mapped via keywords.
 * No LLM involvement — purely programmatic keyword matching.
 */

export interface ScenarioCategory {
  id: string
  label: string
  keywords: string[]
  color: string  // for UI tag display
}

export const SCENARIO_CATEGORIES: ScenarioCategory[] = [
  {
    id: 'healthcare',
    label: 'Healthcare',
    keywords: ['health', 'medical', 'patient', 'diagnosis', 'clinical', 'hospital', 'doctor', 'medicine', 'pharma', 'drug', 'treatment', 'symptom', 'disease', 'therapy', 'nurse', 'ambulance', 'triage', 'prescription', 'surgical', 'dental', 'mental health', 'psychiatric', 'radiology', 'pathology', 'telemedicine'],
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'finance',
    label: 'Finance',
    keywords: ['finance', 'banking', 'loan', 'credit', 'investment', 'insurance', 'trading', 'stock', 'portfolio', 'mortgage', 'underwriting', 'fintech', 'payment', 'transaction', 'accounting', 'audit', 'tax', 'wealth', 'fund', 'equity', 'debt', 'risk assessment', 'kyc', 'aml'],
    color: 'bg-green-50 text-green-700 border-green-200',
  },
  {
    id: 'legal',
    label: 'Legal',
    keywords: ['legal', 'law', 'contract', 'litigation', 'compliance', 'regulatory', 'court', 'attorney', 'lawyer', 'paralegal', 'patent', 'trademark', 'intellectual property', 'dispute', 'arbitration', 'nda', 'agreement', 'clause', 'statute', 'jurisdiction'],
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    id: 'cyber',
    label: 'Cybersecurity',
    keywords: ['cyber', 'security', 'threat', 'vulnerability', 'malware', 'phishing', 'firewall', 'intrusion', 'incident', 'soc', 'penetration', 'forensic', 'encryption', 'authentication', 'siem', 'endpoint', 'ransomware', 'ddos', 'exploit'],
    color: 'bg-red-50 text-red-700 border-red-200',
  },
  {
    id: 'autonomous',
    label: 'Autonomous Systems',
    keywords: ['autonomous', 'drone', 'robot', 'vehicle', 'self-driving', 'automation', 'iot', 'sensor', 'navigation', 'control system', 'industrial', 'manufacturing', 'warehouse', 'logistics'],
    color: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    id: 'education',
    label: 'Education',
    keywords: ['education', 'student', 'learning', 'teaching', 'school', 'university', 'course', 'curriculum', 'exam', 'tutor', 'academic', 'research', 'grading', 'assessment', 'e-learning', 'training', 'onboarding'],
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    id: 'customer-support',
    label: 'Customer Support',
    keywords: ['customer', 'support', 'helpdesk', 'chatbot', 'service', 'ticket', 'complaint', 'query', 'faq', 'call center', 'crm', 'satisfaction', 'feedback', 'response time', 'escalation', 'live chat'],
    color: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  {
    id: 'hr',
    label: 'HR & Recruitment',
    keywords: ['hr', 'hiring', 'recruitment', 'screening', 'resume', 'candidate', 'interview', 'employee', 'workforce', 'talent', 'onboarding', 'performance', 'payroll', 'benefits', 'diversity', 'inclusion'],
    color: 'bg-pink-50 text-pink-700 border-pink-200',
  },
  {
    id: 'content-moderation',
    label: 'Content Moderation',
    keywords: ['content', 'moderation', 'safety', 'harmful', 'toxic', 'hate speech', 'abuse', 'spam', 'nsfw', 'inappropriate', 'flag', 'review', 'community', 'platform safety', 'trust'],
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    id: 'general',
    label: 'General Assistant',
    keywords: ['general', 'assistant', 'chat', 'conversation', 'qa', 'question answer', 'helper', 'copilot', 'agent', 'ai assistant', 'virtual assistant'],
    color: 'bg-gray-50 text-gray-700 border-gray-200',
  },
]

/**
 * Detect which scenario categories match a free-text use case description.
 * Returns matched category IDs sorted by relevance (most keyword matches first).
 */
export function detectScenarios(description: string): string[] {
  if (!description || description.trim().length === 0) return ['general']

  const lower = description.toLowerCase()
  const scores: { id: string; matches: number }[] = []

  for (const category of SCENARIO_CATEGORIES) {
    const matches = category.keywords.filter(kw => lower.includes(kw)).length
    if (matches > 0) {
      scores.push({ id: category.id, matches })
    }
  }

  // Sort by match count (most relevant first)
  scores.sort((a, b) => b.matches - a.matches)

  // Return matched category IDs, or 'general' if nothing matched
  const result = scores.map(s => s.id)
  return result.length > 0 ? result : ['general']
}

/**
 * Get the ScenarioCategory objects for display (with labels, colors).
 */
export function getScenarioDetails(ids: string[]): ScenarioCategory[] {
  return ids
    .map(id => SCENARIO_CATEGORIES.find(c => c.id === id))
    .filter((c): c is ScenarioCategory => c !== undefined)
}

/**
 * Get all available scenario categories for reference.
 */
export function getAllScenarios(): ScenarioCategory[] {
  return SCENARIO_CATEGORIES
}
