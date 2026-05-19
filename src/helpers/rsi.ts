export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function calculateRsi(candles: Candle[], length = 14): number | null {
  if (candles.length < length * 2) {
    return null;
  }

  const closes = candles.map((c) => c.close);
  const deltas = [];
  for (let i = 1; i < closes.length; i++) {
    deltas.push(closes[i] - closes[i - 1]);
  }

  const gains = deltas.map((d) => (d > 0 ? d : 0));
  const losses = deltas.map((d) => (d < 0 ? Math.abs(d) : 0));

  const avgGains = rma(gains, length);
  const avgLosses = rma(losses, length);

  const lastAvgGain = avgGains[avgGains.length - 1];
  const lastAvgLoss = avgLosses[avgLosses.length - 1];

  if (lastAvgLoss === 0) {
    return 100;
  }

  const rs = lastAvgGain / lastAvgLoss;
  return 100 - 100 / (1 + rs);
}

function rma(values: number[], length: number): number[] {
  const rmas: number[] = [];
  let sum = 0;

  // First RMA value is the simple moving average
  for (let i = 0; i < length; i++) {
    sum += values[i];
  }
  rmas.push(sum / length);

  // Subsequent RMA values: RMA(t) = ((length - 1) * RMA(t-1) + value(t)) / length
  for (let i = length; i < values.length; i++) {
    const prevRma = rmas[rmas.length - 1];
    rmas.push(((length - 1) * prevRma + values[i]) / length);
  }

  return rmas;
}
