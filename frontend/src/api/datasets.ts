import client from './client';
import type { Dataset, DatasetCreateRequest, Snapshot } from '../types';

export async function listDatasets(pool?: string): Promise<Dataset[]> {
  const params = pool ? { pool } : {};
  const res = await client.get<Dataset[]>('/datasets', { params });
  return res.data;
}

export async function createDataset(data: DatasetCreateRequest): Promise<void> {
  await client.post('/datasets', data);
}

export async function updateDataset(path: string, properties: Record<string, string>): Promise<void> {
  await client.patch(`/datasets/${path}`, { properties });
}

export async function destroyDataset(path: string): Promise<void> {
  await client.delete(`/datasets/${path}`);
}

export async function listSnapshots(datasetPath: string): Promise<Snapshot[]> {
  const res = await client.get<Snapshot[]>(`/datasets/${datasetPath}/snapshots`);
  return res.data;
}

export async function createSnapshot(datasetPath: string, name: string): Promise<void> {
  await client.post(`/datasets/${datasetPath}/snapshots`, { name });
}

export async function destroySnapshot(datasetPath: string, snapName: string): Promise<void> {
  await client.delete(`/datasets/${datasetPath}/snapshots/${snapName}`);
}

export async function rollbackSnapshot(datasetPath: string, snapName: string): Promise<void> {
  await client.post(`/datasets/${datasetPath}/snapshots/${snapName}/rollback`);
}

export async function cloneSnapshot(datasetPath: string, snapName: string, target: string): Promise<void> {
  await client.post(`/datasets/${datasetPath}/snapshots/${snapName}/clone`, { target });
}
