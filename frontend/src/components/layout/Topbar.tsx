import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut, Bell, User } from 'lucide-react';
import { useAuthStore } from '../../store/auth';

interface TopbarProps {
    setSidebarOpen: (open: boolean) => void;
}

const Topbar: React.FC<TopbarProps> = ({ setSidebarOpen }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuthStore();

    const getPageTitle = () => {
        const path = location.pathname.substring(1);
        if (!path) return 'Dashboard';
        return path.charAt(0).toUpperCase() + path.slice(1).replace('-', ' ');
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="h-20 bg-slate-950/50 backdrop-blur-md border-b border-slate-900 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-4">
                <button
                    className="p-2 text-slate-400 hover:text-white transition-colors lg:hidden rounded-lg hover:bg-slate-900"
                    onClick={() => setSidebarOpen(true)}
                >
                    <Menu className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-semibold text-white tracking-tight">
                    {getPageTitle()}
                </h1>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                <button className="p-2.5 text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-slate-900 hidden md:flex">
                    <Bell className="w-5 h-5" />
                </button>

                <div className="h-8 w-px bg-slate-800 mx-2 hidden md:block" />

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-slate-100">Administrator</p>
                        <p className="text-xs text-slate-500">Full Access</p>
                    </div>
                    <button
                        className="flex items-center gap-2 p-1.5 pl-1.5 pr-2 md:pr-4 bg-slate-900 border border-slate-800 rounded-full hover:border-slate-700 transition-all text-slate-400 hover:text-white group"
                        onClick={handleLogout}
                    >
                        <div className="h-8 w-8 rounded-full bg-blue-600/10 text-blue-500 flex items-center justify-center font-bold border border-blue-500/20">
                            <User className="w-4 h-4" />
                        </div>
                        <LogOut className="w-4 h-4 hidden md:block group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Topbar;
