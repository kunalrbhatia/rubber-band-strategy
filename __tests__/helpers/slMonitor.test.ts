import { connectWebSocket, subscribe, unsubscribe, ws } from '../../src/helpers/slMonitor';
import WebSocket from 'ws';
import { sessionStore } from '../../src/store/sessionStore';
import { tradeStore } from '../../src/store/tradeStore';
import { exitSpread } from '../../src/helpers/orders';

jest.mock('ws');
jest.mock('../../src/helpers/logger');
jest.mock('../../src/helpers/orders');
jest.mock('../../src/notifier');

const MockedWebSocket = WebSocket as jest.MockedClass<typeof WebSocket>;
const mockedExitSpread = exitSpread as jest.MockedFunction<typeof exitSpread>;

describe('SL Monitor Helper', () => {
  let mockWs: any;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    sessionStore.setSession({ jwtToken: 't', feedToken: 'f', refreshToken: 'r' });

    mockWs = {
      on: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      ping: jest.fn(),
      readyState: 1, // OPEN
    };
    MockedWebSocket.mockImplementation(() => mockWs);
  });

  afterEach(() => {
    unsubscribe();
  });

  it('should connect websocket', async () => {
    mockWs.on.mockImplementation((event: string, cb: any) => {
      if (event === 'open') {
        cb();
      }
    });

    await connectWebSocket();
    expect(MockedWebSocket).toHaveBeenCalled();
  });

  it('should subscribe to tokens', async () => {
    mockWs.on.mockImplementation((event: string, cb: any) => {
      if (event === 'open') cb();
    });
    await connectWebSocket();

    subscribe('SELL_TOKEN', 'BUY_TOKEN');
    expect(mockWs.send).toHaveBeenCalled();
  });

  it('should handle target hit', async () => {
    const trade = {
      sellLeg: { symbolToken: 'S1', currentPremium: 100, tradingSymbol: 'S1_SYM' },
      buyLeg: { symbolToken: 'B1', currentPremium: 20, tradingSymbol: 'B1_SYM' },
      netCreditAtEntry: 80,
      lotSize: 75,
      targetPnl: 500,
      slPnl: -500,
    };
    tradeStore.setActiveTrade(trade as any);

    let messageCb: any;
    mockWs.on.mockImplementation((event: string, cb: any) => {
      if (event === 'open') cb();
      if (event === 'message') messageCb = cb;
    });
    await connectWebSocket();

    if (messageCb) {
      // Mock binary packet: Mode 1 (1 byte) + padding (1 byte) + token (25 bytes) + ... + LTP (4 bytes at offset 43)
      const buffer = Buffer.alloc(47);
      buffer.writeInt8(1, 0); // Mode 1
      buffer.write('S1', 2); // Token
      buffer.writeInt32LE(70 * 100, 43); // LTP in paise (7000)

      await messageCb(buffer);
      expect(mockedExitSpread).toHaveBeenCalledWith(expect.anything(), 'TARGET');
    }
  });

  it('should handle SL hit', async () => {
    const trade = {
      sellLeg: { symbolToken: 'S1', currentPremium: 100, tradingSymbol: 'S1_SYM' },
      buyLeg: { symbolToken: 'B1', currentPremium: 20, tradingSymbol: 'B1_SYM' },
      netCreditAtEntry: 80,
      lotSize: 75,
      targetPnl: 500,
      slPnl: -500,
    };
    tradeStore.setActiveTrade(trade as any);

    let messageCb: any;
    mockWs.on.mockImplementation((event: string, cb: any) => {
      if (event === 'open') cb();
      if (event === 'message') messageCb = cb;
    });
    await connectWebSocket();

    if (messageCb) {
      // Mock binary packet: Mode 1 (1 byte) + padding (1 byte) + token (25 bytes) + ... + LTP (4 bytes at offset 43)
      const buffer = Buffer.alloc(47);
      buffer.writeInt8(1, 0); // Mode 1
      buffer.write('S1', 2); // Token
      buffer.writeInt32LE(110 * 100, 43); // LTP in paise (11000)

      await messageCb(buffer);
      expect(mockedExitSpread).toHaveBeenCalledWith(expect.anything(), 'SL_HIT');
    }
  });
});
