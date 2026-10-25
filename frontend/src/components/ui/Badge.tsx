import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'coral' | 'sand' | 'cyan' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = ''
}) => {
  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
  };

  const variantStyles = {
    coral: "bg-coral-500/15 text-coral-400 border border-coral-500/30",
    sand: "bg-sand-300/15 text-sand-300 border border-sand-300/30",
    cyan: "bg-quantum-cyan/15 text-quantum-cyan border border-quantum-cyan/30",
    success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    danger: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
    neutral: "bg-obsidian-800 text-slate-300 border border-obsidian-700",
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return <Badge variant="success">Completed</Badge>;
    case 'running':
      return <Badge variant="coral" className="animate-pulse">Running</Badge>;
    case 'queued':
      return <Badge variant="warning">Queued</Badge>;
    case 'failed':
      return <Badge variant="danger">Failed</Badge>;
    case 'cancelled':
      return <Badge variant="neutral">Cancelled</Badge>;
    case 'active':
      return <Badge variant="success">Active</Badge>;
    case 'suspended':
      return <Badge variant="danger">Suspended</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
};
