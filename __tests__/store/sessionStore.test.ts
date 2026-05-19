import { sessionStore } from '../../src/store/sessionStore';

describe('Session Store', () => {
  it('should set and get session data', () => {
    const data = { jwtToken: 'a', refreshToken: 'b', feedToken: 'c' };
    sessionStore.setSession(data);
    expect(sessionStore.getSession()).toEqual(data);
    expect(sessionStore.jwtToken).toBe('a');
    expect(sessionStore.feedToken).toBe('c');
    expect(sessionStore.refreshToken).toBe('b');
  });

  it('should clear session', () => {
    sessionStore.clearSession();
    expect(sessionStore.getSession()).toBeNull();
  });
});
