import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HostLobby.css';

const HostLobby = () => {
  const navigate = useNavigate();

  const createGame = () => {
    const gameId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const gameCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Log the generated gameId and gameCode
    console.log('Generated gameId:', gameId);
    console.log('Generated gameCode:', gameCode);

    // Navigate to the new game
    navigate(`/host/game/${gameId}`, { state: { gameCode } });
  };

  return (
    <div className="host-lobby">
      <h2>Host a New Game</h2>
      <button onClick={createGame}>Create New Game</button>
    </div>
  );
};

export default HostLobby;