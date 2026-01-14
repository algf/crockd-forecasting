import { Header } from "@/components/layout";
import { PageContainer, PageContent } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { TopVariances } from "@/components/dashboard/top-variances";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { CommentSection } from "@/components/comments";

export default function DashboardPage() {
  return (
    <PageContainer>
      <Header
        title="Dashboard"
        description="Overview of your financial position and forecasts"
      />
      <PageContent>
        <div className="space-y-6">
          {/* Key Metrics */}
          <DashboardStats />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow (13-Week)</CardTitle>
              </CardHeader>
              <CardContent>
                <CashFlowChart />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Variances This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <TopVariances />
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <QuickActions />
            </CardContent>
          </Card>

          {/* Community Comments */}
          <CommentSection />
        </div>
      </PageContent>
    </PageContainer>
  );
}
