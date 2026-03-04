import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const AppShell: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans">
            {/* Sidebar - Mobile overlay */}
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Topbar setSidebarOpen={setSidebarOpen} />

                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AppShell;
