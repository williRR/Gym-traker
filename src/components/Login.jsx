import React, { useState } from 'react';
import { Dumbbell, UserCheck, Lock, AlertCircle } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const USERS = [
    { id: 'willi', nombre: 'Willi', pass: 'willi123' },
    { id: 'jose', nombre: 'Jose', pass: 'jose123' }
  ];

  const [selectedUser, setSelectedUser] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setPasswordInput('');
    setErrorMsg('');
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (passwordInput === selectedUser.pass) {
      const activeUser = { id: selectedUser.id, nombre: selectedUser.nombre };
      localStorage.setItem('gym_user', JSON.stringify(activeUser));
      onLoginSuccess(activeUser);
    } else {
      setErrorMsg('Contraseña incorrecta');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
        <div className="bg-indigo-600/20 text-indigo-400 p-3 rounded-2xl w-fit mx-auto mb-4 border border-indigo-500/30">
          <Dumbbell className="w-10 h-10" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">Gym Tracker</h1>
        <p className="text-xs text-slate-400 mb-6">Selecciona tu perfil e ingresa tu contraseña</p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-3 mb-6">
          {USERS.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleSelectUser(user)}
              className={`w-full p-4 rounded-xl flex items-center justify-between border transition ${
                selectedUser?.id === user.id
                  ? 'bg-indigo-950/60 border-indigo-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <span className="font-semibold">{user.nombre}</span>
              <UserCheck className={`w-5 h-5 ${selectedUser?.id === user.id ? 'text-indigo-400' : 'text-slate-600'}`} />
            </button>
          ))}
        </div>

        {selectedUser && (
          <form onSubmit={handleLoginSubmit} className="space-y-3 animate-fadeIn">
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder={`Contraseña para ${selectedUser.nombre}`}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium p-3 rounded-xl transition text-sm"
            >
              Ingresar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}