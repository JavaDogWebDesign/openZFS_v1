import client from './client';
import type { LoginRequest, LoginResponse, AppUser } from '../types';

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await client.post<LoginResponse>('/auth/login', data);
  return res.data;
}

export async function logout(): Promise<void> {
  await client.post('/auth/logout');
}

export async function getMe(): Promise<AppUser> {
  const res = await client.get<AppUser>('/auth/me');
  return res.data;
}
