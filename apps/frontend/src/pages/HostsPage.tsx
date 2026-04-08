import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Server, Wifi, WifiOff, HelpCircle, Copy, Check, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import api from '../lib/api';

interface Host {
  id: string;
  name: string;
  hostname: string;
  ipAddress?: string;
  os?: string;
  status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
  lastSeen?: string;
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'ONLINE':
      return <Wifi className="w-4 h-4 text-green-500" />;
    case 'OFFLINE':
      return <WifiOff className="w-4 h-4 text-red-500" />;
    default:
      return <HelpCircle className="w-4 h-4 text-gray-400" />;
  }
};

const statusBadge: Record<string, string> = {
  ONLINE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  OFFLINE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  UNKNOWN: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

function HostMenu({ host, onEdit, onDelete }: { host: Host; onEdit: (host: Host) => void; onDelete: (host: Host) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Host options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
          <button
            onClick={() => { setOpen(false); onEdit(host); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => { setOpen(false); onDelete(host); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function HostsPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [newHostName, setNewHostName] = useState('');
  const [newHostHostname, setNewHostHostname] = useState('');
  const [installCommand, setInstallCommand] = useState('');
  const [copied, setCopied] = useState(false);
  const [editingHost, setEditingHost] = useState<Host | null>(null);
  const [editName, setEditName] = useState('');
  const [editHostname, setEditHostname] = useState('');
  const [deletingHost, setDeletingHost] = useState<Host | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['hosts'],
    queryFn: async () => {
      const { data } = await api.get('/hosts');
      return data.hosts as Host[];
    },
    refetchInterval: 30_000,
  });

  const createHost = useMutation({
    mutationFn: async (body: { name: string; hostname: string }) => {
      const { data } = await api.post('/hosts', body);
      return data as { host: Host; installCommand: string };
    },
    onSuccess: (res) => {
      setInstallCommand(res.installCommand);
      queryClient.invalidateQueries({ queryKey: ['hosts'] });
      setNewHostName('');
      setNewHostHostname('');
    },
  });

  const updateHost = useMutation({
    mutationFn: async ({ id, name, hostname }: { id: string; name: string; hostname: string }) => {
      const { data } = await api.patch(`/hosts/${id}`, { name, hostname });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hosts'] });
      setEditingHost(null);
    },
  });

  const deleteHost = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/hosts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hosts'] });
      setDeletingHost(null);
    },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditOpen = (host: Host) => {
    setEditingHost(host);
    setEditName(host.name);
    setEditHostname(host.hostname);
  };

  const hosts = data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Hosts</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Host
        </button>
      </div>

      {showAdd && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Add New Host</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newHostName}
                onChange={(e) => setNewHostName(e.target.value)}
                placeholder="Production Server 1"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hostname
              </label>
              <input
                type="text"
                value={newHostHostname}
                onChange={(e) => setNewHostHostname(e.target.value)}
                placeholder="server1.example.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <button
            onClick={() =>
              createHost.mutate({ name: newHostName, hostname: newHostHostname })
            }
            disabled={!newHostName || !newHostHostname || createHost.isPending}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createHost.isPending ? 'Creating...' : 'Create Host'}
          </button>

          {installCommand && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Install the agent on your Linux host:
              </p>
              <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-3">
                <code className="flex-1 text-xs text-green-400 font-mono overflow-x-auto">
                  {installCommand}
                </code>
                <button
                  onClick={handleCopy}
                  className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editingHost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Edit Host</h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hostname</label>
                <input
                  type="text"
                  value={editHostname}
                  onChange={(e) => setEditHostname(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingHost(null)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => updateHost.mutate({ id: editingHost.id, name: editName, hostname: editHostname })}
                disabled={!editName || !editHostname || updateHost.isPending}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updateHost.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingHost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Delete Host</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-100">{deletingHost.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingHost(null)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteHost.mutate(deletingHost.id)}
                disabled={deleteHost.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteHost.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : hosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <Server className="w-10 h-10 mb-3 text-gray-300" />
          <p className="font-medium">No hosts yet</p>
          <p className="text-sm mt-1">Add a host to start monitoring</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Host
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  OS
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Seen
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {hosts.map((host) => (
                <tr key={host.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{host.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{host.hostname}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                        statusBadge[host.status] ?? statusBadge['UNKNOWN'],
                      )}
                    >
                      <StatusIcon status={host.status} />
                      {host.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {host.ipAddress ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {host.os ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {host.lastSeen ? new Date(host.lastSeen).toLocaleString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <HostMenu host={host} onEdit={handleEditOpen} onDelete={setDeletingHost} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
