import { getAtmStrike, getSellStrike, getNearestExpiry, getFarOtmStrike, findOptionToken } from '../../src/helpers/optionChain';
import { scripMasterStore } from '../../src/store/scripMasterStore';

describe('Option Chain Helpers', () => {
  it('should round to nearest 100 for ATM strike', () => {
    expect(getAtmStrike(24367)).toBe(24400);
    expect(getAtmStrike(24340)).toBe(24300);
    expect(getAtmStrike(25050)).toBe(25100);
  });

  it('should calculate OTM sell strike (200 pts offset)', () => {
    // Spot 25050 -> ATM 25100
    expect(getSellStrike(25050, 'CE')).toBe(25300);
    expect(getSellStrike(25050, 'PE')).toBe(24900);
  });

  it('should calculate far OTM hedge strike (400 pts offset from sell)', () => {
    // Sell 25300 CE -> Hedge 25700 CE
    expect(getFarOtmStrike(25300, 'CE')).toBe(25700);
    // Sell 24900 PE -> Hedge 24500 PE
    expect(getFarOtmStrike(24900, 'PE')).toBe(24500);
  });

  it('should find option token', () => {
    scripMasterStore.setRecords([{
      symbol: 'NIFTY22MAY202525300CE',
      token: '123',
      lotsize: '75',
      instrumenttype: 'OPTIDX'
    } as any]);
    
    const result = findOptionToken(25300, '22MAY2025', 'CE');
    expect(result.symbolToken).toBe('123');
    expect(result.lotSize).toBe(75);
  });

  it('should throw if option token not found', () => {
    expect(() => findOptionToken(24000, '22MAY2025', 'PE')).toThrow();
  });
});
