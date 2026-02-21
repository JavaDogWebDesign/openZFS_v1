import client from './client';
import type { Pool, PoolDetail, PoolCreateRequest, PoolPropertiesResponse, Disk, ScrubSchedule, ScrubScheduleCreateRequest } from '../types';

export async function listPools(): Promise<Pool[]> {
  const res = await client.get<Pool[]>('/pools');
  return res.data;
}

export async function getPool(name: string): Promise<PoolDetail> {
  const res = await client.get<PoolDetail>(`/pools/${name}`);
  return res.data;
}

export async function createPool(data: PoolCreateRequest): Promise<PoolDetail> {
  const res = await client.post<PoolDetail>('/pools', data);
  return res.data;
}

export async function destroyPool(name: string): Promise<void> {
  await client.delete(`/pools/${name}`);
}

export async function scrubPool(name: string): Promise<void> {
  await client.post(`/pools/${name}/scrub`);
}

export async function cancelScrub(name: string): Promise<void> {
  await client.delete(`/pools/${name}/scrub`);
}

export async function exportPool(name: string): Promise<void> {
  await client.post(`/pools/${name}/export`);
}

export async function importPool(name: string): Promise<void> {
  await client.post(`/pools/${name}/import`);
}

export async function trimPool(name: string): Promise<void> {
  await client.post(`/pools/${name}/trim`);
}

export async function getPoolProperties(name: string): Promise<PoolPropertiesResponse> {
  const res = await client.get<PoolPropertiesResponse>(`/pools/${name}/properties`);
  return res.data;
}

export async function listDisks(): Promise<Disk[]> {
  const res = await client.get<Disk[]>('/pools/disks');
  return res.data;
}

// Scrub scheduling
export async function listScrubSchedules(): Promise<ScrubSchedule[]> {
  const res = await client.get<ScrubSchedule[]>('/pools/schedules/scrub');
  return res.data;
}

export async function createScrubSchedule(poolName: string, data: ScrubScheduleCreateRequest): Promise<ScrubSchedule> {
  const res = await client.post<ScrubSchedule>(`/pools/${poolName}/schedule/scrub`, data);
  return res.data;
}

export async function updateScrubSchedule(poolName: string, data: Partial<ScrubSchedule>): Promise<ScrubSchedule> {
  const res = await client.patch<ScrubSchedule>(`/pools/${poolName}/schedule/scrub`, data);
  return res.data;
}

export async function deleteScrubSchedule(poolName: string): Promise<void> {
  await client.delete(`/pools/${poolName}/schedule/scrub`);
}
