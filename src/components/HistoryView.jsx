import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Calendar, Dumbbell } from 'lucide-react';

export default function HistoryView({ user, category, onBack }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadHistory();
    }
  }, [user, category]);

  // Formatear la fecha según la zona horaria local del dispositivo
  const formatDate = (dateString) => {
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
            exercises ( nombre )
          )
        `)
        .eq('user_id', user.id)
        .eq('categoria', category)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filtrar sesiones vacías (sin series guardadas)
      const validSessions = (data || []).filter(
        (session) => session.set_logs && session.set_logs.length > 0
      );

      setSessions(validSessions);
    } catch (err) {
      console.error('Error al cargar historial:', err.message);
    } finally {
      setLoading(false);
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
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="p-2 bg-slate-900 text-slate-400 rounded-xl border border-slate-800">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-base font-bold capitalize">Historial: {category}</h1>
      </div>

      {loading ? (
        <p className="text-center text-slate-500 text-xs animate-pulse">Cargando historial...</p>
      ) : sessions.length === 0 ? (
        <div className="text-center py-10 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <Dumbbell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No hay sesiones registradas para esta categoría.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div key={session.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold mb-3 border-b border-slate-800 pb-2">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {formatDate(session.created_at)}
                </span>
              </div>

              <div className="space-y-2">
                {session.set_logs.map((log) => (
                  <div key={log.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-800/30 last:border-0">
                    <span className="text-slate-300 font-medium">{log.exercises?.nombre || 'Ejercicio'}</span>
                    <span className="text-slate-400 font-mono">
                      Serie {log.num_serie}: <strong className="text-white">{log.peso_kg}kg</strong> x {log.reps}
                    </span>
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