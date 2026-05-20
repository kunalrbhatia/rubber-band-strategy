import { tradeStore } from '../../src/store/tradeStore.js';

describe('Trade Store', () => {
  beforeEach(() => {
    tradeStore.clearActiveTrade();
    tradeStore.setDailySLHit(false);
  });

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

  it('should calculate MTM correctly', () => {
    const trade = {
      lotSize: 50,
      netCreditAtEntry: 10,
      sellLeg: { currentPremium: 100 },
      buyLeg: { currentPremium: 85 }
    } as any;
    
    tradeStore.setActiveTrade(trade);
    // currentNetCredit = 100 - 85 = 15
    // MTM = (10 - 15) * 50 = -5 * 50 = -250
    expect(tradeStore.getMtm()).toBe(-250);
  });

  it('should return 0 MTM if no active trade', () => {
    expect(tradeStore.getMtm()).toBe(0);
  });
});
