export interface SessionData {
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
}

class SessionStore {
  private session: SessionData | null = null;

  setSession(session: SessionData): void {
    this.session = session;
  }

  getSession(): SessionData | null {
    return this.session;
  }

  get jwtToken(): string | undefined {
    return this.session?.jwtToken;
  }

  get feedToken(): string | undefined {
    return this.session?.feedToken;
  }

  get refreshToken(): string | undefined {
    return this.session?.refreshToken;
  }

  clearSession(): void {
    this.session = null;
  }
}

export const sessionStore = new SessionStore();
