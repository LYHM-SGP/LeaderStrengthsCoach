import 'express-session';

declare module 'express-session' {
  interface Session {
    linkedInState?: string;
    linkedInToken?: string;
    linkedInUserId?: string;
  }
}
