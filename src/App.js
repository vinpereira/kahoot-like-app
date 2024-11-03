import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import GameLobby from './GameLobby';
import HostLobby from './HostLobby';
import HostGame from './HostGame';
import PlayerLobby from './PlayerLobby';
import PlayerGame from './PlayerGame';
import { API_ENDPOINT } from './config';
import './App.css';

const App = () => {
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await fetch(API_ENDPOINT);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setQuestions(data);
    } catch (e) {
      console.error('Error fetching questions:', e);
      setError('Failed to fetch questions. Please try again later.');
    }
  };

  return (
    <Router>
      <div className='app'>
        <h1>Kahoot-like App</h1>
        <Routes>
          <Route path="/" element={<GameLobby />} />
          <Route path="/host" element={<HostLobby />} />
          <Route path="/host/game/:gameId" element={<HostGame questions={questions} />} />
          <Route path="/play" element={<PlayerLobby />} />
          <Route path="/play/game/:gameCode" element={<PlayerGame />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {error && (
          <div className='error'>
            <p>Error: {error}</p>
            <button onClick={() => {
              setError(null); 
              fetchQuestions();
            }}>
              Retry
            </button>
          </div>
        )}
      </div>
    </Router>
  );
};

export default App;