import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Anchor, Lock, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import client from '../api/client';
import { useAuthStore } from '../store/auth';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuthStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await client.post('/auth/login', { username, password });
            login({ username: response.data.username }, response.data.access_token);
            navigate('/analytics');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
            {/* Decorative Circles */}
            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md z-10">
                <div className="flex flex-col items-center mb-8">
                    <div className="p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20 mb-4 animate-in fade-in zoom-in duration-700">
                        <Anchor className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Driftlock</h1>
                    <p className="text-slate-400 text-center font-medium">Self-hosted DDNS · Powered by Cloudflare</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">Username</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                placeholder="Admin username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">Password</label>
                            <input
                                type="password"
                                required
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-1">
                                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-blue-600/20"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Login to Driftlock
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-center text-slate-500 text-sm">
                    Driftlock · Self-hosted on AWS Lightsail
                </p>
            </div>
        </div>
    );
};

export default Login;
