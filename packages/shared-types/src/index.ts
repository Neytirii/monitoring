// Enums
export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';
export type Severity = 'INFO' | 'WARNING' | 'HIGH' | 'DISASTER';
export type AlertState = 'OK' | 'FIRING' | 'RESOLVED';
export type HostStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
export type WidgetType = 'line' | 'gauge' | 'pie' | 'bar' | 'stat';
export type NotificationChannelType = 'email' | 'webhook' | 'slack' | 'discord';

// Core Models
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Host {
  id: string;
  name: string;
  hostname: string;
  ipAddress?: string;
  os?: string;
  agentToken: string;
  status: HostStatus;
  lastSeen?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Dashboard {
  id: string;
  name: string;
  layout: WidgetPosition[];
  tenantId: string;
  widgets: Widget[];
  createdAt: string;
  updatedAt: string;
}

export interface Widget {
  id: string;
  dashboardId: string;
  type: WidgetType | string;
  title: string;
  config: WidgetConfig;
  position: WidgetPosition;
  createdAt: string;
  updatedAt: string;
}

export interface WidgetConfig {
  hostId?: string;
  metric?: string;
  timeRange?: string;
  threshold?: number;
  unit?: string;
  [key: string]: unknown;
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NetworkMap {
  id: string;
  name: string;
  tenantId: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface NetworkNode {
  id: string;
  networkMapId: string;
  hostId?: string;
  host?: Pick<Host, 'id' | 'name' | 'status'>;
  label: string;
  type: string;
  positionX: number;
  positionY: number;
  createdAt: string;
  updatedAt: string;
}

export interface NetworkEdge {
  id: string;
  networkMapId: string;
  sourceId: string;
  targetId: string;
  label?: string;
  createdAt: string;
}

export interface Trigger {
  id: string;
  name: string;
  description?: string;
  expression: TriggerExpression;
  severity: Severity;
  tenantId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TriggerExpression {
  metric: string;
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=';
  threshold: number;
}

export interface Alert {
  id: string;
  triggerId: string;
  trigger: Pick<Trigger, 'id' | 'name' | 'severity'>;
  hostId: string;
  host: Pick<Host, 'id' | 'name' | 'hostname'>;
  state: AlertState;
  message: string;
  firedAt: string;
  resolvedAt?: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: NotificationChannelType;
  config: Record<string, unknown>;
  tenantId: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  alertId: string;
  channelId: string;
  sentAt: string;
  success: boolean;
  error?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// Metric types
export interface Metric {
  time: string;
  host_id: string;
  tenant_id?: string;
  name: string;
  value: number;
  tags: Record<string, string>;
}

export interface MetricBatch {
  host_id: string;
  metrics: Array<{
    name: string;
    value: number;
    tags?: Record<string, string>;
  }>;
  timestamp: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuthResponse {
  token: string;
  user: Pick<User, 'id' | 'email' | 'name' | 'role'>;
  tenant: Pick<Tenant, 'id' | 'name' | 'slug'>;
}

export interface HostCreateResponse {
  host: Host;
  installCommand: string;
}
