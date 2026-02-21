import client from './client';
import type { LoginRequest, TokenResponse, AppUser } from '../types';

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const res = await client.post<TokenResponse>('/auth/login', data);
  return res.data;
}

export async function refreshToken(refresh_token: string): Promise<TokenResponse> {
  const res = await client.post<TokenResponse>('/auth/refresh', { refresh_token });
  return res.data;
}

export async function logout(refresh_token: string): Promise<void> {
  await client.post('/auth/logout', { refresh_token });
}

export async function getMe(): Promise<AppUser> {
  const res = await client.get<AppUser>('/auth/me');
  return res.data;
}
