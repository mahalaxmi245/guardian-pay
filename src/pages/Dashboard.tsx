import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Shield, LogOut } from "lucide-react";
import TransactionSimulator from "@/components/TransactionSimulator";
import TransactionHistory from "@/components/TransactionHistory";
import AlertsPanel from "@/components/AlertsPanel";
import StatsOverview from "@/components/StatsOverview";
import { motion } from "framer-motion";

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-primary font-mono animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold font-mono text-foreground">FraudShield</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono hidden sm:block">
              {user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <StatsOverview refreshKey={refreshKey} />
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <TransactionSimulator onTransactionCreated={() => setRefreshKey((k) => k + 1)} />
            <AlertsPanel refreshKey={refreshKey} />
          </div>
          <div className="lg:col-span-2">
            <TransactionHistory refreshKey={refreshKey} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
