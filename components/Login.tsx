import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Ocorreu um erro ao tentar entrar. Verifique sua conexão.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
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
