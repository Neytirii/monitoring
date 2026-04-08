import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, Network, Server, Bell, Settings, Zap, Plus, ChevronDown, ChevronRight, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import api from '../../lib/api';

interface Dashboard {
  id: string;
  name: string;
}

const staticNavItems = [
  { to: '/hosts', icon: Server, label: 'Hosts' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/triggers', icon: Zap, label: 'Triggers' },
  { to: '/network-map/default', icon: Network, label: 'Network Map' },
];

function DashboardMenu({ dashboard, onRename, onDelete }: { dashboard: Dashboard; onRename: (d: Dashboard) => void; onDelete: (d: Dashboard) => void }) {
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
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Dashboard options"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute left-full top-0 ml-1 w-36 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
          <button
            onClick={(e) => { e.preventDefault(); setOpen(false); onRename(dashboard); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 rounded-t-lg transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Rename
          </button>
          <button
            onClick={(e) => { e.preventDefault(); setOpen(false); onDelete(dashboard); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-red-900/30 rounded-b-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const [dashboardsOpen, setDashboardsOpen] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [renamingDashboard, setRenamingDashboard] = useState<Dashboard | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingDashboard, setDeletingDashboard] = useState<Dashboard | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['dashboards'],
    queryFn: async () => {
      const { data } = await api.get('/dashboards');
      return data.dashboards as Dashboard[];
    },
  });

  const createDashboard = useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post('/dashboards', { name });
      return data.dashboard as Dashboard;
    },
    onSuccess: (dashboard) => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      setNewDashboardName('');
      setShowCreate(false);
      navigate(`/dashboard/${dashboard.id}`);
    },
  });

  const renameDashboard = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data } = await api.put(`/dashboards/${id}`, { name });
      return data.dashboard as Dashboard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      setRenamingDashboard(null);
    },
  });

  const deleteDashboard = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/dashboards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      setDeletingDashboard(null);
      navigate('/hosts');
    },
  });

  const dashboards = data ?? [];

  return (
    <>
      <aside className="flex flex-col w-64 bg-gray-900 dark:bg-gray-950 text-gray-100 min-h-screen">
        <div className="flex items-center h-16 px-6 border-b border-gray-700">
          <span className="text-xl font-bold text-primary-400">Monitoring</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {staticNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                )
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}

          {/* Dashboards section */}
          <div className="pt-2">
            <div className="flex items-center justify-between px-3 py-1.5">
              <button
                onClick={() => setDashboardsOpen((v) => !v)}
                className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-200 transition-colors"
              >
                {dashboardsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                Dashboards
              </button>
              <button
                onClick={() => setShowCreate((v) => !v)}
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                aria-label="New dashboard"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {showCreate && (
              <div className="px-3 py-2">
                <input
                  type="text"
                  value={newDashboardName}
                  onChange={(e) => setNewDashboardName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newDashboardName.trim()) createDashboard.mutate(newDashboardName.trim());
                    if (e.key === 'Escape') { setShowCreate(false); setNewDashboardName(''); }
                  }}
                  placeholder="Dashboard name…"
                  autoFocus
                  className="w-full px-2 py-1.5 text-sm rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => { createDashboard.mutate(newDashboardName.trim()); }}
                    disabled={!newDashboardName.trim() || createDashboard.isPending}
                    className="flex-1 py-1 text-xs bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {createDashboard.isPending ? 'Creating…' : 'Create'}
                  </button>
                  <button
                    onClick={() => { setShowCreate(false); setNewDashboardName(''); }}
                    className="flex-1 py-1 text-xs text-gray-400 hover:text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {dashboardsOpen && (
              <div className="mt-1 space-y-0.5">
                {dashboards.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-gray-500">No dashboards yet</p>
                ) : (
                  dashboards.map((d) => (
                    <NavLink
                      key={d.id}
                      to={`/dashboard/${d.id}`}
                      className={({ isActive }) =>
                        clsx(
                          'group flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                        )
                      }
                    >
                      <span className="flex items-center gap-2 truncate">
                        <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{d.name}</span>
                      </span>
                      <DashboardMenu
                        dashboard={d}
                        onRename={(db) => { setRenamingDashboard(db); setRenameValue(db.name); }}
                        onDelete={setDeletingDashboard}
                      />
                    </NavLink>
                  ))
                )}
              </div>
            )}
          </div>
        </nav>

        <div className="px-4 py-4 border-t border-gray-700">
          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
            Settings
          </NavLink>
        </div>
      </aside>

      {/* Rename modal */}
      {renamingDashboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Rename Dashboard</h2>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRenamingDashboard(null)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => renameDashboard.mutate({ id: renamingDashboard.id, name: renameValue.trim() })}
                disabled={!renameValue.trim() || renameDashboard.isPending}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {renameDashboard.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete dashboard confirmation modal */}
      {deletingDashboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Delete Dashboard</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-100">{deletingDashboard.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingDashboard(null)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteDashboard.mutate(deletingDashboard.id)}
                disabled={deleteDashboard.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteDashboard.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
