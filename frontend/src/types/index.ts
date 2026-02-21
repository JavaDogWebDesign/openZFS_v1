// Auth
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  username: string;
  message: string;
}

export interface AppUser {
  username: string;
}

// Pools
export interface Pool {
  name: string;
  size: number;
  allocated: number;
  free: number;
  fragmentation: string;
  capacity: string;
  dedupratio: string;
  health: string;
}

export interface VdevEntry {
  name: string;
  state: string;
  read: string;
  write: string;
  checksum: string;
  children?: VdevEntry[];
}

export interface PoolDetail {
  name: string;
  state: string;
  status: string;
  scan: string;
  config: VdevEntry[];
  errors: string;
}

export interface PoolCreateRequest {
  name: string;
  vdev_type: 'stripe' | 'mirror' | 'raidz' | 'raidz2' | 'raidz3';
  disks: string[];
  properties: Record<string, string>;
  fs_properties?: Record<string, string>;
  force?: boolean;
  mountpoint?: string;
}

export interface Disk {
  name: string;
  path: string;
  size: number;
  model: string;
  serial: string;
  partitions: DiskPartition[];
  in_use: boolean;
}

export interface DiskPartition {
  name: string;
  path: string;
  size: number;
  mountpoint: string;
  fstype: string;
}

// Drives (with SMART)
export interface SmartAttribute {
  id: number;
  name: string;
  value: number;
  worst: number;
  thresh: number;
  raw_value: string;
  flags: string;
}

export interface SmartInfo {
  available: boolean;
  healthy: boolean | null;
  temperature: number | null;
  power_on_hours: number | null;
  model_family: string | null;
  rotation_rate: number | null;
  model: string | null;
  firmware_version: string | null;
  form_factor: string | null;
  interface_speed: string | null;
  serial_number: string | null;
  ata_smart_attributes: SmartAttribute[] | null;
}

export interface DriveInfo {
  name: string;
  path: string;
  size: number;
  model: string;
  serial: string;
  type: 'HDD' | 'SSD' | 'NVMe' | 'Unknown';
  partitions: DiskPartition[];
  in_use: boolean;
  pool: string | null;
  smart: SmartInfo;
}

// Datasets
export interface Dataset {
  name: string;
  used: number;
  available: number;
  referenced: number;
  mountpoint: string;
  type: string;
}

export interface DatasetCreateRequest {
  name: string;
  properties: Record<string, string>;
}

// Snapshots
export interface Snapshot {
  full_name: string;
  dataset: string;
  name: string;
  used: number;
  referenced: number;
  creation: string;
}

// Users
export interface SystemUser {
  username: string;
  uid: number;
  gid: number;
  home: string;
  shell: string;
  groups: string[];
}

export interface UserCreateRequest {
  username: string;
  password: string;
  groups: string[];
}

// SMB Shares
export interface SMBShare {
  name: string;
  path: string;
  comment: string;
  browseable: boolean;
  read_only: boolean;
  guest_ok: boolean;
  valid_users: string[];
  write_list: string[];
  create_mask: string;
  directory_mask: string;
  force_user: string;
  force_group: string;
  inherit_permissions: boolean;
  vfs_objects: string[];
}

export interface SMBShareCreateRequest {
  name: string;
  path: string;
  comment?: string;
  browseable?: boolean;
  read_only?: boolean;
  guest_ok?: boolean;
  valid_users?: string[];
  write_list?: string[];
  create_mask?: string;
  directory_mask?: string;
  force_user?: string;
  force_group?: string;
  inherit_permissions?: boolean;
  vfs_objects?: string[];
}

// NFS Exports
export interface NFSExport {
  id: number;
  path: string;
  client: string;
  options: string;
}

export interface NFSExportCreateRequest {
  path: string;
  client?: string;
  options?: string;
}

// Scrub Scheduling
export interface ScrubSchedule {
  id: number;
  pool: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  day_of_week: number;
  day_of_month: number;
  hour: number;
  minute: number;
  enabled: boolean;
  last_run: number | null;
  last_status: string | null;
  created_at: string;
}

export interface ScrubScheduleCreateRequest {
  pool: string;
  frequency?: string;
  day_of_week?: number;
  day_of_month?: number;
  hour?: number;
  minute?: number;
}

// WebSocket
export interface PoolStatusMessage {
  type: 'pool_status';
  pools: Pool[];
}
