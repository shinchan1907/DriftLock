import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    MoreVertical,
    RefreshCw,
    Shield,
    Globe,
    Zap,
    Trash2,
    ExternalLink,
    ChevronRight,
    Loader2,
    AlertCircle,
    Server,
    Link2,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';
import client from '../api/client';

const Services: React.FC = () => {
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [togglingTunnel, setTogglingTunnel] = useState<number | null>(null);
    const [zones, setZones] = useState<any[]>([]);
    const [newService, setNewService] = useState({
        name: '',
        subdomain: '',
        zone_id: '',
        zone_name: '',
        record_type: 'A',
        port: '',
        proxied: false,
        check_interval: 300,
        tunnel_mode: false,
        local_service_url: ''
    });

    const fetchServices = async () => {
        try {
            const { data } = await client.get('/services');
            setServices(data);
        } catch (err) {
            console.error('Failed to fetch services', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchZones = async () => {
        try {
            const { data } = await client.get('/setup/status');
            if (data.configured && data.zones) {
                setZones(data.zones);
            }
        } catch (err) {
            console.error('Failed to fetch zones', err);
        }
    };

    useEffect(() => {
        fetchServices();
        fetchZones();
    }, []);

    const handleAddService = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = {
                ...newService,
                port: newService.port ? parseInt(newService.port.toString()) : null
            };
            const response = await client.post('/services', data);

            if (newService.tunnel_mode) {
                try {
                    await client.post(`/tunnels/${response.data.id}`, {
                        local_service_url: newService.local_service_url || `http://localhost:${newService.port || 80}`
                    });
                } catch (tunnelErr: any) {
                    alert('Service created, but Tunnel setup failed: ' + (tunnelErr.response?.data?.detail || tunnelErr.message));
                }
            }

            setShowAddModal(false);
            setNewService({
                name: '',
                subdomain: '',
                zone_id: '',
                zone_name: '',
                record_type: 'A',
                port: '',
                proxied: false,
                check_interval: 300,
                tunnel_mode: false,
                local_service_url: ''
            });
            fetchServices();
        } catch (err) {
            alert('Failed to add service');
        }
    };

    const deleteService = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this service?')) {
            await client.delete(`/services/${id}`);
            fetchServices();
        }
    };

    const toggleTunnel = async (service: any) => {
        setTogglingTunnel(service.id);
        try {
            if (service.tunnel_mode) {
                if (window.confirm(`Disable Tunnel for ${service.name}? Service will revert to standard DDNS.`)) {
                    await client.delete(`/tunnels/${service.id}`);
                }
            } else {
                const localUrl = window.prompt(`Enter your local service URL for ${service.name}:`, `http://localhost:${service.port || 3001}`);
                if (localUrl) {
                    await client.post(`/tunnels/${service.id}`, { local_service_url: localUrl });
                }
            }
            await fetchServices();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to toggle tunnel mode');
        } finally {
            setTogglingTunnel(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Services</h2>
                    <p className="text-slate-400 mt-1">Manage your dynamic DNS endpoints and monitoring.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-600/20 group"
                >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    Add Service
                </button>
            </div>

            {/* Stats Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                        <Globe className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Services</p>
                        <p className="text-2xl font-bold text-white">{services.length}</p>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                        <Zap className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active Agents</p>
                        <p className="text-2xl font-bold text-white">{services.filter(s => s.current_ip).length}</p>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                        <Link2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active Tunnels</p>
                        <p className="text-2xl font-bold text-white">{services.filter(s => s.tunnel_mode).length}</p>
                    </div>
                </div>
            </div>

            {/* Services Table */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/30">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Filter services..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => fetchServices()}
                            className="p-3 text-slate-400 hover:text-white transition-colors bg-slate-800/50 rounded-xl border border-slate-700/50"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">Service & Hostname</th>
                                <th className="px-6 py-4">Current IP</th>
                                <th className="px-6 py-4">Settings</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
                                        <p className="text-slate-500 mt-4 font-medium">Loading your services...</p>
                                    </td>
                                </tr>
                            ) : services.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="p-4 bg-slate-950 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 border border-slate-800">
                                            <Server className="w-8 h-8 text-slate-700" />
                                        </div>
                                        <p className="text-slate-300 font-bold text-lg">No services found</p>
                                        <p className="text-slate-500 text-sm mt-1 mb-6">Start by adding your first DDNS endpoint.</p>
                                        <button
                                            onClick={() => setShowAddModal(true)}
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white font-bold rounded-2xl transition-all border border-blue-600/20"
                                        >
                                            <Plus className="w-5 h-5" />
                                            Add First Service
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                services
                                    .filter(s =>
                                        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        s.subdomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        s.zone_name.toLowerCase().includes(searchQuery.toLowerCase())
                                    )
                                    .map((service) => (
                                        <tr key={service.id} className="hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-blue-500 font-bold">
                                                        {service.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold">{service.name}</p>
                                                        <p className="text-slate-500 text-xs font-mono">
                                                            {service.subdomain}.{service.zone_name}
                                                        </p>
                                                        {service.tunnel_mode && service.local_service_url && (
                                                            <p className="text-blue-500/70 text-[10px] font-mono mt-0.5 flex items-center gap-1">
                                                                <ChevronRight className="w-2 h-2" />
                                                                {service.local_service_url}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 font-mono text-sm text-slate-300">
                                                {service.current_ip || (
                                                    <span className="text-slate-600 italic">No IP detected</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex gap-2">
                                                    <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-400">
                                                        {service.record_type}
                                                    </span>
                                                    {service.proxied && !service.tunnel_mode && (
                                                        <span className="px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg text-xs font-bold text-orange-500 flex items-center gap-1">
                                                            <Zap className="w-3 h-3" />
                                                            Proxied
                                                        </span>
                                                    )}
                                                    {service.tunnel_mode && (
                                                        <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs font-bold text-blue-500 flex items-center gap-1">
                                                            <Link2 className="w-3 h-3" />
                                                            CF Tunnel
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => toggleTunnel(service)}
                                                            disabled={togglingTunnel === service.id}
                                                            className={`transition-colors ${togglingTunnel === service.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            title={service.tunnel_mode ? "Disable Tunnel" : "Enable Tunnel"}
                                                        >
                                                            {service.tunnel_mode ? (
                                                                <ToggleRight className="w-8 h-8 text-blue-500 fill-blue-500/10" />
                                                            ) : (
                                                                <ToggleLeft className="w-8 h-8 text-slate-600" />
                                                            )}
                                                        </button>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${service.tunnel_mode ? 'text-blue-500' : 'text-slate-500'}`}>
                                                            {service.tunnel_mode ? 'Tunnel Active' : 'Tunnel Off'}
                                                        </span>
                                                        {togglingTunnel === service.id && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                                                    </div>

                                                    {(service.current_ip || (service.tunnel_mode && service.tunnel_id)) ? (
                                                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full w-fit">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                            Online
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold bg-slate-800/50 border border-slate-800 px-3 py-1.5 rounded-full w-fit">
                                                                <span className="w-2 h-2 rounded-full bg-slate-600" />
                                                                Offline
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {!service.current_ip && (
                                                        <a
                                                            href="/download"
                                                            className="px-3 py-1.5 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-blue-600/20"
                                                        >
                                                            Get Agent
                                                        </a>
                                                    )}
                                                    <button className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
                                                        <ExternalLink className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteService(service.id)}
                                                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Service Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
                    <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-800">
                            <h3 className="text-2xl font-bold text-white">Add New Service</h3>
                            <p className="text-slate-400 text-sm mt-1">Configure a new dynamic DNS record.</p>
                        </div>

                        <form onSubmit={handleAddService} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">Service Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="e.g. Home Server"
                                        value={newService.name}
                                        onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">Subdomain</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="e.g. home"
                                        value={newService.subdomain}
                                        onChange={(e) => setNewService({ ...newService, subdomain: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">Target Zone</label>
                                    <select
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                                        value={newService.zone_id}
                                        onChange={(e) => {
                                            const zone = zones.find(z => z.id === e.target.value);
                                            setNewService({ ...newService, zone_id: e.target.value, zone_name: zone?.name || '' });
                                        }}
                                    >
                                        <option value="">Select a zone...</option>
                                        {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">Check Port (Internal)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="e.g. 8080"
                                        value={newService.port}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewService({ ...newService, port: e.target.value })}
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">Service Mode</label>
                                    <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-2xl mb-4">
                                        <button
                                            type="button"
                                            onClick={() => setNewService({ ...newService, tunnel_mode: false })}
                                            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold transition-all ${!newService.tunnel_mode ? 'bg-slate-800 text-slate-300 shadow-lg' : 'text-slate-500 hover:text-slate-400'}`}
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            Standard DDNS
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewService({ ...newService, tunnel_mode: true })}
                                            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold transition-all ${newService.tunnel_mode ? 'bg-blue-600/20 text-blue-500 border border-blue-600/30' : 'text-slate-500 hover:text-slate-400'}`}
                                        >
                                            <Link2 className="w-4 h-4" />
                                            Cloudflare Tunnel
                                        </button>
                                    </div>

                                    {newService.tunnel_mode ? (
                                        <div className="animate-in slide-in-from-top-2 duration-200">
                                            <label className="block text-sm font-semibold text-slate-300 mb-2 text-blue-400">Local Service URL (Internal)</label>
                                            <input
                                                type="text"
                                                required={newService.tunnel_mode}
                                                className="w-full bg-slate-950 border border-blue-900/50 rounded-2xl px-4 py-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
                                                placeholder="e.g. http://localhost:3001"
                                                value={newService.local_service_url}
                                                onChange={(e) => setNewService({ ...newService, local_service_url: e.target.value })}
                                            />
                                            <p className="mt-2 text-[10px] text-blue-500/70 text-center font-medium italic">Tunnels bypass firewalls and port forwarding automatically</p>
                                        </div>
                                    ) : (
                                        <div className="animate-in slide-in-from-top-2 duration-200">
                                            <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-2xl">
                                                <button
                                                    type="button"
                                                    onClick={() => setNewService({ ...newService, proxied: false })}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold transition-all ${!newService.proxied ? 'bg-slate-800 text-slate-300 shadow-lg' : 'text-slate-500 hover:text-slate-400'}`}
                                                >
                                                    <div className="w-3 h-3 rounded-full bg-slate-500" />
                                                    Grey Cloud (DNS Only)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewService({ ...newService, proxied: true })}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold transition-all ${newService.proxied ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' : 'text-slate-500 hover:text-slate-400'}`}
                                                >
                                                    <Zap className="w-4 h-4 fill-orange-500" />
                                                    Orange Cloud (Proxied)
                                                </button>
                                            </div>
                                            <p className="mt-2 text-[10px] text-slate-500 uppercase tracking-widest text-center">Standard DDNS requires manual port forwarding on your router</p>
                                        </div>
                                    )}
                                </div>

                                <div className="col-span-2 p-6 bg-slate-950 border border-slate-800 rounded-2xl">
                                    <p className="text-slate-500 text-xs font-bold uppercase mb-4 tracking-widest">Public Hostname Preview</p>
                                    <div className="flex items-center gap-3">
                                        <Globe className="w-5 h-5 text-blue-500" />
                                        <span className="text-lg font-bold text-white tracking-tight">
                                            {newService.subdomain || '---'}.{newService.zone_name || 'yourdomain.com'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-600/20"
                                >
                                    Create Service
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Services;
