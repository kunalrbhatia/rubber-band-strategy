import { getAtmStrike, getNearestExpiry, getFarOtmStrike, findOptionToken } from '../../src/helpers/optionChain';
import { scripMasterStore } from '../../src/store/scripMasterStore';

describe('Option Chain Helpers', () => {
  it('should round to nearest 50 for ATM strike', () => {
    expect(getAtmStrike(24367)).toBe(24350);
    expect(getAtmStrike(24380)).toBe(24400);
  });

  it('should calculate far OTM strike', () => {
    expect(getFarOtmStrike(24350, 'PE')).toBe(23950);
    expect(getFarOtmStrike(24350, 'CE')).toBe(24750);
  });

  it('should find option token', () => {
    scripMasterStore.setRecords([{
      symbol: 'NIFTY22MAY202524350PE',
      token: '123',
      lotsize: '75',
      instrumenttype: 'OPTIDX'
    } as any]);
    
    const result = findOptionToken(24350, '22MAY2025', 'PE');
    expect(result.symbolToken).toBe('123');
    expect(result.lotSize).toBe(75);
  });

  it('should throw if option token not found', () => {
    expect(() => findOptionToken(24000, '22MAY2025', 'PE')).toThrow();
  });
});
