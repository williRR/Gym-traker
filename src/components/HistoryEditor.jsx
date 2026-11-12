import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { emptySet, loadSessionExerciseSets, saveSessionExerciseSets, toEditableSets } from '../sessionSets';

export default function HistoryEditor({ category, sessions, onCancel, onSaved }) {
  const [exercises, setExercises] = useState([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [exerciseId, setExerciseId] = useState('');
  const [editing, setEditing] = useState(false);
  const [sets, setSets] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchExercises = async () => {
      try {
        let query = supabase.from('exercises').select('id, nombre, categoria');
        query = category === 'pierna'
          ? query.in('categoria', ['pierna', 'espalda'])
          : query.eq('categoria', category);
        const { data, error: queryError } = await query;
        if (queryError) throw queryError;
        const available = (data || []).filter((exercise) => exercise.categoria === category ||
          (category === 'pierna' && exercise.categoria === 'espalda' && (exercise.nombre || '').toLowerCase().includes('espalda baja')));
        available.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es') || String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
        if (active) setExercises(available);
      } catch (err) {
        console.error('Error al cargar ejercicios del historial:', err);
        if (active) setError('No se pudieron cargar los ejercicios. Vuelve a intentarlo.');
      } finally {
        if (active) setLoadingExercises(false);
      }
    };
    fetchExercises();
    return () => { active = false; };
  }, [category]);

  const loadSets = async () => {
    const session = sessions.find((item) => String(item.id) === sessionId);
    const exercise = exercises.find((item) => String(item.id) === exerciseId);
    if (!session || !exercise || busy) return;
    setBusy(true);
    setError('');
    try {
      const saved = await loadSessionExerciseSets(supabase, session.id, exercise.id);
      setSets(saved.length ? toEditableSets(saved) : [emptySet()]);
      setEditing(true);
      setDirty(false);
    } catch (err) {
      console.error('Error al cargar series del historial:', err);
      setError('No se pudieron cargar las series. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const session = sessions.find((item) => String(item.id) === sessionId);
    const exercise = exercises.find((item) => String(item.id) === exerciseId);
    if (!session || !exercise || busy) return;
    const entered = sets.filter((set) => set.peso_kg !== '' || set.reps !== '');
    if (!entered.length || entered.some((set) =>
      set.peso_kg === '' || set.reps === '' || !Number.isFinite(Number(set.peso_kg)) ||
      Number(set.peso_kg) < 0 || !Number.isInteger(Number(set.reps)) || Number(set.reps) <= 0 ||
      (set.unidad != null && set.unidad !== 'lbs' && set.unidad !== 'discos'))) {
      setError('Completa todas las series con un peso válido y repeticiones enteras mayores a cero.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveSessionExerciseSets(supabase, session.id, exercise.id, entered);
      onSaved();
    } catch (err) {
      console.error('Error al guardar series del historial:', err);
      setError('No se completó el guardado. Algunos cambios podrían haberse aplicado; revisa las series y reintenta.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    if (busy) return;
    if (dirty && !window.confirm('Hay cambios sin guardar. ¿Deseas descartarlos?')) return;
    onCancel();
  };

  const updateSet = (index, field, value) => {
    setSets((current) => current.map((set, i) => i === index ? { ...set, [field]: value } : set));
    setDirty(true);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-950 text-slate-100 p-4">
      <h1 className="text-lg font-bold mb-2">Editar historial</h1>
      <p className="text-xs text-slate-400 mb-4">Selecciona la sesión y el ejercicio que deseas corregir.</p>
      {error && <p role="alert" className="text-sm text-red-400 mb-4">{error}</p>}
      {loadingExercises ? <p className="text-sm text-slate-400">Cargando ejercicios...</p> : (
        <div className="space-y-4">
          <label className="block text-xs text-slate-400">
            Sesión
            <select value={sessionId} disabled={editing || busy} onChange={(event) => setSessionId(event.target.value)} className="block w-full mt-2 p-3 bg-slate-900 rounded-xl text-sm text-white border border-slate-700">
              <option value="">Selecciona una sesión</option>
              {sessions.map((session) => <option key={session.id} value={String(session.id)}>{new Date(session.created_at).toLocaleString('es')} (sesión {session.id})</option>)}
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Ejercicio
            <select value={exerciseId} disabled={editing || busy} onChange={(event) => setExerciseId(event.target.value)} className="block w-full mt-2 p-3 bg-slate-900 rounded-xl text-sm text-white border border-slate-700">
              <option value="">Selecciona un ejercicio</option>
              {exercises.map((exercise) => <option key={exercise.id} value={String(exercise.id)}>{exercise.nombre} (#{exercise.id})</option>)}
            </select>
          </label>
          {!editing ? (
            <button onClick={loadSets} disabled={!sessionId || !exerciseId || busy} className="w-full bg-indigo-600 disabled:opacity-50 py-3 rounded-xl text-sm font-semibold">Cargar ejercicio</button>
          ) : (
            <>
              <p className="text-xs text-slate-400">Puedes agregar o corregir las series de esta sesión. Las unidades no confirmadas se conservan hasta que las cambies.</p>
              {sets.map((set, index) => (
                <div key={index} className="bg-slate-900 p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Serie {index + 1}</span>
                    {sets.length > 1 && <button type="button" disabled={busy} onClick={() => { setSets((current) => current.filter((_, i) => i !== index)); setDirty(true); }} className="text-xs text-red-400">Eliminar serie {index + 1}</button>}
                  </div>
                  <div className="flex gap-2">
                    <label className="flex-1 text-xs text-slate-400">Peso
                      <input type="number" min="0" value={set.peso_kg} disabled={busy} onChange={(event) => updateSet(index, 'peso_kg', event.target.value)} className="block w-full mt-1 p-2 bg-slate-950 border border-slate-700 rounded-lg text-white" />
                    </label>
                    <label className="flex-1 text-xs text-slate-400">Repeticiones
                      <input type="number" min="1" step="1" value={set.reps} disabled={busy} onChange={(event) => updateSet(index, 'reps', event.target.value)} className="block w-full mt-1 p-2 bg-slate-950 border border-slate-700 rounded-lg text-white" />
                    </label>
                  </div>
                  <label className="block text-xs text-slate-400">Unidad
                    <select value={set.unidad ?? ''} disabled={busy} onChange={(event) => updateSet(index, 'unidad', event.target.value || null)} className="block w-full mt-1 p-2 bg-slate-950 border border-slate-700 rounded-lg text-white">
                      <option value="">Unidad no confirmada</option>
                      <option value="lbs">Libras</option>
                      <option value="discos">Discos</option>
                    </select>
                  </label>
                </div>
              ))}
              <button type="button" disabled={busy} onClick={() => { setSets((current) => [...current, emptySet()]); setDirty(true); }} className="w-full bg-slate-900 border border-slate-700 py-3 rounded-xl text-sm">Agregar serie</button>
              <button onClick={save} disabled={busy} className="w-full bg-indigo-600 disabled:opacity-50 py-3 rounded-xl text-sm font-semibold">{busy ? 'Guardando...' : 'Guardar cambios'}</button>
            </>
          )}
        </div>
      )}
      <button onClick={cancel} disabled={busy} className="w-full mt-4 bg-slate-800 disabled:opacity-50 py-3 rounded-xl text-sm">Volver al historial</button>
    </div>
  );
}
