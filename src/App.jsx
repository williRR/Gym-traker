import React, { useState } from 'react';
import Login from './components/Login';
import RoutineSelector from './components/RoutineSelector';
import WorkoutFlow from './components/WorkoutFlow';
import HistoryView from './components/HistoryView';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('gym_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [viewMode, setViewMode] = useState('selector');

  const handleLogin = (user) => {
    setCurrentUser(user);
    setViewMode('selector');
  };

  const handleLogout = () => {
    localStorage.removeItem('gym_user');
    setCurrentUser(null);
    setSelectedCategory(null);
    setViewMode('selector');
  };

  const handleSelectRoutine = (category, mode) => {
    setSelectedCategory(category);
    if (mode === 'new') {
      setViewMode('workout');
    } else if (mode === 'history') {
      setViewMode('history');
    }
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {viewMode === 'selector' && (
        <RoutineSelector
          user={currentUser}
          onLogout={handleLogout}
          onSelectRoutine={handleSelectRoutine}
        />
      )}

      {viewMode === 'workout' && (
        <WorkoutFlow
          user={currentUser}
          category={selectedCategory}
          onFinish={() => setViewMode('selector')}
          onBack={() => setViewMode('selector')}
        />
      )}

      {viewMode === 'history' && (
        <HistoryView
          user={currentUser}
          category={selectedCategory}
          onBack={() => setViewMode('selector')}
        />
      )}
    </div>
  );
}