import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Calendar, Dumbbell, User, Flame, Trash2 } from 'lucide-react';

export default function HistoryView({ user, category, onBack }) {
  const [groupedHistory, setGroupedHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadHistory();
    }
  }, [user, category]);

  // Formatear la fecha según la zona horaria local del dispositivo (ej. 16/9/2026)
  const formatDateKey = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          created_at,
          categoria,
          set_logs (
            id,
            num_serie,
            peso_kg,
            reps,
            created_at,
            exercises ( nombre )
          )
        `)
        .eq('user_id', user.id)
        .eq('categoria', category)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filtrar sesiones vacías
      const validSessions = (data || []).filter(
        (session) => session.set_logs && session.set_logs.length > 0
      );

      // Agrupar las sesiones por FECHA (ej. 16/9/2026) en una única tarjeta por día
      const groupsMap = new Map();

      validSessions.forEach((session) => {
        const dateKey = formatDateKey(session.created_at);

        if (!groupsMap.has(dateKey)) {
          groupsMap.set(dateKey, {
            dateKey,
            rawDate: session.created_at,
            sessionIds: new Set([session.id]),
            exercisesMap: new Map() // nombre_ejercicio -> lista_de_series
          });
        } else {
          groupsMap.get(dateKey).sessionIds.add(session.id);
        }

        const group = groupsMap.get(dateKey);

        (session.set_logs || []).forEach((log) => {
          const exName = log.exercises?.nombre || 'Ejercicio';

          if (!group.exercisesMap.has(exName)) {
            group.exercisesMap.set(exName, []);
          }

          group.exercisesMap.get(exName).push(log);
        });
      });

      // Convertir el Map agrupado en un arreglo para renderizar
      const resultGroups = Array.from(groupsMap.values()).map((g) => ({
        dateKey: g.dateKey,
        rawDate: g.rawDate,
        sessionIds: Array.from(g.sessionIds),
        exercises: Array.from(g.exercisesMap.entries()).map(([exName, logs]) => ({
          name: exName,
          // Ordenar series numéricamente por num_serie
          logs: logs.sort((a, b) => (a.num_serie || 0) - (b.num_serie || 0))
        }))
      }));

      setGroupedHistory(resultGroups);
    } catch (err) {
      console.error('Error al cargar historial:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar una sesión completa por día
  const handleDeleteDateGroup = async (sessionIds, dateKey) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar todas las rutinas registradas el ${dateKey}?`)) {
      return;
    }

    setDeletingId(dateKey);
    try {
      const { error } = await supabase
        .from('workout_sessions')
        .delete()
        .in('id', sessionIds);

      if (error) throw error;

      await loadHistory();
    } catch (err) {
      alert('Error al eliminar la rutina: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Eliminar una serie individual
  const handleDeleteSingleLog = async (logId) => {
    if (!window.confirm('¿Deseas eliminar esta serie de tu historial?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('set_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;

      await loadHistory();
    } catch (err) {
      alert('Error al eliminar la serie: ' + err.message);
    }
  };

  if (!user?.id) {
    return (
      <div className="p-4 text-center text-slate-400">
        No se ha seleccionado un usuario válido.
        <button onClick={onBack} className="block mx-auto mt-4 text-xs text-indigo-400 underline">Volver</button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-950 text-slate-100 p-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="p-2 bg-slate-900 text-slate-400 rounded-xl border border-slate-800">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-right">
          <h1 className="text-base font-bold capitalize text-white">Historial: {category}</h1>
          <div className="flex items-center gap-1 text-xs text-indigo-400 justify-end font-medium">
            <User className="w-3.5 h-3.5 text-indigo-400" />
            <span>Atleta: {user.nombre}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-slate-500 text-xs animate-pulse py-10">Cargando historial...</p>
      ) : groupedHistory.length === 0 ? (
        <div className="text-center py-10 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <Dumbbell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400 mb-1">No hay sesiones registradas para esta categoría.</p>
          <p className="text-xs text-slate-600">Atleta: {user.nombre}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedHistory.map((group, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl relative">
              {/* Encabezado de la Tarjeta del Día con Botón de Eliminar */}
              <div className="flex items-center justify-between text-xs text-indigo-400 font-bold mb-3 border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm text-white font-extrabold">{group.dateKey}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 px-2.5 py-0.5 rounded-full font-semibold">
                    {user.nombre}
                  </span>
                  
                  {/* Botón de eliminar toda la rutina del día */}
                  <button
                    onClick={() => handleDeleteDateGroup(group.sessionIds, group.dateKey)}
                    disabled={deletingId === group.dateKey}
                    className="p-1.5 bg-slate-950 hover:bg-red-950/80 text-slate-400 hover:text-red-400 border border-slate-800 rounded-lg transition disabled:opacity-50"
                    title="Eliminar rutina de este día"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Lista de Ejercicios y sus Series en esa fecha */}
              <div className="space-y-3">
                {group.exercises.map((ex, exIdx) => (
                  <div key={exIdx} className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 mb-2">
                      <Flame className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{ex.name}</span>
                    </div>

                    <div className="space-y-1.5 pl-2 border-l-2 border-indigo-600/30">
                      {ex.logs.map((log) => {
                        const unitLabel = log.peso_kg <= 10 && log.peso_kg % 1 === 0 ? 'lbs/discos' : 'lbs';
                        return (
                          <div key={log.id} className="flex justify-between items-center text-xs py-0.5 group">
                            <span className="text-slate-400 text-[11px]">Serie {log.num_serie}:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-300 font-mono text-[11px]">
                                <strong className="text-white font-bold">{log.peso_kg} {unitLabel}</strong> × {log.reps} reps efectivas
                              </span>
                              <button
                                onClick={() => handleDeleteSingleLog(log.id)}
                                className="text-slate-600 hover:text-red-400 transition"
                                title="Eliminar solo esta serie"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}