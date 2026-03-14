
import React, { useState, useEffect } from 'react';
import { Customer, Sale, User, Product } from '../types';
import { firebaseConfig } from '../services/firebase';

interface SettingsProps {
  user?: User | null;
  customers: Customer[];
  sales: Sale[];
  products: Product[];
  syncStatus?: 'synced' | 'syncing' | 'error';
  lastSyncTime?: number | null;
  isFirebaseConfigured?: boolean;
  onSync?: () => Promise<void>;
  onReload?: () => Promise<void>;
  onUpdateProfile?: (user: User) => void;
  onImport: (data: { customers: Customer[], sales: Sale[], products?: Product[] }) => void;
  onClear: () => void;
  onInstall?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  user, 
  customers, 
  sales, 
  products, 
  syncStatus, 
  lastSyncTime, 
  isFirebaseConfigured,
  onSync, 
  onReload,
  onUpdateProfile, 
  onImport,
  onClear, 
  onInstall 
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'ia' | 'sync' | 'backup' | 'deploy' | 'credits' | 'danger'>('profile');
  
  const [shopName, setShopName] = useState(user?.name || '');
  const [shopLogo, setShopLogo] = useState(user?.avatarUrl || '');
  const [geminiKey, setGeminiKey] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('gestao93_gemini_api_key') || '';
    setGeminiKey(savedKey);
  }, []);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (user && onUpdateProfile) {
      onUpdateProfile({ ...user, name: shopName, avatarUrl: shopLogo });
      alert('Perfil da loja atualizado!');
    }
  };

  const handleSaveIA = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('gestao93_gemini_api_key', geminiKey.trim());
    alert('Configuração de IA salva!');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setShopLogo(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleExport = () => {
    const data = { customers, sales, products, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_gestao93_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.customers && json.sales) {
          if (confirm('Isso substituirá seus dados atuais. Continuar?')) {
            onImport({ customers: json.customers, sales: json.sales, products: json.products || [] });
          }
        }
      } catch { alert('Erro no arquivo.'); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
        {[
          { id: 'profile', label: 'Perfil' },
          { id: 'ia', label: 'IA 🤖' },
          { id: 'sync', label: 'Sincronização ☁️' },
          { id: 'backup', label: 'Backup' },
          { id: 'deploy', label: 'App 📱' },
          { id: 'credits', label: 'Créditos' },
          { id: 'danger', label: 'Zerar' }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`px-6 py-3 text-xs font-black uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === tab.id ? 'text-indigo-800 border-b-2 border-indigo-800' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 min-h-[400px]">
        {activeTab === 'profile' && (
           <form onSubmit={handleUpdateProfile} className="max-w-xl space-y-8 animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-3xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden transition-all group-hover:border-indigo-400">
                    {shopLogo ? (
                      <img src={shopLogo} alt="Logo Preview" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-xl shadow-lg cursor-pointer hover:bg-indigo-700 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </label>
                </div>
                
                <div className="flex-1 space-y-4 w-full">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Nome da Loja</label>
                    <input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Boutique 93" />
                  </div>
                </div>
              </div>
              <button type="submit" className="bg-indigo-900 text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-indigo-950 transition-all active:scale-95">Salvar Perfil</button>
           </form>
        )}

        {activeTab === 'ia' && (
          <form onSubmit={handleSaveIA} className="max-w-xl space-y-6 animate-in fade-in duration-300">
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
              <h3 className="text-sm font-black text-indigo-900 uppercase italic mb-2">Configurar IA Gemini</h3>
              <p className="text-xs text-indigo-700 font-medium leading-relaxed mb-4">
                Para que o Dashboard mostre análises automáticas, você precisa de uma chave de API gratuita do Google AI Studio.
              </p>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">Gemini API Key</label>
                <input 
                  type="password" 
                  value={geminiKey} 
                  onChange={(e) => setGeminiKey(e.target.value)} 
                  className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Cole sua chave aqui..."
                />
              </div>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" className="inline-block mt-4 text-[10px] font-black text-indigo-600 uppercase underline">Obter chave gratuita no Google AI Studio</a>
            </div>
            <button type="submit" className="bg-indigo-900 text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-indigo-950 transition-all active:scale-95">Salvar Chave de IA</button>
          </form>
        )}

        {activeTab === 'sync' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-white p-3 rounded-2xl shadow-sm">
                  <svg className={`w-8 h-8 ${syncStatus === 'error' ? 'text-rose-500' : 'text-indigo-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase italic">Status da Nuvem</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Verifique a saúde da sua base de dados</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Estado Atual</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`}></div>
                    <p className="text-sm font-black text-slate-800 uppercase">
                      {syncStatus === 'synced' ? 'Sincronizado' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Erro na Conexão'}
                    </p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Última Atualização</p>
                  <p className="text-sm font-black text-slate-800 uppercase">
                    {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Aguardando...'}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm md:col-span-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Conexão com Servidor Google</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isFirebaseConfigured ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                    <p className="text-sm font-black text-slate-800 uppercase">
                      {isFirebaseConfigured ? 'Firebase Ativo e Operacional' : 'Firebase Não Detectado'}
                    </p>
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium mt-2 leading-tight">
                    {isFirebaseConfigured 
                      ? 'As chaves de segurança foram validadas e o banco de dados está pronto para receber seus dados.' 
                      : 'O sistema não detectou as chaves necessárias. Verifique o Diagnóstico abaixo.'}
                  </p>
                </div>
              </div>

              {!isFirebaseConfigured && (
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 space-y-3">
                  <h4 className="text-[10px] font-black text-rose-800 uppercase tracking-widest">Diagnóstico de Falha</h4>
                  <div className="space-y-2">
                    {[
                      { label: 'API Key', key: 'apiKey' },
                      { label: 'Project ID', key: 'projectId' },
                      { label: 'Auth Domain', key: 'authDomain' },
                      { label: 'App ID', key: 'appId' }
                    ].map(item => {
                      const val = (firebaseConfig as any)[item.key];
                      const isMissing = !val || val.includes('TODO');
                      const isTooShort = val && val.length < 5;
                      
                      return (
                        <div key={item.key} className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-slate-600">{item.label}:</span>
                          <span className={`font-black uppercase ${isMissing || isTooShort ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {isMissing ? 'Ausente ❌' : isTooShort ? 'Inválido ⚠️' : 'Detectado ✅'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-rose-700 font-medium leading-tight pt-2 border-t border-rose-200">
                    Certifique-se de que você salvou as variáveis de ambiente na plataforma e reiniciou o servidor se necessário.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                  O <b>Gestão 93</b> salva seus dados automaticamente a cada alteração. Se você estiver em um local com internet instável, pode usar o botão abaixo para forçar uma gravação manual ou recarregar os dados da nuvem.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => onSync && onSync()}
                    disabled={syncStatus === 'syncing'}
                    className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {syncStatus === 'syncing' ? 'Processando...' : 'Sincronizar Agora'}
                  </button>
                  <button 
                    onClick={() => onReload && onReload()}
                    disabled={syncStatus === 'syncing'}
                    className="bg-white text-indigo-600 border-2 border-indigo-600 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-50"
                  >
                    Recarregar da Nuvem
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Dicas de Segurança</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">Seus dados são salvos de forma privada no seu perfil do Google.</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">Você pode acessar de qualquer dispositivo usando o mesmo e-mail e senha.</p>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
           <div className="space-y-8 animate-in fade-in duration-300">
              <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 max-w-2xl">
                <p className="text-xs text-amber-900 font-bold leading-relaxed">Mantenha uma cópia de segurança. Recomendado baixar após grandes lançamentos.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <h3 className="text-sm font-black text-slate-900 uppercase italic">Exportar</h3>
                   <button onClick={handleExport} className="w-full bg-indigo-900 text-white px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-indigo-950 transition">Backup .JSON</button>
                </div>
                <div className="space-y-4">
                   <h3 className="text-sm font-black text-slate-900 uppercase italic">Importar</h3>
                   <label className="block w-full cursor-pointer bg-slate-100 text-slate-700 px-6 py-4 rounded-xl text-xs font-black uppercase text-center border border-slate-200 hover:bg-slate-200 transition">
                      Selecionar Arquivo
                      <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                   </label>
                </div>
              </div>
           </div>
        )}

        {activeTab === 'deploy' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-indigo-900 p-8 rounded-[2rem] text-white">
              <h3 className="text-2xl font-black italic uppercase mb-4">Instalar no Android</h3>
              <p className="text-sm text-indigo-200 font-medium mb-6">Transforme este site em um aplicativo real. Ele aparecerá na sua lista de apps e funcionará em tela cheia.</p>
              {onInstall && <button onClick={onInstall} className="bg-white text-indigo-900 px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl hover:bg-indigo-50 transition active:scale-95">Instalar Agora</button>}
            </div>
            {!onInstall && <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200 text-center"><p className="text-amber-800 text-xs font-black uppercase">Vá nos 3 pontinhos do Chrome e selecione "Instalar Aplicativo".</p></div>}
          </div>
        )}

        {activeTab === 'credits' && (
          <div className="space-y-8 animate-in fade-in duration-300 text-center">
            <h3 className="text-2xl font-black text-slate-900 uppercase italic">Idealização</h3>
            <p className="text-xl font-black text-indigo-950 uppercase italic mt-2">Cássio Ribeiro de Freitas</p>
          </div>
        )}

        {activeTab === 'danger' && (
           <div className="max-w-xl space-y-6 animate-in fade-in duration-300">
              <button onClick={() => { if (confirm('TEM CERTEZA? Isso não pode ser desfeito.')) onClear(); }} className="w-full bg-rose-600 text-white px-8 py-4 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg hover:bg-rose-700 transition-all active:scale-95">Zerar Todo o Sistema</button>
           </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
