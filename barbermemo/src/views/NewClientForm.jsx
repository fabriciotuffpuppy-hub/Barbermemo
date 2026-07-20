import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { db } from '../db';
import { ArrowLeft } from 'lucide-react';

export default function NewClientForm() {
  const { id } = useParams(); // present if editing
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, addCliente, updateCliente } = useOutletContext();

  const isEditMode = !!id;

  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    intervaloDiasRetorno: 20
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load client details if edit mode
  useEffect(() => {
    if (isEditMode && currentUser) {
      setLoading(true);
      db.getCliente(currentUser.id, id)
        .then(cli => {
          if (cli) {
            setForm({
              nome: cli.nome,
              telefone: cli.telefone,
              intervaloDiasRetorno: cli.intervaloDiasRetorno
            });
          }
          setLoading(false);
        })
        .catch(err => {
          console.error("Erro ao carregar dados do cliente:", err);
          setLoading(false);
        });
    }
  }, [isEditMode, id, currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.telefone.trim()) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      if (isEditMode) {
        await updateCliente(id, form);
        navigate(`/clientes/${id}`);
      } else {
        const newCli = await addCliente(form);
        
        // Redirect logic using state router history
        if (location.state?.fromAppointment) {
          navigate('/agendamentos/novo', {
            state: {
              prefilledClientId: newCli.id,
              prefilledClientNome: newCli.nome
            }
          });
        } else {
          navigate(`/clientes/${newCli.id}`);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar cliente.");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (isEditMode) {
      navigate(`/clientes/${id}`);
    } else if (location.state?.fromAppointment) {
      navigate('/agendamentos/novo');
    } else {
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center flex-col space-y-4">
        <div className="w-8 h-8 border-3 border-barber-accent border-t-transparent rounded-full animate-spin"></div>
        <span className="text-zinc-500 text-xs font-semibold">Carregando dados...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto w-full space-y-6 fade-in font-sans">
      
      {/* Back button */}
      <div className="flex justify-between items-center select-none">
        <h2 className="text-lg font-bold text-zinc-100 font-sans">
          {isEditMode ? 'Editar Cadastro de Cliente' : 'Cadastrar Novo Cliente'}
        </h2>
        <button
          onClick={handleBack}
          className="text-zinc-500 hover:text-zinc-300 text-xs flex items-center gap-1 cursor-pointer font-sans"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-barber-card border border-barber-border rounded-2xl p-6 space-y-4 shadow-xl">
        
        {/* Name input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 font-sans">Nome Completo</label>
          <input
            type="text"
            required
            disabled={saving}
            placeholder="Ex: João Silva"
            className="w-full bg-barber-dark border border-barber-border rounded-lg py-2.5 px-3 text-xs text-barber-text-primary placeholder:text-zinc-650"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
        </div>

        {/* Phone input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 font-sans">WhatsApp / Celular (com DDD)</label>
          <input
            type="tel"
            required
            disabled={saving}
            placeholder="Ex: 11988887777"
            className="w-full bg-barber-dark border border-barber-border rounded-lg py-2.5 px-3 text-xs text-barber-text-primary placeholder:text-zinc-650"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
          />
        </div>

        {/* Return interval picker */}
        <div className="space-y-1.5 select-none">
          <label className="text-xs font-semibold text-zinc-400 block font-sans">Intervalo de Retorno Sugerido</label>
          <div className="flex gap-2">
            {[15, 20, 25, 30].map((days) => (
              <button
                key={days}
                type="button"
                disabled={saving}
                onClick={() => setForm({ ...form, intervaloDiasRetorno: days })}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer font-sans ${
                  form.intervaloDiasRetorno === days
                    ? 'bg-barber-accent text-white border-barber-accent shadow-sm'
                    : 'bg-barber-dark text-zinc-400 border-barber-border hover:bg-zinc-900/30'
                }`}
              >
                {days} dias
              </button>
            ))}
          </div>
        </div>

        {/* Submit triggers */}
        <div className="pt-4 flex gap-3 select-none">
          <button
            type="button"
            disabled={saving}
            onClick={handleBack}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-lg text-xs font-bold cursor-pointer font-sans"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-barber-accent hover:bg-barber-accent-hover text-white py-2.5 rounded-lg text-xs font-bold cursor-pointer font-sans disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Cliente'}
          </button>
        </div>

      </form>
    </div>
  );
}
