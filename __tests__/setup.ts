process.env.PORT = '3000';
process.env.NODE_ENV = 'test';
process.env.API_KEY = 'test_api_key';
process.env.CLIENT_CODE = 'test_client_code';
process.env.CLIENT_PIN = '1234';
process.env.CLIENT_TOTP_PIN = 'TESTTOTP';
process.env.PAPER_TRADING = 'true';
process.env.TELEGRAM_BOT_TOKEN = 'test_bot';
process.env.TELEGRAM_CHAT_ID = 'test_chat';

jest.mock('otplib', () => ({
  generate: jest.fn(),
  createGuardrails: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));
