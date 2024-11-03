import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WS_ENDPOINT } from './config';
import './PlayerLobby.css';

const PlayerLobby = () => {
  const [gameCode, setGameCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoinGame = async () => {
    if (gameCode.trim()) {
      const ws = new WebSocket(`${WS_ENDPOINT}?gameCode=${gameCode}&role=player`);

      ws.onopen = () => {
        console.log('WebSocket connection established');
        ws.send(JSON.stringify({ action: 'checkGameStatus', gameCode }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);

        if (data.type === 'gameStatus') {
          if (data.status === 'waiting') {
            // Game is joinable, navigate to PlayerGame
            navigate(`/play/game/${gameCode}`);
          } else {
            setError('This game has already started or ended. Please try another game code.');
          }
        } else if (data.type === 'error') {
          setError(data.message || 'An error occurred. Please try again.');
        }

        // Close the WebSocket connection as we don't need it anymore
        ws.close();
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Failed to connect. Please try again.');
      };
    }
  };

  return (
    <div className="player-lobby">
      <h2>Join a Game</h2>
      <div className="input-container">
        <input
          type="text"
          placeholder="Enter Game Code"
          id='gameCode'
          name='gameCode'
          value={gameCode}
          onChange={(e) => setGameCode(e.target.value)}
          maxLength={4}
        />
        <button onClick={handleJoinGame} disabled={gameCode.length !== 4}>Join Game</button>
      </div>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default PlayerLobby;