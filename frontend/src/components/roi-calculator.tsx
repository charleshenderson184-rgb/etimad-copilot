"use client";

import { useMemo, useState } from "react";

const SUBSCRIPTION_COST_PER_BID = 333; // SAR — Growth plan SAR 5K/mo ÷ 15 bilingual bids = ~SAR 333/bid

export function RoiCalculator() {
  const [bidsPerYear, setBidsPerYear] = useState(12);
  const [hoursPerBid, setHoursPerBid] = useState(40);
  const [hourlyCost, setHourlyCost] = useState(250);
  const [freelancerCostPerBid, setFreelancerCostPerBid] = useState(8000);
  const [mode, setMode] = useState<"internal" | "freelancer">("internal");

  const annualCost = useMemo(() => {
    if (mode === "internal") {
      return bidsPerYear * hoursPerBid * hourlyCost;
    }
    return bidsPerYear * freelancerCostPerBid;
  }, [bidsPerYear, hoursPerBid, hourlyCost, freelancerCostPerBid, mode]);

  const subscriptionCost = useMemo(() => {
    // Growth plan: SAR 5,000/mo annual = SAR 60K/year
    if (bidsPerYear <= 36) return 60000; // Growth
    if (bidsPerYear <= 60) return 96000;  // Enterprise lower
    return 96000;
  }, [bidsPerYear]);

  const savings = annualCost - subscriptionCost;
  const savingsPct = annualCost > 0 ? Math.round((savings / annualCost) * 100) : 0;
  const monthsToBreakEven = savings > 0 ? Math.max(0.5, 12 * (subscriptionCost / annualCost)) : null;

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `SAR ${(n / 1_000_000).toFixed(2)}M`
      : `SAR ${Math.round(n).toLocaleString()}`;

  return (
    <div className="bg-white dark:bg-stone-900 rounded-3xl ring-1 ring-stone-200 dark:ring-stone-800 shadow-elev-2 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
        {/* Inputs */}
        <div className="p-8 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 mb-2">
            Savings calculator
          </p>
          <h3 className="text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight mb-1">
            See your annual savings
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
            What does each bid cost you today?
          </p>

          {/* Mode toggle */}
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-stone-100 dark:bg-stone-800 mb-6">
            <button
              onClick={() => setMode("internal")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                mode === "internal"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
              }`}
            >
              Internal team
            </button>
            <button
              onClick={() => setMode("freelancer")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                mode === "freelancer"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
              }`}
            >
              Freelancer / agency
            </button>
          </div>

          <div className="space-y-5">
            {/* Bids per year */}
            <SliderField
              label="Tenders you bid per year"
              labelAr="عدد المنافسات سنويًا"
              value={bidsPerYear}
              setValue={setBidsPerYear}
              min={1}
              max={100}
              step={1}
              format={(v) => `${v} bids`}
            />

            {mode === "internal" ? (
              <>
                <SliderField
                  label="Hours per bid (review + drafting)"
                  labelAr="ساعات لكل عرض"
                  value={hoursPerBid}
                  setValue={setHoursPerBid}
                  min={4}
                  max={120}
                  step={2}
                  format={(v) => `${v} hours`}
                />
                <SliderField
                  label="Loaded hourly cost"
                  labelAr="التكلفة بالساعة"
                  value={hourlyCost}
                  setValue={setHourlyCost}
                  min={50}
                  max={1000}
                  step={25}
                  format={(v) => `SAR ${v}/hr`}
                />
              </>
            ) : (
              <SliderField
                label="Freelancer / agency cost per bid"
                labelAr="تكلفة كل عرض"
                value={freelancerCostPerBid}
                setValue={setFreelancerCostPerBid}
                min={1000}
                max={30000}
                step={500}
                format={(v) => `SAR ${v.toLocaleString()}`}
              />
            )}
          </div>
        </div>

        {/* Output */}
        <div className="relative bg-gradient-to-br from-emerald-700 via-emerald-800 to-stone-950 text-white p-8 md:p-10 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full border border-emerald-600/30 animate-spin-slow" />
          <div className="absolute -bottom-32 -left-12 w-72 h-72 rounded-full border border-emerald-700/20 animate-spin-slow" style={{ animationDirection: "reverse" }} />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300 mb-3">
              Annual savings
            </p>
            <div className="text-5xl md:text-6xl font-bold tracking-tight tabular-nums mb-2">
              {savings > 0 ? fmt(savings) : "—"}
            </div>
            <p className="text-emerald-100/70 text-sm">
              {savings > 0
                ? `${savingsPct}% lower cost vs your current process`
                : "Add a few bids to see your savings."}
            </p>

            <div className="mt-6 pt-5 border-t border-white/10 space-y-3 text-sm">
              <Line label="Current annual cost" value={fmt(annualCost)} />
              <Line label="Etimad Copilot (Growth plan)" value={fmt(subscriptionCost)} sub="SAR 5,000 / month" />
              {monthsToBreakEven !== null && (
                <Line
                  label="Break-even"
                  value={
                    monthsToBreakEven < 1
                      ? "< 1 month"
                      : `${monthsToBreakEven.toFixed(1)} months`
                  }
                  highlight
                />
              )}
            </div>

            {savings > 60000 && (
              <div className="mt-5 p-3 rounded-xl bg-white/10 ring-1 ring-white/20 text-xs leading-relaxed">
                <span className="font-bold text-emerald-300">
                  Plus the upside.
                </span>{" "}
                Customers see win rates climb from ~22% (KSA average) to 47%
                with a structured bid process.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SliderField({
  label,
  labelAr,
  value,
  setValue,
  min,
  max,
  step,
  format,
}: {
  label: string;
  labelAr: string;
  value: number;
  setValue: (n: number) => void;
  min: number;
  max: number;
  step: number;
  format: (n: number) => string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <div>
          <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            {label}
          </label>
          <span className="text-[10px] text-stone-400 dark:text-stone-500 ml-2" dir="rtl">
            {labelAr}
          </span>
        </div>
        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(parseInt(e.target.value))}
        className="w-full accent-emerald-600 cursor-pointer"
      />
    </div>
  );
}

function Line({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between ${
        highlight ? "pt-3 border-t border-white/10" : ""
      }`}
    >
      <div>
        <p className={highlight ? "font-semibold text-white" : "text-emerald-100/70"}>
          {label}
        </p>
        {sub && <p className="text-[10px] text-emerald-200/60 mt-0.5">{sub}</p>}
      </div>
      <span
        className={`tabular-nums font-bold ${
          highlight ? "text-emerald-300 text-lg" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
