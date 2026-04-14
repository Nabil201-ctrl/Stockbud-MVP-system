import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { User, Mail, Lock, ArrowRight, Loader2, AlertCircle, Chrome, Eye, EyeOff, Check, X } from 'lucide-react';
import Slogo from '../../assets/Slogo.png';

const Signup = () => {
    const navigate = useNavigate();
    const { register, isAuthenticated, loading: authLoading } = useAuth();
    const { showNotification } = useNotification();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [strength, setStrength] = useState(0);

    if (!authLoading && isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    useEffect(() => {
        // Simple strength calculation
        let s = 0;
        if (password.length > 7) s++; // Length
        if (/[A-Z]/.test(password)) s++; // Uppercase
        if (/[0-9]/.test(password)) s++; // Number
        if (/[^A-Za-z0-9]/.test(password)) s++; // Special
        setStrength(s);
    }, [password]);

    const handleGoogleLogin = () => {
        window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (strength < 2) {
            setError('Please use a stronger password');
            return;
        }
        setLoading(true);
        setError('');

        const result = await register(name, email, password);
        if (result.success) {
            showNotification('Account created successfully!', 'success');
            navigate('/dashboard');
        } else {
            setError(result.error || 'Registration failed');
        }
        setLoading(false);
    };

    const getStrengthColor = () => {
        if (strength === 0) return 'bg-slate-200 dark:bg-slate-800';
        if (strength === 1) return 'bg-red-500';
        if (strength === 2) return 'bg-yellow-500';
        if (strength === 3) return 'bg-blue-500';
        return 'bg-green-500';
    };

    const getStrengthText = () => {
        if (strength === 0) return 'Too short';
        if (strength === 1) return 'Weak';
        if (strength === 2) return 'Fair';
        if (strength === 3) return 'Good';
        return 'Excellent';
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-950 p-4">
            {/* Background Decorative Elements */}
            <div className="absolute top-20 -right-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute -bottom-10 -left-4 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-700"></div>

            <div className="max-w-md w-full relative z-10 transition-all duration-500 hover:scale-[1.01]">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-slate-800/50">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-lg mb-6 group transition-transform duration-300 hover:scale-110">
                            <img src={Slogo} alt="Stockbud Logo" className="w-10 h-10 object-contain" />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
                            Create Account
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">Join the future of smart retail management</p>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        className="w-full py-3.5 px-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all flex items-center justify-center gap-3 mb-8 shadow-sm"
                    >
                        <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Sign up with Google
                    </button>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="group">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none dark:text-white transition-all shadow-inner"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        <div className="group">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none dark:text-white transition-all shadow-inner"
                                    placeholder="you@email.com"
                                />
                            </div>
                        </div>

                        <div className="group">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">Create Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-12 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none dark:text-white transition-all shadow-inner"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {/* Strength Meter */}
                            {password.length > 0 && (
                                <div className="mt-4 px-1">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Security Strength</span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${strength < 2 ? 'text-red-500' : 'text-green-500'}`}>{getStrengthText()}</span>
                                    </div>
                                    <div className="flex gap-1.5">
                                        {[1, 2, 3, 4].map((step) => (
                                            <div
                                                key={step}
                                                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step <= strength ? getStrengthColor() : 'bg-slate-100 dark:bg-slate-800'}`}
                                            ></div>
                                        ))}
                                    </div>
                                    <ul className="mt-3 grid grid-cols-2 gap-y-1.5">
                                        <li className={`flex items-center gap-1.5 text-[10px] ${password.length > 7 ? 'text-green-500' : 'text-slate-400'}`}>
                                            {password.length > 7 ? <Check size={10} /> : <X size={10} />} 8+ Characters
                                        </li>
                                        <li className={`flex items-center gap-1.5 text-[10px] ${/[A-Z]/.test(password) ? 'text-green-500' : 'text-slate-400'}`}>
                                            {/[A-Z]/.test(password) ? <Check size={10} /> : <X size={10} />} Uppercase
                                        </li>
                                        <li className={`flex items-center gap-1.5 text-[10px] ${/[0-9]/.test(password) ? 'text-green-500' : 'text-slate-400'}`}>
                                            {/[0-9]/.test(password) ? <Check size={10} /> : <X size={10} />} Number
                                        </li>
                                        <li className={`flex items-center gap-1.5 text-[10px] ${/[^A-Za-z0-9]/.test(password) ? 'text-green-500' : 'text-slate-400'}`}>
                                            {/[^A-Za-z0-9]/.test(password) ? <Check size={10} /> : <X size={10} />} Symbol
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium border border-red-100 dark:border-red-900/50">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold shadow-xl shadow-blue-500/30 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Start Your Journey <ArrowRight className="w-5 h-5" /></>}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            Joined us already?{' '}
                            <Link to="/auth/login" className="font-bold text-blue-600 hover:text-blue-500 underline underline-offset-4 decoration-2">Sign In</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;
