import { scripMasterStore } from '../../src/store/scripMasterStore';

describe('Scrip Master Store', () => {
  it('should set and get records', () => {
    const records = [{ token: '1', symbol: 'A' } as any];
    scripMasterStore.setRecords(records);
    expect(scripMasterStore.getRecords()).toEqual(records);
  });

  it('should find a record', () => {
    const record = scripMasterStore.findRecord(r => r.symbol === 'A');
    expect(record?.token).toBe('1');
  });
});
