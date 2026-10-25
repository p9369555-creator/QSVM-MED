import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Atom, LogOut, User as UserIcon, ShieldAlert } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const Navbar: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-obsidian-700/80 bg-obsidian-950/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-coral-600 to-coral-400 flex items-center justify-center shadow-quantum-glow group-hover:scale-105 transition-all">
            <Atom className="w-5 h-5 text-white animate-spin-slow" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-slate-100 flex items-center gap-1.5">
              QuantumSVM <span className="text-coral-500 font-extrabold">Studio</span>
            </span>
            <span className="text-[10px] text-sand-300/80 tracking-widest uppercase block -mt-1 font-mono">
              QML Classification
            </span>
          </div>
        </Link>

        {/* Quantum Hardware Status Badge */}
        <div className="hidden md:flex items-center gap-2 ml-6 pl-6 border-l border-obsidian-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-mono text-slate-400">
            Simulator: <strong className="text-slate-200">Qiskit Aer (Fidelity)</strong>
          </span>
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        {user && (
          <>
            {isAdmin && (
              <Badge variant="coral" size="sm" className="hidden sm:inline-flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Admin Mode
              </Badge>
            )}

            <Link
              to="/profile"
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-obsidian-900 border border-obsidian-800 hover:border-slate-600 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-coral-500/20 text-coral-400 border border-coral-500/30 flex items-center justify-center font-bold text-xs">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-slate-200 hidden sm:inline">
                {user.username}
              </span>
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-coral-400 hover:bg-obsidian-900 border border-transparent hover:border-obsidian-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </header>
  );
};
