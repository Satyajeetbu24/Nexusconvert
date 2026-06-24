import { useState, useEffect, useCallback, useRef } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRightLeft, History, Wallet, ArrowDownUp, TrendingUp,
  RefreshCw, AlertCircle, Bell, BellOff, Download, Layers, X, Zap, CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartTooltip } from "recharts";
import Papa from "papaparse";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

const CURRENCY_META: Record<string, { symbol: string; name: string; flag: string }> = {
  USD: { symbol: "$",   name: "US Dollar",           flag: "🇺🇸" },
  EUR: { symbol: "€",   name: "Euro",                 flag: "🇪🇺" },
  INR: { symbol: "₹",   name: "Indian Rupee",         flag: "🇮🇳" },
  GBP: { symbol: "£",   name: "British Pound",        flag: "🇬🇧" },
  JPY: { symbol: "¥",   name: "Japanese Yen",         flag: "🇯🇵" },
  AUD: { symbol: "A$",  name: "Australian Dollar",    flag: "🇦🇺" },
  CAD: { symbol: "C$",  name: "Canadian Dollar",      flag: "🇨🇦" },
  CHF: { symbol: "Fr",  name: "Swiss Franc",          flag: "🇨🇭" },
  CNY: { symbol: "¥",   name: "Chinese Yuan",         flag: "🇨🇳" },
  SGD: { symbol: "S$",  name: "Singapore Dollar",     flag: "🇸🇬" },
  AED: { symbol: "د.إ", name: "UAE Dirham",           flag: "🇦🇪" },
  BRL: { symbol: "R$",  name: "Brazilian Real",       flag: "🇧🇷" },
  HKD: { symbol: "HK$", name: "Hong Kong Dollar",     flag: "🇭🇰" },
  KRW: { symbol: "₩",   name: "South Korean Won",     flag: "🇰🇷" },
  MXN: { symbol: "MX$", name: "Mexican Peso",         flag: "🇲🇽" },
  NOK: { symbol: "kr",  name: "Norwegian Krone",      flag: "🇳🇴" },
  NZD: { symbol: "NZ$", name: "New Zealand Dollar",   flag: "🇳🇿" },
  PLN: { symbol: "zł",  name: "Polish Zloty",         flag: "🇵🇱" },
  SAR: { symbol: "﷼",   name: "Saudi Riyal",          flag: "🇸🇦" },
  SEK: { symbol: "kr",  name: "Swedish Krona",        flag: "🇸🇪" },
  THB: { symbol: "฿",   name: "Thai Baht",            flag: "🇹🇭" },
  TRY: { symbol: "₺",   name: "Turkish Lira",         flag: "🇹🇷" },
  ZAR: { symbol: "R",   name: "South African Rand",   flag: "🇿🇦" },
  DKK: { symbol: "kr",  name: "Danish Krone",         flag: "🇩🇰" },
  MYR: { symbol: "RM",  name: "Malaysian Ringgit",    flag: "🇲🇾" },
  IDR: { symbol: "Rp",  name: "Indonesian Rupiah",    flag: "🇮🇩" },
  PHP: { symbol: "₱",   name: "Philippine Peso",      flag: "🇵🇭" },
  TWD: { symbol: "NT$", name: "Taiwan Dollar",        flag: "🇹🇼" },
  PKR: { symbol: "₨",   name: "Pakistani Rupee",      flag: "🇵🇰" },
  BDT: { symbol: "৳",   name: "Bangladeshi Taka",     flag: "🇧🇩" },
  CZK: { symbol: "Kč",  name: "Czech Koruna",         flag: "🇨🇿" },
  HUF: { symbol: "Ft",  name: "Hungarian Forint",     flag: "🇭🇺" },
  ILS: { symbol: "₪",   name: "Israeli Shekel",       flag: "🇮🇱" },
  QAR: { symbol: "﷼",   name: "Qatari Riyal",         flag: "🇶🇦" },
  KWD: { symbol: "KD",  name: "Kuwaiti Dinar",        flag: "🇰🇼" },
};

const CURRENCY_CODES = Object.keys(CURRENCY_META);

const FALLBACK_RATES_VS_INR: Record<string, number> = {
  USD: 0.01199, EUR: 0.01104, INR: 1.0, GBP: 0.00948, JPY: 1.8847,
  AUD: 0.01835, CAD: 0.01631, CHF: 0.01079, CNY: 0.08690, SGD: 0.01619,
  AED: 0.04403, BRL: 0.06174, HKD: 0.09373, KRW: 16.23, MXN: 0.2043,
  NOK: 0.1293, NZD: 0.02005, PLN: 0.04826, SAR: 0.04497, SEK: 0.1288,
  THB: 0.4263, TRY: 0.3861, ZAR: 0.2198, DKK: 0.08246, MYR: 0.05641,
  IDR: 196.3, PHP: 0.6898, TWD: 0.3888, PKR: 3.331, BDT: 1.317,
  CZK: 0.2776, HUF: 4.452, ILS: 0.04407, QAR: 0.04367, KWD: 0.003687,
};

type ConversionHistory = {
  id: string;
  time: string;
  date: string;
  fromAmount: number;
  fromCode: string;
  toAmount: number;
  toCode: string;
  rate: number;
};

type PriceAlert = {
  id: string;
  fromCode: string;
  toCode: string;
  targetRate: number;
  direction: "above" | "below";
  triggered: boolean;
};

function fmt(amount: number, code: string) {
  const decimals = ["JPY", "KRW", "IDR", "HUF"].includes(code) ? 0 : 2;
  const sym = CURRENCY_META[code]?.symbol ?? code;
  return `${sym}${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)} ${code}`;
}

function getRateVsINR(code: string, rates: Record<string, number>): number {
  return rates[code] ?? FALLBACK_RATES_VS_INR[code] ?? 1;
}

function convert(amount: number, from: string, to: string, rates: Record<string, number>): number {
  return (amount / getRateVsINR(from, rates)) * getRateVsINR(to, rates);
}

function generateSparkData(currentRate: number, code: string) {
  const seed = code.charCodeAt(0) + code.charCodeAt(1);
  const data = [];
  let val = currentRate * (0.97 + (seed % 5) * 0.01);
  for (let i = 6; i >= 0; i--) {
    const jitter = (Math.sin(seed * i * 0.7) * 0.015 + Math.cos(seed * i * 1.3) * 0.01);
    val = val * (1 + jitter);
    data.push({ day: `D-${i}`, rate: parseFloat(val.toFixed(4)) });
  }
  data.push({ day: "Now", rate: currentRate });
  return data;
}

// Splash Screen
function SplashScreen({ onEnter }: { onEnter: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <div className="flex flex-col items-center gap-8 max-w-md text-center px-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center shadow-2xl shadow-primary/20">
            <ArrowRightLeft className="w-10 h-10 text-primary" />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary animate-pulse" />
        </div>

        <div>
          <h1 className="text-5xl font-bold tracking-tight text-primary mb-2">NexusConvert</h1>
          <p className="text-muted-foreground text-lg">Premium Currency Exchange Terminal</p>
        </div>

        <div className="grid grid-cols-3 gap-4 w-full text-sm">
          {[
            { icon: <TrendingUp className="w-4 h-4" />, label: "Live Rates" },
            { icon: <Bell className="w-4 h-4" />, label: "Price Alerts" },
            { icon: <Wallet className="w-4 h-4" />, label: "Multi-Wallet" },
          ].map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card/50 border border-border/50">
              <span className="text-primary">{f.icon}</span>
              <span className="text-muted-foreground text-xs">{f.label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
          <span>{CURRENCY_CODES.length}+ currencies · Real-time data · INR-first</span>
        </div>

        <Button
          size="lg"
          className="w-full text-base font-bold py-6 gap-2 shadow-lg shadow-primary/20"
          onClick={() => {
            setVisible(false);
            setTimeout(onEnter, 500);
          }}
        >
          <Zap className="w-5 h-5" /> Launch Terminal
        </Button>
      </div>
    </div>
  );
}

// Mini Sparkline
function Sparkline({ data, positive }: { data: { rate: number }[]; positive: boolean }) {
  return (
    <ResponsiveContainer width={80} height={32}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="rate"
          stroke={positive ? "#22d3ee" : "#f87171"}
          strokeWidth={1.5}
          dot={false}
        />
        <RechartTooltip
          contentStyle={{ background: "#1e293b", border: "none", fontSize: 10, borderRadius: 4 }}
          labelFormatter={() => ""}
          formatter={(v: number) => [v.toFixed(4), ""]}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function CurrencyConverter() {
  const [ratesVsINR, setRatesVsINR] = useState<Record<string, number>>(FALLBACK_RATES_VS_INR);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const initWallet = (): Record<string, number> => {
    try {
      const saved = localStorage.getItem("nexus_wallet");
      if (saved) return JSON.parse(saved);
    } catch {}
    const w: Record<string, number> = {};
    for (const c of CURRENCY_CODES) w[c] = 0;
    w["INR"] = 10000;
    return w;
  };

  const [wallet, setWalletState] = useState<Record<string, number>>(initWallet);

  const setWallet = useCallback((updater: (prev: Record<string, number>) => Record<string, number>) => {
    setWalletState((prev) => {
      const next = updater(prev);
      try { localStorage.setItem("nexus_wallet", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const [history, setHistory] = useState<ConversionHistory[]>(() => {
    try {
      const saved = localStorage.getItem("nexus_history");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const saveHistory = (h: ConversionHistory[]) => {
    try { localStorage.setItem("nexus_history", JSON.stringify(h)); } catch {}
    setHistory(h);
  };

  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try {
      const saved = localStorage.getItem("nexus_alerts");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const saveAlerts = (a: PriceAlert[]) => {
    try { localStorage.setItem("nexus_alerts", JSON.stringify(a)); } catch {}
    setAlerts(a);
  };

  const [fromCurrency, setFromCurrency] = useState("INR");
  const [toCurrency, setToCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpCurrency, setTopUpCurrency] = useState("USD");
  const [basketAmount, setBasketAmount] = useState("1000");
  const [basketCurrency, setBasketCurrency] = useState("INR");
  const [alertFrom, setAlertFrom] = useState("USD");
  const [alertTo, setAlertTo] = useState("INR");
  const [alertTarget, setAlertTarget] = useState("");
  const [alertDir, setAlertDir] = useState<"above" | "below">("above");
  const [activeTab, setActiveTab] = useState<"exchange" | "basket" | "alerts">("exchange");
  const [stripeLoading, setStripeLoading] = useState(false);

  const prevRatesRef = useRef<Record<string, number>>({});

  const fetchRates = useCallback(async () => {
    setRatesLoading(true);
    setRatesError(false);
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/INR");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      if (data.result !== "success") throw new Error("api error");
      const rates: Record<string, number> = { INR: 1.0 };
      for (const code of CURRENCY_CODES) {
        if (code !== "INR" && data.rates[code] !== undefined) rates[code] = data.rates[code];
      }
      prevRatesRef.current = { ...ratesVsINR };
      setRatesVsINR(rates);
      const now = new Date();
      setLastUpdated(`${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`);
      toast.success("Live rates updated");
    } catch {
      setRatesError(true);
      toast.error("Could not fetch live rates — using cached rates");
    } finally {
      setRatesLoading(false);
    }
  }, [ratesVsINR]);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Check price alerts whenever rates update
  useEffect(() => {
    if (alerts.length === 0) return;
    const updated = alerts.map((alert) => {
      if (alert.triggered) return alert;
      const currentRate = convert(1, alert.fromCode, alert.toCode, ratesVsINR);
      const hit =
        (alert.direction === "above" && currentRate >= alert.targetRate) ||
        (alert.direction === "below" && currentRate <= alert.targetRate);
      if (hit) {
        toast.success(
          `Alert: 1 ${alert.fromCode} ${alert.direction === "above" ? ">=" : "<="} ${alert.targetRate} ${alert.toCode} (now ${currentRate.toFixed(4)})`,
          { duration: 8000 }
        );
        return { ...alert, triggered: true };
      }
      return alert;
    });
    saveAlerts(updated);
  }, [ratesVsINR]);

  const amountNum = parseFloat(amount);
  const convertedAmount = isNaN(amountNum) ? 0 : convert(amountNum, fromCurrency, toCurrency, ratesVsINR);
  const liveRate = convert(1, fromCurrency, toCurrency, ratesVsINR);

  const handleConvert = () => {
    if (isNaN(amountNum) || amountNum <= 0) { toast.error("Enter a valid amount greater than zero."); return; }
    if (wallet[fromCurrency] < amountNum) {
      toast.error(`Insufficient ${fromCurrency} balance. You have ${fmt(wallet[fromCurrency], fromCurrency)}.`);
      return;
    }
    setWallet((prev) => ({
      ...prev,
      [fromCurrency]: prev[fromCurrency] - amountNum,
      [toCurrency]: (prev[toCurrency] ?? 0) + convertedAmount,
    }));
    const now = new Date();
    const newEntry: ConversionHistory = {
      id: Math.random().toString(36).substr(2, 9),
      time: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
      date: now.toLocaleDateString("en-IN"),
      fromAmount: amountNum,
      fromCode: fromCurrency,
      toAmount: convertedAmount,
      toCode: toCurrency,
      rate: liveRate,
    };
    saveHistory([newEntry, ...history]);
    setAmount("");
    toast.success(`Converted ${fmt(amountNum, fromCurrency)} → ${fmt(convertedAmount, toCurrency)}`);
  };

  const handleTopUp = () => {
    const val = parseFloat(topUpAmount);
    if (isNaN(val) || val <= 0) { toast.error("Enter a valid top-up amount."); return; }
    setWallet((prev) => ({ ...prev, [topUpCurrency]: (prev[topUpCurrency] ?? 0) + val }));
    setTopUpAmount("");
    toast.success(`Added ${fmt(val, topUpCurrency)} to wallet`);
  };

  const handleStripeTopup = async () => {
    const val = parseFloat(topUpAmount);
    if (isNaN(val) || val <= 0) { toast.error("Enter a valid amount to pay."); return; }
    setStripeLoading(true);
    try {
      const res = await fetch("/api/stripe/create-topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: val, currency: topUpCurrency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create checkout");
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message ?? "Payment setup failed");
      setStripeLoading(false);
    }
  };

  // Handle Stripe redirect back with session result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("topup_session");
    const cancelled = params.get("topup_cancelled");

    if (cancelled) {
      toast.error("Payment cancelled");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (!sessionId) return;
    // Remove the param immediately so refresh doesn't re-process
    window.history.replaceState({}, "", window.location.pathname);

    fetch(`/api/stripe/topup-result?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const { walletCurrency, walletAmount } = data;
        setWallet((prev) => ({ ...prev, [walletCurrency]: (prev[walletCurrency] ?? 0) + walletAmount }));
        toast.success(`Payment confirmed — ${fmt(walletAmount, walletCurrency)} added to wallet!`, { duration: 6000 });
      })
      .catch((err) => toast.error("Could not confirm payment: " + err.message));
  }, []);

  const handleAddAlert = () => {
    const target = parseFloat(alertTarget);
    if (isNaN(target) || target <= 0) { toast.error("Enter a valid target rate."); return; }
    const newAlert: PriceAlert = {
      id: Math.random().toString(36).substr(2, 9),
      fromCode: alertFrom,
      toCode: alertTo,
      targetRate: target,
      direction: alertDir,
      triggered: false,
    };
    saveAlerts([...alerts, newAlert]);
    setAlertTarget("");
    toast.success("Alert set!");
  };

  const handleExportCSV = () => {
    if (history.length === 0) { toast.error("No history to export."); return; }
    const csv = Papa.unparse(history.map((h) => ({
      Date: h.date,
      Time: h.time,
      From: h.fromCode,
      "From Amount": h.fromAmount,
      To: h.toCode,
      "To Amount": parseFloat(h.toAmount.toFixed(4)),
      Rate: parseFloat(h.rate.toFixed(6)),
    })));
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "nexusconvert_history.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("History exported as CSV");
  };

  const basketNum = parseFloat(basketAmount);
  const basketResults = isNaN(basketNum)
    ? []
    : CURRENCY_CODES.filter((c) => c !== basketCurrency).map((c) => ({
        code: c,
        amount: convert(basketNum, basketCurrency, c, ratesVsINR),
      }));

  const totalINRValue = CURRENCY_CODES.reduce((sum, code) => sum + (wallet[code] ?? 0) / getRateVsINR(code, ratesVsINR), 0);

  const tabClass = (t: string) =>
    `px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="min-h-screen w-full bg-background p-4 md:p-6 font-sans text-foreground">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">NexusConvert</h1>
            <p className="text-muted-foreground text-sm">Premium Currency Exchange Terminal</p>
          </div>
          <div className="text-right text-xs text-muted-foreground flex flex-col items-end gap-1">
            {ratesLoading ? (
              <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Fetching rates...</span>
            ) : ratesError ? (
              <span className="flex items-center gap-1 text-destructive"><AlertCircle className="w-3 h-3" /> Cached rates</span>
            ) : (
              <span>Live rates · Updated {lastUpdated}</span>
            )}
            <span className="text-muted-foreground/60">{CURRENCY_CODES.length} currencies</span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Left column */}
          <div className="md:col-span-8 space-y-6">

            {/* Exchange / Basket / Alerts tabs */}
            <Card className="border-card-border bg-card/50 backdrop-blur shadow-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1 w-fit">
                  <button className={tabClass("exchange")} onClick={() => setActiveTab("exchange")} data-testid="tab-exchange">
                    <span className="flex items-center gap-1.5"><ArrowRightLeft className="w-3.5 h-3.5" />Exchange</span>
                  </button>
                  <button className={tabClass("basket")} onClick={() => setActiveTab("basket")} data-testid="tab-basket">
                    <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />Basket</span>
                  </button>
                  <button className={tabClass("alerts")} onClick={() => setActiveTab("alerts")} data-testid="tab-alerts">
                    <span className="flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5" />Alerts
                      {alerts.filter((a) => !a.triggered).length > 0 && (
                        <Badge className="h-4 px-1 text-[10px]">{alerts.filter((a) => !a.triggered).length}</Badge>
                      )}
                    </span>
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Exchange Tab */}
                {activeTab === "exchange" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
                      <div className="space-y-2">
                        <Label>From</Label>
                        <Select value={fromCurrency} onValueChange={setFromCurrency}>
                          <SelectTrigger data-testid="select-from-currency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCY_CODES.map((c) => (
                              <SelectItem key={c} value={c}>
                                <span className="flex items-center gap-2">
                                  <span className="text-base leading-none">{CURRENCY_META[c].flag}</span>
                                  <span>{c} — {CURRENCY_META[c].name}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="outline" size="icon" className="mb-[2px] rounded-full shrink-0"
                        onClick={() => { setFromCurrency(toCurrency); setToCurrency(fromCurrency); }}
                        data-testid="button-swap-currencies">
                        <ArrowDownUp className="w-4 h-4" />
                      </Button>
                      <div className="space-y-2">
                        <Label>To</Label>
                        <Select value={toCurrency} onValueChange={setToCurrency}>
                          <SelectTrigger data-testid="select-to-currency"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CURRENCY_CODES.map((c) => (
                              <SelectItem key={c} value={c}>
                                <span className="flex items-center gap-2">
                                  <span className="text-base leading-none">{CURRENCY_META[c].flag}</span>
                                  <span>{c} — {CURRENCY_META[c].name}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            {CURRENCY_META[fromCurrency].symbol}
                          </div>
                          <Input type="number" placeholder="0.00" className="pl-8 text-lg font-mono"
                            value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="input-exchange-amount" />
                        </div>
                        <Button onClick={handleConvert} className="px-8 font-bold" data-testid="button-convert">Convert</Button>
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-4 border border-border space-y-1">
                      <div className="text-xs text-muted-foreground">
                        1 {fromCurrency} = {liveRate.toFixed(4)} {toCurrency}
                        {ratesLoading && <span className="ml-2 opacity-60">(updating...)</span>}
                      </div>
                      <div className="text-3xl font-bold tracking-tight text-primary transition-all duration-300" data-testid="text-converted-result">
                        {fmt(convertedAmount, toCurrency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Wallet: {fmt(wallet[fromCurrency] ?? 0, fromCurrency)} available
                      </div>
                    </div>
                  </>
                )}

                {/* Basket Tab */}
                {activeTab === "basket" && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Convert one amount into all currencies simultaneously.</p>
                    <div className="flex gap-3 items-end">
                      <div className="space-y-2 flex-1">
                        <Label>Amount</Label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            {CURRENCY_META[basketCurrency].symbol}
                          </div>
                          <Input type="number" placeholder="1000" className="pl-8" value={basketAmount}
                            onChange={(e) => setBasketAmount(e.target.value)} data-testid="input-basket-amount" />
                        </div>
                      </div>
                      <div className="space-y-2 w-40">
                        <Label>Currency</Label>
                        <Select value={basketCurrency} onValueChange={setBasketCurrency}>
                          <SelectTrigger data-testid="select-basket-currency"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CURRENCY_CODES.map((c) => (
                              <SelectItem key={c} value={c}>
                                <span className="flex items-center gap-2">
                                  <span>{CURRENCY_META[c].flag}</span><span>{c}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                      {basketResults.map(({ code, amount: a }) => (
                        <div key={code} className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border/40 text-sm" data-testid={`basket-result-${code}`}>
                          <span className="flex items-center gap-1.5">
                            <span>{CURRENCY_META[code].flag}</span>
                            <span className="font-medium">{code}</span>
                          </span>
                          <span className="font-mono text-primary text-xs">
                            {CURRENCY_META[code].symbol}{new Intl.NumberFormat("en-IN", {
                              minimumFractionDigits: ["JPY","KRW","IDR","HUF"].includes(code) ? 0 : 2,
                              maximumFractionDigits: ["JPY","KRW","IDR","HUF"].includes(code) ? 0 : 2,
                            }).format(a)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alerts Tab */}
                {activeTab === "alerts" && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Get notified when a rate crosses your target.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">From</Label>
                        <Select value={alertFrom} onValueChange={setAlertFrom}>
                          <SelectTrigger data-testid="select-alert-from"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CURRENCY_CODES.map((c) => (
                              <SelectItem key={c} value={c}>
                                <span className="flex items-center gap-2"><span>{CURRENCY_META[c].flag}</span><span>{c}</span></span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">To</Label>
                        <Select value={alertTo} onValueChange={setAlertTo}>
                          <SelectTrigger data-testid="select-alert-to"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CURRENCY_CODES.map((c) => (
                              <SelectItem key={c} value={c}>
                                <span className="flex items-center gap-2"><span>{CURRENCY_META[c].flag}</span><span>{c}</span></span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-3 items-end">
                      <div className="space-y-1 flex-1">
                        <Label className="text-xs">Target rate (1 {alertFrom} = ? {alertTo})</Label>
                        <Input type="number" placeholder="e.g. 85" value={alertTarget}
                          onChange={(e) => setAlertTarget(e.target.value)} data-testid="input-alert-target" />
                      </div>
                      <div className="space-y-1 w-32">
                        <Label className="text-xs">Direction</Label>
                        <Select value={alertDir} onValueChange={(v) => setAlertDir(v as "above" | "below")}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="above">Goes above</SelectItem>
                            <SelectItem value="below">Goes below</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAddAlert} data-testid="button-add-alert">Set</Button>
                    </div>
                    {alerts.length > 0 && (
                      <div className="space-y-2">
                        {alerts.map((a) => (
                          <div key={a.id} className={`flex items-center justify-between p-3 rounded-md border text-sm ${a.triggered ? "border-border/30 opacity-50" : "border-primary/20 bg-primary/5"}`} data-testid={`alert-item-${a.id}`}>
                            <span className="flex items-center gap-2">
                              {a.triggered ? <BellOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Bell className="w-3.5 h-3.5 text-primary" />}
                              <span>{CURRENCY_META[a.fromCode].flag} 1 {a.fromCode} {a.direction === "above" ? "≥" : "≤"} {a.targetRate} {a.toCode} {CURRENCY_META[a.toCode].flag}</span>
                            </span>
                            <div className="flex items-center gap-2">
                              {a.triggered && <Badge variant="secondary" className="text-[10px]">Triggered</Badge>}
                              <button onClick={() => saveAlerts(alerts.filter((x) => x.id !== a.id))} className="text-muted-foreground hover:text-destructive transition-colors">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Rates vs INR with sparklines */}
            <Card className="border-card-border bg-card/50 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" /> Live Rates vs Indian Rupee (INR)
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={fetchRates} disabled={ratesLoading}
                  data-testid="button-refresh-rates" className="gap-1 text-xs">
                  <RefreshCw className={`w-3 h-3 ${ratesLoading ? "animate-spin" : ""}`} /> Refresh
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {CURRENCY_CODES.filter((c) => c !== "INR").map((code) => {
                    const rateOfCode = getRateVsINR(code, ratesVsINR);
                    const inrPerUnit = 1 / rateOfCode;
                    const prevRate = prevRatesRef.current[code] ? 1 / prevRatesRef.current[code] : inrPerUnit;
                    const positive = inrPerUnit >= prevRate;
                    const sparkData = generateSparkData(inrPerUnit, code);
                    return (
                      <div key={code} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors" data-testid={`rate-row-${code}`}>
                        <div className="flex items-center gap-3 w-40">
                          <span className="text-xl leading-none">{CURRENCY_META[code].flag}</span>
                          <div>
                            <div className="font-bold text-foreground text-sm">{code}</div>
                            <div className="text-xs text-muted-foreground">{CURRENCY_META[code].name}</div>
                          </div>
                        </div>
                        <Sparkline data={sparkData} positive={positive} />
                        <div className="text-right font-mono w-36">
                          <div className="text-sm font-semibold text-foreground">
                            {CURRENCY_META[code].symbol}1 = ₹{inrPerUnit.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ₹1 = {CURRENCY_META[code].symbol}{rateOfCode.toFixed(4)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {ratesError && (
                  <div className="flex items-center gap-2 px-6 py-3 text-xs text-amber-400 bg-amber-400/5 border-t border-border/50">
                    <AlertCircle className="w-3 h-3" /> Showing cached rates — live fetch failed
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Log */}
            <Card className="border-card-border bg-card/50 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" /> Activity Log
                </CardTitle>
                <div className="flex items-center gap-2">
                  {history.length > 0 && (
                    <>
                      <Button variant="ghost" size="sm" onClick={handleExportCSV} className="gap-1 text-xs" data-testid="button-export-csv">
                        <Download className="w-3 h-3" /> CSV
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => saveHistory([])} data-testid="button-clear-history">Clear</Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">No recent transactions</div>
                ) : (
                  <div className="space-y-2">
                    {history.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border/50 text-sm font-mono" data-testid={`history-item-${item.id}`}>
                        <div className="text-muted-foreground text-xs">{item.time}</div>
                        <div className="flex items-center gap-3 flex-1 justify-end">
                          <span>{CURRENCY_META[item.fromCode].flag} {fmt(item.fromAmount, item.fromCode)}</span>
                          <ArrowRightLeft className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-primary">{CURRENCY_META[item.toCode].flag} {fmt(item.toAmount, item.toCode)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Wallet */}
          <div className="md:col-span-4 space-y-6">
            <Card className="border-card-border bg-card/50 backdrop-blur sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" /> My Wallet
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Total: ₹{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalINRValue)} INR
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                  {CURRENCY_CODES.map((c) => {
                    const bal = wallet[c] ?? 0;
                    const inINR = bal / getRateVsINR(c, ratesVsINR);
                    const hasBalance = bal > 0;
                    return (
                      <div key={c}
                        className={`flex items-center justify-between py-2 px-3 rounded-md transition-colors ${hasBalance ? "bg-primary/5 border border-primary/10" : "border border-transparent"}`}
                        data-testid={`wallet-row-${c}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg leading-none">{CURRENCY_META[c].flag}</span>
                          <div>
                            <div className="font-medium text-sm">{c}</div>
                            {hasBalance && (
                              <div className="text-xs text-muted-foreground">≈ ₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(inINR)}</div>
                            )}
                          </div>
                        </div>
                        <span className={`font-mono text-sm ${hasBalance ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                          {CURRENCY_META[c].symbol}{new Intl.NumberFormat("en-IN", {
                            minimumFractionDigits: ["JPY","KRW","IDR","HUF"].includes(c) ? 0 : 2,
                            maximumFractionDigits: ["JPY","KRW","IDR","HUF"].includes(c) ? 0 : 2,
                          }).format(bal)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Top Up Wallet</Label>
                  <Select value={topUpCurrency} onValueChange={setTopUpCurrency}>
                    <SelectTrigger data-testid="select-topup-currency"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCY_CODES.map((c) => (
                        <SelectItem key={c} value={c}>
                          <span className="flex items-center gap-2">
                            <span className="text-base leading-none">{CURRENCY_META[c].flag}</span>
                            <span>{c} — {CURRENCY_META[c].symbol}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      {CURRENCY_META[topUpCurrency].symbol}
                    </div>
                    <Input type="number" placeholder="Amount" value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)} className="pl-8" data-testid="input-topup-amount" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" onClick={handleTopUp} data-testid="button-topup-add">
                      Add (Test)
                    </Button>
                    <Button
                      onClick={handleStripeTopup}
                      disabled={stripeLoading}
                      data-testid="button-stripe-topup"
                      className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      {stripeLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CreditCard className="w-3.5 h-3.5" />
                      )}
                      Pay
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    "Pay" uses Stripe — card &amp; UPI (INR). "Add (Test)" adds instantly.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={CurrencyConverter} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          {showSplash ? (
            <SplashScreen onEnter={() => setShowSplash(false)} />
          ) : (
            <Router />
          )}
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
