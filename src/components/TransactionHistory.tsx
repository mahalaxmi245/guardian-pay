import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, ArrowUpDown } from "lucide-react";
import RiskBadge from "./RiskBadge";
import { format } from "date-fns";

interface Transaction {
  id: string;
  amount: number;
  sender_upi: string;
  receiver_upi: string;
  device_type: string;
  location: string;
  risk_score: number;
  status: string;
  ai_reasoning: string | null;
  created_at: string;
}

const TransactionHistory = ({ refreshKey }: { refreshKey: number }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) setTransactions(data);
      setLoading(false);
    };
    fetchTransactions();
  }, [refreshKey]);

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: "bg-risk-low risk-low",
      blocked: "bg-risk-critical risk-critical",
      flagged: "bg-risk-high risk-high",
      pending: "bg-muted text-muted-foreground",
    };
    return (
      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full uppercase ${styles[status] || styles.pending}`}>
        {status}
      </span>
    );
  };

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="text-base font-mono flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          Transaction History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            No transactions yet. Simulate one above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="font-mono text-xs">Time</TableHead>
                  <TableHead className="font-mono text-xs">Amount</TableHead>
                  <TableHead className="font-mono text-xs">Sender</TableHead>
                  <TableHead className="font-mono text-xs">Receiver</TableHead>
                  <TableHead className="font-mono text-xs">Risk</TableHead>
                  <TableHead className="font-mono text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="border-border/30 hover:bg-muted/30">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {format(new Date(tx.created_at), "MMM dd, HH:mm")}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-semibold">
                      ₹{tx.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{tx.sender_upi}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{tx.receiver_upi}</TableCell>
                    <TableCell><RiskBadge score={tx.risk_score} /></TableCell>
                    <TableCell>{statusBadge(tx.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionHistory;
