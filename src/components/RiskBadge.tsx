const RiskBadge = ({ score }: { score: number }) => {
  const getRiskLevel = () => {
    if (score >= 0.7) return { label: "CRITICAL", className: "risk-critical bg-risk-critical" };
    if (score >= 0.4) return { label: "HIGH", className: "risk-high bg-risk-high" };
    if (score >= 0.2) return { label: "MEDIUM", className: "risk-medium bg-risk-medium" };
    return { label: "LOW", className: "risk-low bg-risk-low" };
  };

  const { label, className } = getRiskLevel();

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${className}`}>
        {label}
      </span>
      <span className="text-sm font-mono font-bold text-foreground">
        {(score * 100).toFixed(0)}%
      </span>
    </div>
  );
};

export default RiskBadge;
