import React from 'react';
import { Link } from 'react-router-dom';
import './GameLobby.css';

const GameLobby = () => {
  return (
    <div className="game-lobby">
      <h1>Welcome to Kahoot-like App</h1>
      <Link to="/host">
        <button>Host a Game</button>
      </Link>
      <Link to="/play">
        <button>Join a Game</button>
      </Link>
    </div>
  );
};

export default GameLobby;