import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Check, Plus, Trash2, Dumbbell, AlertCircle } from 'lucide-react';

export default function WorkoutFlow({ user, category, onFinish, onBack }) {
  const [exercises, setExercises] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [lastWorkoutSets, setLastWorkoutSets] = useState([]);
  const [currentSets, setCurrentSets] = useState([{ peso_kg: '', reps: '' }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Clave única para guardar el progreso por usuario y categoría
  const DRAFT_KEY = `gym_draft_${user?.id}_${category}`;

  useEffect(() => {
    initWorkout();
  }, [category, user]);

  // 1. Restaurar progreso local si existe un borrador guardado
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.sessionId) setSessionId(parsed.sessionId);
        if (parsed.currentIndex !== undefined) setCurrentIndex(parsed.currentIndex);
        if (parsed.currentSets) setCurrentSets(parsed.currentSets);
      } catch (e) {
        console.error('Error al restaurar borrador:', e);
      }
    }
  }, [DRAFT_KEY]);

  // 2. Auto-guardar en localStorage cada vez que cambie de ejercicio o altere los campos
  useEffect(() => {
    if (sessionId) {
      const draftData = {
        sessionId,
        currentIndex,
        currentSets,
        category,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    }
  }, [sessionId, currentIndex, currentSets, category, DRAFT_KEY]);

  const initWorkout = async () => {
    setLoading(true);
    try {
      // Si ya hay un sessionId cargado desde el borrador local, no creamos una nueva sesión en Supabase
      let activeSessionId = sessionId;

      if (!activeSessionId) {
        const { data: sessionData, error: sessionErr } = await supabase
          .from('workout_sessions')
          .insert([{ user_id: user.id, categoria: category }])
          .select()
          .single();

        if (sessionErr) throw sessionErr;
        activeSessionId = sessionData.id;
        setSessionId(activeSessionId);
      }

      // Cargar ejercicios de la categoría
      const { data: exData, error: exErr } = await supabase
        .from('exercises')
        .select('*')
        .eq('categoria', category)
        .order('orden', { ascending: true });

      if (exErr) throw exErr;
      setExercises(exData || []);

      if (exData && exData.length > 0) {
        const targetExerciseId = exData[currentIndex]?.id || exData[0].id;
        await loadLastWorkout(targetExerciseId);
      }
    } catch (err) {
      console.error('Error inicializando entrenamiento:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLastWorkout = async (exerciseId) => {
    try {
      const { data, error } = await supabase
        .from('set_logs')
        .select('num_serie, peso_kg, reps')
        .eq('exercise_id', exerciseId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setLastWorkoutSets(data.reverse());
      } else {
        setLastWorkoutSets([]);
      }
    } catch (err) {
      setLastWorkoutSets([]);
    }
  };

  const currentExercise = exercises[currentIndex];

  const handleAddSet = () => {
    const lastSet = currentSets[currentSets.length - 1];
    setCurrentSets([
      ...currentSets,
      { peso_kg: lastSet?.peso_kg || '', reps: lastSet?.reps || '' }
    ]);
  };

  const handleRemoveSet = (index) => {
    if (currentSets.length > 1) {
      setCurrentSets(currentSets.filter((_, i) => i !== index));
    }
  };

  const handleSetChange = (index, field, value) => {
    const updated = [...currentSets];
    updated[index][field] = value;
    setCurrentSets(updated);
  };

  const handleNextExercise = async () => {
    if (!sessionId || !currentExercise) return;

    const validSets = currentSets.filter(
      (s) => s.peso_kg !== '' && s.reps !== '' && parseFloat(s.peso_kg) >= 0 && parseInt(s.reps, 10) > 0
    );

    if (validSets.length === 0) {
      alert('Debes ingresar al menos 1 serie válida (peso y repeticiones) antes de continuar.');
      return;
    }

    setSaving(true);

    try {
      const setsToInsert = validSets.map((s, idx) => ({
        session_id: sessionId,
        exercise_id: currentExercise.id,
        num_serie: idx + 1,
        peso_kg: parseFloat(s.peso_kg),
        reps: parseInt(s.reps, 10)
      }));

      const { error } = await supabase.from('set_logs').insert(setsToInsert);
      if (error) throw error;

      if (currentIndex + 1 < exercises.length) {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        setCurrentSets([{ peso_kg: '', reps: '' }]);
        await loadLastWorkout(exercises[nextIdx].id);
      } else {
        // Limpiar el borrador local al finalizar exitosamente la rutina
        localStorage.removeItem(DRAFT_KEY);
        onFinish();
      }
    } catch (err) {
      console.error('Error al guardar series:', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <p className="text-slate-400 text-sm animate-pulse">Cargando rutina...</p>
      </div>
    );
  }

  if (!currentExercise) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-10 h-10 text-indigo-400 mb-2" />
        <p className="text-slate-300 font-medium mb-4">No se encontraron ejercicios registrados para esta categoría.</p>
        <button onClick={onBack} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs">
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-950 text-slate-100 p-4 flex flex-col justify-between">
      <div>
        {/* Cabecera */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="p-2 bg-slate-900 text-slate-400 rounded-xl border border-slate-800">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-indigo-400 bg-indigo-950/80 border border-indigo-800/50 px-3 py-1 rounded-full">
            Ejercicio {currentIndex + 1} de {exercises.length}
          </span>
        </div>

        {/* Título e Indicaciones */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Dumbbell className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">{currentExercise.nombre}</h2>
          </div>
          {currentExercise.indicaciones && (
            <p className="text-xs text-indigo-300 font-medium bg-indigo-950/40 border border-indigo-900/50 p-2 rounded-lg mt-2">
              📋 Objetivo: {currentExercise.indicaciones}
            </p>
          )}
        </div>

        {/* Referencia del último entrenamiento */}
        {lastWorkoutSets.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 mb-4">
            <p className="text-xs font-semibold text-slate-400 mb-2">Última sesión registrada:</p>
            <div className="flex flex-wrap gap-2">
              {lastWorkoutSets.map((s, idx) => (
                <span key={idx} className="text-xs bg-slate-950 text-slate-300 border border-slate-800 px-2 py-1 rounded-md">
                  S{s.num_serie}: <strong className="text-white">{s.peso_kg}kg</strong> x {s.reps}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Formulario de Series */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400">Registrar Series de Hoy:</p>

          {currentSets.map((set, index) => (
            <div key={index} className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <span className="text-xs font-bold text-slate-500 w-6 text-center">#{index + 1}</span>
              
              <div className="flex-1">
                <input
                  type="number"
                  placeholder="Kg"
                  value={set.peso_kg}
                  onChange={(e) => handleSetChange(index, 'peso_kg', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-center text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <span className="text-xs text-slate-500">x</span>

              <div className="flex-1">
                <input
                  type="number"
                  placeholder="Reps"
                  value={set.reps}
                  onChange={(e) => handleSetChange(index, 'reps', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-center text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {currentSets.length > 1 && (
                <button
                  onClick={() => handleRemoveSet(index)}
                  className="p-2 text-slate-500 hover:text-red-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={handleAddSet}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-indigo-400 text-xs font-semibold rounded-xl border border-dashed border-slate-800 flex items-center justify-center gap-1.5 transition mt-2"
          >
            <Plus className="w-4 h-4" /> Agregar otra serie
          </button>
        </div>
      </div>

      {/* Botón de Siguiente / Finalizar */}
      <div className="pt-4">
        <button
          onClick={handleNextExercise}
          disabled={saving}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          <Check className="w-5 h-5" />
          {saving
            ? 'Guardando...'
            : currentIndex + 1 === exercises.length
            ? 'Finalizar Entrenamiento'
            : 'Guardar y Siguiente Ejercicio'}
        </button>
      </div>
    </div>
  );
}