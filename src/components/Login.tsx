import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const Login: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsAuthenticating(true);

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Erro ao autenticar. Verifique suas credenciais.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google Auth error:', err);
      setError(err.message || 'Erro ao autenticar com Google.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Visual Section */}
      <div className="hidden md:flex md:w-1/2 lg:w-2/3 relative overflow-hidden">
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-indigo-950 via-indigo-900/40 to-transparent"></div>
        
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-2 p-2">
          <div className="relative overflow-hidden rounded-lg">
            <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover" alt="Store" />
          </div>
          <div className="relative overflow-hidden rounded-lg">
            <img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover" alt="Fashion" />
          </div>
          <div className="relative overflow-hidden rounded-lg group">
            <img src="https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover transform group-hover:scale-105 transition duration-700" alt="Business" />
            <div className="absolute inset-0 flex items-center justify-center p-6 bg-indigo-950/40">
              <p className="text-white text-xl lg:text-3xl font-black text-center uppercase tracking-widest leading-none drop-shadow-2xl italic">
                Acesse de qualquer lugar
              </p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg">
            <img src="https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover" alt="Clothing" />
          </div>
        </div>

        <div className="absolute bottom-12 left-12 z-20 max-w-lg text-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            </div>
            <h1 className="text-4xl font-black tracking-tighter italic uppercase">Gestão 93</h1>
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-4">Seus recebíveis sincronizados em tempo real.</h2>
        </div>
      </div>

      {/* Auth Section */}
      <div className="flex-1 flex flex-col justify-center p-8 md:p-12 lg:p-20 bg-slate-50">
        <div className="max-w-md w-full mx-auto">
          <div className="mb-8">
            <h3 className="text-3xl font-bold text-slate-800 mb-2">Seja bem-vindo</h3>
            <p className="text-slate-500 text-sm">Escolha como deseja acessar seus dados através do <b>Gestão 93</b>.</p>
          </div>

          <div className="space-y-4">
            {/* Google Login Button */}
            <button 
              onClick={handleGoogleLogin}
              disabled={isAuthenticating}
              className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-4 rounded-2xl hover:bg-slate-50 transition shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
            >
              {isAuthenticating ? (
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <img src="https://cdn-icons-png.flaticon.com/512/300/300221.png" className="h-6" alt="Google" />
              )}
              {isAuthenticating ? 'Conectando...' : 'Entrar com Google'}
            </button>

            <div className="relative py-4">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
               <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-50 px-2 text-slate-400 font-bold">Ou use e-mail local</span></div>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none transition" placeholder="seu@email.com" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Senha</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none transition" placeholder="••••••••" />
              </div>

              {error && <p className="text-rose-500 text-[10px] font-bold bg-rose-50 p-3 rounded-lg border border-rose-100">{error}</p>}

              <button type="submit" disabled={isAuthenticating} className="w-full bg-indigo-900 text-white font-bold py-4 rounded-xl hover:bg-indigo-950 transition shadow-lg shadow-indigo-100 disabled:opacity-50">
                {isRegistering ? 'Criar Conta Local' : 'Entrar no Painel'}
              </button>
            </form>

            <div className="text-center">
              <button onClick={() => setIsRegistering(!isRegistering)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition">
                {isRegistering ? 'Já tem conta? Faça Login' : 'Não tem conta? Cadastre sua loja'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
