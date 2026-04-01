import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, AlertTriangle, XCircle, CheckCircle } from "lucide-react";

const StatsOverview = ({ refreshKey }: { refreshKey: number }) => {
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    flagged: 0,
    blocked: 0,
    avgRisk: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase.from("transactions").select("status, risk_score");
      if (!data) return;

      setStats({
        total: data.length,
        approved: data.filter((t) => t.status === "approved").length,
        flagged: data.filter((t) => t.status === "flagged").length,
        blocked: data.filter((t) => t.status === "blocked").length,
        avgRisk: data.length > 0
          ? data.reduce((sum, t) => sum + Number(t.risk_score), 0) / data.length
          : 0,
      });
    };
    fetchStats();
  }, [refreshKey]);

  const cards = [
    { label: "Total", value: stats.total, icon: Shield, className: "text-primary" },
    { label: "Approved", value: stats.approved, icon: CheckCircle, className: "text-risk-low" },
    { label: "Flagged", value: stats.flagged, icon: AlertTriangle, className: "text-risk-high" },
    { label: "Blocked", value: stats.blocked, icon: XCircle, className: "text-risk-critical" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ label, value, icon: Icon, className }) => (
        <Card key={label} className="border-border/50 bg-card">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${className}`} />
              <span className="text-xs text-muted-foreground font-mono">{label}</span>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsOverview;
