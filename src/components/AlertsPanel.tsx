import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface Alert {
  id: string;
  alert_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const AlertsPanel = ({ refreshKey }: { refreshKey: number }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      const { data } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setAlerts(data);
    };
    fetchAlerts();
  }, [refreshKey]);

  const markAsRead = async (id: string) => {
    await supabase.from("alerts").update({ is_read: true }).eq("id", id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="text-base font-mono flex items-center gap-2">
          <Bell className="w-4 h-4 text-destructive" />
          Alerts
          {unreadCount > 0 && (
            <span className="text-xs bg-destructive text-destructive-foreground rounded-full px-2 py-0.5">
              {unreadCount}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No alerts yet</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            <AnimatePresence>
              {alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded-lg border text-sm ${
                    alert.is_read
                      ? "border-border/30 bg-muted/20 opacity-60"
                      : alert.alert_type === "critical"
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-risk-high/30 bg-risk-high/5"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-foreground/90 text-xs leading-relaxed">{alert.message}</p>
                    {!alert.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => markAsRead(alert.id)}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {format(new Date(alert.created_at), "MMM dd, HH:mm:ss")}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsPanel;
