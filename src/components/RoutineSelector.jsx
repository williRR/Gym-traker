import React from 'react';
import { Dumbbell, Flame, BicepsFlexed, LogOut, PlusCircle, History } from 'lucide-react';

export default function RoutineSelector({ user, onLogout, onSelectRoutine }) {
  const ROUTINES = [
    {
      id: 'espalda',
      title: 'Espalda y Bíceps',
      desc: 'Jalones, Remos, Hombro pos., Curls y Espalda baja',
      icon: Dumbbell,
    },
    {
      id: 'pierna',
      title: 'Pierna y Abdomen',
      desc: 'Sentadilla, Extensiones, Femoral, Hip Thrust y Pantorrilla',
      icon: Flame,
    },
    {
      id: 'pecho',
      title: 'Pecho, Tríceps y Hombro',
      desc: 'Press Banca, Fondos, Polea y Elevaciones',
      icon: BicepsFlexed,
    },
  ];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-950 text-slate-100 p-4 flex flex-col justify-between">
      <div>
        {/* Cabecera */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-6">
          <div>
            <p className="text-xs text-slate-400 font-medium">Atleta</p>
            <h2 className="text-lg font-bold text-white">{user?.nombre || 'Usuario'}</h2>
          </div>
          <button
            onClick={onLogout}
            className="p-2 bg-slate-950 hover:bg-red-950/50 text-slate-400 hover:text-red-400 border border-slate-800 rounded-xl transition"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <h1 className="text-xl font-bold text-center text-white mb-6">Selecciona Rutina</h1>

        {/* Tarjetas de Rutina */}
        <div className="space-y-4">
          {ROUTINES.map((routine) => {
            const Icon = routine.icon;
            return (
              <div
                key={routine.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col items-center text-center space-y-3"
              >
                <div className="p-3 bg-indigo-950/60 border border-indigo-800/40 rounded-xl text-indigo-400">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{routine.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">{routine.desc}</p>
                </div>
                <div className="flex gap-2 w-full pt-2">
                  <button
                    onClick={() => onSelectRoutine && onSelectRoutine(routine.id, 'new')}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Nueva Rutina
                  </button>
                  <button
                    onClick={() => onSelectRoutine && onSelectRoutine(routine.id, 'history')}
                    className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-300 font-medium py-2 px-3 rounded-xl border border-slate-800 text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <History className="w-4 h-4 text-indigo-400" />
                    Historial
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}