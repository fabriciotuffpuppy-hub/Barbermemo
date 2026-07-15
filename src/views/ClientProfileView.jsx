import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { db } from '../db';
import Lightbox from '../components/Lightbox';
import {
  Phone, Edit2, Trash2, Calendar, Scissors, PhoneCall, ArrowLeft
} from 'lucide-react';

export default function ClientProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, deleteCliente, refreshClientes } = useOutletContext();

  const [activeClient, setActiveClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState(null);

  const loadClientDetails = useCallback(async () => {
    if (!currentUser || !id) return;
    setLoading(true);
    try {
      const res = await db.getCliente(currentUser.id, id);
      setActiveClient(res);
    } catch (e) {
      console.error("Erro ao carregar detalhes do cliente:", e);
    } finally {
      setLoading(false);
    }
  }, [currentUser, id]);

  useEffect(() => {
    loadClientDetails();
  }, [loadClientDetails]);

  const handleDeleteClient = async () => {
    if (confirm("Tem certeza que deseja excluir este cliente e todo o histórico dele? Esta ação é irreversível.")) {
      try {
        await deleteCliente(id);
        navigate('/dashboard');
      } catch (err) {
        console.error(err);
        alert("Erro ao excluir cliente.");
      }
    }
  };

  const handleWhatsAppReminder = (client, elapsed, last) => {
    const phone = client.telefone.replace(/\D/g, '');
    if (!phone) {
      alert("Telefone inválido.");
      return;
    }
    const text = `Olá, ${client.nome}! Tudo bem? Sentimos sua falta aqui na barbearia. 💈 Faz ${elapsed} dias desde o seu último corte. Que tal darmos aquele trato no visual? Podemos agendar um horário! Abraço!`;
    window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
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

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center flex-col space-y-4">
        <div className="w-8 h-8 border-3 border-barber-accent border-t-transparent rounded-full animate-spin"></div>
        <span className="text-zinc-550 text-xs font-semibold">Buscando ficha do cliente...</span>
      </div>
    );
  }

  if (!activeClient) {
    return (
      <div className="p-8 text-center text-zinc-500 space-y-3 max-w-sm mx-auto">
        <AlertCircle className="w-10 h-10 mx-auto text-zinc-650" />
        <h3 className="text-zinc-300 font-bold">Cliente não encontrado</h3>
        <p className="text-xs">A ficha técnica procurada pode ter sido removida ou não pertence a esta conta.</p>
        <button onClick={() => navigate('/dashboard')} className="text-xs bg-zinc-800 text-zinc-300 py-1.5 px-3 rounded-lg border border-zinc-700 font-bold">
          Voltar ao Painel
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col font-sans fade-in">
      
      {/* Mobile Back navigation */}
      <div className="md:hidden flex items-center gap-2 mb-4">
        <button onClick={() => navigate('/dashboard')} className="p-2 bg-barber-card border border-barber-border rounded-lg text-zinc-400">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-zinc-400">Voltar ao Painel</span>
      </div>

      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-barber-border/50 pb-4 mb-5 gap-3 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2 font-sans flex-wrap">
            {activeClient.nome}
            <span className="text-[9px] font-normal bg-zinc-855 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700">
              CRM ID: {activeClient.id}
            </span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1 font-sans">
            <Phone className="w-3.5 h-3.5" />
            {activeClient.telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/clientes/${activeClient.id}/editar`)}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-755 text-zinc-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-barber-accent-light" /> Editar
          </button>
          <button
            onClick={handleDeleteClient}
            className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-455 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </button>
        </div>
      </div>

      {/* Workspaces details */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0 overflow-y-auto no-scrollbar pb-6">

        {/* Left pane: Profile metadata card */}
        <div className="md:col-span-4 space-y-4 h-fit md:sticky md:top-0">
          <div className="bg-barber-card border border-barber-border rounded-xl p-4 space-y-4 shadow-sm">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block select-none">Metadados e Alertas</span>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500 font-sans">Prazo de Retorno</span>
                <span className="font-semibold text-zinc-300 font-sans">{activeClient.intervaloDiasRetorno} dias</span>
              </div>

              {activeClient.atendimentos.length > 0 ? (
                (() => {
                  const last = activeClient.atendimentos[0];
                  const diff = new Date() - new Date(last.data);
                  const elapsed = Math.floor(diff / (1000 * 60 * 60 * 24));
                  const isOverdue = elapsed >= activeClient.intervaloDiasRetorno;

                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-zinc-550 font-sans">Última Visita</span>
                        <span className="font-semibold text-zinc-300 font-sans">{formatDate(last.data)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-550 font-sans">Intervalo Decorrido</span>
                        <span className={`font-semibold font-sans ${isOverdue ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {elapsed === 0 ? 'Hoje' : `${elapsed} dias`}
                        </span>
                      </div>
                    </>
                  );
                })()
              ) : (
                <div className="text-amber-500 font-semibold text-[11px] font-sans">Nenhum histórico</div>
              )}
            </div>

            {activeClient.atendimentos.length > 0 && (() => {
              const last = activeClient.atendimentos[0];
              const diff = new Date() - new Date(last.data);
              const elapsed = Math.floor(diff / (1000 * 60 * 60 * 24));
              const isOverdue = elapsed >= (activeClient.intervaloDiasRetorno - 2);

              if (isOverdue) {
                return (
                  <div className="pt-2 border-t border-barber-border/30">
                    <button
                      onClick={() => handleWhatsAppReminder(activeClient, elapsed, last)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Phone className="w-3.5 h-3.5 fill-white text-emerald-650" />
                      Lembrar por WhatsApp
                    </button>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          <button
            onClick={() => navigate(`/clientes/${activeClient.id}/atendimentos/novo`)}
            className="w-full bg-barber-accent hover:bg-barber-accent-hover text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-barber-accent/15 cursor-pointer transition-all"
          >
            <Scissors className="w-4 h-4" /> Registrar Atendimento
          </button>
        </div>

        {/* Right pane: Timeline history logs */}
        <div className="md:col-span-8 space-y-4">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block px-1 select-none">Linha do Tempo</span>

          {activeClient.atendimentos.length > 0 ? (
            <div className="relative border-l border-barber-border ml-2 pl-4 space-y-5">
              {activeClient.atendimentos.map((item) => (
                <div key={item.id} className="relative">
                  <span className="absolute -left-[22px] top-1.5 w-3 h-3 rounded-full border border-barber-accent bg-barber-dark flex items-center justify-center select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-barber-accent"></span>
                  </span>

                  <div className="bg-barber-card border border-barber-border rounded-xl p-4 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center text-xs select-none">
                      <span className="font-bold text-zinc-200 flex items-center gap-1 font-sans">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        {formatDate(item.data)}
                      </span>
                      <span className="text-[9px] font-semibold text-zinc-400 bg-zinc-850 px-2 py-0.5 rounded">
                        {formatRelativeTime(item.data)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                      {item.laterais && (
                        <div>
                          <span className="text-zinc-550 block text-[9px] uppercase font-bold select-none font-sans">Laterais</span>
                          <span className="text-zinc-300 font-medium font-sans">{item.laterais}</span>
                        </div>
                      )}
                      {item.topo && (
                        <div>
                          <span className="text-zinc-555 block text-[9px] uppercase font-bold select-none font-sans">Topo</span>
                          <span className="text-zinc-300 font-medium font-sans">{item.topo}</span>
                        </div>
                      )}
                      {item.barba && (
                        <div>
                          <span className="text-zinc-550 block text-[9px] uppercase font-bold select-none font-sans">Barba</span>
                          <span className="text-zinc-300 font-medium font-sans">{item.barba}</span>
                        </div>
                      )}
                      {item.produtos && (
                        <div>
                          <span className="text-zinc-550 block text-[9px] uppercase font-bold select-none font-sans">Produtos</span>
                          <span className="text-zinc-300 font-medium font-sans">{item.produtos}</span>
                        </div>
                      )}
                    </div>

                    {item.fotos && item.fotos.length > 0 && (
                      <div className="pt-2 border-t border-barber-border/20 flex gap-2 flex-wrap">
                        {item.fotos.map((src, i) => (
                          <div
                            key={i}
                            className="w-16 h-16 rounded-lg overflow-hidden border border-barber-border bg-barber-dark cursor-pointer relative group shrink-0"
                            onClick={() => setLightboxImage(src)}
                          >
                            <img src={src} alt="Corte" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-barber-card border border-barber-border rounded-xl p-8 text-center text-zinc-500 shadow-sm">
              <Scissors className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
              <p className="text-xs">Nenhum corte registrado ainda.</p>
              <button
                onClick={() => navigate(`/clientes/${activeClient.id}/atendimentos/novo`)}
                className="mt-3 bg-barber-accent hover:bg-barber-accent-hover text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all"
              >
                Registrar Primeiro Corte
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Lightbox photo preview */}
      <Lightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />

    </div>
  );
}
