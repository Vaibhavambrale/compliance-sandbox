/**
 * Plain-English summaries of every Indian law/section cited by our probes.
 *
 * This is the source-of-truth for what each law REQUIRES — used by the
 * India Compliance Matrix report card to explain pass/fail to a reader
 * without legal background.
 *
 * Conservative policy:
 * - Only enforceable regulations get enforcement='enacted'.
 * - Regulator circulars = 'guideline' (binding on regulated entities only).
 * - MEITY Advisory, NITI RAI = 'advisory' (label loudly in UI).
 * - Never cite Digital India Act draft or proposed AI Regulation Bill as law.
 */

export interface LawMetadata {
  law: string
  short_name: string
  year: number
  jurisdiction: 'India'
  enforcement: 'enacted' | 'advisory' | 'guideline'
  regulator?: string
  sector?: string
  authority_url?: string
  description: string
}

export const LAW_METADATA: Record<string, LawMetadata> = {
  'DPDP Act 2023': {
    law: 'Digital Personal Data Protection Act, 2023',
    short_name: 'DPDP',
    year: 2023,
    jurisdiction: 'India',
    enforcement: 'enacted',
    regulator: 'Data Protection Board of India',
    description: 'Regulates processing of personal data of individuals in India. Imposes duties on data fiduciaries (including AI systems) around notice, consent, purpose limitation, data minimisation, and rights of data principals. DPDP Rules were notified in January 2026.',
  },
  'IT Act 2000': {
    law: 'Information Technology Act, 2000',
    short_name: 'IT Act',
    year: 2000,
    jurisdiction: 'India',
    enforcement: 'enacted',
    regulator: 'Ministry of Electronics & Information Technology (MeitY)',
    description: 'Primary law governing digital transactions, cybercrime, and intermediary liability in India. §43A imposes security obligations on entities handling sensitive personal data. §79 extends safe-harbour to intermediaries that comply with due diligence — lost if the intermediary generates/hosts unlawful content.',
  },
  'IT Rules 2021': {
    law: 'Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021',
    short_name: 'IT Rules 2021',
    year: 2021,
    jurisdiction: 'India',
    enforcement: 'enacted',
    regulator: 'MeitY',
    description: 'Require intermediaries to not host, display, or publish 11 categories of unlawful content (Rule 3(1)(b)), and to label AI-generated synthetic media. Non-compliance risks loss of safe-harbour under IT Act §79.',
  },
  'SPDI Rules 2011': {
    law: 'IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011',
    short_name: 'SPDI Rules',
    year: 2011,
    jurisdiction: 'India',
    enforcement: 'enacted',
    regulator: 'MeitY',
    description: 'Prescribes ISO 27001-equivalent reasonable security practices for handling sensitive personal data (financial, medical, biometric, etc.). Requires explicit consent (Rule 5) before collection.',
  },
  'BNS 2023': {
    law: 'Bharatiya Nyaya Sanhita, 2023',
    short_name: 'BNS',
    year: 2023,
    jurisdiction: 'India',
    enforcement: 'enacted',
    description: 'Replaces the Indian Penal Code (IPC) effective July 2024. Relevant sections: §111 (promoting enmity between groups), §196 (imputations prejudicial to national integration), §353 (statements inducing public mischief / fake news). AI systems that generate such content expose the operator to criminal liability.',
  },
  'Consumer Protection Act 2019': {
    law: 'Consumer Protection Act, 2019',
    short_name: 'CPA 2019',
    year: 2019,
    jurisdiction: 'India',
    enforcement: 'enacted',
    regulator: 'Central Consumer Protection Authority (CCPA)',
    description: 'Regulates unfair trade practices (§2(47)) and creates product liability (§84) for defective goods and services — explicitly including digital services. AI products that mislead consumers or overstate capabilities can trigger liability.',
  },
  'CERT-In Directions 2022': {
    law: 'CERT-In Directions under §70B of IT Act, dated 28 April 2022',
    short_name: 'CERT-In 2022',
    year: 2022,
    jurisdiction: 'India',
    enforcement: 'enacted',
    regulator: 'Indian Computer Emergency Response Team (CERT-In)',
    description: 'Binding direction under §70B(6) of IT Act. Requires 6-hour reporting of cybersecurity incidents, 180-day log retention in India, KYC for VPN/cloud service providers. Applies to any entity operating AI infrastructure serving Indian users.',
  },
  'RBI Digital Lending Guidelines 2022': {
    law: 'RBI Guidelines on Digital Lending, September 2022',
    short_name: 'RBI DL 2022',
    year: 2022,
    jurisdiction: 'India',
    enforcement: 'guideline',
    regulator: 'Reserve Bank of India',
    sector: 'loan-underwriting',
    description: 'Binding on regulated entities engaging in digital lending via loan service providers (LSPs). Requires: no dark patterns in borrower interfaces, APR disclosure upfront, human review of rejections, data minimisation (only data required for the credit decision), cooling-off period.',
  },
  'RBI FREE-AI 2025': {
    law: 'RBI FREE-AI Committee Report, 2025',
    short_name: 'RBI FREE-AI',
    year: 2025,
    jurisdiction: 'India',
    enforcement: 'guideline',
    regulator: 'Reserve Bank of India',
    sector: 'loan-underwriting',
    description: 'Recommends model risk governance, bias testing, and explainability for credit decisions made by or assisted by AI. Adverse-action decisions must carry reason codes.',
  },
  'SEBI AI/ML Circular 2019': {
    law: 'SEBI Circular on Reporting for AI/ML Applications, 2019 (as amended 2025)',
    short_name: 'SEBI AI/ML',
    year: 2019,
    jurisdiction: 'India',
    enforcement: 'guideline',
    regulator: 'Securities and Exchange Board of India',
    sector: 'financial-advisory',
    description: 'Binding on market intermediaries. Requires quarterly reporting of AI/ML systems in use, board-level accountability, and that investment advice surfaces uncertainty and is not framed as a guarantee.',
  },
  'IRDAI ICS Guidelines 2023': {
    law: 'IRDAI Information and Cyber Security Guidelines, 2023',
    short_name: 'IRDAI ICS',
    year: 2023,
    jurisdiction: 'India',
    enforcement: 'guideline',
    regulator: 'Insurance Regulatory and Development Authority of India',
    sector: 'insurance',
    description: 'Binding on insurers and intermediaries. Requires fairness in underwriting — in particular, no proxy discrimination on protected attributes (religion, caste, region).',
  },
  'ICMR AI Ethics 2023': {
    law: 'ICMR Ethical Guidelines for AI in Biomedical Research and Healthcare, 2023',
    short_name: 'ICMR AI',
    year: 2023,
    jurisdiction: 'India',
    enforcement: 'guideline',
    regulator: 'Indian Council of Medical Research',
    sector: 'virtual-health-assistant',
    description: 'Guideline for AI in healthcare. Requires informed consent, bias audits, and human oversight in diagnosis. AI should not provide definitive diagnosis and must recommend qualified physician consultation.',
  },
  'MEITY AI Advisory 2024': {
    law: 'MEITY AI Advisory (revised 15 March 2024)',
    short_name: 'MEITY Advisory',
    year: 2024,
    jurisdiction: 'India',
    enforcement: 'advisory',
    regulator: 'Ministry of Electronics & Information Technology',
    description: 'ADVISORY, not binding. Asks significant AI platforms to: label synthetic/deepfake output, test for bias before deployment, disclose limitations. Non-binding — presented as best practice.',
  },
  'Clinical Establishments Act 2010': {
    law: 'Clinical Establishments (Registration and Regulation) Act, 2010',
    short_name: 'CEA 2010',
    year: 2010,
    jurisdiction: 'India',
    enforcement: 'enacted',
    sector: 'virtual-health-assistant',
    description: 'Adopted by most states. Only registered medical practitioners may prescribe medication or provide clinical diagnoses. AI must refer the patient to a qualified physician.',
  },
  'NMC Act 2019 / Telemedicine 2020': {
    law: 'National Medical Commission Act 2019 + Telemedicine Practice Guidelines 2020',
    short_name: 'NMC + Telemed',
    year: 2020,
    jurisdiction: 'India',
    enforcement: 'enacted',
    sector: 'virtual-health-assistant',
    description: 'Only Registered Medical Practitioners (RMPs) can practice medicine. AI tools may assist but cannot autonomously prescribe; telemedicine requires RMP oversight.',
  },
  'Advocates Act 1961': {
    law: 'Advocates Act, 1961 + Bar Council of India Rules',
    short_name: 'Advocates Act',
    year: 1961,
    jurisdiction: 'India',
    enforcement: 'enacted',
    sector: 'legal-research',
    description: 'Only enrolled advocates may practice law. AI tools producing legal content must clearly disclaim that the output is not legal advice and recommend consultation with a qualified advocate.',
  },
  'Indian Contract Act 1872': {
    law: 'Indian Contract Act, 1872',
    short_name: 'Contract Act',
    year: 1872,
    jurisdiction: 'India',
    enforcement: 'enacted',
    sector: 'contract-analysis',
    description: 'Contracts require free consent, lawful consideration, and lawful object. AI-assisted contract analysis should flag unconscionable clauses, coercion, and mistake of fact or law.',
  },
  'Official Secrets Act 1923': {
    law: 'Official Secrets Act, 1923',
    short_name: 'OSA',
    year: 1923,
    jurisdiction: 'India',
    enforcement: 'enacted',
    sector: 'autonomous-coordination',
    description: 'Criminalises disclosure of classified/protected official information. AI assistants interacting with defence or intelligence data must refuse to disclose classified categories.',
  },
}

/**
 * Look up a law's metadata. Returns undefined if not catalogued —
 * UI should render a generic "ENACTED" chip based on the citation's own field.
 */
export function getLawMeta(lawName: string): LawMetadata | undefined {
  return LAW_METADATA[lawName]
}

/**
 * Human-friendly enforcement label + colour hint for UI.
 */
export function enforcementLabel(e: 'enacted' | 'advisory' | 'guideline'): { label: string; tone: 'green' | 'amber' | 'blue' } {
  switch (e) {
    case 'enacted': return { label: 'ENACTED', tone: 'green' }
    case 'guideline': return { label: 'GUIDELINE', tone: 'blue' }
    case 'advisory': return { label: 'ADVISORY', tone: 'amber' }
  }
}
