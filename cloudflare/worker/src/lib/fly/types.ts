// ─── Enums ───────────────────────────────────────────────────────────

export type MachineState =
  | 'created'
  | 'starting'
  | 'started'
  | 'stopping'
  | 'stopped'
  | 'suspending'
  | 'suspended'
  | 'replacing'
  | 'destroying'
  | 'destroyed'
  | 'failed';

export type CpuKind = 'shared' | 'performance';
export type RestartPolicy = 'no' | 'on-failure' | 'always';
export type Autostop = 'off' | 'stop' | 'suspend' | boolean;
export type ServiceProtocol = 'tcp' | 'udp';
export type PortHandler = 'http' | 'tls' | 'tcp' | 'edge_http';

// ─── Nested config types ─────────────────────────────────────────────

export interface Guest {
  cpu_kind?: CpuKind;
  cpus?: number;
  memory_mb?: number;
  gpu_kind?: string;
  gpus?: number;
  kernel_args?: string[];
  persist_rootfs?: 'never' | 'restart' | 'always';
  host_dedication_id?: string;
}

export interface Port {
  port?: number;
  start_port?: number;
  end_port?: number;
  handlers: PortHandler[];
  force_https?: boolean;
  http_options?: {
    compress?: boolean;
    h2_backend?: boolean;
    response?: {
      headers?: Record<string, string>;
      pristine?: boolean;
    };
  };
  tls_options?: {
    alpn?: string[];
    default_self_signed?: boolean;
    versions?: string[];
  };
}

export interface Concurrency {
  type?: 'connections' | 'requests';
  soft_limit?: number;
  hard_limit?: number;
}

export interface Service {
  protocol: ServiceProtocol;
  internal_port: number;
  ports: Port[];
  concurrency?: Concurrency;
  autostart?: boolean;
  autostop?: Autostop;
  min_machines_running?: number;
}

export interface HealthCheck {
  type: 'tcp' | 'http';
  port?: number;
  interval?: number;
  timeout?: number;
  grace_period?: number;
  method?: string;
  path?: string;
  protocol?: 'http' | 'https';
  tls_server_name?: string;
  tls_skip_verify?: boolean;
  headers?: Record<string, string[]>;
}

export interface RestartConfig {
  policy: RestartPolicy;
  max_retries?: number;
}

export interface InitConfig {
  exec?: string[];
  entrypoint?: string[];
  cmd?: string[];
  tty?: boolean;
  swap_size_mb?: number;
  kernel_args?: string[];
}

export interface Mount {
  volume: string;
  path: string;
  name?: string;
  encrypted?: boolean;
  extend_threshold_percent?: number;
  add_size_gb?: number;
  size_gb_limit?: number;
}

export interface FileEntry {
  guest_path: string;
  raw_value?: string;
  secret_name?: string;
}

export interface StopConfig {
  signal?: string;
  timeout?: number;
}

// ─── MachineConfig ───────────────────────────────────────────────────

export interface MachineConfig {
  image: string;
  auto_destroy?: boolean;
  env?: Record<string, string>;
  guest?: Guest;
  restart?: RestartConfig;
  init?: InitConfig;
  services?: Service[];
  checks?: Record<string, HealthCheck>;
  mounts?: Mount[];
  files?: FileEntry[];
  metadata?: Record<string, string>;
  size?: string;
  stop_config?: StopConfig;
  schedule?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  standbys?: string[];
}

// ─── Machine response ────────────────────────────────────────────────

export interface ImageRef {
  registry: string;
  repository: string;
  tag?: string;
  digest: string;
  labels?: Record<string, string>;
}

export interface MachineEvent {
  type: string;
  status: string;
  source: string;
  timestamp: number;
}

export interface CheckStatus {
  name: string;
  status: 'passing' | 'critical' | 'warning';
  output?: string;
  updated_at: string;
}

export interface Machine {
  id: string;
  name: string;
  state: MachineState;
  region: string;
  instance_id: string;
  private_ip: string;
  config: MachineConfig;
  image_ref: ImageRef;
  checks?: Record<string, CheckStatus>;
  events: MachineEvent[];
  created_at: string;
  updated_at: string;
  nonce?: string;
}

// ─── Request shapes ──────────────────────────────────────────────────

export interface CreateMachineRequest {
  name?: string;
  region?: string;
  config: MachineConfig;
  skip_launch?: boolean;
  skip_service_registration?: boolean;
}

export interface UpdateMachineRequest {
  config: MachineConfig;
  current_version?: string;
}

export interface StopMachineRequest {
  signal?: string;
  timeout?: string;
}

export interface WaitOptions {
  state: 'started' | 'stopped' | 'suspended' | 'destroyed';
  timeout?: number;
  instance_id?: string;
}

// ─── Response shapes ─────────────────────────────────────────────────

export interface StartMachineResponse {
  previous_state: MachineState;
  migrated: boolean;
}

export interface OkResponse {
  ok: true;
}

// ─── Errors ──────────────────────────────────────────────────────────

export class FlyApiError extends Error {
  constructor(
    public status: number,
    public body: string,
    message: string,
  ) {
    super(message);
    this.name = 'FlyApiError';
  }
}

export class FlyAuthError extends FlyApiError {}
export class FlyNotFoundError extends FlyApiError {}
export class FlyTimeoutError extends FlyApiError {}
export class FlyConflictError extends FlyApiError {}
export class FlyValidationError extends FlyApiError {}
export class FlyRateLimitError extends FlyApiError {}
export class FlyServerError extends FlyApiError {}
