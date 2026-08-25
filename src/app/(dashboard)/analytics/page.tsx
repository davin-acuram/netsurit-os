import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground text-sm">GA4 detail.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Scaffold placeholder</CardTitle>
          <CardDescription>
            GA4 traffic breakdowns land here once the data layer is wired
            up.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
