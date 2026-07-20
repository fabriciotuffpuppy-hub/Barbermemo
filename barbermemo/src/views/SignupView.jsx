import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../db';
import { User, Mail, Lock, Building2, Phone, FileText, AlertCircle, CheckCircle2, Loader2, ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';

export default function SignupView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();

  const subscriptionId = searchParams.get('subscription_id') || searchParams.get('sub') || '';
  const initialPlano = searchParams.get('plano') || 'autonomo';

  const [verifying, setVerifying] = useState(true);
  const [subscriptionValid, setSubscriptionValid] = useState(false);
  const [plano, setPlano] = useState(initialPlano);

  const [nome, setNome] = useState('');
  const [barbeariaName, setBarbeariaName] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const verifySubscription = async () => {
    if (!subscriptionId) {
      setVerifying(false);
      setSubscriptionValid(false);
      setError('Nenhuma assinatura informada. Por favor, contrate um plano para liberar seu cadastro.');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const res = await fetch(`/api/asaas/verify-subscription?subscriptionId=${subscriptionId}`);
      const data = await res.json();

      if (res.ok && data.valid) {
        setSubscriptionValid(true);
        if (data.plano) setPlano(data.plano);
        if (data.email) setEmail(data.email);
        if (data.nome) setNome(data.nome);
        if (data.telefone) setTelefone(data.telefone);
        if (data.cpfCnpj) setCpfCnpj(data.cpfCnpj);
      } else {
        setSubscriptionValid(false);
        setError(data.message || data.error || 'Aguardando validação do pagamento da assinatura no Asaas.');
      }
    } catch (err) {
      console.error(err);
      setSubscriptionValid(false);
      setError('Erro ao comunicar com o servidor de validação.');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    verifySubscription();
  }, [subscriptionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!subscriptionValid) {
      setError('É necessário ter uma assinatura válida e paga no Asaas para criar a conta.');
      return;
    }

    if (!nome.trim() || !email.trim() || !senha) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (plano === 'barbearia' && !barbeariaName.trim()) {
      setError('Por favor, informe o Nome da Barbearia.');
      return;
    }

    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (senha !== confirmSenha) {
      setError('As senhas não conferem.');
      return;
    }

    setIsSaving(true);

    try {
      const user = await db.registerUserFromSubscription({
        nome,
        email,
        senha,
        plano,
        barbeariaName: plano === 'barbearia' ? barbeariaName : null,
        cpfCnpj,
        telefone,
        subscriptionId
      });

      if (user) {
        setCurrentUser(user);
        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao registrar conta.');
    } finally {
      setIsSaving(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen w-full bg-barber-dark flex flex-col items-center justify-center text-zinc-100 font-sans p-4 space-y-4">
        <Loader2 className="w-8 h-8 text-barber-accent animate-spin" />
        <p className="text-xs text-zinc-400">Verificando pagamento da assinatura no Asaas...</p>
      </div>
    );
  }

  const isBarbearia = plano === 'barbearia';

  return (
    <div className="min-h-screen w-full bg-barber-dark flex items-center justify-center font-sans px-4 py-12 relative overflow-hidden">
      {/* Background decoration lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-barber-accent/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-barber-accent/5 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-barber-card border border-barber-border/80 rounded-2xl shadow-2xl overflow-hidden p-6 md:p-8 space-y-6 z-10 fade-in">
        
        {/* Branding & Plan Badge */}
        <div className="flex flex-col items-center text-center space-y-2 select-none">
          <img src="/logo.svg" alt="BarberMemo Logo" className="w-12 h-12 object-contain rounded-xl shadow-lg" />
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 font-sans">BarberMemo</h1>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-barber-accent/15 border border-barber-accent/30 rounded-full text-xs font-bold text-barber-accent">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isBarbearia ? 'Criar Conta de Administrador (Plano Barbearia)' : 'Criar Perfil de Barbeiro (Plano Autônomo)'}</span>
          </div>
        </div>

        {/* BLOCKED STATE: IF SUBSCRIPTION IS NOT CONFIRMED/VALID */}
        {!subscriptionValid ? (
          <div className="space-y-6 text-center py-2">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-bold text-zinc-100">Pagamento Não Confirmado</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {error || 'Para criar sua conta, é necessário ter uma assinatura mensal ativa e paga no Asaas.'}
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={verifySubscription}
                className="w-full bg-barber-accent hover:bg-barber-accent-hover text-white py-3.5 rounded-xl font-bold text-xs shadow-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Verificar Pagamento Novamente</span>
              </button>

              <Link
                to={`/checkout?plano=${plano}`}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-3.5 rounded-xl font-bold text-xs border border-barber-border uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Ir para o Checkout / Assinar Plano</span>
              </Link>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM (ONLY SHOWN WHEN SUBSCRIPTION IS VALID & PAID) */
          <form onSubmit={handleSubmit} className="space-y-4">

            {error && (
              <div className="bg-red-500/10 border border-red-500/25 p-3.5 rounded-xl flex items-start gap-2.5 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Nome completo */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase block font-sans">
                {isBarbearia ? 'Nome do Proprietário / Admin *' : 'Seu Nome Completo *'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  className="w-full bg-barber-dark border border-barber-border rounded-xl py-3 pl-10 pr-4 text-xs text-barber-text-primary placeholder:text-zinc-650"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Nome da Barbearia (se plano Barbearia) */}
            {isBarbearia && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase block font-sans">
                  Nome da Barbearia *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Barbearia Dom Pedro"
                    className="w-full bg-barber-dark border border-barber-border rounded-xl py-3 pl-10 pr-4 text-xs text-barber-text-primary placeholder:text-zinc-650"
                    value={barbeariaName}
                    onChange={(e) => setBarbeariaName(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            )}

            {/* E-mail */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase block font-sans">E-mail de Acesso *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="Ex: seuemail@gmail.com"
                  className="w-full bg-barber-dark border border-barber-border rounded-xl py-3 pl-10 pr-4 text-xs text-barber-text-primary placeholder:text-zinc-650"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Senha e Confirmação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase block font-sans">Senha *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 dígitos"
                    className="w-full bg-barber-dark border border-barber-border rounded-xl py-3 pl-10 pr-4 text-xs text-barber-text-primary placeholder:text-zinc-650"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase block font-sans">Confirmar Senha *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    placeholder="Repita a senha"
                    className="w-full bg-barber-dark border border-barber-border rounded-xl py-3 pl-10 pr-4 text-xs text-barber-text-primary placeholder:text-zinc-650"
                    value={confirmSenha}
                    onChange={(e) => setConfirmSenha(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            {/* Telefone e CPF/CNPJ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase block font-sans">WhatsApp / Telefone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="(00) 90000-0000"
                    className="w-full bg-barber-dark border border-barber-border rounded-xl py-3 pl-10 pr-4 text-xs text-barber-text-primary placeholder:text-zinc-650"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase block font-sans">CPF ou CNPJ</label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    className="w-full bg-barber-dark border border-barber-border rounded-xl py-3 pl-10 pr-4 text-xs text-barber-text-primary placeholder:text-zinc-650"
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-barber-accent hover:bg-barber-accent-hover text-white py-4 rounded-xl font-bold text-xs shadow-lg uppercase tracking-wider transition-all disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Criando Conta...</span>
                </>
              ) : (
                <span>Finalizar Cadastro e Acessar Sistema</span>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
