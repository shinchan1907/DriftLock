import React, { useState, useEffect } from 'react';
import {
    Search,
    Filter,
    Download,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    AlertCircle,
    CheckCircle2,
    Info
} from 'lucide-react';
import client from '../api/client';

const Logs: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        service_id: '',
        status: ''
    });

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data } = await client.get('/api/logs', {
                params: {
                    page,
                    per_page: 20,
                    ...filters
                }
            });
            setLogs(data.items);
            setTotalPages(data.pages);
        } catch (err) {
            console.error('Failed to fetch logs', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, filters]);

    useEffect(() => {
        const fetchServices = async () => {
            const { data } = await client.get('/api/services');
            setServices(data);
        };
        fetchServices();
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'no_change': return <RefreshCw className="w-4 h-4 text-slate-500" />;
            default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'success': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'error': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'no_change': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
            default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Update Logs</h2>
                    <p className="text-slate-400 mt-1">Audit trail of all DNS updates and agent activity.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl hover:text-white hover:border-slate-700 transition-all text-sm font-bold">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                    <button
                        onClick={() => fetchLogs()}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg shadow-blue-600/20"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-[2rem] p-4 flex flex-col lg:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by IP or message..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-4 w-full lg:w-auto">
                    <select
                        className="flex-1 lg:w-48 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                        value={filters.service_id}
                        onChange={(e) => setFilters({ ...filters, service_id: e.target.value })}
                    >
                        <option value="">All Services</option>
                        {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select
                        className="flex-1 lg:w-40 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                        <option value="">All Statuses</option>
                        <option value="success">Success</option>
                        <option value="error">Error</option>
                        <option value="no_change">No Change</option>
                    </select>
                    <button className="p-3 bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl hover:text-white transition-all">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-slate-500 text-xs font-bold uppercase tracking-wider bg-slate-900/30">
                                <th className="px-6 py-5">Timestamp</th>
                                <th className="px-6 py-5">Service</th>
                                <th className="px-6 py-5">Update Details</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5">Agent / Platform</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 text-sm">
                            {loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-slate-500">
                                        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                                        Fetching logs...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center border border-slate-800 mx-auto mb-4 text-slate-700">
                                            <Clock className="w-8 h-8" />
                                        </div>
                                        <p className="text-slate-300 font-bold">No activity logs found</p>
                                        <p className="text-slate-500 text-xs mt-1">Logs will appear here once agents start reporting.</p>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-slate-100 font-medium">
                                                    {new Date(log.created_at).toLocaleDateString()}
                                                </span>
                                                <span className="text-slate-500 text-xs">
                                                    {new Date(log.created_at).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-white font-bold">{services.find(s => s.id === log.service_id)?.name || 'Deleted Service'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-slate-500 font-mono text-xs">{log.old_ip || '---'}</span>
                                                <ChevronRight className="w-3 h-3 text-slate-700" />
                                                <span className="text-blue-400 font-mono text-xs font-bold">{log.new_ip}</span>
                                            </div>
                                            {log.error_msg && (
                                                <p className="text-red-400/80 text-[10px] mt-1 italic max-w-xs truncate">{log.error_msg}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-extrabold uppercase tracking-widest ${getStatusStyles(log.status)}`}>
                                                {getStatusIcon(log.status)}
                                                {log.status.replace('_', ' ')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-300 text-xs font-medium">{log.source || 'Unknown Agent'}</span>
                                                <span className="text-slate-500 text-[10px]">{log.duration_ms}ms response</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-6 bg-slate-900/30 border-t border-slate-800 flex items-center justify-between">
                    <p className="text-xs text-slate-500 font-medium">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white disabled:opacity-50 transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white disabled:opacity-50 transition-all"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Logs;
