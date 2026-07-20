import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, ArrowRight, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';

export default function CheckoutView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [plano, setPlano] = useState(searchParams.get('plano') === 'barbearia' ? 'barbearia' : 'autonomo');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [telefone, setTelefone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkoutResult, setCheckoutResult] = useState(null);

  useEffect(() => {
    const p = searchParams.get('plano');
    if (p === 'barbearia' || p === 'autonomo') {
      setPlano(p);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!nome.trim() || !email.trim()) {
      setError('Por favor, preencha nome e e-mail.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/asaas/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, cpfCnpj, telefone, plano })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao criar assinatura no Asaas.');
      }

      setCheckoutResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const preco = plano === 'barbearia' ? 'R$ 189,99' : 'R$ 59,90';
  const tituloPlano = plano === 'barbearia' ? 'Plano Barbearia (Equipes até 5 barbeiros)' : 'Plano Autônomo (Barbeiro Individual)';

  return (
    <div className="min-h-screen w-full bg-barber-dark flex items-center justify-center font-sans px-4 py-12 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-barber-accent/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-barber-accent/5 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-lg bg-barber-card border border-barber-border/80 rounded-2xl shadow-2xl overflow-hidden p-6 md:p-8 space-y-6 z-10 fade-in">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <img src="/logo.svg" alt="BarberMemo Logo" className="w-12 h-12 object-contain rounded-xl shadow-lg" />
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 font-sans">BarberMemo</h1>
          <p className="text-xs text-zinc-400">Assinatura Mensal via Asaas</p>
        </div>

        {/* Plan Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-barber-dark border border-barber-border rounded-xl">
          <button
            type="button"
            onClick={() => setPlano('autonomo')}
            className={`py-2.5 px-3 text-xs font-bold rounded-lg transition-all ${
              plano === 'autonomo'
                ? 'bg-barber-accent text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Plano Autônomo (R$ 59,90/mês)
          </button>
          <button
            type="button"
            onClick={() => setPlano('barbearia')}
            className={`py-2.5 px-3 text-xs font-bold rounded-lg transition-all ${
              plano === 'barbearia'
                ? 'bg-barber-accent text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Plano Barbearia (R$ 189,99/mês)
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-lg flex items-start gap-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!checkoutResult ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 bg-zinc-900/50 border border-barber-border/60 rounded-xl space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Plano Selecionado:</span>
                <span className="font-bold text-barber-accent">{tituloPlano}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Cobrança:</span>
                <span className="font-bold text-zinc-100">{preco} / mês</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase block">Nome Completo *</label>
              <input
                type="text"
                required
                placeholder="Seu nome"
                className="w-full bg-barber-dark border border-barber-border rounded-xl py-3 px-4 text-xs text-barber-text-primary placeholder:text-zinc-650"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase block">E-mail Principal *</label>
              <input
                type="email"
                required
                placeholder="seuemail@exemplo.com"
                className="w-full bg-barber-dark border border-barber-border rounded-xl py-3 px-4 text-xs text-barber-text-primary placeholder:text-zinc-650"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase block">CPF / CNPJ (Opcional)</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  className="w-full bg-barber-dark border border-barber-border rounded-xl py-3 px-4 text-xs text-barber-text-primary placeholder:text-zinc-650"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase block">WhatsApp / Telefone (Opcional)</label>
                <input
                  type="text"
                  placeholder="(00) 90000-0000"
                  className="w-full bg-barber-dark border border-barber-border rounded-xl py-3 px-4 text-xs text-barber-text-primary placeholder:text-zinc-650"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-barber-accent hover:bg-barber-accent-hover text-white py-4 rounded-xl font-bold text-xs shadow-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando Cobrança Asaas...</span>
                </>
              ) : (
                <>
                  <span>Ir para Pagamento da Assinatura ({preco})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Checkout Generated Success State */
          <div className="space-y-6 text-center">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-100">Assinatura Criada com Sucesso!</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Acesse o checkout do Asaas para efetuar o pagamento da 1ª mensalidade via PIX, Cartão de Crédito ou Boleto.
              </p>
            </div>

            <div className="p-4 bg-zinc-900 border border-barber-border rounded-xl space-y-3">
              <a
                href={checkoutResult.invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 px-4 rounded-xl font-bold text-xs shadow-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <span>Pagar Fatura no Asaas</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <p className="text-[11px] text-zinc-500">
                Assim que o pagamento for concluído, você será direcionado para criar sua conta.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/cadastrar?subscription_id=${checkoutResult.subscriptionId}&plano=${plano}`)}
              className="w-full bg-barber-accent hover:bg-barber-accent-hover text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              <span>Já Realizei o Pagamento -&gt; Criar Conta</span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-zinc-500 text-[11px]">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Pagamento seguro e transparente processado pelo Asaas</span>
        </div>
      </div>
    </div>
  );
}
