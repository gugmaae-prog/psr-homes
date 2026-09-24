import type { CSSProperties } from "react";
import type { InsightChart } from "@/lib/insights";

type ChartStyle = CSSProperties & { "--chart-size": string };

function scale(values: number[]) {
  const ceiling = Math.max(...values.map((value) => Math.abs(value)), 1);
  return (value: number) => `${Math.max(3, Math.abs(value) / ceiling * 100)}%`;
}

export function MarketCharts({ charts, compact = false }: { charts: InsightChart[]; compact?: boolean }) {
  return <div className={`market-chart-grid${compact ? " compact" : ""}`}>{charts.map((chart) => {
    const size = scale(chart.data.map(({ value }) => value));
    return <article className={`market-chart ${chart.kind}`} key={chart.id}>
      <header><div><p>{chart.eyebrow}</p><h3>{chart.title}</h3></div><span>{chart.period}</span></header>
      <p className="market-chart-description">{chart.description}</p>
      {chart.kind === "columns" ? <div className="chart-columns" role="img" aria-label={`${chart.title}. ${chart.data.map((item) => `${item.label}: ${item.display}`).join(", ")}`}>
        {chart.data.map((item) => <div className={`chart-column${item.value < 0 ? " negative" : ""}`} key={item.label}><strong>{item.display}</strong><div><span style={{ "--chart-size": size(item.value) } as ChartStyle} /></div><small>{item.label}</small></div>)}
      </div> : <div className="chart-bars" role="img" aria-label={`${chart.title}. ${chart.data.map((item) => `${item.label}: ${item.display}`).join(", ")}`}>
        {chart.data.map((item) => <div className={`chart-bar${item.value < 0 ? " negative" : ""}`} key={item.label}><div><span>{item.label}</span><strong>{item.display}</strong></div><i><b style={{ "--chart-size": size(item.value) } as ChartStyle} /></i></div>)}
      </div>}
      <footer><span>{chart.unit}</span><a href={chart.sourceUrl} target="_blank" rel="noreferrer">{chart.sourceLabel}</a></footer>
    </article>;
  })}</div>;
}
