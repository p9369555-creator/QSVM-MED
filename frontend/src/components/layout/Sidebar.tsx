import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Database,
  Cpu,
  Activity,
  PlayCircle,
  Sparkles,
  GitCompare,
  FileText,
  ShieldAlert,
  User as UserIcon,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { isAdmin } = useAuth();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/datasets', label: 'Datasets', icon: Database },
    { to: '/feature-map', label: 'Feature Maps', icon: Cpu },
    { to: '/kernel-engine', label: 'Kernel Engine', icon: Activity },
    { to: '/training', label: 'Model Training', icon: PlayCircle },
    { to: '/prediction', label: 'Inference', icon: Sparkles },
    { to: '/evaluation', label: 'Evaluation & Benchmarks', icon: GitCompare },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/profile', label: 'Profile', icon: UserIcon },
  ];

  if (isAdmin) {
    navItems.push({ to: '/admin', label: 'Admin Studio', icon: ShieldAlert });
  }

  return (
    <aside className="w-64 border-r border-obsidian-700/80 bg-obsidian-950/60 backdrop-blur-md flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16">
      <div className="p-4 space-y-1.5 overflow-y-auto">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
          Platform Modules
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-coral-500 text-white shadow-quantum-glow font-bold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-obsidian-900 border border-transparent hover:border-obsidian-800'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Footer system status */}
      <div className="p-4 border-t border-obsidian-800/80 bg-obsidian-900/40 m-3 rounded-xl">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
          <span>QML Backend</span>
          <span className="text-emerald-400 font-mono font-bold">ONLINE</span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          Qiskit ML v0.7 • Scikit-Learn
        </div>
      </div>
    </aside>
  );
};
