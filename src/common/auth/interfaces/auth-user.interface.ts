import { Request as ExpressRequest } from 'express';

export interface JwtAuthUser {
  userId: string;
  email: string;
}

export interface JwtRefreshAuthUser {
  userId: string;
  email: string;
  refreshToken: string;
}

export type AuthRequest = ExpressRequest & { user: JwtAuthUser };
export type AuthRefreshRequest = ExpressRequest & { user: JwtRefreshAuthUser };
