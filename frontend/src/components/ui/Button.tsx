import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-obsidian-950 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs font-semibold gap-1.5",
    md: "px-4 py-2 text-sm font-semibold gap-2",
    lg: "px-6 py-2.5 text-base font-bold gap-2.5",
  };

  const variantStyles = {
    primary: "bg-coral-500 hover:bg-coral-600 text-white shadow-quantum-glow hover:shadow-lg focus:ring-coral-500 active:scale-[0.98]",
    secondary: "bg-obsidian-800 hover:bg-obsidian-700 text-slate-200 border border-obsidian-700 hover:border-slate-500 focus:ring-slate-500",
    outline: "border border-coral-500/50 hover:border-coral-500 text-coral-400 hover:bg-coral-500/10 focus:ring-coral-500",
    ghost: "text-slate-400 hover:text-white hover:bg-obsidian-800/60 focus:ring-slate-600",
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-md focus:ring-rose-500",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};
