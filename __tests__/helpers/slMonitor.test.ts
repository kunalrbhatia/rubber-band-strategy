import { connectWebSocket, subscribe, unsubscribe } from '../../src/helpers/slMonitor';
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

  it('should connect websocket', async () => {
    mockWs.on.mockImplementation((event: string, cb: any) => {
      if (event === 'open') setTimeout(cb, 0);
    });

    await connectWebSocket();
    expect(MockedWebSocket).toHaveBeenCalled();
  });

  it('should subscribe to tokens', async () => {
    mockWs.on.mockImplementation((event: string, cb: any) => {
      if (event === 'open') setTimeout(cb, 0);
    });
    await connectWebSocket();

    subscribe('SELL_TOKEN', 'BUY_TOKEN');
    expect(mockWs.send).toHaveBeenCalled();
  });

  it('should handle target hit', async () => {
    const trade = {
      sellLeg: { symbolToken: 'S1', currentPremium: 100 },
      buyLeg: { symbolToken: 'B1', currentPremium: 20 },
      netCreditAtEntry: 80,
      lotSize: 75,
      targetPnl: 500,
      slPnl: -500,
    };
    tradeStore.setActiveTrade(trade as any);

    let messageCb: any;
    mockWs.on.mockImplementation((event: string, cb: any) => {
      if (event === 'open') setTimeout(cb, 0);
      if (event === 'message') messageCb = cb;
    });
    await connectWebSocket();

    if (messageCb) {
      messageCb(JSON.stringify({ token: 'S1', ltp: '70' })); // Big drop, profit
      expect(mockedExitSpread).toHaveBeenCalledWith(expect.anything(), 'TARGET');
    }
  });

  it('should handle SL hit', async () => {
    const trade = {
      sellLeg: { symbolToken: 'S1', currentPremium: 100 },
      buyLeg: { symbolToken: 'B1', currentPremium: 20 },
      netCreditAtEntry: 80,
      lotSize: 75,
      targetPnl: 500,
      slPnl: -500,
    };
    tradeStore.setActiveTrade(trade as any);

    let messageCb: any;
    mockWs.on.mockImplementation((event: string, cb: any) => {
      if (event === 'open') setTimeout(cb, 0);
      if (event === 'message') messageCb = cb;
    });
    await connectWebSocket();

    if (messageCb) {
      messageCb(JSON.stringify({ token: 'S1', ltp: '110' })); // Rise, loss
      expect(mockedExitSpread).toHaveBeenCalledWith(expect.anything(), 'SL_HIT');
    }
  });
});
