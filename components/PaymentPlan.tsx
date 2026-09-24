"use client";

import { Fragment, useId, useState } from "react";
import type { LaunchPayment } from "@/data/curated-launches";
import { validLaunchPaymentSchedule } from "@/lib/launch-payment-schedule";

/**
 * Payment plan as interactive circles.
 *
 * The registry gives the real percentage split (e.g. 40/60) and a handover
 * quarter, but no installment dates. So the top-level circles carry the real
 * figures and honest stage labels; clicking a construction stage expands it into
 * smaller circles showing the typical quarterly UAE cadence — clearly marked
 * indicative, because the developer's sale agreement defines the exact schedule.
 *
 * The button keeps the exact class "payment-milestone" (state lives on data-
 * attributes) and the connectors stay `span.payment-divider`, matching the
 * markup the rendered-html test guards.
 */

function stageLabel(index: number, total: number) {
  if (total === 2) return index === 0 ? "During construction" : "On handover";
  if (index === 0) return "On booking";
  if (index === total - 1) return "On handover";
  return total === 3 ? "During construction" : `Construction stage ${index}`;
}

/** Split a construction percentage into ~10% quarterly installments so the
 *  breakdown reflects the common cadence without inventing exact amounts. */
function installments(percentage: number) {
  const count = Math.max(1, Math.min(6, Math.round(percentage / 10)));
  const base = Math.floor((percentage / count) * 10) / 10;
  const parts = Array.from({ length: count }, () => base);
  const remainder = Math.round((percentage - base * count) * 10) / 10;
  parts[parts.length - 1] = Math.round((parts[parts.length - 1] + remainder) * 10) / 10;
  return parts;
}

function isConstruction(index: number, total: number) {
  if (total === 2) return index === 0;
  return index > 0 && index < total - 1;
}

export function PaymentPlan({ milestones, handover, schedule }: { milestones: number[]; handover?: string; schedule?: LaunchPayment[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const baseId = useId();
  const suppliedSchedule = validLaunchPaymentSchedule(schedule);

  if (suppliedSchedule.length) {
    return <div className="payment-plan-wrap payment-plan-exact">
      <table className="payment-schedule-table">
        <caption>Published payment schedule</caption>
        <thead><tr><th scope="col">Stage</th><th scope="col">Due</th><th scope="col">Payment</th></tr></thead>
        <tbody>{suppliedSchedule.map((row, index) => <tr key={`${row.stage}-${index}`}><th scope="row">{row.stage}</th><td>{row.due}</td><td>{row.percentage}%</td></tr>)}</tbody>
        <tfoot><tr><th scope="row" colSpan={2}>Total purchase price</th><td>100%</td></tr></tfoot>
      </table>
      <p className="payment-note">Dates and percentages follow the supplied release schedule. Confirm the selected unit&rsquo;s reservation form and sale and purchase agreement before payment.</p>
    </div>;
  }

  if (!milestones.length) {
    return <div className="payment-visual"><div className="payment-private"><strong>Private</strong><span>Ask for the current payment schedule</span></div></div>;
  }

  const handoverKnown = handover && !/^(to be confirmed|tbc|n\/a|-)$/i.test(handover.trim());

  return <div className="payment-plan-wrap">
    <div className={`payment-visual${milestones.length > 2 ? " many" : ""}`} role="list" aria-label="Payment plan milestones">
      {milestones.map((percentage, index) => {
        const expandable = isConstruction(index, milestones.length) && percentage >= 15;
        const isOpen = open === index;
        return <Fragment key={`${percentage}-${index}`}>
          <div className="payment-node" role="listitem" data-open={expandable && isOpen ? "" : undefined}>
            <button
              type="button"
              className="payment-milestone"
              data-expandable={expandable ? "" : undefined}
              data-open={expandable && isOpen ? "" : undefined}
              aria-expanded={expandable ? isOpen : undefined}
              aria-controls={expandable ? `${baseId}-${index}` : undefined}
              onClick={expandable ? () => setOpen(isOpen ? null : index) : undefined}
              disabled={!expandable}
            >
              <strong>{percentage}%</strong>
              <span>{stageLabel(index, milestones.length)}</span>
              {expandable && <em className="payment-more" aria-hidden="true">{isOpen ? "Close" : "Break down"}</em>}
            </button>
            {expandable && isOpen && <div className="payment-installments" id={`${baseId}-${index}`}>
              {installments(percentage).map((part, i, arr) => <div className="payment-subnode" key={i}>
                <div className="payment-subcircle"><strong>{part}%</strong></div>
                <span>Installment {i + 1}{i < arr.length - 1 ? " · ~3 months apart" : ""}</span>
              </div>)}
            </div>}
          </div>
          {index < milestones.length - 1 && <span className="payment-divider" aria-hidden="true" />}
        </Fragment>;
      })}
    </div>
    <p className="payment-note">
      {handoverKnown ? <>Handover anticipated {handover}. </> : null}
      Percentages are the developer&rsquo;s published split. The installment breakdown shows the typical quarterly UAE cadence for illustration — the sale and purchase agreement defines the exact dates and amounts.
    </p>
  </div>;
}
