import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';

export function useClientes(barberId, searchQuery = '') {
  const [clientes, setClientes] = useState([]);
  const [proximosRetornos, setProximosRetornos] = useState([]);
  const [allDbClients, setAllDbClients] = useState([]);
  const [stats, setStats] = useState({ totalClientes: 0, totalAtendimentos: 0, atendimentosMes: 0 });
  const [loading, setLoading] = useState(false);

  const refreshClientes = useCallback(async () => {
    if (!barberId) return;
    setLoading(true);
    try {
      const [clis, retornos, st, allClis] = await Promise.all([
        db.getClientes(barberId, searchQuery),
        db.getProximosRetornos(barberId),
        db.getStats(barberId),
        db.getClientes(barberId, '')
      ]);
      setClientes(clis);
      setProximosRetornos(retornos);
      setStats(st);
      setAllDbClients(allClis);
    } catch (e) {
      console.error("Erro ao carregar dados dos clientes:", e);
    } finally {
      setLoading(false);
    }
  }, [barberId, searchQuery]);

  useEffect(() => {
    refreshClientes();
  }, [refreshClientes]);

  const addCliente = async (cliente) => {
    const data = await db.addCliente(barberId, cliente);
    await refreshClientes();
    return data;
  };

  const updateCliente = async (id, updatedFields) => {
    const data = await db.updateCliente(barberId, id, updatedFields);
    await refreshClientes();
    return data;
  };

  const deleteCliente = async (id) => {
    await db.deleteCliente(barberId, id);
    await refreshClientes();
  };

  const addAtendimento = async (atendimento) => {
    const data = await db.addAtendimento(barberId, atendimento);
    await refreshClientes();
    return data;
  };

  return {
    clientes,
    proximosRetornos,
    allDbClients,
    stats,
    loading,
    refreshClientes,
    addCliente,
    updateCliente,
    deleteCliente,
    addAtendimento
  };
}
