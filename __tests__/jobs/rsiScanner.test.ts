import { rsiScannerJob } from '../../src/jobs/rsiScanner.js';
import { tradeStore } from '../../src/store/tradeStore.js';
import { appStateStore } from '../../src/store/appStateStore.js';
import { getNiftySpot, getCandles, getLtp } from '../../src/helpers/marketData.js';
import { calculateRsi } from '../../src/helpers/rsi.js';
import { findOptionToken } from '../../src/helpers/optionChain.js';
import { sendNotification } from '../../src/notifier.js';

jest.mock('../../src/helpers/marketData.js');
jest.mock('../../src/helpers/rsi.js');
jest.mock('../../src/helpers/optionChain.js');
jest.mock('../../src/helpers/orders.js');
jest.mock('../../src/helpers/marginCalc.js');
jest.mock('../../src/helpers/slMonitor.js');
jest.mock('../../src/notifier.js');
jest.mock('../../src/store/tradeStore.js');
jest.mock('../../src/store/appStateStore.js');

describe('RSI Scanner Job', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should skip if kill switch is active', async () => {
    (appStateStore as any).isKillSwitchActive = true;
    await rsiScannerJob();
    expect(getCandles).not.toHaveBeenCalled();
  });

  it('should skip if active trade exists', async () => {
    (appStateStore as any).isKillSwitchActive = false;
    (tradeStore.hasActiveTrade as jest.Mock).mockReturnValue(true);
    await rsiScannerJob();
    expect(getCandles).not.toHaveBeenCalled();
  });

  it('should notify and set pending in manual mode when signal detected', async () => {
    (appStateStore as any).isKillSwitchActive = false;
    (appStateStore as any).isManualMode = true;
    (tradeStore.hasActiveTrade as jest.Mock).mockReturnValue(false);
    (getCandles as jest.Mock).mockResolvedValue([{}]);
    (calculateRsi as jest.Mock).mockReturnValue(15); // Oversold

    await rsiScannerJob();

    expect(appStateStore.setPendingTrade).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: 'OVERSOLD',
        approved: false,
      }),
    );
    expect(sendNotification).toHaveBeenCalledWith(expect.stringContaining('SIGNAL DETECTED'));
  });

  it('should execute trade in auto mode when signal detected', async () => {
    (appStateStore as any).isKillSwitchActive = false;
    (appStateStore as any).isManualMode = false;
    (tradeStore.hasActiveTrade as jest.Mock).mockReturnValue(false);
    (getCandles as jest.Mock).mockResolvedValue([{}]);
    (calculateRsi as jest.Mock).mockReturnValue(15); // Oversold
    (getNiftySpot as jest.Mock).mockResolvedValue(24000);
    (getLtp as jest.Mock).mockResolvedValue(100);
    (findOptionToken as jest.Mock).mockReturnValue({
      tradingSymbol: 'NIFTY_TEST',
      symbolToken: '123',
      lotSize: 50,
    });

    await rsiScannerJob();

    expect(sendNotification).toHaveBeenCalledWith(expect.stringContaining('SPREAD ENTRY'));
    expect(tradeStore.setActiveTrade).toHaveBeenCalled();
  });
});
