import React, { useState, useEffect } from 'react';
import { Shield, Key, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import client from '../api/client';

const Setup: React.FC = () => {
    const [apiToken, setApiToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<any>(null);
    const [error, setError] = useState('');

    const fetchStatus = async () => {
        try {
            const { data } = await client.get('/api/setup/status');
            setStatus(data);
        } catch (err) {
            console.error('Failed to fetch setup status', err);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await client.post('/api/setup/cloudflare', { api_token: apiToken });
            await fetchStatus();
            setApiToken('');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Setup failed. Please check your token.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">System Setup</h2>
                    <p className="text-slate-400 mt-1">Configure your Cloudflare integration to enable DDNS.</p>
                </div>
                {status?.configured ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        System Configured
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-sm font-medium">
                        <AlertCircle className="w-4 h-4" />
                        Needs Configuration
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Main Setup Card */}
                    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-8">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <Shield className="w-6 h-6 text-blue-500" />
                            Cloudflare API Configuration
                        </h3>

                        <form onSubmit={handleSetup} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Cloudflare API Token</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                                        <Key className="w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                        placeholder={status?.configured ? "••••••••••••••••" : "Paste your API token here..."}
                                        value={apiToken}
                                        onChange={(e) => setApiToken(e.target.value)}
                                    />
                                </div>
                                <p className="mt-3 text-xs text-slate-500">
                                    Tokens are encrypted with AES-256-GCM before storage. Driftlock never exposes your raw token to the frontend after configuration.
                                </p>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-sm">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold">Configuration Error</p>
                                        <p className="mt-0.5">{error}</p>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 group shadow-xl shadow-blue-600/20"
                            >
                                {loading ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        {status?.configured ? 'Update Configuration' : 'Save Configuration'}
                                        <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Status Details */}
                    {status?.configured && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                                <p className="text-slate-500 text-sm font-medium">Zones Cached</p>
                                <p className="text-3xl font-bold text-white mt-1">{status.zones_count}</p>
                            </div>
                            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                                <p className="text-slate-500 text-sm font-medium">Last Verified</p>
                                <p className="text-lg font-bold text-white mt-1">
                                    {status.verified_at ? new Date(status.verified_at).toLocaleString() : 'Just now'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-blue-600/10 border border-blue-500/20 rounded-3xl p-8">
                        <h4 className="text-lg font-bold text-blue-400 mb-4">How it works</h4>
                        <ul className="space-y-4 text-sm text-slate-300">
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">1</span>
                                Create an API Token in your Cloudflare dashboard with "Zone.DNS" edit permissions.
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">2</span>
                                Paste the token here. Driftlock will verify it and cache your available zones.
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">3</span>
                                Start adding services! We'll handle the DNS record updates automatically.
                            </li>
                        </ul>
                        <a
                            href="https://dash.cloudflare.com/profile/api-tokens"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            Cloudflare Dashboard
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Setup;
