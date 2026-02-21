import client from './client';
import type { SystemUser, UserCreateRequest } from '../types';

export async function listUsers(): Promise<SystemUser[]> {
  const res = await client.get<SystemUser[]>('/users');
  return res.data;
}

export async function createUser(data: UserCreateRequest): Promise<void> {
  await client.post('/users', data);
}

export async function deleteUser(username: string): Promise<void> {
  await client.delete(`/users/${username}`);
}

export async function changePassword(username: string, password: string): Promise<void> {
  await client.patch(`/users/${username}/password`, { password });
}

export async function updateGroups(username: string, groups: string[]): Promise<void> {
  await client.patch(`/users/${username}/groups`, { groups });
}

export async function listGroups(): Promise<{ name: string; gid: number; members: string[] }[]> {
  const res = await client.get<{ name: string; gid: number; members: string[] }[]>('/users/groups');
  return res.data;
}

export async function setSmbPassword(username: string, password: string): Promise<void> {
  await client.post(`/users/${username}/smb-password`, { password });
}
