import { tradeStore } from '../../src/store/tradeStore';

describe('Trade Store', () => {
  it('should set and clear active trade', () => {
    const trade = { id: '1' } as any;
    tradeStore.setActiveTrade(trade);
    expect(tradeStore.hasActiveTrade()).toBe(true);
    expect(tradeStore.activeTrade).toEqual(trade);
    tradeStore.clearActiveTrade();
    expect(tradeStore.hasActiveTrade()).toBe(false);
  });

  it('should handle daily SL hit flag', () => {
    tradeStore.setDailySLHit(true);
    expect(tradeStore.dailySLHit).toBe(true);
    tradeStore.setDailySLHit(false);
    expect(tradeStore.dailySLHit).toBe(false);
  });
});
