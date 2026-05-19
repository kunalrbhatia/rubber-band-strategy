export interface SpreadLeg {
  tradingSymbol: string;
  symbolToken: string;
  action: 'SELL' | 'BUY';
  strike: number;
  entryPremium: number;
  currentPremium: number;
}

export interface ActiveTrade {
  id: string;
  entryTime: string;
  underlying: 'NIFTY';
  optionType: 'CE' | 'PE';
  expiry: string;
  lotSize: number;
  quantity: number;
  sellLeg: SpreadLeg;
  buyLeg: SpreadLeg;
  netCreditAtEntry: number;
  usedMargin: number;
  targetPnl: number;
  slPnl: number;
  rsiAtEntry: number;
  mode: 'PAPER' | 'LIVE';
}

class TradeStore {
  private _activeTrade: ActiveTrade | null = null;
  private _dailySLHit = false;

  get activeTrade(): ActiveTrade | null {
    return this._activeTrade;
  }

  setActiveTrade(trade: ActiveTrade): void {
    this._activeTrade = trade;
  }

  clearActiveTrade(): void {
    this._activeTrade = null;
  }

  hasActiveTrade(): boolean {
    return this._activeTrade !== null;
  }

  get dailySLHit(): boolean {
    return this._dailySLHit;
  }

  setDailySLHit(value: boolean): void {
    this._dailySLHit = value;
  }
}

export const tradeStore = new TradeStore();
