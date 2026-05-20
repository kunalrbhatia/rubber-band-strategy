import { eodSquareOffJob } from '../../src/jobs/eodSquareOff.js';
import { tradeStore } from '../../src/store/tradeStore.js';
import { appStateStore } from '../../src/store/appStateStore.js';
import { getLtp } from '../../src/helpers/marketData.js';
import { exitSpread } from '../../src/helpers/orders.js';

jest.mock('../../src/store/tradeStore.js');
jest.mock('../../src/store/appStateStore.js');
jest.mock('../../src/helpers/marketData.js');
jest.mock('../../src/helpers/orders.js');
jest.mock('../../src/helpers/slMonitor.js');
jest.mock('../../src/notifier.js');

describe('EOD Square-off Job', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should skip if kill switch is active', async () => {
    (appStateStore as any).isKillSwitchActive = true;
    await eodSquareOffJob();
    expect(tradeStore.hasActiveTrade).not.toHaveBeenCalled();
  });

  it('should skip if no active trade', async () => {
    (appStateStore as any).isKillSwitchActive = false;
    (tradeStore.hasActiveTrade as jest.Mock).mockReturnValue(false);
    await eodSquareOffJob();
    expect(getLtp).not.toHaveBeenCalled();
  });

  it('should exit spread if active trade exists', async () => {
    (appStateStore as any).isKillSwitchActive = false;
    (tradeStore.hasActiveTrade as jest.Mock).mockReturnValue(true);
    (tradeStore as any).activeTrade = {
      lotSize: 50,
      netCreditAtEntry: 10,
      sellLeg: { symbolToken: 'S1', tradingSymbol: 'S1' },
      buyLeg: { symbolToken: 'B1', tradingSymbol: 'B1' },
    };
    (getLtp as jest.Mock).mockResolvedValue(5);

    await eodSquareOffJob();

    expect(exitSpread).toHaveBeenCalled();
    expect(tradeStore.clearActiveTrade).toHaveBeenCalled();
  });
});
