import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  TrendingUp, BarChart3, Users, Scissors, Calendar, DollarSign,
  AlertCircle, Phone, ArrowRight, Settings, Info, Award, CalendarDays
} from 'lucide-react';
import { db } from '../db';

const DEFAULT_PRICES = {
  'Corte': 40,
  'Barba': 30,
  'Corte + Barba': 60,
  'Sobrancelha': 15,
  'Luzes/Platinado': 80,
  'Selagem/Progressiva': 120,
  'Outros': 40
};

export default function MetricsView() {
  const { currentUser } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState(DEFAULT_PRICES);
  const [showPriceSettings, setShowPriceSettings] = useState(false);
  const [clients, setClients] = useState([]);
  const [atendimentos, setAtendimentos] = useState([]);
  const [agendamentosConcluidos, setAgendamentosConcluidos] = useState([]);

  // Metrics state
  const [metrics, setMetrics] = useState({
    faturamentoMes: 0,
    faturamentoDia: 0,
    ticketMedio: 0,
    taxaRetorno: 0,
    totalVisitas: 0,
    faturamentoTotal: 0,
    clientesSumidos45: [],
    clientesSumidos60: [],
    receitaPorServico: {},
    rankingClientes: []
  });

  const [sumidosFilter, setSumidosFilter] = useState('all'); // all (>45) | critical (>60)

  // Load prices from localStorage
  useEffect(() => {
    if (currentUser) {
      const stored = localStorage.getItem(`barbermemo_prices_${currentUser.id}`);
      if (stored) {
        try {
          setPrices(JSON.parse(stored));
        } catch (e) {
          console.error('Erro ao ler preços salvos:', e);
        }
      }
    }
  }, [currentUser]);

  // Save prices to localStorage
  const handleSavePrices = (e) => {
    e.preventDefault();
    localStorage.setItem(`barbermemo_prices_${currentUser.id}`, JSON.stringify(prices));
    setShowPriceSettings(false);
    calculateMetrics(clients, atendimentos, agendamentosConcluidos);
  };

  // Fetch data
  const fetchData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [allClis, allAtends, allAgs] = await Promise.all([
        db.getClientes(currentUser.id, ''),
        db.getAtendimentosForMetrics(currentUser.id),
        db.getAgendamentosConcluidos(currentUser.id)
      ]);
      setClients(allClis);
      setAtendimentos(allAtends);
      setAgendamentosConcluidos(allAgs);
      calculateMetrics(allClis, allAtends, allAgs);
    } catch (error) {
      console.error('Erro ao buscar dados para relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  // Core metrics engine
  const calculateMetrics = (clis, atends, ags) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Map to keep track of visits and revenue
    let totalRevenue = 0;
    let monthRevenue = 0;
    let dayRevenue = 0;
    const serviceCounts = {};
    const clientSpent = {}; // client_id -> spent

    // 1. Process Completed Appointments (Agendamentos Concluídos)
    // Map of unique visit keys to avoid double-counting with Atendimentos: client_id + yyyy-mm-dd
    const processedVisits = new Set();
    const agsRevenueByClientDay = new Map(); // client_id + yyyy-mm-dd -> cost

    ags.forEach(ag => {
      const date = new Date(ag.dataHora);
      const dateStr = date.toISOString().split('T')[0];
      const isThisMonth = date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      const isToday = dateStr === todayStr;

      // Extract price from service name
      let price = prices['Outros'];
      const serviceName = ag.servicos || 'Corte';

      // Match exact or prefix
      let matched = false;
      Object.keys(prices).forEach(key => {
        if (!matched && serviceName.toLowerCase().includes(key.toLowerCase())) {
          price = prices[key];
          matched = true;
        }
      });

      totalRevenue += price;
      if (isThisMonth) monthRevenue += price;
      if (isToday) dayRevenue += price;

      // Track services count
      const category = matched ? Object.keys(prices).find(k => serviceName.toLowerCase().includes(k.toLowerCase())) : 'Outros';
      serviceCounts[category] = (serviceCounts[category] || 0) + price;

      // Track client spent
      if (ag.clienteId) {
        clientSpent[ag.clienteId] = (clientSpent[ag.clienteId] || 0) + price;
        const key = `${ag.clienteId}_${dateStr}`;
        processedVisits.add(key);
        agsRevenueByClientDay.set(key, price);
      }
    });

    // 2. Process independent Atendimentos (not linked to an agendamento on that day)
    let independentVisitsCount = 0;
    atends.forEach(atend => {
      const date = new Date(atend.data);
      const dateStr = date.toISOString().split('T')[0];
      const isThisMonth = date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      const isToday = dateStr === todayStr;

      const visitKey = `${atend.clienteId}_${dateStr}`;

      // If we already counted an appointment for this client on this day, we skip double-counting revenue
      // But we can check if there was any price mismatch or just skip
      if (processedVisits.has(visitKey)) {
        return;
      }

      // Infer service type based on fields
      let serviceType = 'Corte';
      if (atend.barba && atend.barba !== 'Sem Barba' && atend.barba.trim() !== '') {
        if ((atend.laterais && atend.laterais.trim() !== '') || (atend.topo && atend.topo.trim() !== '')) {
          serviceType = 'Corte + Barba';
        } else {
          serviceType = 'Barba';
        }
      }

      const price = prices[serviceType] || prices['Corte'];

      totalRevenue += price;
      if (isThisMonth) monthRevenue += price;
      if (isToday) dayRevenue += price;

      serviceCounts[serviceType] = (serviceCounts[serviceType] || 0) + price;

      if (atend.clienteId) {
        clientSpent[atend.clienteId] = (clientSpent[atend.clienteId] || 0) + price;
      }
      processedVisits.add(visitKey);
      independentVisitsCount++;
    });

    const totalVisitsCount = processedVisits.size;
    const ticketMedioVal = totalVisitsCount > 0 ? (totalRevenue / totalVisitsCount) : 0;

    // 3. Calculate Client Return Rate within 30 days
    // Group atendimentos by client
    const clientVisits = {};
    atends.forEach(atend => {
      if (!clientVisits[atend.clienteId]) {
        clientVisits[atend.clienteId] = [];
      }
      clientVisits[atend.clienteId].push(new Date(atend.data));
    });

    let clientsWithVisits = 0;
    let returnedWithin30DaysCount = 0;

    Object.keys(clientVisits).forEach(cliId => {
      clientsWithVisits++;
      const dates = clientVisits[cliId].sort((a, b) => a - b);

      // Check gaps between consecutive visits
      let hasShortReturn = false;
      for (let i = 1; i < dates.length; i++) {
        const diffTime = Math.abs(dates[i] - dates[i - 1]);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          hasShortReturn = true;
          break;
        }
      }
      if (hasShortReturn) {
        returnedWithin30DaysCount++;
      }
    });

    const returnRatePct = clientsWithVisits > 0 ? (returnedWithin30DaysCount / clientsWithVisits) * 100 : 0;

    // 4. Calculate Missing Clients (Clientes Sumidos: > 45 days and > 60 days)
    const sumidos45 = [];
    const sumidos60 = [];
    const now = new Date();

    clis.forEach(cli => {
      // Find all client atendimentos
      const cliAtends = atends.filter(a => a.clienteId === cli.id);
      if (cliAtends.length === 0) {
        // If client has no history, exclude them from sumidos alerts (just registered, never cut)
        return;
      }

      // Last cut date
      const lastCut = cliAtends.sort((a, b) => new Date(b.data) - new Date(a.data))[0];
      const diffTime = Math.abs(now - new Date(lastCut.data));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      const clientInfo = {
        client: cli,
        daysPassed: diffDays,
        lastCutDetails: `Laterais: ${lastCut.laterais || 'N/A'}, Topo: ${lastCut.topo || 'N/A'}`
      };

      if (diffDays > 60) {
        sumidos60.push(clientInfo);
      } else if (diffDays > 45) {
        sumidos45.push(clientInfo);
      }
    });

    // Sort sumidos by most critical (most days passed)
    sumidos45.sort((a, b) => b.daysPassed - a.daysPassed);
    sumidos60.sort((a, b) => b.daysPassed - a.daysPassed);

    // 5. Ranking VIP clients
    const vipList = clis
      .map(cli => ({
        client: cli,
        spent: clientSpent[cli.id] || 0,
        visitsCount: clientVisits[cli.id] ? clientVisits[cli.id].length : 0
      }))
      .filter(item => item.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);

    setMetrics({
      faturamentoMes: monthRevenue,
      faturamentoDia: dayRevenue,
      faturamentoTotal: totalRevenue,
      ticketMedio: ticketMedioVal,
      taxaRetorno: returnRatePct,
      totalVisitas: totalVisitsCount,
      clientesSumidos45: sumidos45,
      clientesSumidos60: sumidos60,
      receitaPorServico: serviceCounts,
      rankingClientes: vipList
    });
  };

  // WhatsApp Trigger
  const triggerWhatsAppReminder = (clientInfo) => {
    const { client, daysPassed, lastCutDetails } = clientInfo;
    const phone = client.telefone.replace(/\D/g, '');
    if (!phone) {
      alert('Telefone inválido para este cliente.');
      return;
    }

    const text = `Olá, ${client.nome}! Tudo bem? Sentimos sua falta aqui na barbearia! 💈 Faz mais de ${daysPassed} dias desde o seu último corte. Que tal darmos aquele trato no visual esta semana? Podemos agendar um horário! Abraço!`;
    const encoded = encodeURIComponent(text);
    const url = `https://api.whatsapp.com/send?phone=55${phone}&text=${encoded}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-barber-dark py-20 flex-col space-y-4">
        <div className="w-10 h-10 border-4 border-barber-accent border-t-transparent rounded-full animate-spin"></div>
        <span className="text-zinc-500 text-xs font-semibold">Carregando métricas financeiras...</span>
      </div>
    );
  }

  // Combine lists of sumidos depending on filter
  const displaySumidos = sumidosFilter === 'critical'
    ? metrics.clientesSumidos60
    : [...metrics.clientesSumidos60, ...metrics.clientesSumidos45];

  return (
    <div className="flex-1 p-6 space-y-6 bg-barber-dark max-w-4xl mx-auto overflow-y-auto no-scrollbar font-sans text-barber-text-primary fade-in pb-20">

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-barber-border/30 pb-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-barber-accent" />
            Desempenho e Insights Financeiros
          </h2>
          <p className="text-xs text-zinc-500">Métricas financeiras detalhadas e estatísticas de retenção de clientes</p>
        </div>

        <button
          onClick={() => setShowPriceSettings(!showPriceSettings)}
          className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-750 text-zinc-200 text-xs font-bold py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-all"
        >
          <Settings className="w-4 h-4 text-barber-accent-light" />
          Configurar Valores
        </button>
      </div>

      {/* PRICE SETTINGS PANEL (IF OPEN) */}
      {showPriceSettings && (
        <div className="bg-barber-card border border-barber-accent/30 rounded-2xl p-5 space-y-4 shadow-xl fade-in">
          <div className="flex justify-between items-center border-b border-barber-border/40 pb-2.5">
            <span className="font-bold text-sm text-zinc-200">Tabela de Preços (Serviços)</span>
            <span className="text-[10px] text-zinc-500">Os valores abaixo estimam o seu faturamento</span>
          </div>

          <form onSubmit={handleSavePrices} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Object.keys(prices).map(key => (
              <div key={key} className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase block">{key}</label>
                <div className="relative">
                  <span className="text-[11px] text-zinc-500 absolute left-2.5 top-2">R$</span>
                  <input
                    type="number"
                    min="0"
                    required
                    className="w-full bg-barber-dark border border-barber-border rounded-lg py-1.5 pl-7 pr-2 text-xs text-zinc-200 font-bold"
                    value={prices[key]}
                    onChange={(e) => setPrices({ ...prices, [key]: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            ))}

            <div className="col-span-2 sm:col-span-3 pt-3 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setPrices(DEFAULT_PRICES);
                  localStorage.removeItem(`barbermemo_prices_${currentUser.id}`);
                }}
                className="bg-zinc-900 text-zinc-400 px-4 py-2 rounded-xl text-xs font-bold border border-zinc-800"
              >
                Restaurar Padrões
              </button>
              <button
                type="submit"
                className="flex-1 bg-barber-accent hover:bg-barber-accent-hover text-white py-2 rounded-xl text-xs font-bold"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CORE FINANCIAL CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

        {/* Faturamento Mensal */}
        <div className="bg-barber-card border border-barber-border rounded-2xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Mensal Estimado</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-zinc-100 block">R$ {metrics.faturamentoMes.toFixed(0)}</span>
            <span className="text-[10px] text-zinc-500 mt-1 block">Mês atual consolidado</span>
          </div>
          <div className="absolute right-0 bottom-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all"></div>
        </div>

        {/* Faturamento Diário */}
        <div className="bg-barber-card border border-barber-border rounded-2xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Hoje Estimado</span>
            <CalendarDays className="w-4 h-4 text-barber-accent" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-zinc-100 block font-sans">R$ {metrics.faturamentoDia.toFixed(0)}</span>
            <span className="text-[10px] text-zinc-500 mt-1 block">Ganhos do dia de hoje</span>
          </div>
          <div className="absolute right-0 bottom-0 w-16 h-16 bg-barber-accent/5 rounded-full blur-xl group-hover:bg-barber-accent/10 transition-all"></div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-barber-card border border-barber-border rounded-2xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Ticket Médio</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-zinc-100 block">R$ {metrics.ticketMedio.toFixed(1)}</span>
            <span className="text-[10px] text-zinc-500 mt-1 block flex items-center gap-1">
              Média por atendimento
              <div className="group/info relative inline-block">
                <Info className="w-3 h-3 text-zinc-600 hover:text-zinc-400 cursor-pointer" />
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-32 bg-zinc-900 border border-zinc-700 text-zinc-400 text-[8px] p-1.5 rounded shadow-lg opacity-0 group-hover/info:opacity-100 transition-opacity z-50 normal-case leading-normal font-medium text-center">
                  Faturamento total dividido pelo total de visitas únicas.
                </span>
              </div>
            </span>
          </div>
          <div className="absolute right-0 bottom-0 w-16 h-16 bg-sky-500/5 rounded-full blur-xl group-hover:bg-sky-500/10 transition-all"></div>
        </div>

        {/* Taxa de Retorno */}
        <div className="bg-barber-card border border-barber-border rounded-2xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Retenção (30d)</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-zinc-100 block">{metrics.taxaRetorno.toFixed(0)}%</span>
            <span className="text-[10px] text-zinc-500 mt-1 block flex items-center gap-1">
              Voltam em até 30 dias
              <div className="group/info2 relative inline-block">
                <Info className="w-3 h-3 text-zinc-600 hover:text-zinc-400 cursor-pointer" />
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-36 bg-zinc-900 border border-zinc-700 text-zinc-400 text-[8px] p-1.5 rounded shadow-lg opacity-0 group-hover/info2:opacity-100 transition-opacity z-50 normal-case leading-normal font-medium text-center">
                  Percentual de clientes cadastrados que retornaram para cortar em até 30 dias após a visita anterior.
                </span>
              </div>
            </span>
          </div>
          <div className="absolute right-0 bottom-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all"></div>
        </div>

      </div>

      {/* MIDDLE SECTION: SERVICE DISTRIBUTION & TOP CUSTOMERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Service Type Breakdown */}
        <div className="bg-barber-card border border-barber-border rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Distribuição de Receita por Serviço</h3>
            <p className="text-[10px] text-zinc-500">Divisão do faturamento total por categoria de serviço prestado</p>
          </div>

          <div className="space-y-3 pt-2">
            {Object.keys(prices).map(key => {
              const spent = metrics.receitaPorServico[key] || 0;
              const pct = metrics.faturamentoTotal > 0 ? (spent / metrics.faturamentoTotal) * 100 : 0;

              if (spent === 0) return null;

              return (
                <div key={key} className="space-y-1 text-xs">
                  <div className="flex justify-between items-center text-zinc-300">
                    <span className="font-semibold">{key}</span>
                    <span className="font-mono text-zinc-400 font-bold">R$ {spent.toFixed(0)} <span className="text-[10px] font-normal text-zinc-650">({pct.toFixed(0)}%)</span></span>
                  </div>
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-900/30">
                    <div
                      className="bg-barber-accent h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}

            {Object.keys(metrics.receitaPorServico).length === 0 && (
              <div className="py-6 text-center text-zinc-600 text-xs">Nenhum serviço registrado para estimar.</div>
            )}
          </div>
        </div>

        {/* Top VIP Clients Ranking */}
        <div className="bg-barber-card border border-barber-border rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <Award className="w-4 h-4 text-barber-accent" />
              Ranking de Clientes VIP
            </h3>
            <p className="text-[10px] text-zinc-500">Os 5 clientes que mais trouxeram faturamento para você</p>
          </div>

          <div className="divide-y divide-barber-border/30">
            {metrics.rankingClientes.map((item, idx) => {
              const med = item.visitsCount > 0 ? (item.spent / item.visitsCount) : 0;
              return (
                <div key={item.client.id} className="py-2.5 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${idx === 0
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        : 'bg-zinc-800 text-zinc-400'
                      }`}>
                      {idx + 1}
                    </div>
                    <span className="font-semibold text-zinc-200 block truncate">{item.client.nome}</span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-zinc-100 block">R$ {item.spent.toFixed(0)}</span>
                    <span className="text-[9px] text-zinc-500 block">{item.visitsCount} visitas • R$ {med.toFixed(0)} méd.</span>
                  </div>
                </div>
              );
            })}

            {metrics.rankingClientes.length === 0 && (
              <div className="py-8 text-center text-zinc-650 text-xs">Ainda não há clientes com faturamento calculado.</div>
            )}
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: MISSING CLIENTS (CLIENTES SUMIDOS) */}
      <div className="bg-barber-card border border-barber-border rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Alerta de Clientes Sumidos (Pós-Venda)
            </h3>
            <p className="text-[10px] text-zinc-500">Clientes que realizaram cortes anteriormente, mas não voltam há algum tempo</p>
          </div>

          {/* Filters */}
          <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-barber-border/80 text-xs text-zinc-400">
            <button
              onClick={() => setSumidosFilter('all')}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${sumidosFilter === 'all' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'hover:text-white'}`}
            >
              Todos ({metrics.clientesSumidos60.length + metrics.clientesSumidos45.length})
            </button>
            <button
              onClick={() => setSumidosFilter('critical')}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${sumidosFilter === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'hover:text-white'}`}
            >
              Críticos &gt;60d ({metrics.clientesSumidos60.length})
            </button>
          </div>
        </div>

        {/* Sumidos list */}
        <div className="space-y-3 pt-2 max-h-[300px] overflow-y-auto no-scrollbar">
          {displaySumidos.map(item => {
            const isCritical = item.daysPassed > 60;
            return (
              <div
                key={item.client.id}
                className={`p-3 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors ${isCritical
                    ? 'bg-red-500/[0.01] border-red-950/20 hover:border-red-900/30'
                    : 'bg-amber-500/[0.01] border-amber-950/20 hover:border-amber-900/30'
                  }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-200 text-xs">{item.client.nome}</span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${isCritical
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                      Ausente {item.daysPassed}d
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 block truncate mt-1">
                    Último corte: <span className="text-zinc-400 font-medium">{item.lastCutDetails}</span>
                  </p>
                </div>

                <button
                  onClick={() => triggerWhatsAppReminder(item)}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white py-1.5 px-3 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-md self-end sm:self-center shrink-0"
                >
                  <Phone className="w-3 h-3 fill-white text-emerald-600" />
                  Resgatar Cliente
                </button>
              </div>
            );
          })}

          {displaySumidos.length === 0 && (
            <div className="py-10 text-center bg-zinc-950/15 border border-barber-border/30 rounded-2xl text-zinc-500 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
              Nenhum cliente ausente detectado para este filtro. Parabéns pela retenção! 🎉
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
