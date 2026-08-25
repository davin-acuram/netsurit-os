import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SearchConsolePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Search Console</h1>
        <p className="text-muted-foreground text-sm">GSC detail.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Scaffold placeholder</CardTitle>
          <CardDescription>
            Search Console query and page performance land here once the
            data layer is wired up.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
