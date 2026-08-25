import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-muted-foreground text-sm">
          Organic traffic and search performance at a glance.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Scaffold placeholder</CardTitle>
          <CardDescription>
            GA4 and Search Console summary cards land here once the data
            layer is wired up.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
