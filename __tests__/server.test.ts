import { verifySlackSignature } from '../src/server.js';
import { config } from '../src/config/env.js';
import crypto from 'crypto';

jest.mock('../src/helpers/logger.js');
jest.mock('../src/helpers/slMonitor.js', () => ({
  unsubscribe: jest.fn(),
}));

describe('Server Middlewares', () => {
  let req: any;
  let res: any;
  let next: jest.Mock;
  let originalEnv: string;
  let originalSecret: string;

  beforeAll(() => {
    originalEnv = process.env.NODE_ENV || 'test';
    originalSecret = config.slackSigningSecret;
    config.slackSigningSecret = 'test_secret';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
    config.slackSigningSecret = originalSecret;
  });

  beforeEach(() => {
    req = {
      headers: {},
      rawBody: Buffer.from('test_body', 'utf8'),
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    next = jest.fn();
  });

  it('should bypass signature verification in test env if signature header is missing', () => {
    process.env.NODE_ENV = 'test';
    verifySlackSignature(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should reject signature verification if signature is missing in non-test env', () => {
    process.env.NODE_ENV = 'production';
    verifySlackSignature(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Unauthorized');
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject signature verification if timestamp is missing in non-test env', () => {
    process.env.NODE_ENV = 'production';
    req.headers['x-slack-signature'] = 'some_sig';
    verifySlackSignature(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject verification if timestamp is expired', () => {
    process.env.NODE_ENV = 'production';
    req.headers['x-slack-signature'] = 'some_sig';
    req.headers['x-slack-request-timestamp'] = (Math.floor(Date.now() / 1000) - 60 * 10).toString(); // 10 mins ago
    verifySlackSignature(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should verify signature successfully with valid headers and signature', () => {
    process.env.NODE_ENV = 'production';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sigBaseString = `v0:${timestamp}:test_body`;
    const hmac = crypto.createHmac('sha256', 'test_secret');
    const signature = `v0=${hmac.update(sigBaseString).digest('hex')}`;

    req.headers['x-slack-signature'] = signature;
    req.headers['x-slack-request-timestamp'] = timestamp;

    verifySlackSignature(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should reject verification if signatures mismatch', () => {
    process.env.NODE_ENV = 'production';
    const timestamp = Math.floor(Date.now() / 1000).toString();

    req.headers['x-slack-signature'] = 'v0=invalid_sig_here_longer_value_so_timing_safe_check_runs';
    req.headers['x-slack-request-timestamp'] = timestamp;

    verifySlackSignature(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
