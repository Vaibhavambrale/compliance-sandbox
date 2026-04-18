import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export default function FrameworksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Regulatory Frameworks</h1>
        <p className="text-muted-foreground mt-1">
          Compliance frameworks we test against, with detailed requirement breakdowns.
        </p>
      </div>

      <Accordion type="multiple" className="space-y-4">
        {/* NIST AI RMF */}
        <AccordionItem value="nist" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <span className="font-semibold">NIST AI RMF</span>
              <Badge variant="secondary">Established</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-2">Govern</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>AI risk management policies and accountability structures</li>
                    <li>Organizational governance and oversight mechanisms</li>
                    <li>Third-party AI risk assessment and management</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-2">Map</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Context and use case identification</li>
                    <li>Stakeholder impact and risk categorization</li>
                    <li>Interdependency and deployment context mapping</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-2">Measure</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Bias and fairness metric evaluation</li>
                    <li>Accuracy, robustness, and reliability testing</li>
                    <li>Transparency and explainability assessment</li>
                    <li>Privacy and security compliance measurement</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-2">Manage</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Risk treatment and mitigation planning</li>
                    <li>Continuous monitoring and incident response</li>
                    <li>Model update and deprecation protocols</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* EU AI Act */}
        <AccordionItem value="eu-ai-act" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <span className="font-semibold">EU AI Act 2024</span>
              <Badge variant="secondary">Established</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium">Risk Tier</th>
                      <th className="text-left py-2 pr-4 font-medium">Examples</th>
                      <th className="text-left py-2 font-medium">Requirements</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b">
                      <td className="py-2 pr-4"><Badge variant="destructive">Unacceptable</Badge></td>
                      <td className="py-2 pr-4">Social scoring, real-time biometric surveillance</td>
                      <td className="py-2">Prohibited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4"><Badge className="bg-orange-500/10 text-orange-400" variant="secondary">High</Badge></td>
                      <td className="py-2 pr-4">Healthcare, credit scoring, employment</td>
                      <td className="py-2">Conformity assessment, human oversight, transparency</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4"><Badge className="bg-amber-500/10 text-amber-400" variant="secondary">Limited</Badge></td>
                      <td className="py-2 pr-4">Chatbots, emotion detection</td>
                      <td className="py-2">Transparency obligations</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4"><Badge variant="secondary">Minimal</Badge></td>
                      <td className="py-2 pr-4">Spam filters, game AI</td>
                      <td className="py-2">Voluntary codes of conduct</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-2">What We Test for High-Risk Deployments</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Data governance and quality management</li>
                    <li>Technical documentation and record-keeping</li>
                    <li>Transparency and provision of information to deployers</li>
                    <li>Human oversight and intervention capability</li>
                    <li>Accuracy, robustness, and cybersecurity</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* India DPDP Act */}
        <AccordionItem value="india-dpdp" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <span className="font-semibold">India DPDP Act 2023</span>
              <Badge variant="secondary">Established (Enforceable Law)</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-2">Key Requirements We Test</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>PII handling: proper treatment of Aadhaar, PAN, health records</li>
                    <li>Sensitive personal data: biometric, health, financial, caste data protection</li>
                    <li>Data processing of minors: age verification and guardian consent</li>
                    <li>Data minimization: collecting only necessary personal data</li>
                    <li>Purpose limitation: using data only for stated purposes</li>
                    <li>Data principal rights: right to access, correction, erasure</li>
                    <li>Cross-border data transfer restrictions</li>
                    <li>Data breach notification requirements</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* MEITY AI Advisory */}
        <AccordionItem value="meity" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <span className="font-semibold">MEITY AI Advisory March 2024</span>
              <Badge className="bg-amber-500/10 text-amber-400" variant="secondary">Emerging (Advisory Only)</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                <p className="text-sm text-amber-300">
                  This is advisory guidance from the Ministry of Electronics and Information Technology, not enforceable law yet.
                  Compliance is recommended but not legally mandated.
                </p>
              </div>
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-2">What We Test</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>AI disclosure: model clearly identifies itself as AI, not human</li>
                    <li>Sovereignty content: respectful handling of India-specific topics</li>
                    <li>Election misinformation: refusal to generate misleading electoral content</li>
                    <li>Labeling of AI-generated content</li>
                    <li>Platform accountability for AI outputs</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
