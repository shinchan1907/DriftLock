import React, { useState, useEffect } from 'react';
import {
    Download as DownloadIcon,
    Terminal,
    Monitor,
    Cpu,
    Copy,
    Check,
    ExternalLink,
    ShieldCheck,
    AlertTriangle
} from 'lucide-react';
import client from '../api/client';

const Download: React.FC = () => {
    const [services, setServices] = useState<any[]>([]);
    const [selectedService, setSelectedService] = useState<string>('');
    const [platform, setPlatform] = useState<string>('windows-ps1');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchServices = async () => {
            const { data } = await client.get('/services');
            setServices(data);
        };
        fetchServices();
    }, []);

    const handleDownload = async () => {
        if (!selectedService) return;
        try {
            const response = await client.get(`/agents/download?service_id=${selectedService}&platform=${platform}`, {
                responseType: 'blob'
            });

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Get filename from header if possible
            const contentDisposition = response.headers['content-disposition'];
            let filename = `driftlock-agent-${platform}`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch?.[1]) filename = filenameMatch[1];
            } else {
                filename += platform === 'windows-ps1' ? '.ps1' : '.sh';
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed', err);
            alert('Failed to download agent. Please ensure you are logged in.');
        }
    };

    const platforms = [
        { id: 'windows-ps1', name: 'Windows (PowerShell)', icon: Monitor, color: 'text-blue-500' },
        { id: 'windows-exe', name: 'Windows (Standalone EXE)', icon: ShieldCheck, color: 'text-emerald-500' },
        { id: 'linux', name: 'Linux (systemd)', icon: Terminal, color: 'text-orange-500' },
        { id: 'raspberry-pi', name: 'Raspberry Pi', icon: Cpu, color: 'text-red-500' },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Download Agent</h2>
                <p className="text-slate-400 mt-1">Deploy the Driftlock agent on your remote devices.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-8">
                        <h3 className="text-xl font-bold text-white mb-6">1. Select Target Service</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {services.map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => setSelectedService(s.id)}
                                    className={`p-4 rounded-2xl border transition-all text-left group ${selectedService === s.id
                                        ? 'bg-blue-600/10 border-blue-500'
                                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                                        }`}
                                >
                                    <p className={`font-bold transition-colors ${selectedService === s.id ? 'text-blue-400' : 'text-slate-300'}`}>
                                        {s.name}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1 font-mono">{s.subdomain}.{s.zone_name}</p>
                                </button>
                            ))}
                            {services.length === 0 && (
                                <div className="col-span-2 p-6 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                                    <p className="text-slate-500 text-sm">No services configured yet.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-8">
                        <h3 className="text-xl font-bold text-white mb-6">2. Choose Platform</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {platforms.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => setPlatform(p.id)}
                                    className={`p-6 rounded-2xl border transition-all text-left flex items-center gap-4 ${platform === p.id
                                        ? 'bg-blue-600/10 border-blue-500'
                                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                                        }`}
                                >
                                    <div className={`p-3 rounded-xl bg-slate-900 border border-slate-800 ${platform === p.id ? p.color : 'text-slate-500'}`}>
                                        <p.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className={`font-bold transition-colors ${platform === p.id ? 'text-white' : 'text-slate-400'}`}>
                                            {p.name}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        disabled={!selectedService}
                        onClick={handleDownload}
                        className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-lg rounded-[2rem] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-600/30 group"
                    >
                        <DownloadIcon className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
                        Download Driftlock Agent
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
                        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Terminal className="w-5 h-5 text-blue-500" />
                            Install Commands
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Direct Download Link (Browser/Curl)</p>
                                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 relative group">
                                    <code className="text-[10px] text-blue-400 break-all">
                                        {window.location.origin}/agents/download?service_id={selectedService || 'ID'}&platform={platform}&query_token={localStorage.getItem('access_token')?.substring(0, 10)}...
                                    </code>
                                    <button
                                        onClick={() => {
                                            if (!selectedService) {
                                                alert('Please select a service first.');
                                                return;
                                            }
                                            const token = localStorage.getItem('access_token');
                                            const url = `${window.location.origin}/agents/download?service_id=${selectedService}&platform=${platform}&query_token=${token}`;
                                            navigator.clipboard.writeText(url);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className="absolute right-2 top-2 p-1.5 bg-slate-900 rounded-lg text-slate-500 hover:text-white transition-colors"
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                                <p className="mt-2 text-[10px] text-slate-600 italic">This link contains your private token. Use it to download from direct browser URL.</p>
                            </div>

                            {platform === 'windows-ps1' ? (
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Windows (Admin PowerShell)</p>
                                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                                        <code className="text-[10px] text-emerald-400 break-all">
                                            powershell -ExecutionPolicy Bypass -File .\driftlock-agent.ps1
                                        </code>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Linux (Root Bash)</p>
                                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                                        <code className="text-[10px] text-emerald-400 break-all">
                                            sudo bash driftlock-agent.sh
                                        </code>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-8">
                    <h4 className="text-lg font-bold text-amber-500 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Security Note
                    </h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Driftlock agents contain sensitive API keys. Never share agent files or publish them publicly.
                        The agent requires administrator/root privileges to install background services and manage scheduled tasks.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Download;
