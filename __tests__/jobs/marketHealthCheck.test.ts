import { marketHealthCheckJob, marketHealthLogger } from '../../src/jobs/marketHealthCheck.js';
import { runDiagnostics } from '../../src/scripts/market-diagnostics.js';
import { appStateStore } from '../../src/store/appStateStore.js';

jest.mock('../../src/scripts/market-diagnostics.js');
jest.mock('../../src/store/appStateStore.js');
jest.mock('winston', () => {
  const mFormat = {
    combine: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
  };
  const mTransports = {
    Console: jest.fn(),
    File: jest.fn(),
  };
  return {
    format: mFormat,
    createLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      error: jest.fn(),
    }),
    transports: mTransports,
  };
});

const mockedRunDiagnostics = runDiagnostics as jest.MockedFunction<typeof runDiagnostics>;

describe('Market Health Check Job', () => {
  it('should run diagnostics when kill switch is inactive', async () => {
    (appStateStore as any).isKillSwitchActive = false;
    await marketHealthCheckJob();
    expect(mockedRunDiagnostics).toHaveBeenCalledWith(marketHealthLogger);
  });

  it('should skip diagnostics when kill switch is active', async () => {
    (appStateStore as any).isKillSwitchActive = true;
    mockedRunDiagnostics.mockClear();
    await marketHealthCheckJob();
    expect(mockedRunDiagnostics).not.toHaveBeenCalled();
  });
});
