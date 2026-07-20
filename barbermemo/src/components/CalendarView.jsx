import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Calendar, Clock, Plus, Check, X,
  User, UserCheck, Scissors, ExternalLink, RefreshCw, MessageSquare
} from 'lucide-react';
import { db } from '../db';

const HOUR_HEIGHT = 68; // height in pixels of one hour row
const START_HOUR = 7;   // Grid starts at 07:00
const END_HOUR = 21;    // Grid ends at 21:00 (inclusive of slot 21:00-22:00)
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

// Estimate duration based on services text
const getServiceDuration = (servicesStr) => {
  const service = (servicesStr || '').toLowerCase();
  if (service.includes('platinado') || service.includes('luzes')) return 90;
  if (service.includes('selagem') || service.includes('progressiva')) return 120;
  if (service.includes('corte + barba') || service.includes('corte e barba')) return 60;
  if (service.includes('corte')) return 40;
  if (service.includes('barba')) return 30;
  if (service.includes('sobrancelha')) return 20;
  return 45; // default 45 mins
};

export default function CalendarView() {
  const {
    currentUser,
    selectedDate,
    setSelectedDate,
    refreshClientes,
    refreshAgendamentos
  } = useOutletContext();

  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState('week'); // week | day
  const [baseDate, setBaseDate] = useState(new Date(selectedDate + 'T00:00:00'));
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null); // for appointment details popup
  const [actionLoading, setActionLoading] = useState(false);

  // Timezone-safe local string helpers
  const toLocalDateStr = (d) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };

  // Sync baseDate with selectedDate from parent if it changes
  useEffect(() => {
    setBaseDate(new Date(selectedDate + 'T00:00:00'));
  }, [selectedDate]);

  // Calculate days of the current week (Monday to Sunday) based on baseDate
  const getWeekDays = (date) => {
    const current = new Date(date);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Monday starts the week
    const monday = new Date(current.setDate(diff));
    
    return Array.from({ length: 7 }, (_, i) => {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      return nextDay;
    });
  };

  const weekDays = getWeekDays(baseDate);

  // Fetch range appointments
  const fetchAppointments = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      let startStr, endStr;
      if (viewMode === 'week') {
        startStr = toLocalDateStr(weekDays[0]);
        endStr = toLocalDateStr(weekDays[6]);
      } else {
        startStr = toLocalDateStr(baseDate);
        endStr = startStr;
      }
      const data = await db.getAgendamentosRange(currentUser.id, startStr, endStr);
      setAppointments(data);
    } catch (error) {
      console.error('Erro ao buscar agendamentos para o calendário:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [baseDate, viewMode, currentUser]);

  // Navigate baseDate
  const handlePrev = () => {
    const newDate = new Date(baseDate);
    if (viewMode === 'week') {
      newDate.setDate(baseDate.getDate() - 7);
    } else {
      newDate.setDate(baseDate.getDate() - 1);
    }
    setBaseDate(newDate);
    setSelectedDate(toLocalDateStr(newDate));
  };

  const handleNext = () => {
    const newDate = new Date(baseDate);
    if (viewMode === 'week') {
      newDate.setDate(baseDate.getDate() + 7);
    } else {
      newDate.setDate(baseDate.getDate() + 1);
    }
    setBaseDate(newDate);
    setSelectedDate(toLocalDateStr(newDate));
  };

  const handleToday = () => {
    const today = new Date();
    setBaseDate(today);
    setSelectedDate(toLocalDateStr(today));
  };

  // Render hour formatting
  const formatHourString = (hour) => `${String(hour).padStart(2, '0')}:00`;

  // Handle cell slot click to create appointment
  const handleSlotClick = (dateStr, hour) => {
    const hourStr = String(hour).padStart(2, '0') + ':00';
    navigate('/agendamentos/novo', {
      state: {
        prefilledDate: dateStr,
        prefilledHour: hourStr
      }
    });
  };

  // Toggle appointment status
  const handleToggleStatus = async (appId, newStatus) => {
    setActionLoading(true);
    try {
      await db.updateAgendamentoStatus(currentUser.id, appId, newStatus);
      setSelectedApp(null);
      await fetchAppointments();
      refreshAgendamentos();
      refreshClientes();
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete appointment
  const handleDeleteApp = async (appId) => {
    if (confirm('Deseja cancelar/excluir este agendamento?')) {
      setActionLoading(true);
      try {
        await db.deleteAgendamento(currentUser.id, appId);
        setSelectedApp(null);
        await fetchAppointments();
        refreshAgendamentos();
        refreshClientes();
      } catch (e) {
        console.error(e);
        alert('Erro ao cancelar agendamento.');
      } finally {
        setActionLoading(false);
      }
    }
  };

  // Format helper to extract hour and minute from ISO date
  const parseTime = (dateStr) => {
    const date = new Date(dateStr);
    return {
      hours: date.getHours(),
      minutes: date.getMinutes()
    };
  };

  // Render month header
  const getHeaderMonthYear = () => {
    const options = { month: 'long', year: 'numeric' };
    return baseDate.toLocaleDateString('pt-BR', options);
  };

  // Render appointment cards absolute positioned inside day container
  const renderAppointmentsForDay = (dateStr) => {
    const dayApps = appointments.filter(app => {
      const appDateStr = toLocalDateStr(new Date(app.dataHora));
      return appDateStr === dateStr;
    });

    return dayApps.map(app => {
      const { hours, minutes } = parseTime(app.dataHora);
      const startDecimal = hours + minutes / 60;
      
      if (startDecimal < START_HOUR || startDecimal > END_HOUR + 1) return null;

      const duration = getServiceDuration(app.servicos);
      const topPx = (startDecimal - START_HOUR) * HOUR_HEIGHT;
      const heightPx = (duration / 60) * HOUR_HEIGHT;

      let statusColor = 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20';
      if (app.status === 'Confirmado') {
        statusColor = 'bg-sky-500/10 text-sky-400 border-sky-500/30 hover:bg-sky-500/20';
      } else if (app.status === 'Concluído') {
        statusColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20';
      }

      return (
        <div
          key={app.id}
          className={`absolute left-1 right-1 rounded-lg border p-1 text-[10px] leading-tight flex flex-col justify-between overflow-hidden shadow-sm cursor-pointer select-none transition-all group hover:z-10 ${statusColor}`}
          style={{ top: `${topPx + 2}px`, height: `${heightPx - 4}px` }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedApp(app);
          }}
        >
          <div className="font-bold truncate">
            {new Date(app.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {app.cliente ? app.cliente.nome : 'Cliente'}
          </div>
          <div className="truncate text-[8px] text-zinc-400">{app.servicos}</div>
        </div>
      );
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-barber-dark font-sans select-none">
      
      {/* Calendar Header Control Bar */}
      <div className="p-4 border-b border-barber-border bg-barber-card/25 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-barber-accent/10 border border-barber-accent/20 flex items-center justify-center text-barber-accent">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-widest font-sans">Agenda Virtual</h2>
            <span className="text-[10px] text-zinc-500 capitalize">{getHeaderMonthYear()}</span>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-barber-border/80">
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${viewMode === 'week' ? 'bg-barber-accent text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Semana
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${viewMode === 'day' ? 'bg-barber-accent text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Dia
          </button>
        </div>

        {/* Navigator buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-2 bg-barber-card hover:bg-zinc-800 border border-barber-border rounded-lg text-zinc-400 hover:text-white cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-[10px] font-bold uppercase cursor-pointer"
          >
            Hoje
          </button>
          <button
            onClick={handleNext}
            className="p-2 bg-barber-card hover:bg-zinc-800 border border-barber-border rounded-lg text-zinc-400 hover:text-white cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={fetchAppointments}
            className="p-2 bg-zinc-850 hover:bg-zinc-850 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
            title="Recarregar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid container with hours and columns */}
      <div className="flex-1 overflow-auto no-scrollbar relative min-h-0">
        
        <div className="flex min-w-[700px] md:min-w-0" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
          
          {/* Left vertical hours axis */}
          <div className="w-14 border-r border-barber-border/40 select-none bg-barber-dark sticky left-0 z-20 shrink-0">
            {HOURS.map(hour => (
              <div
                key={hour}
                className="text-[10px] text-zinc-550 pr-2 text-right font-mono flex items-start justify-end pt-1"
                style={{ height: `${HOUR_HEIGHT}px` }}
              >
                {formatHourString(hour)}
              </div>
            ))}
          </div>

          {/* Columns for days */}
          <div className="flex-1 flex divide-x divide-barber-border/30 relative">
            
            {/* Background grid line borders */}
            <div className="absolute inset-0 pointer-events-none z-0 flex flex-col">
              {HOURS.map(hour => (
                <div key={hour} className="border-b border-barber-border/20" style={{ height: `${HOUR_HEIGHT}px` }}></div>
              ))}
            </div>

            {/* View renders */}
            {viewMode === 'week' ? (
              weekDays.map((day, idx) => {
                const dateStr = toLocalDateStr(day);
                const isToday = toLocalDateStr(new Date()) === dateStr;
                return (
                  <div key={idx} className="flex-1 relative min-h-full group hover:bg-zinc-850/5">
                    {/* Header showing weekday name and number */}
                    <div className="sticky top-0 bg-barber-card/65 backdrop-blur-sm border-b border-barber-border/40 py-1.5 px-2 text-center z-10 select-none">
                      <span className="text-[9px] text-zinc-500 uppercase font-black block tracking-wider font-sans">
                        {day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                      </span>
                      <span className={`text-xs font-bold font-sans inline-block mt-0.5 w-5 h-5 rounded-full leading-5 ${isToday ? 'bg-barber-accent text-white shadow-md' : 'text-zinc-300'}`}>
                        {day.getDate()}
                      </span>
                    </div>

                    {/* Hourly slots */}
                    <div className="relative w-full h-full">
                      {HOURS.map(hour => (
                        <div
                          key={hour}
                          className="w-full hover:bg-zinc-800/10 cursor-crosshair transition-colors"
                          style={{ height: `${HOUR_HEIGHT}px` }}
                          onClick={() => handleSlotClick(dateStr, hour)}
                        ></div>
                      ))}

                      {/* Absolute appointment cards */}
                      {renderAppointmentsForDay(dateStr)}
                    </div>
                  </div>
                );
              })
            ) : (
              // Single day viewmode
              (() => {
                const dateStr = toLocalDateStr(baseDate);
                const isToday = toLocalDateStr(new Date()) === dateStr;
                return (
                  <div className="flex-1 relative min-h-full">
                    <div className="sticky top-0 bg-barber-card/65 backdrop-blur-sm border-b border-barber-border/40 py-2.5 px-4 z-10 flex items-center justify-between select-none">
                      <span className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                        Dia selecionado: <strong className="text-barber-accent-light">{baseDate.toLocaleDateString('pt-BR', { weekday: 'long' })}</strong>
                      </span>
                      <span className={`text-xs font-bold inline-block px-3 py-1 rounded-lg ${isToday ? 'bg-barber-accent/15 text-barber-accent border border-barber-accent/30' : 'bg-zinc-850 text-zinc-400'}`}>
                        {baseDate.getDate()} de {baseDate.toLocaleDateString('pt-BR', { month: 'long' })}
                      </span>
                    </div>

                    <div className="relative w-full h-full">
                      {HOURS.map(hour => (
                        <div
                          key={hour}
                          className="w-full hover:bg-zinc-800/10 cursor-crosshair transition-colors"
                          style={{ height: `${HOUR_HEIGHT}px` }}
                          onClick={() => handleSlotClick(dateStr, hour)}
                        ></div>
                      ))}

                      {renderAppointmentsForDay(dateStr)}
                    </div>
                  </div>
                );
              })()
            )}

          </div>

        </div>

      </div>

      {/* Appointment Detail Popup */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 fade-in" onClick={() => setSelectedApp(null)}>
          <div className="bg-barber-card border border-barber-border w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-100" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start select-none">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Detalhes do Agendamento</span>
              <button onClick={() => setSelectedApp(null)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-barber-accent shrink-0 border border-zinc-700 select-none">
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider select-none">Cliente</span>
                  <span className="font-bold text-sm text-zinc-200 block truncate">{selectedApp.cliente ? selectedApp.cliente.nome : 'Cliente Desconhecido'}</span>
                  {selectedApp.cliente && selectedApp.cliente.telefone && (
                    <div className="flex items-center gap-1.5 mt-0.5 select-none">
                      <span className="text-xs text-zinc-400 select-all">
                        {selectedApp.cliente.telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                      </span>
                      <a
                        href={`https://api.whatsapp.com/send?phone=55${selectedApp.cliente.telefone.replace(/\D/g, '')}&text=${encodeURIComponent(
                          `Olá, ${selectedApp.cliente.nome}! Aqui é o ${currentUser?.nome}${currentUser?.barbeariaName ? ` da ${currentUser.barbeariaName}` : ''}. Estou entrando em contato sobre o seu agendamento no dia ${new Date(selectedApp.dataHora).toLocaleDateString('pt-BR')} às ${new Date(selectedApp.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-500 hover:text-emerald-400 transition-colors p-0.5 rounded hover:bg-zinc-800/60"
                        title="Enviar mensagem no WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-zinc-950/20 p-3 rounded-xl border border-barber-border/30 text-xs">
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block select-none">Serviços</span>
                  <span className="font-semibold text-zinc-300">{selectedApp.servicos}</span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block select-none">Horário</span>
                  <span className="font-semibold text-zinc-300 flex items-center gap-1 select-none">
                    <Clock className="w-3 h-3 text-barber-accent" />
                    {new Date(selectedApp.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="col-span-2 border-t border-barber-border/20 pt-2 mt-1">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block select-none">Status Atual</span>
                  <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded uppercase select-none ${
                    selectedApp.status === 'Concluído'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : selectedApp.status === 'Confirmado'
                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}>
                    {selectedApp.status}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2 select-none">
                {selectedApp.cliente && selectedApp.cliente.telefone && (
                  <a
                    href={`https://api.whatsapp.com/send?phone=55${selectedApp.cliente.telefone.replace(/\D/g, '')}&text=${encodeURIComponent(
                      `Olá, ${selectedApp.cliente.nome}! Aqui é o ${currentUser?.nome}${currentUser?.barbeariaName ? ` da ${currentUser.barbeariaName}` : ''}. Estou entrando em contato sobre o seu agendamento no dia ${new Date(selectedApp.dataHora).toLocaleDateString('pt-BR')} às ${new Date(selectedApp.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950/20"
                  >
                    <MessageSquare className="w-3.5 h-3.5 fill-white text-emerald-600" />
                    Enviar Mensagem no WhatsApp
                  </a>
                )}
                <div className="flex gap-2">
                  {selectedApp.status !== 'Concluído' && (
                    <button
                      onClick={() => {
                        navigate(`/clientes/${selectedApp.clienteId}/atendimentos/novo`, {
                          state: { appointmentId: selectedApp.id }
                        });
                        setSelectedApp(null);
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Concluir
                    </button>
                  )}
                  {selectedApp.status === 'Pendente' && (
                    <button
                      onClick={() => handleToggleStatus(selectedApp.id, 'Confirmado')}
                      disabled={actionLoading}
                      className="flex-1 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Confirmar
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  {selectedApp.clienteId && (
                    <button
                      onClick={() => {
                        navigate(`/clientes/${selectedApp.clienteId}`);
                        setSelectedApp(null);
                      }}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-zinc-755 cursor-pointer"
                    >
                      <Scissors className="w-3.5 h-3.5 text-barber-accent-light" />
                      Ver Ficha
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteApp(selectedApp.id)}
                    disabled={actionLoading}
                    className="flex-1 bg-red-950/20 hover:bg-red-950/40 text-red-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border border-red-900/30 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
