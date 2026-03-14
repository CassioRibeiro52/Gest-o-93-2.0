import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setError('Erro de configuração: Firebase não inicializado.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Erro de Autenticação:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('O cadastro por e-mail/senha não está ativado no Firebase Console. Use o Google ou ative-o manualmente.');
      } else {
        setError(`Erro: ${err.message || 'Verifique sua conexão.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth) {
      setError('Erro de configuração: Firebase não inicializado.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Erro Google Login:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelado.');
      } else {
        setError(`Erro Google: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!auth) return;
    if (!email) {
      setError('Digite seu e-mail para recuperar a senha.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      setError('');
    } catch (err: any) {
      setError('Erro ao enviar e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans">
      {/* Lado Esquerdo: Imagem e Frase */}
      <div className="md:w-1/2 lg:w-3/5 relative h-[35vh] md:h-screen overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1600" 
          className="absolute inset-0 w-full h-full object-cover" 
          alt="Mulher fazendo compras" 
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-indigo-950/40"></div>
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-24 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-2xl border border-white/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter">
              Gestão <span className="text-purple-400">93</span>
            </h1>
          </div>
          <p className="text-lg md:text-2xl font-bold italic drop-shadow-lg">“Lute Pelos seus Sonhos hoje !”</p>
        </div>
      </div>

      {/* Lado Direito: Formulário de Login */}
      <div className="flex-1 flex flex-col justify-center p-8 md:p-12 bg-slate-50 relative overflow-y-auto">
        <div className="max-w-md w-full mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              {isRegistering ? 'Criar Nova Conta' : 'Acesse seu Painel'}
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Sincronização em Nuvem Ativa</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase p-4 rounded-2xl text-center">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase p-4 rounded-2xl text-center">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Processando...' : isRegistering ? 'Cadastrar Agora' : 'Entrar no Sistema'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative flex items-center justify-center mb-6">
              <div className="border-t border-slate-200 w-full"></div>
              <span className="bg-slate-50 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest absolute">ou</span>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white border border-slate-200 text-slate-700 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Entrar com Google
            </button>
          </div>

          <div className="mt-8 space-y-4 text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
            >
              {isRegistering ? 'Já tenho uma conta? Entrar' : 'Não tem conta? Cadastre-se'}
            </button>
            
            {!isRegistering && (
              <div>
                <button
                  onClick={handleResetPassword}
                  className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-500 transition"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

