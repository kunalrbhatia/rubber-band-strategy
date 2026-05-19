import { isTradingDay } from '../../src/helpers/holidayCheck';
import { toZonedTime } from 'date-fns-tz';
import { TIME_CONSTANTS } from '../../src/helpers/constants';

jest.mock('date-fns-tz', () => ({
  ...jest.requireActual('date-fns-tz'),
  toZonedTime: jest.fn(),
}));

const mockedToZonedTime = toZonedTime as jest.MockedFunction<typeof toZonedTime>;

describe('Holiday Check Helper', () => {
  it('should return false for weekends', async () => {
    // Saturday June 6, 2026
    const saturday = new Date('2026-06-06T10:00:00Z');
    mockedToZonedTime.mockReturnValue(saturday);

    const result = await isTradingDay();
    expect(result).toBe(false);
  });

  it('should return false for listed holidays', async () => {
    // Republic Day 2026-01-26
    const holiday = new Date('2026-01-26T10:00:00Z');
    mockedToZonedTime.mockReturnValue(holiday);

    const result = await isTradingDay();
    expect(result).toBe(false);
  });

  it('should return true for a regular trading day', async () => {
    // Wednesday June 10, 2026
    const wednesday = new Date('2026-06-10T10:00:00Z');
    mockedToZonedTime.mockReturnValue(wednesday);

    const result = await isTradingDay();
    expect(result).toBe(true);
  });
});
