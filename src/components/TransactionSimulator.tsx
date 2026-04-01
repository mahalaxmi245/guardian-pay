import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RiskBadge from "./RiskBadge";

interface AnalysisResult {
  transaction: any;
  risk_analysis: { risk_score: number; reasoning: string; flags: string[] };
  status: string;
}

const TransactionSimulator = ({ onTransactionCreated }: { onTransactionCreated: () => void }) => {
  const [amount, setAmount] = useState("");
  const [senderUpi, setSenderUpi] = useState("");
  const [receiverUpi, setReceiverUpi] = useState("");
  const [deviceType, setDeviceType] = useState("mobile");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in first");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-transaction`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            amount: parseFloat(amount),
            sender_upi: senderUpi,
            receiver_upi: receiverUpi,
            device_type: deviceType,
            location,
            transaction_time: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to analyze transaction");
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
      onTransactionCreated();

      if (data.status === "blocked") {
        toast.error("🚨 Transaction BLOCKED — High fraud risk detected!");
      } else if (data.status === "flagged") {
        toast.warning("⚠️ Transaction FLAGGED — Suspicious activity detected");
      } else {
        toast.success("✅ Transaction APPROVED — Low risk");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-base font-mono flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Simulate Transaction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Amount (₹)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-muted/50 font-mono"
                required
                min="1"
              />
              <Select value={deviceType} onValueChange={setDeviceType}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="tablet">Tablet</SelectItem>
                  <SelectItem value="unknown">Unknown Device</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Sender UPI (e.g. user@paytm)"
              value={senderUpi}
              onChange={(e) => setSenderUpi(e.target.value)}
              className="bg-muted/50 font-mono text-sm"
              required
            />
            <Input
              placeholder="Receiver UPI (e.g. shop@upi)"
              value={receiverUpi}
              onChange={(e) => setReceiverUpi(e.target.value)}
              className="bg-muted/50 font-mono text-sm"
              required
            />
            <Input
              placeholder="Location (e.g. Mumbai, Delhi)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-muted/50"
              required
            />
            <Button type="submit" variant="glow" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze & Submit"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className={`border-border/50 ${
              result.status === "blocked" ? "border-risk-critical/50 bg-risk-critical/5" :
              result.status === "flagged" ? "border-risk-high/50 bg-risk-high/5" :
              "border-risk-low/50 bg-risk-low/5"
            }`}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-muted-foreground">Risk Score</span>
                  <RiskBadge score={result.risk_analysis.risk_score} />
                </div>
                <div className="text-sm text-muted-foreground">
                  {result.risk_analysis.reasoning}
                </div>
                {result.risk_analysis.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {result.risk_analysis.flags.map((flag, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TransactionSimulator;
