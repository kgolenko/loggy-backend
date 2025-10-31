export interface JwtPayload {
  sub: string; // userId
  email: string;
  type: 'access' | 'refresh';
}
