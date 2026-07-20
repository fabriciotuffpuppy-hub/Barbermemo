import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { Search, Check, Plus, ArrowLeft } from 'lucide-react';

export default function NewAppointmentForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    allDbClients,
    addAgendamento,
    refreshClientes,
    refreshAgendamentos
  } = useOutletContext();

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const quickPills = [
    'Corte', 'Barba', 'Corte + Barba', 'Sobrancelha',
    'Luzes/Platinado', 'Selagem/Progressiva'
  ];

  // Prefill states from Router transition history (e.g. from slot click or client profile redirect)
  const [appointmentForm, setAppointmentForm] = useState({
    clienteId: location.state?.prefilledClientId || '',
    data: location.state?.prefilledDate || getTodayStr(),
    hora: location.state?.prefilledHour || '09:00',
    servicos: 'Corte'
  });

  const [appFormSearch, setAppFormSearch] = useState(() => {
    return location.state?.prefilledClientNome || '';
  });

  const [saving, setSaving] = useState(false);

  // Filter clients based on search input
  const filteredClients = appFormSearch.trim()
    ? allDbClients.filter(c =>
        c.nome.toLowerCase().includes(appFormSearch.toLowerCase()) ||
        c.telefone.includes(appFormSearch)
      )
    : allDbClients.slice(0, 5);

  const handlePillClick = (value) => {
    setAppointmentForm(prev => {
      const current = prev.servicos.trim();
      if (!current) return { ...prev, servicos: value };
      if (current.includes(value)) return prev;
      return { ...prev, servicos: `${current}, ${value}` };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!appointmentForm.clienteId) {
      alert("Por favor, selecione um cliente.");
      return;
    }
    if (!appointmentForm.data || !appointmentForm.hora) {
      alert("Por favor, forneça data e hora válidas.");
      return;
    }

    setSaving(true);
    try {
      const datetimeStr = `${appointmentForm.data}T${appointmentForm.hora}:00`;
      await addAgendamento({
        clienteId: appointmentForm.clienteId,
        dataHora: new Date(datetimeStr).toISOString(),
        servicos: appointmentForm.servicos
      });

      await refreshAgendamentos();
      await refreshClientes();

      // Redirect to Calendar route
      navigate('/agendamentos');
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar agendamento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto w-full space-y-6 fade-in font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center select-none">
        <h2 className="text-lg font-bold text-zinc-100 font-sans">Agendar Novo Horário</h2>
        <button
          onClick={() => navigate('/agendamentos')}
          className="text-zinc-550 hover:text-zinc-300 text-xs flex items-center gap-1 cursor-pointer font-sans"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-barber-card border border-barber-border rounded-2xl p-6 space-y-4 shadow-xl">
        
        {/* Client Search/Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 font-sans">1. Selecionar Cliente</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-zinc-500 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Buscar entre meus clientes..."
              disabled={saving}
              className="w-full bg-barber-dark border border-barber-border rounded-lg py-2 pl-8 pr-4 text-xs text-barber-text-primary placeholder:text-zinc-655"
              value={appFormSearch}
              onChange={(e) => setAppFormSearch(e.target.value)}
            />
          </div>

          {/* List display */}
          <div className="bg-barber-dark border border-barber-border rounded-lg max-h-32 overflow-y-auto divide-y divide-barber-border/30 mt-1 select-none no-scrollbar shadow-inner">
            {filteredClients.map(c => {
              const selected = appointmentForm.clienteId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    if (saving) return;
                    setAppointmentForm({ ...appointmentForm, clienteId: c.id });
                    setAppFormSearch(c.nome);
                  }}
                  className={`p-2 text-xs cursor-pointer flex justify-between items-center transition-colors font-sans ${
                    selected ? 'bg-barber-accent/15 text-white' : 'hover:bg-zinc-800/30 text-zinc-300'
                  }`}
                >
                  <span>{c.nome}</span>
                  {selected && <Check className="w-3.5 h-3.5 text-barber-accent-light" />}
                </div>
              );
            })}
            
            {filteredClients.length === 0 && appFormSearch.trim() !== '' && (
              <div className="p-3 text-center bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-2 select-none">
                <p className="text-[11px] text-amber-500 font-sans">Cliente não encontrado, deseja cadastrá-lo agora?</p>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    navigate('/clientes/novo', { state: { fromAppointment: true } });
                  }}
                  className="text-[9px] font-bold text-white bg-barber-accent hover:bg-barber-accent-hover py-1 px-3 rounded-lg cursor-pointer transition-all active:scale-95"
                >
                  Adicionar "{appFormSearch}"
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Date and hour picker */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 font-sans">Data do Agendamento</label>
            <input
              type="date"
              required
              disabled={saving}
              className="w-full bg-barber-dark border border-barber-border rounded-lg py-2.5 px-3 text-xs text-zinc-200"
              value={appointmentForm.data}
              onChange={(e) => setAppointmentForm({ ...appointmentForm, data: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 font-sans">Horário</label>
            <input
              type="time"
              required
              disabled={saving}
              className="w-full bg-barber-dark border border-barber-border rounded-lg py-2.5 px-3 text-xs text-zinc-200 font-mono"
              value={appointmentForm.hora}
              onChange={(e) => setAppointmentForm({ ...appointmentForm, hora: e.target.value })}
            />
          </div>
        </div>

        {/* Services detail */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 block font-sans">Serviços</label>
          <input
            type="text"
            required
            disabled={saving}
            placeholder="Ex: Corte clássico..."
            className="w-full bg-barber-dark border border-barber-border rounded-lg py-2 px-3 text-xs text-barber-text-primary placeholder:text-zinc-655"
            value={appointmentForm.servicos}
            onChange={(e) => setAppointmentForm({ ...appointmentForm, servicos: e.target.value })}
          />
          <div className="flex flex-wrap gap-1.5 pt-1.5 select-none">
            {quickPills.map((pill) => (
              <button
                key={pill}
                type="button"
                disabled={saving}
                onClick={() => handlePillClick(pill)}
                className="bg-zinc-850 text-[9px] text-zinc-400 px-2 py-0.5 rounded border border-zinc-700 hover:bg-zinc-750 cursor-pointer font-sans transition-all"
              >
                {pill}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 flex gap-3 select-none">
          <button
            type="button"
            disabled={saving}
            onClick={() => navigate('/agendamentos')}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-lg text-xs font-bold cursor-pointer font-sans"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-barber-accent hover:bg-barber-accent-hover text-white py-2.5 rounded-lg text-xs font-bold cursor-pointer font-sans disabled:opacity-50 transition-all active:scale-95"
          >
            {saving ? 'Salvando...' : 'Salvar Agendamento'}
          </button>
        </div>

      </form>
    </div>
  );
}
