"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect, useRef } from "react";
import Link from "next/link";

const plans: Record<string, { name: string; account: number; fee: number }> = {
  starter: { name: "Starter", account: 3000, fee: 1000 },
  basic: { name: "Basic", account: 5000, fee: 1200 },
  growth: { name: "Growth", account: 8000, fee: 1440 },
  pro: { name: "Pro", account: 10000, fee: 1730 },
  advanced: { name: "Advanced", account: 20000, fee: 2080 },
  elite: { name: "Elite", account: 25000, fee: 2490 },
};

// 🪙 Available markets
const MARKETS = [
  { symbol: "btcusdt", label: "BTC/USDT", name: "Bitcoin" },
  { symbol: "ethusdt", label: "ETH/USDT", name: "Ethereum" },
  { symbol: "solusdt", label: "SOL/USDT", name: "Solana" },
  { symbol: "bnbusdt", label: "BNB/USDT", name: "BNB" },
  { symbol: "xrpusdt", label: "XRP/USDT", name: "XRP" },
  { symbol: "dogeusdt", label: "DOGE/USDT", name: "Dogecoin" },
];

type Trade = {
  id: number;
  pair: string;
  type: "BUY" | "SELL";
  amount: number;
  entry: number;
  exit: number | null;
  profit: number;
  status: "OPEN" | "CLOSED";
  timestamp: string;
};

// ─────────────────────────────────────────────────────────────
// Chart config: timeframes + indicators
// ─────────────────────────────────────────────────────────────
const TIMEFRAMES = [
  { key: "1m", label: "1m", seconds: 60 },
  { key: "5m", label: "5m", seconds: 300 },
  { key: "15m", label: "15m", seconds: 900 },
  { key: "1h", label: "1H", seconds: 3600 },
  { key: "4h", label: "4H", seconds: 14400 },
  { key: "1d", label: "1D", seconds: 86400 },
] as const;

type IndicatorDef = {
  key: string;
  label: string;
  type: "sma" | "ema";
  period: number;
  color: string;
};

const INDICATOR_DEFS: IndicatorDef[] = [
  { key: "sma20", label: "SMA 20", type: "sma", period: 20, color: "#f59e0b" },
  { key: "sma50", label: "SMA 50", type: "sma", period: 50, color: "#a855f7" },
  { key: "ema50", label: "EMA 50", type: "ema", period: 50, color: "#10b981" },
  { key: "ema200", label: "EMA 200", type: "ema", period: 200, color: "#ec4899" },
];

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

function computeSMA(candles: Candle[], period: number) {
  const out: { time: number; value: number }[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) out.push({ time: candles[i].time, value: sum / period });
  }
  return out;
}

function computeEMA(candles: Candle[], period: number) {
  const k = 2 / (period + 1);
  const out: { time: number; value: number }[] = [];
  let ema: number | null = null;
  for (let i = 0; i < candles.length; i++) {
    const close = candles[i].close;
    ema = ema === null ? close : close * k + ema * (1 - k);
    if (i >= period - 1) out.push({ time: candles[i].time, value: ema });
  }
  return out;
}

function LiveChart({
  symbol = "btcusdt",
  label = "BTC/USDT",
  onPriceChange,
}: {
  symbol?: string;
  label?: string;
  onPriceChange?: (price: number) => void;
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<any>(null);
  const lastCandleRef = useRef<Candle | null>(null);
  const priceDisplayRef = useRef<HTMLParagraphElement>(null);
  const lastCallbackRef = useRef(0);
  const onPriceChangeRef = useRef(onPriceChange);
  onPriceChangeRef.current = onPriceChange;

  const candlesRef = useRef<Candle[]>([]);
  const indSeriesRef = useRef<
    Record<
      string,
      {
        series: any;
        type: "sma" | "ema";
        period: number;
        k: number;
        emaClosed: number | null;
        currentEMA: number | null;
      }
    >
  >({});
  const trendlineSeriesRef = useRef<any>(null);
  const trendPointsRef = useRef<{ time: any; value: number }[]>([]);

  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [intervalKey, setIntervalKey] = useState<string>("1m");
  const [indicators, setIndicators] = useState<string[]>([]);
  const [trendlineMode, setTrendlineMode] = useState(false);

  const indicatorSig = [...indicators].sort().join(",");

  const trendlineModeRef = useRef(trendlineMode);
  trendlineModeRef.current = trendlineMode;

  const intervalRef = useRef(
    TIMEFRAMES.find((t) => t.key === intervalKey) ?? TIMEFRAMES[0]
  );
  intervalRef.current =
    TIMEFRAMES.find((t) => t.key === intervalKey) ?? TIMEFRAMES[0];

  // ─────────────────────────────────────────────────────────
  // 1) Init chart & load historical candles
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return;
    let cancelled = false;
    let chart: any = null;

    const initChart = async () => {
      const { createChart, CandlestickSeries, LineSeries } = await import(
        "lightweight-charts"
      );
      if (cancelled || !chartContainerRef.current) return;

      chart = createChart(chartContainerRef.current, {
        layout: {
          background: { color: "#020617" },
          textColor: "#94a3b8",
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: "rgba(148, 163, 184, 0.1)" },
          horzLines: { color: "rgba(148, 163, 184, 0.1)" },
        },
        crosshair: {
          mode: 0,
          vertLine: { color: "rgba(34, 211, 238, 0.5)" },
          horzLine: { color: "rgba(34, 211, 238, 0.5)" },
        },
        rightPriceScale: { borderColor: "rgba(148, 163, 184, 0.2)" },
        timeScale: {
          borderColor: "rgba(148, 163, 184, 0.2)",
          timeVisible: true,
          secondsVisible: false,
        },
        autoSize: true,
      });

      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });
      seriesRef.current = series;

      // Trendline series (empty until user clicks two points)
      trendlineSeriesRef.current = chart.addSeries(LineSeries, {
        color: "#f43f5e",
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      trendPointsRef.current = [];

      // Indicator series
      indSeriesRef.current = {};
      const activeKeys = indicatorSig ? indicatorSig.split(",") : [];
      for (const key of activeKeys) {
        const def = INDICATOR_DEFS.find((d) => d.key === key);
        if (!def) continue;
        const s = chart.addSeries(LineSeries, {
          color: def.color,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        indSeriesRef.current[key] = {
          series: s,
          type: def.type,
          period: def.period,
          k: 2 / (def.period + 1),
          emaClosed: null,
          currentEMA: null,
        };
      }

      // Trendline: click two points to draw
      chart.subscribeClick((param: any) => {
        if (!trendlineModeRef.current) return;
        if (!param.point || param.time === undefined) return;
        const price = series.coordinateToPrice(param.point.y);
        if (price === null || price === undefined) return;

        const pts = [
          ...trendPointsRef.current,
          { time: param.time, value: price as number },
        ];
        trendPointsRef.current = pts.length > 2 ? pts.slice(-2) : pts;

        const sorted = [...trendPointsRef.current].sort(
          (a, b) => Number(a.time) - Number(b.time)
        );
        trendlineSeriesRef.current?.setData(sorted);
      });

      // Historical candles
      try {
        const tf = intervalRef.current;
        const res = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${tf.key}&limit=500`
        );
        const data = await res.json();
        const candles: Candle[] = data.map((c: any[]) => ({
          time: c[0] / 1000,
          open: parseFloat(c[1]),
          high: parseFloat(c[2]),
          low: parseFloat(c[3]),
          close: parseFloat(c[4]),
        }));

        if (cancelled) return;

        series.setData(candles);
        candlesRef.current = candles;
        lastCandleRef.current = candles[candles.length - 1];

        for (const key of Object.keys(indSeriesRef.current)) {
          const entry = indSeriesRef.current[key];
          const values =
            entry.type === "sma"
              ? computeSMA(candles, entry.period)
              : computeEMA(candles, entry.period);
          entry.series.setData(values);
          const last = values[values.length - 1];
          const prev = values[values.length - 2];
          if (last) entry.currentEMA = last.value;
          entry.emaClosed = prev ? prev.value : last ? last.value : null;
        }

        chart.timeScale().fitContent();
      } catch (err) {
        console.error("Failed to load candles:", err);
      }
    };

    initChart();

    return () => {
      cancelled = true;
      if (chart) {
        chart.remove();
        chart = null;
      }
      seriesRef.current = null;
      lastCandleRef.current = null;
      indSeriesRef.current = {};
      trendlineSeriesRef.current = null;
      candlesRef.current = [];
    };
  }, [symbol, intervalKey, indicatorSig]);

  // ─────────────────────────────────────────────────────────
  // 2) Live stream
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    if (priceDisplayRef.current) priceDisplayRef.current.textContent = "Loading...";

    const connect = () => {
      if (cancelled) return;
      setConnectionStatus("Connecting...");
      ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@trade`);

      ws.onopen = () => {
        if (!cancelled) setConnectionStatus("Live");
      };

      ws.onmessage = (event) => {
        if (cancelled || !seriesRef.current) return;
        try {
          const msg = JSON.parse(event.data);
          const price = parseFloat(msg.p);
          if (isNaN(price)) return;

          const bucketSec = intervalRef.current.seconds;
          const nowSec = Math.floor(Date.now() / 1000);
          const bucketStart = Math.floor(nowSec / bucketSec) * bucketSec;
          const last = lastCandleRef.current;

          let newCandle: Candle;
          let isNewCandle = false;
          if (last && last.time === bucketStart) {
            newCandle = {
              time: last.time,
              open: last.open,
              high: Math.max(last.high, price),
              low: Math.min(last.low, price),
              close: price,
            };
          } else {
            isNewCandle = true;
            newCandle = {
              time: bucketStart,
              open: price,
              high: price,
              low: price,
              close: price,
            };
          }

          try {
            seriesRef.current.update(newCandle);
            lastCandleRef.current = newCandle;
          } catch {}

          const arr = candlesRef.current;
          if (arr.length && arr[arr.length - 1].time === newCandle.time) {
            arr[arr.length - 1] = newCandle;
          } else {
            arr.push(newCandle);
            if (arr.length > 1000) arr.shift();
          }

          for (const key of Object.keys(indSeriesRef.current)) {
            const entry = indSeriesRef.current[key];

            if (entry.type === "sma") {
              const p = entry.period;
              if (arr.length >= p) {
                let sum = 0;
                for (let i = arr.length - p; i < arr.length; i++) sum += arr[i].close;
                try {
                  entry.series.update({ time: newCandle.time, value: sum / p });
                } catch {}
              }
            } else {
              if (isNewCandle && entry.currentEMA !== null) {
                entry.emaClosed = entry.currentEMA;
              }
              const base = entry.emaClosed ?? newCandle.close;
              const newEMA = newCandle.close * entry.k + base * (1 - entry.k);
              entry.currentEMA = newEMA;
              if (arr.length >= entry.period) {
                try {
                  entry.series.update({ time: newCandle.time, value: newEMA });
                } catch {}
              }
            }
          }

          if (priceDisplayRef.current) {
            priceDisplayRef.current.textContent = `$${price.toLocaleString()}`;
          }

          const nowMs = Date.now();
          if (nowMs - lastCallbackRef.current >= 1000) {
            lastCallbackRef.current = nowMs;
            onPriceChangeRef.current?.(price);
          }
        } catch {}
      };

      ws.onclose = () => {
        if (cancelled) return;
        setConnectionStatus("Closed");
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.close();
      }
    };
  }, [symbol]);

  const toggleIndicator = (key: string) => {
    setIndicators((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const clearTrendline = () => {
    trendPointsRef.current = [];
    trendlineSeriesRef.current?.setData([]);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
      {/* ─── Toolbar: timeframe, indicators, trendline ─── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-slate-900/60 px-3 py-2">
        {/* Timeframe */}
        <div className="flex items-center gap-0.5 rounded-lg bg-slate-950 p-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.key}
              onClick={() => setIntervalKey(tf.key)}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                intervalKey === tf.key
                  ? "bg-cyan-400 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Indicators */}
        <div className="flex items-center gap-1">
          {INDICATOR_DEFS.map((ind) => {
            const active = indicators.includes(ind.key);
            return (
              <button
                key={ind.key}
                onClick={() => toggleIndicator(ind.key)}
                className={`rounded border px-2.5 py-1 text-xs font-semibold transition ${
                  active
                    ? "border-transparent text-slate-950"
                    : "border-white/10 text-slate-400 hover:text-white"
                }`}
                style={active ? { backgroundColor: ind.color } : undefined}
              >
                {ind.label}
              </button>
            );
          })}
        </div>

        {/* Trendline */}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setTrendlineMode((v) => !v)}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
              trendlineMode
                ? "bg-rose-500 text-white"
                : "border border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            📏 Trendline
          </button>
          {trendlineMode && (
            <button
              onClick={clearTrendline}
              className="rounded px-2.5 py-1 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ─── Chart area ─── */}
      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-4">
          <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p ref={priceDisplayRef} className="text-2xl font-bold text-white">
              Loading...
            </p>
          </div>
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              connectionStatus === "Live"
                ? "bg-green-500/10 text-green-400"
                : "bg-yellow-500/10 text-yellow-400"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
            {connectionStatus}
          </div>
        </div>

        <div
          ref={chartContainerRef}
          className={`h-[500px] w-full ${trendlineMode ? "cursor-crosshair" : ""}`}
        />

        {trendlineMode && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold text-rose-300">
            Click two points on the chart to draw a trendline
          </div>
        )}
      </div>
    </div>
  );
}

function TradeContent() {
  const searchParams = useSearchParams();
  const selected = searchParams.get("plan") || "starter";
  const plan = plans[selected] || plans.starter;

  // ✅ balance is now mutable
  const [balance, setBalance] = useState(plan.account);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState("");
  const [leverage, setLeverage] = useState(5);
  const [currentPrice, setCurrentPrice] = useState(0);

  const [marketIndex, setMarketIndex] = useState(0);
  const market = MARKETS[marketIndex];

  const openPositions = trades.filter((t) => t.status === "OPEN");
  const closedTrades = trades.filter((t) => t.status === "CLOSED");
  const realizedPnL = closedTrades.reduce((s, t) => s + t.profit, 0);
  const unrealizedPnL = openPositions.reduce((s, t) => s + t.profit, 0);
  const usedMargin = openPositions.reduce((s, t) => s + t.amount, 0);
  const equity = balance + usedMargin + unrealizedPnL;
  const totalPnL = realizedPnL + unrealizedPnL;
  const loss = totalPnL < 0 ? Math.abs(totalPnL) : 0;

  const profitTarget = plan.account * 0.08;
  const dailyDrawdownLimit = plan.account * 0.05;
  const maxDrawdownLimit = plan.account * 0.1;
  const challengeFailed = loss >= dailyDrawdownLimit || loss >= maxDrawdownLimit;
  const challengePassed = totalPnL >= profitTarget && closedTrades.length >= 5;
  const status = challengeFailed ? "FAILED" : challengePassed ? "PASSED" : "ACTIVE";

  const placeTrade = () => {
    const tradeAmount = Number(amount);
    if (!tradeAmount || tradeAmount <= 0) {
      alert("Enter a valid trade amount.");
      return;
    }
    if (tradeAmount > balance) {
      alert("Insufficient free balance.");
      return;
    }

    const randomPnL = Math.round((Math.random() * 2 - 0.9) * tradeAmount * 0.05);
    const newTrade: Trade = {
      id: Date.now(),
      pair: market.label,
      type: orderType,
      amount: tradeAmount,
      entry: currentPrice || 0,
      exit: null,
      profit: randomPnL,
      status: "OPEN",
      timestamp: new Date().toLocaleString("en-IN"),
    };

    setTrades((prev) => [newTrade, ...prev]);
    setBalance((b) => b - tradeAmount); // lock margin
    setAmount("");
  };

  const closeTrade = (id: number) => {
    const trade = trades.find((t) => t.id === id);
    if (!trade) return;

    setBalance((b) => b + trade.amount + trade.profit); // return margin + P&L

    setTrades((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: "CLOSED" as const,
              exit: currentPrice || t.entry,
              timestamp: new Date().toLocaleString("en-IN"),
            }
          : t
      )
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold">
            Trade<span className="text-cyan-400">Nova</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-400 md:block">
              {plan.name} Challenge
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                status === "ACTIVE"
                  ? "bg-cyan-400/10 text-cyan-400"
                  : status === "PASSED"
                  ? "bg-green-400/10 text-green-400"
                  : "bg-red-400/10 text-red-400"
              }`}
            >
              {status}
            </span>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Stat cards: added "Margin Used" */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-500">Balance</p>
            <p className="mt-1 text-lg font-bold">
              ₹{balance.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-500">Margin Used</p>
            <p className="mt-1 text-lg font-bold">
              ₹{usedMargin.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-500">Equity</p>
            <p className="mt-1 text-lg font-bold">
              ₹{equity.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-500">Total P&L</p>
            <p
              className={`mt-1 text-lg font-bold ${
                totalPnL >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {totalPnL >= 0 ? "+" : "-"}₹
              {Math.abs(totalPnL).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-500">Target</p>
            <p className="mt-1 text-lg font-bold">
              ₹{profitTarget.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-500">Open Positions</p>
            <p className="mt-1 text-lg font-bold">{openPositions.length}</p>
          </div>
        </div>

        {/* 🪙 MARKET SELECTOR TABS */}
        <div className="mb-4 flex flex-wrap gap-2">
          {MARKETS.map((m, i) => (
            <button
              key={m.symbol}
              onClick={() => setMarketIndex(i)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                marketIndex === i
                  ? "bg-cyan-400 text-slate-950"
                  : "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <LiveChart
              symbol={market.symbol}
              label={market.label}
              onPriceChange={setCurrentPrice}
            />
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-bold">Place Demo Trade</h3>

              <div className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-center text-sm">
                <span className="text-slate-500">Trading: </span>
                <span className="font-bold text-cyan-400">{market.label}</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setOrderType("BUY")}
                  className={`rounded-xl py-3 font-bold transition ${
                    orderType === "BUY"
                      ? "bg-green-500 text-white"
                      : "border border-white/10 bg-slate-900 text-slate-400"
                  }`}
                >
                  BUY
                </button>
                <button
                  onClick={() => setOrderType("SELL")}
                  className={`rounded-xl py-3 font-bold transition ${
                    orderType === "SELL"
                      ? "bg-red-500 text-white"
                      : "border border-white/10 bg-slate-900 text-slate-400"
                  }`}
                >
                  SELL
                </button>
              </div>

              <div className="mt-4">
                <label className="text-xs text-slate-500">Amount (₹)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-3 outline-none focus:border-cyan-400"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Free balance: ₹{balance.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="mt-4">
                <label className="text-xs text-slate-500">
                  Leverage: {leverage}×
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="mt-2 w-full accent-cyan-400"
                />
              </div>

              <div className="mt-4 rounded-xl bg-slate-900 p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Market Price</span>
                  <span className="font-semibold">
                    ${currentPrice.toLocaleString() || "—"}
                  </span>
                </div>
              </div>

              <button
                onClick={placeTrade}
                disabled={challengeFailed || challengePassed}
                className={`mt-5 w-full rounded-xl py-4 font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  orderType === "BUY"
                    ? "bg-green-500 hover:bg-green-400"
                    : "bg-red-500 hover:bg-red-400"
                }`}
              >
                {orderType === "BUY" ? "Buy / Long" : "Sell / Short"}{" "}
                {market.label}
              </button>

              <p className="mt-2 text-center text-xs text-slate-600">
                Demo trade — simulated only
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-bold">Open Positions</h3>
          {openPositions.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
              No open positions. Place a demo trade to get started.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 text-slate-400">
                  <tr>
                    <th className="pb-3">Pair</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Entry</th>
                    <th className="pb-3">P&L</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {openPositions.map((trade) => (
                    <tr
                      key={trade.id}
                      className="border-b border-white/5 last:border-0"
                    >
                      <td className="py-3 font-semibold">{trade.pair}</td>
                      <td className="py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-bold ${
                            trade.type === "BUY"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {trade.type}
                        </span>
                      </td>
                      <td className="py-3">
                        ₹{trade.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3">${trade.entry}</td>
                      <td
                        className={`py-3 font-semibold ${
                          trade.profit >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {trade.profit >= 0 ? "+" : ""}₹
                        {trade.profit.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => closeTrade(trade.id)}
                          className="rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-400 hover:bg-white/5"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-bold">Trade History</h3>
          {closedTrades.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
              No closed trades yet.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 text-slate-400">
                  <tr>
                    <th className="pb-3">Time</th>
                    <th className="pb-3">Pair</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3 text-right">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {closedTrades.map((trade) => (
                    <tr
                      key={trade.id}
                      className="border-b border-white/5 last:border-0"
                    >
                      <td className="py-3 text-slate-400">{trade.timestamp}</td>
                      <td className="py-3 font-semibold">{trade.pair}</td>
                      <td className="py-3">{trade.type}</td>
                      <td className="py-3">
                        ₹{trade.amount.toLocaleString("en-IN")}
                      </td>
                      <td
                        className={`py-3 text-right font-semibold ${
                          trade.profit >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {trade.profit >= 0 ? "+" : ""}₹
                        {trade.profit.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6">
          <Link
            href={`/dashboard?plan=${selected}`}
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function TradePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 p-10 text-white">
          Loading trading terminal...
        </div>
      }
    >
      <TradeContent />
    </Suspense>
  );
}