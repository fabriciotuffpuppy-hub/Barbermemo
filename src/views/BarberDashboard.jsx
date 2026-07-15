import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Users, Scissors, TrendingUp, Search, X, Clock, Phone, AlertCircle,
  ChevronLeft, UserPlus, Calendar, Plus
} from 'lucide-react';

export default function BarberDashboard() {
  const {
    currentUser,
    searchQuery,
    setSearchQuery,
    clientes,
    proximosRetornos,
    stats,
    selectedDate
  } = useOutletContext();

  const navigate = useNavigate();

  const handleWhatsAppReminder = (client, item) => {
    const phone = client.telefone.replace(/\D/g, '');
    if (!phone) {
      alert("Telefone inválido.");
      return;
    }
    const text = `Olá, ${client.nome}! Tudo bem? Sentimos sua falta aqui na barbearia. 💈 Faz ${item.diasPassados} dias desde o seu último corte. Que tal darmos aquele trato no visual? Podemos agendar um horário! Abraço!`;
    window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Nenhum corte registrado';
    try {
      const date = new Date(dateString);
      const today = new Date();
      const diffTime = Math.abs(today - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Hoje';
      if (diffDays === 1) return 'Ontem';
      return `há ${diffDays} dias`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="h-full flex flex-col font-sans">
      
      {/* 1. DESKTOP WELCOME SCREEN (Visible only on md screens) */}
      <div className="hidden md:flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto space-y-6 fade-in font-sans h-full my-auto">
        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700/50">
          <Scissors className="w-8 h-8 text-barber-accent animate-pulse" />
        </div>
        <div className="space-y-2 select-none">
          <h2 className="text-lg font-bold text-zinc-100">BarberMemo Dashboard</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Painel de controle individual. Logado como <strong className="text-barber-accent-light">{currentUser.nome}</strong>{currentUser.barbeariaName ? ` na barbearia ${currentUser.barbeariaName}` : ''}. Selecione um cliente cadastrado ou clique abaixo para iniciar.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full pt-4 font-sans select-none">
          <div
            onClick={() => navigate('/clientes/novo')}
            className="bg-barber-card hover:bg-zinc-800/40 border border-barber-border/80 p-4 rounded-xl text-left cursor-pointer transition-colors"
          >
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Clientes</span>
            <span className="text-xs text-zinc-300 font-semibold mt-1 flex items-center gap-1">
              <UserPlus className="w-3.5 h-3.5 text-barber-accent-light" />
              Novo Cliente
            </span>
          </div>
          <div
            onClick={() => navigate('/agendamentos/novo')}
            className="bg-barber-card hover:bg-zinc-800/40 border border-barber-border/80 p-4 rounded-xl text-left cursor-pointer transition-colors"
          >
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Calendário</span>
            <span className="text-xs text-zinc-300 font-semibold mt-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-barber-accent-light" />
              Agendar Horário
            </span>
          </div>
        </div>
      </div>

      {/* 2. MOBILE DASHBOARD (Visible on screens < md) */}
      <div className="md:hidden px-4 py-5 space-y-6 fade-in">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 select-none">
          <div className="bg-barber-card border border-barber-border rounded-xl p-3 text-center">
            <Users className="w-4 h-4 mx-auto mb-1 text-barber-accent-light" />
            <span className="text-[10px] text-barber-text-secondary block">Clientes</span>
            <span className="text-base font-bold text-zinc-200">{stats.totalClientes}</span>
          </div>
          <div className="bg-barber-card border border-barber-border rounded-xl p-3 text-center">
            <Scissors className="w-4 h-4 mx-auto mb-1 text-barber-accent-light" />
            <span className="text-[10px] text-barber-text-secondary block">Cortes</span>
            <span className="text-base font-bold text-zinc-200">{stats.totalAtendimentos}</span>
          </div>
          <div className="bg-barber-card border border-barber-border rounded-xl p-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-barber-accent-light" />
            <span className="text-[10px] text-barber-text-secondary block">Este Mês</span>
            <span className="text-base font-bold text-zinc-200">{stats.atendimentosMes}</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3.5 text-barber-text-secondary w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar cliente por nome ou celular..."
            className="w-full bg-barber-card border border-barber-border rounded-xl py-3 pl-9 pr-4 text-xs text-barber-text-primary placeholder:text-zinc-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3.5 text-barber-text-secondary hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Alertas de Retorno */}
        {!searchQuery && proximosRetornos.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-barber-accent-light px-1 select-none">
              <Clock className="w-4 h-4" />
              <h2 className="text-xs font-semibold uppercase tracking-wider">Alertas de Retorno</h2>
              <span className="ml-auto bg-amber-500/10 text-amber-500 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/20 font-bold">
                {proximosRetornos.length} pendentes
              </span>
            </div>

            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {proximosRetornos.map((item) => (
                <div
                  key={item.cliente.id}
                  className="flex-shrink-0 w-64 bg-amber-500/[0.02] border border-amber-500/20 rounded-xl p-4 flex flex-col justify-between shadow-sm"
                >
                  <div className="cursor-pointer" onClick={() => navigate(`/clientes/${item.cliente.id}`)}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm text-zinc-100 block truncate pr-2">{item.cliente.nome}</span>
                      <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded shrink-0">
                        {item.diasAtrasados > 0 ? `Atrasado ${item.diasAtrasados}d` : 'Hoje'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mb-3 truncate">
                      Último: {item.ultimoCorte ? `${item.ultimoCorte.laterais} (${formatRelativeTime(item.ultimoCorte.data)})` : 'Nenhum corte registrado'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleWhatsAppReminder(item.cliente, item)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950/20 cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 fill-white text-emerald-600" />
                    Lembrar Cliente
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clientes List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1 select-none">
            <h2 className="text-xs font-semibold text-barber-text-secondary uppercase tracking-wider">
              {searchQuery ? 'Resultados da Busca' : 'Todos os Meus Clientes'}
            </h2>
            <span className="text-[10px] text-zinc-550 font-medium">{clientes.length} total</span>
          </div>

          <div className="bg-barber-card border border-barber-border rounded-xl divide-y divide-barber-border overflow-hidden shadow-md">
            {clientes.map((c) => {
              const lastCut = c.lastCut;
              return (
                <div
                  key={c.id}
                  className="p-4 hover:bg-barber-light/30 transition-colors flex justify-between items-center cursor-pointer"
                  onClick={() => navigate(`/clientes/${c.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-sm block text-zinc-200 truncate">{c.nome}</span>
                    <span className="text-[11px] text-barber-text-secondary block mt-0.5">
                      {c.telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                    </span>
                    {lastCut && (
                      <span className="text-[10px] text-barber-accent block mt-1.5 flex items-center gap-1 font-sans">
                        <Scissors className="w-3 h-3" />
                        {lastCut.laterais} • {formatRelativeTime(lastCut.data)}
                      </span>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                      <ChevronLeft className="w-4 h-4 rotate-180 text-zinc-400" />
                    </div>
                  </div>
                </div>
              );
            })}
            {clientes.length === 0 && (
              <div className="p-8 text-center text-zinc-500 select-none">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-zinc-650" />
                <p className="text-xs">Nenhum cliente cadastrado em sua conta</p>
              </div>
            )}
          </div>
        </div>

        {/* Global FAB (MOBILE) */}
        <div className="fixed bottom-20 right-6 z-20">
          <button
            onClick={() => navigate('/clientes/novo')}
            className="w-14 h-14 bg-barber-accent hover:bg-barber-accent-hover text-white rounded-full flex items-center justify-center shadow-lg shadow-barber-accent/45 active:scale-95 transition-transform cursor-pointer"
          >
            <UserPlus className="w-6 h-6" />
          </button>
        </div>
      </div>

    </div>
  );
}
