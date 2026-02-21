import client from './client';
import type { SMBShare, SMBShareCreateRequest, NFSExport, NFSExportCreateRequest } from '../types';

// SMB
export async function listSMBShares(): Promise<SMBShare[]> {
  const res = await client.get<SMBShare[]>('/shares/smb');
  return res.data;
}

export async function createSMBShare(data: SMBShareCreateRequest): Promise<SMBShare> {
  const res = await client.post<SMBShare>('/shares/smb', data);
  return res.data;
}

export async function updateSMBShare(name: string, data: Partial<SMBShare>): Promise<SMBShare> {
  const res = await client.patch<SMBShare>(`/shares/smb/${name}`, data);
  return res.data;
}

export async function deleteSMBShare(name: string): Promise<void> {
  await client.delete(`/shares/smb/${name}`);
}

export async function reloadSMB(): Promise<void> {
  await client.post('/shares/smb/reload');
}

// NFS
export async function listNFSExports(): Promise<NFSExport[]> {
  const res = await client.get<NFSExport[]>('/shares/nfs');
  return res.data;
}

export async function createNFSExport(data: NFSExportCreateRequest): Promise<NFSExport> {
  const res = await client.post<NFSExport>('/shares/nfs', data);
  return res.data;
}

export async function updateNFSExport(id: number, data: Partial<NFSExport>): Promise<NFSExport> {
  const res = await client.patch<NFSExport>(`/shares/nfs/${id}`, data);
  return res.data;
}

export async function deleteNFSExport(id: number): Promise<void> {
  await client.delete(`/shares/nfs/${id}`);
}

export async function reloadNFS(): Promise<void> {
  await client.post('/shares/nfs/reload');
}
