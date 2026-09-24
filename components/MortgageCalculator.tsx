"use client";

import "./mortgage-display-currency.css";
import type { CSSProperties } from "react";
import { useId, useMemo, useState } from "react";
import {
  baselineConfiguration,
  configurationPlanningPrice,
  sortConfigurationOptions,
  usesLandedArea,
} from "@/lib/unit-pricing";
import {
  normalizeLiquiditySchedule,
  rebalanceLiquiditySchedule,
  validLiquiditySourceSchedule,
  type LiquiditySchedule,
} from "@/lib/off-plan-liquidity";
import {
  CARD_CURRENCIES,
  CARD_CURRENCY_RATE_DATE,
  CARD_CURRENCY_RATE_SOURCE,
  formatDisplayCurrencyAmount,
  type CardCurrency,
} from "@/lib/card-currency";
import { useDisplayCurrency } from "@/components/useDisplayCurrency";

type BuyerProfile = "uae-national" | "expatriate";
type PurchasePurpose = "first-home" | "subsequent";
type PropertyStatus = "ready" | "off-plan";
type RateModel = "fixed" | "variable";

type MortgageCalculatorProps = {
  initialPrice?: number;
  context?: string;
  emirate?: string;
  propertyStatus?: PropertyStatus;
  unitOptions?: string[];
  residenceTypes?: string[];
  unitPrices?: Record<string, number>;
  paymentMilestones?: number[];
  handover?: string;
};

const CBUAE_MORTGAGE_RULES = "https://rulebook.centralbank.ae/en/rulebook/regulations-regarding-mortgage-loans";
const DLD_MORTGAGE_FEES = "https://dubailand.gov.ae/en/eservices/request-for-mortgage-registration/";
const UAE_RATE_REFERENCE = "https://www.hsbc.ae/mortgages/rates/";
const DLD_OFF_PLAN_REGISTRATION = "https://dubailand.gov.ae/en/news-media/dld-calls-on-developers-to-pay-property-registration-fees-within-60-days/";
const ADREC_PROJECT_DEVELOPMENT = "https://adrec.gov.ae/en/sectors/regulatory-services/project-development/developer-journey";
const RAK_SALE_REGISTRATION = "https://sanad.mun.rak.ae/docs/en/services-card-arabic-temp-28";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function maxLtv(profile: BuyerProfile, purpose: PurchasePurpose, status: PropertyStatus, price: number) {
  if (status === "off-plan") return 0.5;
  if (purpose === "subsequent") return profile === "uae-national" ? 0.65 : 0.6;
  if (profile === "uae-national") return price <= 5_000_000 ? 0.85 : 0.75;
  return price < 5_000_000 ? 0.8 : 0.7;
}

function stageLabel(index: number, total: number, handover?: string) {
  if (index === 0) return "Booking payment";
  if (index === total - 1) return handover && !/^(to be confirmed|tbc|n\/a|-)$/i.test(handover) ? `At handover · ${handover}` : "At handover";
  return "During construction";
}

function registrationAssumption(emirate = "") {
  if (/dubai/i.test(emirate)) return { rate: 4, label: "Dubai registration", href: DLD_OFF_PLAN_REGISTRATION, source: "Dubai Land Department" };
  if (/abu dhabi/i.test(emirate)) return { rate: 2, label: "Abu Dhabi off-plan registration", href: ADREC_PROJECT_DEVELOPMENT, source: "Abu Dhabi Real Estate Centre" };
  if (/ras al khaimah/i.test(emirate)) return { rate: 2, label: "RAK buyer registration share", href: RAK_SALE_REGISTRATION, source: "Ras Al Khaimah Municipality" };
  return { rate: 0, label: "Local registration", href: "", source: "Confirm with the relevant land authority" };
}

export function MortgageCalculator({
  initialPrice = 0,
  context,
  emirate,
  propertyStatus: initialStatus = "ready",
  unitOptions = [],
  residenceTypes = [],
  unitPrices = {},
  paymentMilestones = [],
  handover,
}: MortgageCalculatorProps) {
  const panelId = `mortgage-${useId().replaceAll(":", "")}`;
  const { currency, chooseCurrency } = useDisplayCurrency();
  const money = (value: number) => formatDisplayCurrencyAmount(value, currency);
  const units = sortConfigurationOptions(unitOptions);
  const publishedStartingPrice = Number.isFinite(initialPrice) && initialPrice >= 250_000
    ? Math.round(initialPrice)
    : 0;
  const startingModelPrice = publishedStartingPrice || 2_000_000;
  const landed = usesLandedArea(residenceTypes);
  const initialUnit = units[0] || "Selected residence";
  const [open, setOpen] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState(initialUnit);
  const [price, setPrice] = useState(startingModelPrice);
  const [priceInput, setPriceInput] = useState(startingModelPrice.toLocaleString("en-AE"));
  const [priceSource, setPriceSource] = useState<"starting" | "published" | "estimated" | "manual">(
    publishedStartingPrice && units.length ? "starting" : "manual",
  );
  const [profile, setProfile] = useState<BuyerProfile>("expatriate");
  const [purpose, setPurpose] = useState<PurchasePurpose>("first-home");
  const [status, setStatus] = useState<PropertyStatus>(initialStatus);
  const [deposit, setDeposit] = useState(initialStatus === "off-plan" ? 50 : 20);
  const [rateModel, setRateModel] = useState<RateModel>("fixed");
  const [rate, setRate] = useState(4.05);
  const [years, setYears] = useState(25);
  const [monthlyIncome, setMonthlyIncome] = useState(30_000);
  const [existingDebt, setExistingDebt] = useState(0);
  const publishedSchedule = validLiquiditySourceSchedule(paymentMilestones);
  const baseSchedule = initialStatus === "off-plan" ? normalizeLiquiditySchedule(paymentMilestones) : [];
  const [scheduleDraft, setScheduleDraft] = useState(() => baseSchedule.map(String));
  const schedule = scheduleDraft.map((part) => clamp(Number(part) || 0, 0, 100));
  const scheduleTotal = schedule.reduce((sum, part) => sum + part, 0);
  const scheduleIsValid = schedule.length === 3 && scheduleDraft.every((part) => part !== "") && scheduleTotal === 100;
  const scheduleEdited = scheduleDraft.join("/") !== baseSchedule.join("/");
  const registration = registrationAssumption(emirate);
  const [registrationRate, setRegistrationRate] = useState(registration.rate);
  const [agencyRate, setAgencyRate] = useState(0);
  const [adminFee, setAdminFee] = useState(0);
  const [contingencyRate, setContingencyRate] = useState(2);

  function selectProfile(value: BuyerProfile) {
    setProfile(value);
    setDeposit(Math.round((1 - maxLtv(value, purpose, status, price)) * 100));
  }

  function selectPurpose(value: PurchasePurpose) {
    setPurpose(value);
    setDeposit(Math.round((1 - maxLtv(profile, value, status, price)) * 100));
  }

  function selectStatus(value: PropertyStatus) {
    setStatus(value);
    setDeposit(Math.round((1 - maxLtv(profile, purpose, value, price)) * 100));
  }

  function selectRateModel(value: RateModel) {
    setRateModel(value);
    setRate(value === "fixed" ? 4.05 : 4.69);
  }

  function selectUnit(value: string) {
    if (value === selectedUnit) return;
    setSelectedUnit(value);
    const publishedUnitPrice = unitPrices[value];
    if (Number.isFinite(publishedUnitPrice) && publishedUnitPrice >= 250_000) {
      setPrice(publishedUnitPrice);
      setPriceInput(publishedUnitPrice.toLocaleString("en-AE"));
      setPriceSource("published");
      setDeposit(Math.round((1 - maxLtv(profile, purpose, status, publishedUnitPrice)) * 100));
      return;
    }
    if (!publishedStartingPrice) {
      setPriceSource("manual");
      return;
    }
    const nextPrice = configurationPlanningPrice(publishedStartingPrice, units, value, landed);
    setPrice(nextPrice);
    setPriceInput(nextPrice.toLocaleString("en-AE"));
    setPriceSource(value === baselineConfiguration(units) ? "starting" : "estimated");
    setDeposit(Math.round((1 - maxLtv(profile, purpose, status, nextPrice)) * 100));
  }

  function editPrice(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 9);
    const nextPrice = Math.min(Number(digits) || 0, 100_000_000);
    setPriceInput(digits);
    setPrice(nextPrice);
    setPriceSource("manual");
    if (nextPrice > 0) {
      setDeposit(Math.round((1 - maxLtv(profile, purpose, status, nextPrice)) * 100));
    }
  }

  function commitPrice() {
    const nextPrice = clamp(Number(priceInput.replace(/\D/g, "")) || 0, 250_000, 100_000_000);
    setPrice(nextPrice);
    setPriceInput(nextPrice.toLocaleString("en-AE"));
    setDeposit(Math.round((1 - maxLtv(profile, purpose, status, nextPrice)) * 100));
  }

  function editSchedule(index: number, value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 3);
    setScheduleDraft((current) => {
      if (!digits) return current.map((part, partIndex) => partIndex === index ? "" : part);
      const currentSchedule: LiquiditySchedule = [
        clamp(Number(current[0]) || 0, 0, 100),
        clamp(Number(current[1]) || 0, 0, 100),
        clamp(Number(current[2]) || 0, 0, 100),
      ];
      return rebalanceLiquiditySchedule(currentSchedule, index, Number(digits)).map(String);
    });
  }

  function resetSchedule() {
    setScheduleDraft(baseSchedule.map(String));
  }

  const priceSourceNote = priceSource === "estimated"
    ? "Indicative configuration estimate derived from this project’s advertised starting price and typical UAE size bands. Replace it with the live unit price."
    : priceSource === "published"
      ? "Published starting price for this residence configuration. Confirm the selected unit, floor and live availability before relying on it."
    : priceSource === "starting"
      ? "Advertised project starting price for the lowest available configuration. Confirm current inventory before relying on it."
      : "Manually entered planning value. Confirm it against the current unit statement or availability sheet.";

  const result = useMemo(() => {
    const regulatoryLtv = maxLtv(profile, purpose, status, price);
    const minimumDeposit = Math.round((1 - regulatoryLtv) * 100);
    const depositAmount = price * (deposit / 100);
    const loan = Math.max(0, price - depositAmount);
    const months = years * 12;
    const monthlyRate = rate / 100 / 12;
    const monthly = monthlyRate > 0 ? loan * (monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1) : loan / months;
    const totalRepayable = monthly * months;
    const totalInterest = Math.max(0, totalRepayable - loan);
    const interestShare = totalRepayable > 0 ? totalInterest / totalRepayable : 0;
    const transferFee = price * 0.04;
    const mortgageServiceFees = status === "off-plan" ? 5_520 : 4_470;
    const mortgageRegistration = loan * 0.0025 + mortgageServiceFees;
    const bankArrangement = Math.max(loan * 0.0105, 5_250);
    const valuationFee = 2_625;
    const conservativeCash = depositAmount + transferFee + mortgageRegistration + bankArrangement + valuationFee;
    const incomeMultiple = profile === "uae-national" ? 8 : 7;
    const incomeFinanceCeiling = monthlyIncome * 12 * incomeMultiple;
    const regulatoryFinanceCeiling = Math.min(price * regulatoryLtv, incomeFinanceCeiling);
    const debtBurden = monthlyIncome > 0 ? (monthly + existingDebt) / monthlyIncome : 1;
    return {
      regulatoryLtv,
      minimumDeposit,
      depositAmount,
      loan,
      monthly,
      totalRepayable,
      totalInterest,
      interestShare,
      transferFee,
      mortgageRegistration,
      bankArrangement,
      valuationFee,
      conservativeCash,
      regulatoryFinanceCeiling,
      debtBurden,
      belowMinimumDeposit: deposit < minimumDeposit,
      exceedsFinanceCeiling: loan > regulatoryFinanceCeiling + 1,
      exceedsDebtBurden: debtBurden > 0.5,
    };
  }, [deposit, existingDebt, monthlyIncome, price, profile, purpose, rate, status, years]);

  const ringStyle = { "--interest-share": `${Math.round(result.interestShare * 360)}deg` } as CSSProperties;

  const liquidity = useMemo(() => {
    const instalments = schedule.map((percentage) => price * percentage / 100);
    const registrationFee = price * registrationRate / 100;
    const agencyFee = price * agencyRate / 100;
    const contingency = price * contingencyRate / 100;
    const transactionFees = registrationFee + agencyFee + adminFee;
    const booking = instalments[0] || 0;
    const handoverAmount = instalments.at(-1) || 0;
    const construction = instalments.slice(1, -1).reduce((sum, amount) => sum + amount, 0);
    const beforeHandover = booking + construction + transactionFees;
    const plannedLiquidity = instalments.reduce((sum, amount) => sum + amount, 0) + transactionFees + contingency;
    return {
      instalments,
      registrationFee,
      agencyFee,
      contingency,
      transactionFees,
      booking,
      construction,
      handoverAmount,
      beforeHandover,
      plannedLiquidity,
      plannedPercentage: price > 0 ? plannedLiquidity / price * 100 : 0,
    };
  }, [adminFee, agencyRate, contingencyRate, price, registrationRate, schedule]);

  const currencyControl = <div className="mortgage-display-currency">
    <label><span>Display results in</span><select aria-label="Display calculator results in" value={currency} onChange={(event) => chooseCurrency(event.target.value as CardCurrency)}>{CARD_CURRENCIES.map((code) => <option value={code} key={code}>{code}</option>)}</select></label>
    <p>Inputs and calculations remain in AED. Foreign values are indicative, using <a href={CARD_CURRENCY_RATE_SOURCE} target="_blank" rel="noreferrer">CBUAE reference rates dated {CARD_CURRENCY_RATE_DATE}</a>.</p>
  </div>;

  if (initialStatus === "off-plan") return <section className="mortgage-tool liquidity-tool" data-open={open ? "" : undefined}>
    <header className="mortgage-tool-bar">
      <div className="mortgage-tool-heading"><span>Off-plan liquidity model</span><strong>{selectedUnit}</strong><small>{money(price)} purchase price</small></div>
      <div className="mortgage-tool-preview"><span>Cash before handover</span><strong>{money(liquidity.beforeHandover)}</strong></div>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls={panelId}>{open ? "Hide calculator" : "Open calculator"}</button>
    </header>
    {open && <div id={panelId} className="mortgage-calculator">
      {currencyControl}
      <div className="mortgage-controls">
        {units.length > 0 && <fieldset className="mortgage-choice"><legend>Residence configuration</legend><div>{units.map((unit) => <button type="button" key={unit} data-active={unit === selectedUnit ? "" : undefined} onClick={() => selectUnit(unit)}>{unit}</button>)}</div><small>{Object.keys(unitPrices).length ? "Published configuration prices are used where available. Confirm the selected unit and live statement before relying on the result." : "Configuration changes use a planning estimate derived from the advertised starting price. Replace it with the selected unit price."}</small></fieldset>}

        <div className="mortgage-control-group">
          <div className="mortgage-group-heading"><span>Property value</span><small>Prefilled from the project and fully editable</small></div>
          <label className="mortgage-number-field"><span>Editable unit price</span><div className="mortgage-input-frame"><b>AED</b><input aria-label="Current unit price in AED" type="text" inputMode="numeric" autoComplete="off" value={priceInput} aria-invalid={price > 0 && price < 250_000 ? true : undefined} onFocus={(event) => event.currentTarget.select()} onChange={(event) => editPrice(event.target.value)} onBlur={commitPrice} /></div></label>
          <p className="mortgage-price-source" data-source={priceSource} aria-live="polite">{priceSourceNote}</p>
        </div>

        <div className="mortgage-control-group liquidity-fees">
          <div className="mortgage-group-heading"><span>Fees and reserve</span><small>Every assumption is editable</small></div>
          <div className="mortgage-number-grid liquidity-fee-grid">
            <label className="mortgage-number-field"><span>{registration.label}</span><div className="mortgage-input-frame liquidity-percent-input"><input aria-label="Registration fee percentage" type="number" inputMode="decimal" min="0" max="10" step="0.1" value={registrationRate} onChange={(event) => setRegistrationRate(clamp(Number(event.target.value) || 0, 0, 10))} /><b>%</b></div><small>{money(liquidity.registrationFee)}</small></label>
            <label className="mortgage-number-field"><span>Buyer agency fee</span><div className="mortgage-input-frame liquidity-percent-input"><input aria-label="Buyer agency fee percentage" type="number" inputMode="decimal" min="0" max="10" step="0.1" value={agencyRate} onChange={(event) => setAgencyRate(clamp(Number(event.target.value) || 0, 0, 10))} /><b>%</b></div><small>{money(liquidity.agencyFee)}</small></label>
            <label className="mortgage-number-field"><span>Admin and service fees</span><div className="mortgage-input-frame"><b>AED</b><input aria-label="Admin and service fees in AED" type="text" inputMode="numeric" value={adminFee.toLocaleString("en-AE")} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setAdminFee(clamp(Number(event.target.value.replace(/\D/g, "")) || 0, 0, 1_000_000))} /></div><small>{price > 0 ? `${(adminFee / price * 100).toFixed(2)}% of price` : "0% of price"}</small></label>
            <label className="mortgage-number-field"><span>Liquidity contingency</span><div className="mortgage-input-frame liquidity-percent-input"><input aria-label="Liquidity contingency percentage" type="number" inputMode="decimal" min="0" max="20" step="0.5" value={contingencyRate} onChange={(event) => setContingencyRate(clamp(Number(event.target.value) || 0, 0, 20))} /><b>%</b></div><small>{money(liquidity.contingency)}</small></label>
          </div>
        </div>
      </div>

      <aside className="mortgage-results liquidity-results" aria-live="polite">
        <div className="mortgage-result-lead"><p>{context || "UAE off-plan liquidity model"}</p><strong>{money(liquidity.plannedLiquidity)}</strong><span>{liquidity.plannedPercentage.toFixed(1)}% full planned liquidity including editable fees and reserve</span></div>
        <div className="mortgage-key-metrics">
          <div><span>Booking payment</span><strong>{money(liquidity.booking)}</strong></div>
          <div><span>During construction</span><strong>{money(liquidity.construction)}</strong></div>
          <div><span>At handover</span><strong>{money(liquidity.handoverAmount)}</strong></div>
        </div>
        <ol className="liquidity-stage-list">
          {schedule.map((percentage, index) => <li key={index}><span>{stageLabel(index, schedule.length, handover)} <small>{percentage}%</small></span><strong>{money(liquidity.instalments[index])}</strong></li>)}
        </ol>
        <dl>
          <div><dt>{registration.label} ({registrationRate}%)</dt><dd>{money(liquidity.registrationFee)}</dd></div>
          <div><dt>Buyer agency fee ({agencyRate}%)</dt><dd>{money(liquidity.agencyFee)}</dd></div>
          <div><dt>Admin and service fees ({price > 0 ? (adminFee / price * 100).toFixed(2) : "0.00"}%)</dt><dd>{money(adminFee)}</dd></div>
          <div><dt>Contingency reserve ({contingencyRate}%)</dt><dd>{money(liquidity.contingency)}</dd></div>
          <div><dt>Total planned liquidity</dt><dd>{money(liquidity.plannedLiquidity)}</dd></div>
        </dl>
        <small>Timing and liability for registration, developer, agency and service fees vary by emirate, project and contract. Confirm the SPA, reservation form and current authority schedule before committing funds.</small>
      </aside>

      <section className="unit-payment-schedule" aria-label={`${selectedUnit} liquidity schedule`}>
        <div className="unit-payment-intro">
          <div><span>Editable developer payment structure</span><h3>{selectedUnit}</h3><p>Booking is separated from the construction instalments. Amend any phase and the linked balance adjusts automatically, keeping the plan at exactly 100%.</p></div>
          <div className="payment-plan-total" data-valid={scheduleIsValid ? "" : undefined} aria-live="polite"><span>Plan total</span><strong>{scheduleTotal}%</strong><small>{scheduleIsValid ? "Automatically balanced" : "Enter a percentage"}</small></div>
        </div>
        <ol>{schedule.map((percentage, index) => <li key={index}>
          <label className="payment-percentage-field">
            <span>{stageLabel(index, schedule.length, handover)}</span>
            <span className="payment-percentage-input"><input aria-label={`${stageLabel(index, schedule.length, handover)} percentage`} type="text" inputMode="numeric" autoComplete="off" value={scheduleDraft[index]} aria-invalid={scheduleDraft[index] === "" ? true : undefined} onFocus={(event) => event.currentTarget.select()} onChange={(event) => editSchedule(index, event.target.value)} /><b>%</b></span>
          </label>
          <strong className="payment-instalment-amount">{money(price * percentage / 100)}</strong>
        </li>)}</ol>
        <div className="payment-plan-editor-note">
          <p>{publishedSchedule.length === 2 ? scheduleEdited ? "Booking has been edited within the published before-handover share. Confirm the final booking, construction and handover milestones against the reservation form and SPA." : `The published before-handover and handover split is preserved. Booking is modelled at ${baseSchedule[0]}% within the before-handover share and remains editable.` : publishedSchedule.length > 2 ? scheduleEdited ? "Planning phases edited from the published split. Confirm final milestones and dates against the reservation form and SPA." : "The published structure is consolidated into booking, during construction and handover for liquidity planning. Confirm exact milestone dates against current developer documents." : "No verified project split was published, so booking starts at 20% in this editable planning structure. Replace it with the current reservation form or SPA structure."}</p>
          {scheduleEdited && <button type="button" onClick={resetSchedule}>Reset starting structure</button>}
        </div>
      </section>
      <div className="mortgage-sources liquidity-sources">
        <span>Authority reference</span>
        {registration.href ? <a href={registration.href} target="_blank" rel="noreferrer">{registration.source}</a> : <span>{registration.source}</span>}
        <small>Displayed rates are editable planning assumptions, not a quotation or allocation of contractual liability.</small>
      </div>
    </div>}
  </section>;

  return <section className="mortgage-tool" data-open={open ? "" : undefined}>
    <header className="mortgage-tool-bar">
      <div className="mortgage-tool-heading"><span>UAE project finance model</span><strong>{selectedUnit}</strong><small>{money(price)} purchase price</small></div>
      <div className="mortgage-tool-preview"><span>Estimated monthly</span><strong>{money(result.monthly)}</strong></div>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls={panelId}>{open ? "Hide calculator" : "Open calculator"}</button>
    </header>
    {open && <div id={panelId} className="mortgage-calculator">
      {currencyControl}
      <div className="mortgage-controls">
        {units.length > 0 && <fieldset className="mortgage-choice"><legend>Residence configuration</legend><div>{units.map((unit) => <button type="button" key={unit} data-active={unit === selectedUnit ? "" : undefined} onClick={() => selectUnit(unit)}>{unit}</button>)}</div><small>{Object.keys(unitPrices).length ? "Published configuration prices are used where available; other configurations remain planning estimates. Confirm live unit inventory before relying on either." : "Selecting a configuration updates an indicative planning price using typical UAE size bands. Live inventory and unit-specific pricing must still be confirmed."}</small></fieldset>}

        <div className="mortgage-control-group">
          <div className="mortgage-group-heading"><span>Property value</span><small>Edit the price to recalculate every figure</small></div>
          <label className="mortgage-number-field"><span>Editable unit price</span><div className="mortgage-input-frame"><b>AED</b><input aria-label="Current unit price in AED" type="text" inputMode="numeric" autoComplete="off" value={priceInput} aria-invalid={price > 0 && price < 250_000 ? true : undefined} onFocus={(event) => event.currentTarget.select()} onChange={(event) => editPrice(event.target.value)} onBlur={commitPrice} /></div></label>
          <p className="mortgage-price-source" data-source={priceSource} aria-live="polite">{priceSourceNote}</p>
        </div>

        <div className="mortgage-control-group">
          <div className="mortgage-group-heading"><span>Finance profile</span><small>UAE lending limits update with these selections</small></div>
          <div className="mortgage-select-grid">
            <label className="mortgage-select-field"><span>Buyer profile</span><select value={profile} onChange={(event) => selectProfile(event.target.value as BuyerProfile)}><option value="expatriate">Expatriate</option><option value="uae-national">UAE national</option></select></label>
            <label className="mortgage-select-field"><span>Purchase purpose</span><select value={purpose} onChange={(event) => selectPurpose(event.target.value as PurchasePurpose)}><option value="first-home">First home</option><option value="subsequent">Subsequent or investment</option></select></label>
            <label className="mortgage-select-field"><span>Property status</span><select value={status} onChange={(event) => selectStatus(event.target.value as PropertyStatus)}><option value="ready">Ready property</option><option value="off-plan">Off-plan</option></select></label>
            <label className="mortgage-select-field"><span>Rate model</span><select value={rateModel} onChange={(event) => selectRateModel(event.target.value as RateModel)}><option value="fixed">Fixed illustration</option><option value="variable">3-month EIBOR-linked</option></select></label>
          </div>
        </div>

        <div className="mortgage-control-group">
          <div className="mortgage-group-heading"><span>Loan structure</span><small>Adjust the assumptions to stress-test affordability</small></div>
          <div className="mortgage-range-grid">
            <label className="mortgage-range-field"><span>Cash deposit</span><strong>{deposit}%</strong><input aria-label="Cash deposit percentage" type="range" min={10} max={80} value={deposit} onChange={(event) => setDeposit(Number(event.target.value))} /><small>{money(result.depositAmount)}</small></label>
            <label className="mortgage-range-field"><span>Annual interest rate</span><strong>{rate.toFixed(2)}%</strong><input aria-label="Annual interest rate" type="range" min={1} max={12} step={0.01} value={rate} onChange={(event) => setRate(Number(event.target.value))} /><small>{rateModel === "fixed" ? "Fixed-rate illustration" : "EIBOR-linked illustration"}</small></label>
            <label className="mortgage-range-field"><span>Mortgage term</span><strong>{years} years</strong><input aria-label="Mortgage term in years" type="range" min={5} max={25} value={years} onChange={(event) => setYears(Number(event.target.value))} /><small>{years * 12} monthly payments</small></label>
          </div>
        </div>

        <div className="mortgage-control-group">
          <div className="mortgage-group-heading"><span>Affordability</span><small>Used for the debt-burden and income-multiple checks</small></div>
          <div className="mortgage-number-grid">
            <label className="mortgage-number-field"><span>Gross monthly income</span><div className="mortgage-input-frame"><b>AED</b><input aria-label="Gross monthly income in AED" type="text" inputMode="numeric" value={monthlyIncome.toLocaleString("en-AE")} onChange={(event) => setMonthlyIncome(clamp(Number(event.target.value.replace(/\D/g, "")) || 0, 5_000, 10_000_000))} /></div></label>
            <label className="mortgage-number-field"><span>Existing monthly debt</span><div className="mortgage-input-frame"><b>AED</b><input aria-label="Existing monthly debt payments in AED" type="text" inputMode="numeric" value={existingDebt.toLocaleString("en-AE")} onChange={(event) => setExistingDebt(clamp(Number(event.target.value.replace(/\D/g, "")) || 0, 0, 10_000_000))} /></div></label>
          </div>
        </div>

        {(result.belowMinimumDeposit || result.exceedsFinanceCeiling || result.exceedsDebtBurden) && <div className="mortgage-flags" role="alert">
          {result.belowMinimumDeposit && <p>The selected deposit is below the CBUAE minimum for this profile. The regulatory starting point is {result.minimumDeposit}% cash.</p>}
          {result.exceedsFinanceCeiling && <p>The requested loan exceeds the lower of the applicable LTV ceiling and the CBUAE income-multiple ceiling.</p>}
          {result.exceedsDebtBurden && <p>Estimated total monthly debt is {Math.round(result.debtBurden * 100)}% of gross income, above the CBUAE 50% debt-burden ceiling.</p>}
        </div>}
      </div>
      <aside className="mortgage-results" aria-live="polite">
        <div className="mortgage-result-lead"><p>{context || "UAE mortgage model"}</p><strong>{money(result.monthly)}</strong><span>Estimated monthly payment</span></div>
        <div className="mortgage-key-metrics">
          <div><span>Loan amount</span><strong>{money(result.loan)}</strong></div>
          <div><span>Deposit</span><strong>{money(result.depositAmount)}</strong></div>
          <div><span>Debt burden</span><strong>{Math.round(result.debtBurden * 100)}%</strong></div>
        </div>
        <div className="mortgage-donut">
          <div className="mortgage-ring" style={ringStyle} role="img" aria-label={`${Math.round((1 - result.interestShare) * 100)}% principal and ${Math.round(result.interestShare * 100)}% interest over the modelled term`} />
          <ul>
            <li><i className="dot-principal" />Principal <b>{money(result.loan)}</b></li>
            <li><i className="dot-interest" />Modelled interest <b>{money(result.totalInterest)}</b></li>
          </ul>
        </div>
        <dl>
          <div><dt>CBUAE maximum LTV</dt><dd>{Math.round(result.regulatoryLtv * 100)}%</dd></div>
          <div><dt>Regulatory finance ceiling</dt><dd>{money(result.regulatoryFinanceCeiling)}</dd></div>
          <div><dt>Total repayable over {years} years</dt><dd>{money(result.totalRepayable)}</dd></div>
          <div><dt>DLD transfer fee assumption (4%)</dt><dd>{money(result.transferFee)}</dd></div>
          <div><dt>Mortgage registration and service fees</dt><dd>{money(result.mortgageRegistration)}</dd></div>
          <div><dt>Bank arrangement illustration</dt><dd>{money(result.bankArrangement)}</dd></div>
          <div><dt>Valuation illustration</dt><dd>{money(result.valuationFee)}</dd></div>
          <div><dt>Indicative upfront cash</dt><dd>{money(result.conservativeCash)}</dd></div>
        </dl>
        <small>The rate is editable. The fixed 4.05% and variable 4.69% starting points mirror current UAE lender illustrations; they are not offers. Final approval, valuation, insurance, fees and pricing depend on the lender and borrower.</small>
      </aside>
      {schedule.length > 0 && <section className="unit-payment-schedule" aria-label={`${selectedUnit} payment schedule`}>
        <div className="unit-payment-intro">
          <div><span>Editable developer payment schedule</span><h3>{selectedUnit}</h3><p>Edit any percentage below. Every instalment amount recalculates immediately from the current unit price; the plan must total exactly 100%.</p></div>
          <div className="payment-plan-total" data-valid={scheduleIsValid ? "" : undefined} aria-live="polite"><span>Plan total</span><strong>{scheduleTotal}%</strong><small>{scheduleIsValid ? "Ready to model" : "Adjust to 100%"}</small></div>
        </div>
        <ol>{schedule.map((percentage, index) => <li key={index}>
          <label className="payment-percentage-field">
            <span>{stageLabel(index, schedule.length, handover)}</span>
            <span className="payment-percentage-input"><input aria-label={`${stageLabel(index, schedule.length, handover)} payment percentage`} type="text" inputMode="numeric" autoComplete="off" value={scheduleDraft[index]} aria-invalid={percentage <= 0 || percentage > 100 ? true : undefined} onFocus={(event) => event.currentTarget.select()} onChange={(event) => editSchedule(index, event.target.value)} /><b>%</b></span>
          </label>
          <strong className="payment-instalment-amount">{money(price * percentage / 100)}</strong>
        </li>)}</ol>
        <div className="payment-plan-editor-note">
          <p>{scheduleEdited ? "Planning schedule edited from the published split. Confirm the final milestones and due dates against the reservation form and SPA." : "This is the published project split. Confirm the exact reservation, construction and handover dates against the current developer documents."}</p>
          {scheduleEdited && <button type="button" onClick={resetSchedule}>Reset published plan</button>}
        </div>
      </section>}
      <div className="mortgage-sources">
        <span>Primary references</span>
        <a href={CBUAE_MORTGAGE_RULES} target="_blank" rel="noreferrer">CBUAE mortgage regulations</a>
        <a href={DLD_MORTGAGE_FEES} target="_blank" rel="noreferrer">Dubai Land Department mortgage fees</a>
        <a href={UAE_RATE_REFERENCE} target="_blank" rel="noreferrer">UAE lender rate illustration</a>
      </div>
    </div>}
  </section>;
}
