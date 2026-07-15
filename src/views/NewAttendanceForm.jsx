import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { db } from '../db';
import ImagePicker from '../components/ImagePicker';
import {
  Scissors, Phone, AlertCircle, ArrowLeft, Clock, Calendar
} from 'lucide-react';

export default function NewAttendanceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, addAtendimento, refreshClientes } = useOutletContext();

  const [activeClient, setActiveClient] = useState(null);
  const [loadingClient, setLoadingClient] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [form, setForm] = useState({
    laterais: '',
    topo: '',
    barba: '',
    produtos: ''
  });
  const [selectedPhotos, setSelectedPhotos] = useState([]);

  // Load client details
  const loadClientDetails = useCallback(async () => {
    if (!currentUser || !id) return;
    setLoadingClient(true);
    try {
      const res = await db.getCliente(currentUser.id, id);
      setActiveClient(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingClient(false);
    }
  }, [currentUser, id]);

  useEffect(() => {
    loadClientDetails();
  }, [loadClientDetails]);

  // Pill click helper to append values
  const handlePillClick = (field, value) => {
    setForm(prev => {
      const current = prev[field].trim();
      if (!current) return { ...prev, [field]: value };
      if (current.includes(value)) return prev;
      return { ...prev, [field]: `${current}, ${value}` };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addAtendimento({
        clienteId: id,
        laterais: form.laterais,
        topo: form.topo,
        barba: form.barba,
        produtos: form.produtos,
        fotos: selectedPhotos
      });

      await refreshClientes();
      navigate(`/clientes/${id}`);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar atendimento.");
    } finally {
      setSaving(false);
    }
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

  if (loadingClient) {
    return (
      <div className="p-8 flex items-center justify-center flex-col space-y-4">
        <div className="w-8 h-8 border-3 border-barber-accent border-t-transparent rounded-full animate-spin"></div>
        <span className="text-zinc-550 text-xs font-semibold">Buscando perfil do cliente...</span>
      </div>
    );
  }

  if (!activeClient) {
    return (
      <div className="p-8 text-center text-zinc-550 max-w-sm mx-auto space-y-3">
        <AlertCircle className="w-8 h-8 mx-auto text-zinc-650" />
        <h3 className="text-zinc-300 font-bold">Cliente inválido</h3>
        <p className="text-xs">Não foi possível localizar o cliente para iniciar o atendimento.</p>
        <button onClick={() => navigate('/dashboard')} className="bg-zinc-800 text-xs font-bold py-2 px-4 rounded-xl font-sans">
          Voltar ao Painel
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col font-sans fade-in">
      
      {/* Mobile Back Header */}
      <div className="md:hidden flex items-center gap-2 mb-4">
        <button onClick={() => navigate(`/clientes/${id}`)} className="p-2 bg-barber-card border border-barber-border rounded-lg text-zinc-400">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-zinc-400">Voltar ao Perfil</span>
      </div>

      <div className="flex justify-between items-center border-b border-barber-border/50 pb-4 mb-5 shrink-0 select-none">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            Registrar Atendimento
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">Fórmula técnica para o cliente: <strong>{activeClient.nome}</strong></p>
        </div>
        <button
          onClick={() => navigate(`/clientes/${id}`)}
          className="text-zinc-550 hover:text-zinc-300 text-xs flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Cancelar
        </button>
      </div>

      {/* Main Layout Area */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0 overflow-y-auto no-scrollbar pb-6">
        
        {/* Profile Card (Desktop Only - Left Pane) */}
        <div className="hidden md:block md:col-span-4 space-y-4 h-fit sticky top-0">
          <div className="bg-barber-card border border-barber-border rounded-xl p-4 space-y-4 shadow-sm select-none">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">Metadados e Alertas</span>

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
          </div>
        </div>

        {/* Form Area (Desktop: 8 columns, Mobile: 12 columns) */}
        <div className="md:col-span-8">
          <div className="bg-barber-card border border-barber-border rounded-xl p-5 space-y-4 shadow-md">
            
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Laterais */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 font-sans">Laterais (Corte / Máquina)</label>
                <input
                  type="text"
                  required
                  disabled={saving}
                  placeholder="Ex: Degradê navalhado do 0 ao 2..."
                  className="w-full bg-barber-dark border border-barber-border rounded-lg py-2.5 px-3 text-xs text-barber-text-primary placeholder:text-zinc-650"
                  value={form.laterais}
                  onChange={(e) => setForm({ ...form, laterais: e.target.value })}
                />
                <div className="flex flex-wrap gap-1.5 select-none pt-1">
                  {['Degradê', 'Máquina 1', 'Máquina 2', 'Máquina 3', 'Tesoura', 'Na Navalha'].map(val => (
                    <button
                      key={val}
                      type="button"
                      disabled={saving}
                      onClick={() => handlePillClick('laterais', val)}
                      className="bg-zinc-850 text-[9px] text-zinc-400 px-2 py-0.5 rounded border border-zinc-700 hover:bg-zinc-750 font-sans transition-all cursor-pointer"
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topo */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 font-sans">Topo (Corte / Tesoura)</label>
                <input
                  type="text"
                  required
                  disabled={saving}
                  placeholder="Ex: Topete leve desfiado na tesoura..."
                  className="w-full bg-barber-dark border border-barber-border rounded-lg py-2.5 px-3 text-xs text-barber-text-primary placeholder:text-zinc-655"
                  value={form.topo}
                  onChange={(e) => setForm({ ...form, topo: e.target.value })}
                />
                <div className="flex flex-wrap gap-1.5 select-none pt-1">
                  {['Curto', 'Médio', 'Comprido', 'Topete', 'Desfiado', 'Na Tesoura'].map(val => (
                    <button
                      key={val}
                      type="button"
                      disabled={saving}
                      onClick={() => handlePillClick('topo', val)}
                      className="bg-zinc-855 text-[9px] text-zinc-450 px-2 py-0.5 rounded border border-zinc-700 hover:bg-zinc-750 font-sans transition-all cursor-pointer"
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Barba */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 font-sans">Barba</label>
                <input
                  type="text"
                  disabled={saving}
                  placeholder="Ex: Aparada na máquina 1 com contorno na navalha..."
                  className="w-full bg-barber-dark border border-barber-border rounded-lg py-2.5 px-3 text-xs text-barber-text-primary placeholder:text-zinc-655"
                  value={form.barba}
                  onChange={(e) => setForm({ ...form, barba: e.target.value })}
                />
                <div className="flex flex-wrap gap-1.5 select-none pt-1">
                  {['Feita', 'Aparada', 'Desenhada', 'Terapia', 'Na Toalha', 'Sem Barba'].map(val => (
                    <button
                      key={val}
                      type="button"
                      disabled={saving}
                      onClick={() => handlePillClick('barba', val)}
                      className="bg-zinc-855 text-[9px] text-zinc-450 px-2 py-0.5 rounded border border-zinc-700 hover:bg-zinc-750 font-sans transition-all cursor-pointer"
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Produtos */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 font-sans">Produtos Utilizados</label>
                <input
                  type="text"
                  disabled={saving}
                  placeholder="Ex: Pomada matte e óleo de barba..."
                  className="w-full bg-barber-dark border border-barber-border rounded-lg py-2.5 px-3 text-xs text-barber-text-primary placeholder:text-zinc-655"
                  value={form.produtos}
                  onChange={(e) => setForm({ ...form, produtos: e.target.value })}
                />
                <div className="flex flex-wrap gap-1.5 select-none pt-1">
                  {['Pomada Efeito Mate', 'Pomada Efeito Brilho', 'Óleo de Barba', 'Shampoo', 'Condicionador', 'Spray'].map(val => (
                    <button
                      key={val}
                      type="button"
                      disabled={saving}
                      onClick={() => handlePillClick('produtos', val)}
                      className="bg-zinc-855 text-[9px] text-zinc-450 px-2 py-0.5 rounded border border-zinc-700 hover:bg-zinc-750 font-sans transition-all cursor-pointer"
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fotos Upload */}
              <div className="pt-2">
                <ImagePicker selectedPhotos={selectedPhotos} setSelectedPhotos={setSelectedPhotos} />
              </div>

              {/* Submit triggers */}
              <div className="pt-4 flex gap-3 select-none">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => navigate(`/clientes/${id}`)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-lg text-xs font-bold cursor-pointer font-sans"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-barber-accent hover:bg-barber-accent-hover text-white py-2.5 rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer font-sans transition-all active:scale-95 shadow-md shadow-barber-accent/15"
                >
                  {saving ? 'Registrando...' : 'Salvar Ficha do Corte'}
                </button>
              </div>

            </form>

          </div>
        </div>

      </div>

    </div>
  );
}
