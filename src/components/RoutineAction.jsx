import React from 'react';
import { ArrowLeft, History, PlusCircle } from 'lucide-react';

export default function RoutineAction({ category, onSelectMode, onBack }) {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-950 text-slate-100 p-4 flex flex-col justify-center">
      <button
        onClick={onBack}
        className="self-start p-2 bg-slate-900 text-slate-400 hover:text-white rounded-xl border border-slate-800 mb-6 flex items-center gap-2 text-xs"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a rutinas
      </button>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 border border-indigo-800/50 px-3 py-1 rounded-full">
          {category}
        </span>
        <h2 className="text-xl font-bold text-white mt-4 mb-2">¿Qué deseas hacer?</h2>
        <p className="text-xs text-slate-400 mb-6">Elige una opción para continuar.</p>

        <div className="space-y-3">
          <button
            onClick={() => onSelectMode('new')}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition"
          >
            <PlusCircle className="w-5 h-5" />
            Iniciar Nueva Rutina
          </button>

          <button
            onClick={() => onSelectMode('history')}
            className="w-full py-3.5 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold text-sm rounded-xl border border-slate-800 flex items-center justify-center gap-2 transition"
          >
            <History className="w-5 h-5 text-indigo-400" />
            Ver Historial
          </button>
        </div>
      </div>
    </div>
  );
}