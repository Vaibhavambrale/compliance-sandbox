import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const MODELS = [
  {
    name: 'Gemini 1.5 Flash',
    provider: 'Google AI Studio',
    freeLimit: '15 requests/minute',
    bestFor: 'Fast testing, general compliance',
    getKey: 'aistudio.google.com',
  },
  {
    name: 'Gemini 1.5 Pro',
    provider: 'Google AI Studio',
    freeLimit: '2 requests/minute',
    bestFor: 'Thorough analysis',
    getKey: 'aistudio.google.com',
  },
  {
    name: 'Llama 3 70B via Groq',
    provider: 'Groq',
    freeLimit: '30 requests/minute',
    bestFor: 'Open source testing',
    getKey: 'console.groq.com',
  },
  {
    name: 'Mixtral 8x7B via Groq',
    provider: 'Groq',
    freeLimit: '30 requests/minute',
    bestFor: 'Multilingual testing',
    getKey: 'console.groq.com',
  },
]

export default function ModelsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Models</h1>
        <p className="text-muted-foreground mt-1">
          Free-tier models available for compliance testing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MODELS.map((model) => (
          <Card key={model.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{model.name}</CardTitle>
                <Badge className="bg-green-100 text-green-700" variant="secondary">
                  Free
                </Badge>
              </div>
              <CardDescription>{model.provider}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Free Limit</p>
                  <p className="font-medium">{model.freeLimit}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Best For</p>
                  <p className="font-medium">{model.bestFor}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Get key at {model.getKey}
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings">Configure Key</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
