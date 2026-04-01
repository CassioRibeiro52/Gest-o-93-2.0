
import React, { useState, useEffect, useRef } from 'react';
import { Customer, Sale, User, Product, Expense, Condicional, CashierClosure, TrashItem } from '../types';
import Modal from './ui/Modal';
import { AlertTriangle, CheckCircle, Download, Upload, Trash2, Smartphone, Info, Bot } from 'lucide-react';

interface SettingsProps {
  user?: User | null;
  customers: Customer[];
  sales: Sale[];
  products: Product[];
  expenses: Expense[];
  condicionais: Condicional[];
  cashierClosures: CashierClosure[];
  trashSales: TrashItem[];
  syncStatus?: 'error' | 'synced' | 'syncing';
  lastSyncTime?: number;
  isFirebaseConfigured?: boolean;
  onSync?: () => Promise<void>;
  onUpdateProfile?: (user: User) => void;
  onImport: (data: { 
    customers: Customer[], 
    sales: Sale[], 
    products?: Product[],
    expenses?: Expense[],
    condicionais?: Condicional[],
    cashierClosures?: CashierClosure[],
    trashSales?: TrashItem[]
  }) => void;
  onClear: () => void;
  onInstall?: () => void;
  showNotification?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  user, customers, sales, products, expenses, condicionais, cashierClosures, trashSales,
  onUpdateProfile, onImport, onClear, onInstall, showNotification
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'ia' | 'backup' | 'deploy' | 'credits' | 'danger'>('profile');
  
  const [shopName, setShopName] = useState(user?.name || '');
  const [shopLogo, setShopLogo] = useState(user?.avatarUrl || '');
  const [geminiKey, setGeminiKey] = useState('');
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('gestao93_gemini_api_key') || '';
    setGeminiKey(savedKey);
  }, []);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (user && onUpdateProfile) {
      onUpdateProfile({ ...user, name: shopName, avatarUrl: shopLogo });
      if (showNotification) showNotification('Perfil da loja atualizado!', 'success');
    }
  };

  const handleSaveIA = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('gestao93_gemini_api_key', geminiKey.trim());
    if (showNotification) showNotification('Configuração de IA salva!', 'success');
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
    const data = { 
      customers, 
      sales, 
      products, 
      expenses,
      condicionais,
      cashierClosures,
      trashSales,
      exportDate: new Date().toISOString() 
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_gestao93_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (showNotification) showNotification('Backup exportado com sucesso!', 'success');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (e.g., limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      if (showNotification) showNotification('O arquivo é muito grande (máximo 10MB).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (!content) {
          if (showNotification) showNotification('O arquivo está vazio.', 'error');
          return;
        }

        const json = JSON.parse(content);
        
        // More flexible check: at least one of the main keys should exist
        const hasData = json && typeof json === 'object' && (
          json.customers || json.sales || json.products || json.expenses || 
          json.condicionais || json.cashierClosures || json.trashSales
        );
        
        if (hasData) {
          setPendingImportData(json);
          setIsImportModalOpen(true);
        } else {
          if (showNotification) showNotification('O arquivo não parece ser um backup válido do Gestão 93.', 'error');
        }
      } catch (err) { 
        console.error('Erro na leitura do JSON:', err);
        if (showNotification) showNotification('Erro ao processar o arquivo. Verifique se é um JSON válido.', 'error');
      }
    };
    reader.onerror = () => {
      if (showNotification) showNotification('Erro ao ler o arquivo do disco.', 'error');
    };
    reader.readAsText(file);
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const confirmImport = async () => {
    if (pendingImportData && !isImporting) {
      setIsImporting(true);
      try {
        await onImport({ 
          customers: pendingImportData.customers || [], 
          sales: pendingImportData.sales || [], 
          products: pendingImportData.products || [],
          expenses: pendingImportData.expenses || [],
          condicionais: pendingImportData.condicionais || [],
          cashierClosures: pendingImportData.cashierClosures || [],
          trashSales: pendingImportData.trashSales || []
        });
        setIsImportModalOpen(false);
        setPendingImportData(null);
      } catch (err) {
        console.error('Erro ao confirmar importação:', err);
        if (showNotification) showNotification('Falha ao importar dados.', 'error');
      } finally {
        setIsImporting(false);
      }
    }
  };

  const confirmClear = () => {
    onClear();
    setIsClearModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
        {[
          { id: 'profile', label: 'Perfil' },
          { id: 'ia', label: 'IA 🤖' },
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
                      <Info className="w-10 h-10 text-slate-300" />
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-xl shadow-lg cursor-pointer hover:bg-indigo-700 transition-colors">
                    <CheckCircle className="w-4 h-4" />
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
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-indigo-900 uppercase italic">Configurar IA Gemini</h3>
              </div>
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

        {activeTab === 'backup' && (
           <div className="space-y-8 animate-in fade-in duration-300">
              <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 max-w-2xl">
                <p className="text-xs text-amber-900 font-bold leading-relaxed">Mantenha uma cópia de segurança. Recomendado baixar após grandes lançamentos.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <h3 className="text-sm font-black text-slate-900 uppercase italic">Exportar</h3>
                   <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 bg-indigo-900 text-white px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-indigo-950 transition">
                     <Download size={16} />
                     Backup .JSON
                   </button>
                </div>
                <div className="space-y-4">
                   <h3 className="text-sm font-black text-slate-900 uppercase italic">Importar</h3>
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="flex items-center justify-center gap-2 w-full bg-slate-100 text-slate-700 px-6 py-4 rounded-xl text-xs font-black uppercase text-center border border-slate-200 hover:bg-slate-200 transition"
                   >
                      <Upload size={16} />
                      Selecionar Arquivo
                   </button>
                   <input 
                     type="file" 
                     className="hidden" 
                     accept="application/json,.json" 
                     onChange={handleFileSelect} 
                     ref={fileInputRef} 
                   />
                </div>
              </div>
           </div>
        )}

        {activeTab === 'deploy' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-indigo-900 p-8 rounded-[2rem] text-white">
              <div className="flex items-center gap-3 mb-4">
                <Smartphone className="w-8 h-8 text-indigo-300" />
                <h3 className="text-2xl font-black italic uppercase">Instalar no Android</h3>
              </div>
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
              <button 
                onClick={() => setIsClearModalOpen(true)} 
                className="w-full flex items-center justify-center gap-2 bg-rose-600 text-white px-8 py-4 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg hover:bg-rose-700 transition-all active:scale-95"
              >
                <Trash2 size={18} />
                Zerar Todo o Sistema
              </button>
           </div>
        )}
      </div>

      {/* Import Confirmation Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Confirmar Importação"
        footer={
          <>
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="px-6 py-3 text-xs font-black uppercase text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmImport}
              disabled={isImporting}
              className={`px-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isImporting ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Importando...
                </>
              ) : 'Confirmar Importação'}
            </button>
          </>
        }
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="font-black text-slate-900 uppercase italic mb-2">Atenção!</p>
            <p className="text-slate-600 leading-relaxed">
              Isso substituirá todos os seus dados atuais (clientes, vendas, produtos, etc) pelos dados do arquivo de backup. Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>
      </Modal>

      {/* Clear System Modal */}
      <Modal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title="Zerar Sistema"
        footer={
          <>
            <button
              onClick={() => setIsClearModalOpen(false)}
              className="px-6 py-3 text-xs font-black uppercase text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmClear}
              className="px-8 py-3 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-rose-700 transition-all"
            >
              Zerar Tudo
            </button>
          </>
        }
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
            <Trash2 size={24} />
          </div>
          <div>
            <p className="font-black text-slate-900 uppercase italic mb-2">TEM CERTEZA?</p>
            <p className="text-slate-600 leading-relaxed">
              Você está prestes a apagar todos os dados do sistema. Todos os registros de vendas, clientes e produtos serão permanentemente removidos.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
