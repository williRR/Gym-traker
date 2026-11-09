import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { getLastWorkoutSets } from '../lastWorkout';
import { sortLegExercises } from '../legExercises';
import { weightUnitLabel } from '../weightUnit';
import { ArrowLeft, Check, Plus, Trash2, Dumbbell, AlertCircle, Disc, Scale } from 'lucide-react';

export default function WorkoutFlow({ user, category, onFinish, onBack }) {
  const [exercises, setExercises] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [lastWorkout, setLastWorkout] = useState(null);
  const [currentSets, setCurrentSets] = useState([{ peso_kg: '', reps: '', unidad: 'lbs' }]);
  const [sentadillaVariant, setSentadillaVariant] = useState('Libre'); // 'Libre' | 'Hack'
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Clave única para guardar el progreso por usuario y categoría
  const DRAFT_KEY = `gym_draft_${user?.id}_${category}`;

  // Reiniciar estados al cambiar de categoría o usuario
  useEffect(() => {
    setSessionId(null);
    setCurrentIndex(0);
    setCurrentSets([{ peso_kg: '', reps: '', unidad: 'lbs' }]);
    setLastWorkout(null);
    setSentadillaVariant('Libre');
    initWorkout();
  }, [category, user?.id]);

  // Auto-guardar en localStorage cada vez que cambie de ejercicio o altere los campos
  useEffect(() => {
    if (!loading && sessionId && exercises[currentIndex]) {
      const draftData = {
        userId: user?.id,
        sessionId,
        currentIndex,
        exerciseId: exercises[currentIndex].id,
        currentSets,
        category,
        sentadillaVariant,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    }
  }, [loading, exercises, sessionId, currentIndex, currentSets, category, DRAFT_KEY, user?.id, sentadillaVariant]);

  // Filtrado y ordenamiento estricto por categoría solicitada por el usuario
  const sortExercisesByCustomOrder = (exList, cat) => {
    if (!exList || !Array.isArray(exList) || exList.length === 0) return [];

    if (cat === 'espalda') {
      // 1. Jalones al pecho (normales)
      // 2. Remo
      // 3. Curl de bíceps
      // 4. Extensiones de hombro (Hombro posterior)
      // 5. Espalda baja
      const getScore = (ex) => {
        const n = (ex?.nombre || '').toLowerCase();
        if (n.includes('jalón') || n.includes('jalones')) return 0;
        if (n.includes('remo')) return 1;
        if (n.includes('curl') || n.includes('biceps') || n.includes('bíceps')) return 2;
        if (n.includes('hombro') || n.includes('extensi')) return 3;
        if (n.includes('espalda baja')) return 4;
        return -1;
      };

      const filtered = exList.filter((ex) => getScore(ex) !== -1);
      const sorted = filtered.sort((a, b) => getScore(a) - getScore(b));

      const selected = [];
      const seenScores = new Set();
      sorted.forEach((ex) => {
        const score = getScore(ex);
        if (!seenScores.has(score)) {
          seenScores.add(score);
          selected.push(ex);
        }
      });
      return selected;
    }

    if (cat === 'pierna') {
      return sortLegExercises(exList);
    }

    if (cat === 'pecho') {
      // 1. Press de banca plano (Press plano)
      // 2. Fondos en paralelas
      // 3. Extensiones de tríceps en polea
      // 4. Hombro medio (Elevaciones laterales / Hombro medio)
      const getScore = (ex) => {
        const n = (ex?.nombre || '').toLowerCase();
        if (n.includes('press') && !n.includes('inclinado')) return 0;
        if (n.includes('fondos')) return 1;
        if (n.includes('tríceps') || n.includes('triceps') || n.includes('polea')) return 2;
        if (n.includes('hombro') || n.includes('laterales') || n.includes('elevaciones')) return 3;
        return -1;
      };

      const filtered = exList.filter((ex) => getScore(ex) !== -1);
      const sorted = filtered.sort((a, b) => getScore(a) - getScore(b));

      const selected = [];
      const seenScores = new Set();
      sorted.forEach((ex) => {
        const score = getScore(ex);
        if (!seenScores.has(score)) {
          seenScores.add(score);
          selected.push(ex);
        }
      });
      return selected;
    }

    return exList;
  };

  const initWorkout = async () => {
    setLoading(true);
    setInitError(null);
    try {
      if (!user?.id) return;
      let draft = null;
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed?.userId === user.id) draft = parsed;
        } catch (err) {
          console.error('Error al restaurar borrador:', err);
        }
      }

      let activeSessionId = draft?.sessionId;

      if (!activeSessionId) {
        const { data: sessionData, error: sessionErr } = await supabase
          .from('workout_sessions')
          .insert([{ user_id: user.id, categoria: category }])
          .select()
          .single();

        if (sessionErr) throw sessionErr;
        activeSessionId = sessionData?.id;
      }

      // Cargar ejercicios de la categoría
      let exercisesQuery = supabase
        .from('exercises')
        .select('*');
      exercisesQuery = category === 'pierna'
        ? exercisesQuery.in('categoria', ['pierna', 'espalda'])
        : exercisesQuery.eq('categoria', category);
      const { data: exData, error: exErr } = await exercisesQuery;

      if (exErr) throw exErr;

      // Ordenar y filtrar exactamente según la secuencia deseada
      const sortedEx = sortExercisesByCustomOrder(exData, category);
      if (draft) {
        const draftExerciseId = draft.exerciseId ?? (category === 'pierna'
          ? sortLegExercises(exData, true)[draft.currentIndex]?.id
          : sortedEx[draft.currentIndex]?.id);
        const restoredIndex = sortedEx.findIndex((exercise) => exercise.id === draftExerciseId);
        if (restoredIndex !== -1) {
          setCurrentIndex(restoredIndex);
          if (Array.isArray(draft.currentSets)) setCurrentSets(draft.currentSets);
          if (draft.sentadillaVariant) setSentadillaVariant(draft.sentadillaVariant);
        } else {
          console.error('No se pudo restaurar el ejercicio del borrador:', draftExerciseId);
          throw new Error('No se pudo restaurar el ejercicio del borrador. Regresa e inténtalo de nuevo.');
        }
      }
      setSessionId(activeSessionId);
      setExercises(sortedEx);
    } catch (err) {
      console.error('Error inicializando entrenamiento:', err.message);
      setInitError(err.message || 'No se pudo cargar la rutina.');
    } finally {
      setLoading(false);
    }
  };

  const currentExercise = exercises[currentIndex];
  const exerciseId = currentExercise?.id;
  const userId = user?.id;

  useEffect(() => {
    if (!userId || !exerciseId) return;

    let active = true;
    getLastWorkoutSets(supabase, userId, exerciseId)
      .then((sets) => {
        if (active) setLastWorkout({ userId, exerciseId, category, sets });
      })
      .catch((err) => {
        if (active) {
          console.error('Error al cargar la última sesión:', err);
          setLastWorkout({ userId, exerciseId, category, error: true });
        }
      });

    return () => {
      active = false;
    };
  }, [userId, exerciseId, category]);

  const currentLastWorkout = lastWorkout?.userId === userId
    && lastWorkout?.exerciseId === exerciseId
    && lastWorkout?.category === category
    ? lastWorkout
    : null;

  const isSentadilla = (name) => {
    return (name || '').toLowerCase().includes('sentadilla');
  };

  const handleAddSet = () => {
    const lastSet = currentSets[currentSets.length - 1];
    setCurrentSets([
      ...currentSets,
      { peso_kg: lastSet?.peso_kg || '', reps: lastSet?.reps || '', unidad: lastSet?.unidad || 'lbs' }
    ]);
  };

  const handleRemoveSet = (index) => {
    if (currentSets.length > 1) {
      setCurrentSets(currentSets.filter((_, i) => i !== index));
    }
  };

  const handleSetChange = (index, field, value) => {
    const updated = [...currentSets];
    if (updated[index]) {
      updated[index] = { ...updated[index], [field]: value };
      setCurrentSets(updated);
    }
  };

  const toggleSetUnidad = (index) => {
    const updated = [...currentSets];
    if (updated[index]) {
      const currentUnit = updated[index].unidad || 'lbs';
      updated[index] = { ...updated[index], unidad: currentUnit === 'lbs' ? 'discos' : 'lbs' };
      setCurrentSets(updated);
    }
  };

  const handleNextExercise = async () => {
    if (!sessionId || !currentExercise) return;

    const validSets = currentSets.filter(
      (s) => s.peso_kg !== '' && s.reps !== '' && !isNaN(parseFloat(s.peso_kg)) && parseFloat(s.peso_kg) >= 0 && parseInt(s.reps, 10) > 0
    );

    if (validSets.length === 0) {
      alert('Debes ingresar al menos 1 serie válida (peso/discos y repeticiones) antes de continuar.');
      return;
    }

    setSaving(true);

    try {
      const setsToInsert = validSets.map((s, idx) => ({
        session_id: sessionId,
        exercise_id: currentExercise.id,
        num_serie: idx + 1,
        peso_kg: parseFloat(s.peso_kg),
        unidad: s.unidad || 'lbs',
        reps: parseInt(s.reps, 10)
      }));

      const { error } = await supabase.from('set_logs').insert(setsToInsert);
      if (error) throw error;

      if (currentIndex + 1 < exercises.length) {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        setCurrentSets([{ peso_kg: '', reps: '', unidad: 'lbs' }]);
      } else {
        localStorage.removeItem(DRAFT_KEY);
        onFinish();
      }
    } catch (err) {
      console.error('Error al guardar series:', err.message);
      alert('No se pudieron guardar las series. Inténtalo de nuevo.');
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

  if (initError) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-2" />
        <p role="alert" className="text-slate-300 font-medium mb-2">{initError}</p>
        <button onClick={onBack} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-700 transition">
          Volver
        </button>
      </div>
    );
  }

  // Protección anti-crash si no hay ejercicio disponible
  if (!currentExercise) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-10 h-10 text-indigo-400 mb-2" />
        <p className="text-slate-300 font-medium mb-2">No se encontraron ejercicios registrados para esta categoría.</p>
        <button onClick={onBack} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-700 transition">
          Volver
        </button>
      </div>
    );
  }

  // Nombre para mostrar limpio según la rutina
  let exerciseDisplayName = currentExercise?.nombre || 'Ejercicio';
  const exNameLower = (currentExercise?.nombre || '').toLowerCase();

  if (category === 'espalda') {
    if (exNameLower.includes('jalón') || exNameLower.includes('jalon')) {
      exerciseDisplayName = 'Jalones al pecho';
    } else if (exNameLower.includes('remo')) {
      exerciseDisplayName = 'Remo';
    } else if (exNameLower.includes('curl') || exNameLower.includes('biceps') || exNameLower.includes('bíceps')) {
      exerciseDisplayName = 'Curl de bíceps';
    } else if (exNameLower.includes('hombro') || exNameLower.includes('extensi')) {
      exerciseDisplayName = 'Extensiones de hombro (Hombro posterior)';
    } else if (exNameLower.includes('espalda baja')) {
      exerciseDisplayName = 'Espalda baja';
    }
  } else if (category === 'pierna') {
    if (isSentadilla(currentExercise?.nombre)) {
      exerciseDisplayName = `Sentadilla (${sentadillaVariant})`;
    } else if (exNameLower.includes('extensiones')) {
      exerciseDisplayName = 'Extensiones de pierna';
    } else if (exNameLower.includes('hip thrust') || exNameLower.includes('hiptrust')) {
      exerciseDisplayName = 'Hip Thrust';
    } else if (exNameLower.includes('femoral') || exNameLower.includes('isquios') || exNameLower.includes('curl')) {
      exerciseDisplayName = 'Curl femoral (isquios)';
    } else if (exNameLower.includes('espalda baja')) {
      exerciseDisplayName = 'Espalda baja';
    } else if (exNameLower.includes('pantorrilla')) {
      exerciseDisplayName = 'Pantorrilla';
    } else if (exNameLower.includes('abdomen') || exNameLower.includes('abdominal')) {
      exerciseDisplayName = 'Abdomen';
    }
  } else if (category === 'pecho') {
    if (exNameLower.includes('press') && !exNameLower.includes('inclinado')) {
      exerciseDisplayName = 'Press de banca plano';
    } else if (exNameLower.includes('fondos')) {
      exerciseDisplayName = 'Fondos en paralelas';
    } else if (exNameLower.includes('tríceps') || exNameLower.includes('triceps') || exNameLower.includes('polea')) {
      exerciseDisplayName = 'Extensiones de tríceps en polea';
    } else if (exNameLower.includes('hombro') || exNameLower.includes('laterales') || exNameLower.includes('elevaciones')) {
      exerciseDisplayName = 'Hombro medio (Elevaciones laterales)';
    }
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
            <h2 className="text-lg font-bold text-white">{exerciseDisplayName}</h2>
          </div>

          {/* Selector nativo de tipo de Sentadilla (Libre vs Hack) */}
          {isSentadilla(currentExercise?.nombre) && (
            <div className="mt-3 pt-3 border-t border-slate-800/80">
              <p className="text-[11px] font-semibold text-slate-400 mb-1.5">Variante de Sentadilla:</p>
              <div className="flex gap-2">
                {['Libre', 'Hack'].map((variant) => (
                  <button
                    key={variant}
                    type="button"
                    onClick={() => setSentadillaVariant(variant)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition ${
                      sentadillaVariant === variant
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Sentadilla {variant}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentExercise?.indicaciones && (
            <p className="text-xs text-indigo-300 font-medium bg-indigo-950/40 border border-indigo-900/50 p-2 rounded-lg mt-3">
              📋 Objetivo: {currentExercise.indicaciones}
            </p>
          )}
        </div>

        {/* Referencia de la última sesión registrada */}
        {currentLastWorkout?.error && (
          <p role="alert" className="text-xs text-red-400 mb-4">
            No se pudo cargar la última sesión de este ejercicio.
          </p>
        )}
        {!currentLastWorkout && (
          <p className="text-xs text-slate-400 mb-4">Cargando última sesión de este ejercicio...</p>
        )}
        {currentLastWorkout?.sets?.length === 0 && (
          <p className="text-xs text-slate-400 mb-4">Aún no hay una sesión registrada para este ejercicio.</p>
        )}
        {currentLastWorkout?.sets?.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 mb-4">
            <p className="text-xs font-semibold text-slate-400 mb-2">Tu última sesión registrada ({user?.nombre}):</p>
            <div className="flex flex-wrap gap-2">
              {currentLastWorkout.sets.map((s, idx) => (
                  <span key={idx} className="text-xs bg-slate-950 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-md">
                    S{s?.num_serie}: <strong className="text-white">{s?.peso_kg} {weightUnitLabel(s?.unidad)}</strong> × {s?.reps} reps
                  </span>
              ))}
            </div>
          </div>
        )}

        {/* Formulario de Series */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400">Registrar Series de Hoy:</p>

          {/* Encabezados de Columna */}
          <div className="flex items-center gap-2 px-3 text-xs font-bold text-indigo-400 uppercase tracking-wider pb-1">
            <span className="w-6 text-center">#</span>
            <span className="flex-1 text-center bg-slate-900/80 py-1 rounded-lg border border-slate-800">
              Peso / Discos
            </span>
            <span className="text-slate-600">x</span>
            <span className="flex-1 text-center bg-slate-900/80 py-1 rounded-lg border border-slate-800">
              Reps Efectivas
            </span>
            <span className="w-8"></span>
          </div>

          {currentSets.map((set, index) => {
            const unit = set?.unidad || 'lbs';
            const isDiscos = unit === 'discos';

            return (
              <div key={index} className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-sm">
                <span className="text-xs font-bold text-slate-500 w-6 text-center">#{index + 1}</span>
                
                <div className="flex-1 relative flex items-center">
                  <input
                    type="number"
                    placeholder={isDiscos ? 'Discos' : 'Lbs'}
                    value={set?.peso_kg || ''}
                    onChange={(e) => handleSetChange(index, 'peso_kg', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-2 pr-14 py-2.5 text-center text-sm font-semibold text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSetUnidad(index)}
                    className={`absolute right-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase transition flex items-center gap-0.5 border ${
                      isDiscos
                        ? 'bg-amber-950/80 border-amber-600/60 text-amber-400'
                        : 'bg-indigo-950/80 border-indigo-600/60 text-indigo-400'
                    }`}
                    title="Alternar entre Lbs y Discos"
                  >
                    {isDiscos ? <Disc className="w-3 h-3" /> : <Scale className="w-3 h-3" />}
                    {unit}
                  </button>
                </div>

                <span className="text-xs font-bold text-slate-600">x</span>

                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="Reps"
                    value={set?.reps || ''}
                    onChange={(e) => handleSetChange(index, 'reps', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-center text-sm font-semibold text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {currentSets.length > 1 ? (
                  <button
                    onClick={() => handleRemoveSet(index)}
                    className="p-2 text-slate-500 hover:text-red-400 transition w-8 flex justify-center"
                    title="Eliminar serie"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="w-8"></span>
                )}
              </div>
            );
          })}

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
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg shadow-indigo-600/20"
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