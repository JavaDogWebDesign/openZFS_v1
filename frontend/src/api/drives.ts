import client from './client';
import type { DriveInfo } from '../types';

export async function listDrives(): Promise<DriveInfo[]> {
  const res = await client.get<DriveInfo[]>('/drives');
  return res.data;
}
