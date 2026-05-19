import { marketHealthCheckJob, marketHealthLogger } from '../../src/jobs/marketHealthCheck';
import { runDiagnostics } from '../../src/scripts/market-diagnostics';

jest.mock('../../src/scripts/market-diagnostics');
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
  it('should run diagnostics', async () => {
    await marketHealthCheckJob();
    expect(mockedRunDiagnostics).toHaveBeenCalledWith(marketHealthLogger);
  });
});
