import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Server,
    History,
    Download,
    Settings,
    Anchor,
    Lock,
    X
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
    return twMerge(clsx(inputs));
}

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

const navItems = [
    { name: 'Analytics', href: '/analytics', icon: LayoutDashboard },
    { name: 'Services', href: '/services', icon: Server },
    { name: 'Download Agent', href: '/download', icon: Download },
    { name: 'Update Logs', href: '/logs', icon: History },
    { name: 'Setup', href: '/setup', icon: Settings },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
    return (
        <>
            {/* Mobile Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity duration-300",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setIsOpen(false)}
            />

            {/* Sidebar Content */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    {/* Logo Section */}
                    <div className="flex items-center justify-between h-20 px-6 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
                                <Anchor className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1">
                                Driftlock <Lock className="w-3 h-3 text-blue-400" />
                            </span>
                        </div>
                        <button
                            className="p-2 text-slate-400 lg:hidden hover:text-white"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.href}
                                to={item.href}
                                onClick={() => setIsOpen(false)}
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                    isActive
                                        ? "bg-blue-600/10 text-blue-400 font-medium"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                                )}
                            >
                                <item.icon className={cn(
                                    "w-5 h-5 transition-colors",
                                    "group-hover:text-blue-400"
                                )} />
                                {item.name}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Footer Branding */}
                    <div className="p-6 border-t border-slate-800">
                        <div className="text-xs text-slate-500 font-medium">
                            v1.0.0 · Self-hosted
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
