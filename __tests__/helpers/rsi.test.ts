import { calculateRsi, Candle } from '../../src/helpers/rsi';

describe('RSI Calculation', () => {
  it('should return null if insufficient candles', () => {
    const candles: Candle[] = Array(10).fill({ close: 100 } as Candle);
    expect(calculateRsi(candles)).toBeNull();
  });

  it('should calculate RSI correctly with sample data', () => {
    // Basic test case: flat prices should lead to RS = 0 (or undefined)
    // but Wilder's smoothing with seeding takes time to stabilize.
    const candles: Candle[] = Array(30).fill(0).map((_, i) => ({
      close: 100,
      timestamp: '',
      open: 0,
      high: 0,
      low: 0,
      volume: 0
    }));
    
    // With all same prices, RSI should eventually stabilize at 100 or 50 depending on implementation details
    // but here it should be 100 because avgLoss will be 0.
    expect(calculateRsi(candles)).toBe(100);
  });

  it('should calculate RSI correctly with fluctuating data', () => {
    const candles: Candle[] = Array(30).fill(0).map((_, i) => ({
      close: 100 + (i % 2 === 0 ? 10 : -10),
      timestamp: '',
      open: 0,
      high: 0,
      low: 0,
      volume: 0
    }));
    
    const rsi = calculateRsi(candles);
    expect(rsi).toBeGreaterThan(0);
    expect(rsi).toBeLessThan(100);
  });
});
