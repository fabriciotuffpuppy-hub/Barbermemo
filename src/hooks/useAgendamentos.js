import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';

export function useAgendamentos(barberId, selectedDate) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshAgendamentos = useCallback(async () => {
    if (!barberId || !selectedDate) return;
    setLoading(true);
    try {
      const data = await db.getAgendamentos(barberId, selectedDate);
      setAgendamentos(data);
    } catch (e) {
      console.error("Erro ao carregar agendamentos:", e);
    } finally {
      setLoading(false);
    }
  }, [barberId, selectedDate]);

  useEffect(() => {
    refreshAgendamentos();
  }, [refreshAgendamentos]);

  const addAgendamento = async (agendamento) => {
    const data = await db.addAgendamento(barberId, agendamento);
    await refreshAgendamentos();
    return data;
  };

  const updateAgendamentoStatus = async (id, status) => {
    const data = await db.updateAgendamentoStatus(barberId, id, status);
    await refreshAgendamentos();
    return data;
  };

  const deleteAgendamento = async (id) => {
    await db.deleteAgendamento(barberId, id);
    await refreshAgendamentos();
  };

  return {
    agendamentos,
    loading,
    refreshAgendamentos,
    addAgendamento,
    updateAgendamentoStatus,
    deleteAgendamento
  };
}
