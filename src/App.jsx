import React, { useState } from 'react';
import Login from './components/Login';
import RoutineSelector from './components/RoutineSelector';
import WorkoutFlow from './components/WorkoutFlow';
import HistoryView from './components/HistoryView';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('GymTracker ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-red-400 mb-2">Ocurrió un inconveniente temporal</h2>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              {this.state.error?.message || 'Error de conexión o de renderizado'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 px-4 rounded-xl text-xs font-semibold transition"
            >
              Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('gym_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
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
    return (
      <ErrorBoundary>
        <Login onLoginSuccess={handleLogin} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}