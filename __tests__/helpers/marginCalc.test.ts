import { computeThresholds } from '../../src/helpers/marginCalc';

describe('Margin Calc Helpers', () => {
  it('should compute correct thresholds', () => {
    const { targetPnl, slPnl } = computeThresholds(50000);
    expect(targetPnl).toBe(750);
    expect(slPnl).toBe(-750);
  });
});
