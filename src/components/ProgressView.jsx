import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { loadProgressSessions, progressStats, summarizeProgress } from '../progress';

const formatDate = (date) => new Date(date).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
const formatWeight = (weight) => Number(weight.toFixed(2)).toString();
const formatChange = (difference) => `${difference > 0 ? '+' : ''}${formatWeight(difference)}`;

function ProgressChart({ points, unit }) {
  const width = Math.max(320, points.length * 55);
  const max = Math.max(...points.map((point) => point.weight), 1);
  const min = Math.min(...points.map((point) => point.weight), 0);
  const range = max - min || 1;
  const x = (index) => points.length === 1 ? width / 2 : 30 + index * (width - 60) / (points.length - 1);
  const y = (weight) => 140 - (weight - min) / range * 110;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} 170`} width={width} height="170" role="img" aria-label={`Gráfica de peso máximo por sesión en ${unit}`}>
        <line x1="25" x2={width - 25} y1="140" y2="140" stroke="#475569" />
        <polyline fill="none" stroke="#818cf8" strokeWidth="3" points={points.map((point, index) => `${x(index)},${y(point.weight)}`).join(' ')} />
        {points.map((point, index) => (
          <g key={point.sessionId}>
            <circle cx={x(index)} cy={y(point.weight)} r="4" fill="#a5b4fc" />
            <text x={x(index)} y={y(point.weight) - 9} textAnchor="middle" fill="#e2e8f0" fontSize="11">{formatWeight(point.weight)}</text>
            <text x={x(index)} y="160" textAnchor="middle" fill="#94a3b8" fontSize="10">{new Date(point.date).toLocaleDateString('es', { day: 'numeric', month: 'numeric' })}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function UnitReport({ points, unit }) {
  const stats = progressStats(points);
  if (!stats) return <p className="text-sm text-slate-400">No hay series en {unit} durante este período.</p>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-950 rounded-xl p-3">
          <p className="text-slate-400">Primera → última sesión</p>
          <p className="text-white font-bold mt-1">{formatWeight(stats.first.weight)} → {formatWeight(stats.last.weight)} {unit}</p>
          <p className="text-indigo-300 mt-1">{stats.count > 1 ? `${formatChange(stats.difference)} ${unit}` : 'Se necesitan 2 sesiones para comparar'}</p>
        </div>
        <div className="bg-slate-950 rounded-xl p-3">
          <p className="text-slate-400">Mejor marca</p>
          <p className="text-white font-bold mt-1">{formatWeight(stats.best.weight)} {unit} × {stats.best.reps} reps</p>
          <p className="text-slate-400 mt-1">{formatDate(stats.best.date)}</p>
        </div>
      </div>
      <p className="text-xs text-slate-400">Sesiones con {unit}: {stats.count}</p>
      <ProgressChart points={points} unit={unit} />
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-300">Mejor serie de cada sesión</p>
        {points.map((point) => (
          <div key={point.sessionId} className="flex justify-between gap-3 text-xs bg-slate-950 rounded-lg p-2">
            <span className="text-slate-400">{formatDate(point.date)}</span>
            <span className="text-white">{formatWeight(point.weight)} {unit} × {point.reps} reps</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProgressView({ user, onBack }) {
  const [days, setDays] = useState(30);
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [unit, setUnit] = useState('lbs');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    loadProgressSessions(supabase, user.id, start, end)
      .then((data) => { if (active) { setSessions(data); setError(false); } })
      .catch((err) => {
        console.error('Error al cargar progreso:', err);
        if (active) setError(true);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.id, days, reload]);

  const exercises = useMemo(() => summarizeProgress(sessions), [sessions]);
  const selected = exercises.find((exercise) => String(exercise.id) === selectedId) || exercises[0];
  const unknownCount = exercises.reduce((sum, exercise) => sum + exercise.unknownCount, 0);

  const changePeriod = (value) => {
    if (value !== days) {
      setLoading(true);
      setDays(value);
    }
  };
  const retry = () => { setLoading(true); setReload((value) => value + 1); };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-950 text-slate-100 p-4">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} aria-label="Volver" className="p-2 bg-slate-900 rounded-xl border border-slate-800"><ArrowLeft className="w-4 h-4" /></button>
        <div><h1 className="text-lg font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-400" /> Mi progreso</h1><p className="text-xs text-slate-400">{user.nombre}</p></div>
      </div>
      <div className="flex gap-2 mb-4" aria-label="Período">
        {[{ value: 30, label: 'Mensual · 30 días' }, { value: 90, label: 'Trimestral · 90 días' }].map((period) => (
          <button key={period.value} onClick={() => changePeriod(period.value)} aria-pressed={days === period.value} className={`flex-1 rounded-xl p-3 text-xs font-semibold border ${days === period.value ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300'}`}>{period.label}</button>
        ))}
      </div>
      {loading ? <p className="text-sm text-slate-400">Cargando progreso...</p> : error ? (
        <div role="alert" className="text-sm text-red-400">No se pudo cargar el progreso. <button onClick={retry} className="underline">Reintentar</button></div>
      ) : exercises.length === 0 ? (
        <p className="text-sm text-slate-400">No hay ejercicios registrados en los últimos {days} días.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">Últimos {days} días. Se muestra el peso máximo por sesión y sus repeticiones; si hay empate, se usan las mayores repeticiones.</p>
          {unknownCount > 0 && <p className="text-xs text-amber-300">{unknownCount} {unknownCount === 1 ? 'serie excluida' : 'series excluidas'} por tener unidad no confirmada.</p>}
          {days === 90 && (
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <h2 className="font-bold text-sm mb-3">Resumen por ejercicio</h2>
              <div className="space-y-2">
                {exercises.map((exercise) => (
                  <button key={exercise.id} onClick={() => setSelectedId(String(exercise.id))} className="block text-left w-full bg-slate-950 p-3 rounded-xl text-xs">
                    <span className="font-semibold text-white">{exercise.name}</span>
                    <span className="block text-slate-400 mt-1">
                      {['lbs', 'discos'].map((u) => {
                        const stats = progressStats(exercise.units[u]);
                        return stats ? `${formatWeight(stats.first.weight)} → ${formatWeight(stats.last.weight)} ${u}${stats.count > 1 ? ` (${formatChange(stats.difference)})` : ' (1 sesión)'}` : null;
                      }).filter(Boolean).join(' · ') || 'Sin unidades confirmadas'}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div>
              <label htmlFor="progress-exercise" className="block text-xs text-slate-400 mb-2">Ejercicio</label>
              <select id="progress-exercise" value={String(selected.id)} onChange={(event) => setSelectedId(event.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white">
                {exercises.map((exercise) => <option key={exercise.id} value={String(exercise.id)}>{exercise.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2" aria-label="Unidad">
              {['lbs', 'discos'].map((value) => <button key={value} onClick={() => setUnit(value)} aria-pressed={unit === value} className={`flex-1 p-2 rounded-lg text-xs font-semibold ${unit === value ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400'}`}>{value}</button>)}
            </div>
            <UnitReport points={selected.units[unit]} unit={unit} />
          </section>
        </div>
      )}
    </div>
  );
}
