export interface ScripRecord {
  token: string;
  symbol: string;
  name: string;
  expiry: string;
  strike: string;
  lotsize: string;
  instrumenttype: string;
  exch_seg: string;
  tick_size: string;
}

class ScripMasterStore {
  private records: ScripRecord[] = [];

  setRecords(records: ScripRecord[]): void {
    this.records = records;
  }

  getRecords(): ScripRecord[] {
    return this.records;
  }

  findRecord(predicate: (record: ScripRecord) => boolean): ScripRecord | undefined {
    return this.records.find(predicate);
  }
}

export const scripMasterStore = new ScripMasterStore();
