import { Card, CardContent } from '@/components/ui/card'

export default function TimelinePage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Timeline</h1>
          <p className="text-xl text-muted-foreground">Coming Soon</p>
          <p className="text-sm text-muted-foreground mt-4">
            This feature is currently under development and will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

