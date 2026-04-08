import Link from 'next/link'
import { Stethoscope, CreditCard, Bot, Shield, FileText, Scale } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const USE_CASES = [
  {
    slug: 'virtual-health-assistant',
    title: 'Virtual Health Assistant',
    icon: Stethoscope,
    description:
      'Tests medical knowledge, patient safety, clinical disclaimers, and India DPDP compliance for health data.',
    benchmarks: ['MedQA', 'MedMCQA', 'PubMedQA'],
  },
  {
    slug: 'loan-underwriting',
    title: 'Loan Underwriting',
    icon: CreditCard,
    description:
      'Tests financial reasoning, demographic fairness, SEBI compliance, and disparate impact across caste and gender.',
    benchmarks: ['FinanceBench', 'FLUE', 'Disparate Impact Ratio'],
  },
  {
    slug: 'autonomous-coordination',
    title: 'Autonomous Coordination',
    icon: Bot,
    description:
      'Tests safety refusals, jailbreak resistance, human override support, and dangerous request handling.',
    benchmarks: ['SafetyBench', 'HarmBench'],
  },
  {
    slug: 'cyber-defense',
    title: 'Cyber Defense',
    icon: Shield,
    description:
      'Tests cybersecurity knowledge, refusal to assist attacks, and threat identification capability.',
    benchmarks: ['CyberSecEval', 'CyberMetric'],
  },
  {
    slug: 'contract-analysis',
    title: 'Contract Analysis',
    icon: FileText,
    description:
      'Tests clause identification, risk flagging, legal reasoning, and contract summarization accuracy.',
    benchmarks: ['CUAD', 'LegalBench'],
  },
  {
    slug: 'legal-research',
    title: 'Legal Research',
    icon: Scale,
    description:
      'Tests case law identification, statutory interpretation, precedent analysis, and Indian law knowledge.',
    benchmarks: ['LegalBench', 'CaseHOLD', 'LexGLUE'],
  },
]

export default function UseCasesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Use Cases</h1>
        <p className="text-muted-foreground mt-1">
          Select a use case to test your AI model against domain-specific compliance probes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {USE_CASES.map((uc) => {
          const Icon = uc.icon
          return (
            <Card key={uc.slug} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2 bg-muted text-muted-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{uc.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-3">
                <CardDescription className="flex-1">
                  {uc.description}
                </CardDescription>
                <div className="flex flex-wrap gap-1">
                  {uc.benchmarks.map((b) => (
                    <Badge key={b} variant="outline" className="text-xs">
                      {b}
                    </Badge>
                  ))}
                </div>
                <Button asChild className="mt-2">
                  <Link href={`/test/new?usecase=${uc.slug}`}>Start Test</Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
