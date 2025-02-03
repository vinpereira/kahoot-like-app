import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { WS_ENDPOINT } from './config';
import './HostGame.css'; 

const renderPodium = (leaderboard) => {
  if (!leaderboard || leaderboard.length === 0) return null;

  const [first, second, third] = leaderboard;
  const remainingPlayers = leaderboard.slice(3);

  return (
    <div className="final-leaderboard">
      <h3>Final Leaderboard:</h3>
      
      <div className="podium">
        {/* Second Place */}
        <div className="podium-item">
          {second && (
            <>
              <div className="podium-medal">🥈</div>
              <div className="podium-rank podium-second">
                <div className="podium-player">{second.nickname}</div>
                <div className="podium-score">{second.score}</div>
              </div>
            </>
          )}
        </div>

        {/* First Place */}
        <div className="podium-item">
          {first && (
            <>
              <div className="podium-medal">👑</div>
              <div className="podium-rank podium-first">
                <div className="podium-player">{first.nickname}</div>
                <div className="podium-score">{first.score}</div>
              </div>
            </>
          )}
        </div>

        {/* Third Place */}
        <div className="podium-item">
          {third && (
            <>
              <div className="podium-medal">🥉</div>
              <div className="podium-rank podium-third">
                <div className="podium-player">{third.nickname}</div>
                <div className="podium-score">{third.score}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Remaining Players */}
      {remainingPlayers.length > 0 && (
        <div className="remaining-players">
          <ol start="4">
            {remainingPlayers.map((player, index) => (
              <li key={index}>
                <span className='player-position'>#{index + 4}</span>
                <span className='player-name'>{player.nickname}</span>
                <span className='player-score'>{player.score}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

const HostGame = ({ questions }) => {
  const { gameId } = useParams();
  const location = useLocation();
  const gameCode = location.state?.gameCode;
  const navigate = useNavigate();
  const [ws, setWs] = useState(null);
  const [players, setPlayers] = useState([]);
  // const [currentQuestion, setCurrentQuestion] = useState(null);
  const [gameState, setGameState] = useState('waiting'); // 'waiting', 'playing', 'roundEnded', 'ended'
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [error, setError] = useState(null);
  const [topPlayers, setTopPlayers] = useState([]);
  const [highestStreakPlayer, setHighestStreakPlayer] = useState(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
  const [currentQuestionText, setCurrentQuestionText] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [finalLeaderboard, setFinalLeaderboard] = useState(null);

  useEffect(() => {
    console.log('HostGame mounted. GameId:', gameId, 'GameCode:', gameCode);
    
    const websocket = new WebSocket(`${WS_ENDPOINT}?gameId=${gameId}&role=host`);

    websocket.onopen = () => {
      console.log('WebSocket connection established');
      console.log('Initiating game with ID:', gameId);
      websocket.send(JSON.stringify({ 
        action: 'initiateGame', 
        gameId,
        gameCode 
      }));
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received message:', data);

      switch (data.type) {
        case 'gameInitiated':
          console.log('Game initiated successfully');
          setTotalQuestions(questions.length);
          setCurrentQuestionNumber(1);
          setError(null);
          break;
        case 'playerJoined':
          if (data.players && Array.isArray(data.players)) {
            setPlayers(data.players);
          } else {
            console.error('Invalid players data received:', data.players);
          }
          break;
        case 'gameStarted':
          setGameState('playing');
          break;
        case 'newQuestion':
          setCurrentQuestionText(data.question);
          setCurrentQuestionNumber(data.questionNumber);
          setTotalQuestions(data.totalQuestions);
          setGameState('playing');
          break;
        case 'allAnswered':
          if (data.players && Array.isArray(data.players)) {
            setPlayers(data.players);
            updateTopPlayers(data.players);
            updateHighestStreakPlayer(data.players);
            setGameState('roundEnded');
          } else {
            console.error('Invalid players data received:', data.players);
          }
          break;
        case 'roundEnded':
          setTopPlayers(data.topPlayers);
          setHighestStreakPlayer(data.highestStreakPlayer);
          setGameState('roundEnded');
          break;
        case 'gameEnded':;
          setFinalLeaderboard(data.leaderboard);
          setGameState('ended');
          break;
        case 'error':
          setError(data.message);
          break;
        default:
          console.log('Unhandled message type:', data.type);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Failed to connect to game server. Please try again.');
    };

    websocket.onclose = (event) => {
      if (event.wasClean) {
        console.log(`Closed cleanly, code=${event.code}, reason=${event.reason}`);
      } else {
        console.error('Connection died');
        setError('Lost connection to game server. Please refresh the page.');
      }
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [gameId, gameCode, questions.length]);

  const updateTopPlayers = (playerList) => {
    const sorted = [...playerList].sort((a, b) => b.score - a.score);
    setTopPlayers(sorted.slice(0, 3));
  };

  const updateHighestStreakPlayer = (playerList) => {
    if (playerList.length === 0) {
      setHighestStreakPlayer(null);
      return;
    }
    const highestStreak = Math.max(...playerList.map(player => player.streak || 0));
    const highestStreakPlayers = playerList.filter(player => (player.streak || 0) === highestStreak);
    const highestStreakPlayer = highestStreakPlayers.reduce((a, b) => (a.score || 0) > (b.score || 0) ? a : b, highestStreakPlayers[0]);
    setHighestStreakPlayer(highestStreakPlayer);
  };

  const startGame = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: 'startGame', gameId }));
    } else {
      setError('Cannot start game. Connection to server lost.');
    }
  }, [ws, gameId]);

  const endGame = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: 'endGame', gameId }));
      // setGameState('ended');
    } else {
      setError('Cannot end game. Connection to server lost.');
    }
  }, [ws, gameId]);
1
  const nextQuestion = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      // if (currentQuestionIndex < questions.length - 1) {
      if (currentQuestionIndex < totalQuestions - 1) {
        console.log('currentQuestionIndex', currentQuestionIndex);
        console.log('totalQuestions', totalQuestions);
        ws.send(JSON.stringify({ action: 'nextQuestion', gameId }));
        setCurrentQuestionIndex(prevIndex => prevIndex + 1);
        // setGameState('playing');
      } else {
        endGame();
      }
    } else {
      setError('Cannot proceed. Connection to server lost.');
    }
  }, [ws, gameId, currentQuestionIndex, totalQuestions, endGame]);

  const backToLobby = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  return (
    <div className="host-game">
      <h2>Kahoot-like App</h2>
  
      {gameState === 'waiting' && (
        <div className="game-info">
          <div className='game-code'>
            <h1>Game Code:</h1>
            <div className='code'>{gameCode}</div>
          </div>
          <p>Game State: {gameState}</p>
          <p>{totalQuestions} questions available</p>
          <p>Share this code with players to join the game.</p>
        </div>
      )}

      {gameState === 'waiting' && (
        <div className="players-section">
          <h3>Players:</h3>
          {players.length > 0 ? (
            <>
              <ul className="waiting-players-list">
                {players.map((player, index) => (
                  <li key={index}>
                    <span className="player-number">#{index + 1}</span>
                    <span className="player-name">{player.nickname}</span>
                  </li>
                ))}
              </ul>
              <button onClick={startGame} disabled={players.length === 0}>Start Game</button>
            </>
          ) : (
            <p>No players connected yet...</p>
          )}
        </div>
      )}

      {(gameState === 'playing' || gameState === 'roundEnded') && (
        <>     
          {currentQuestionText && (
            <div className="current-question">
              <h3>Current Question: {currentQuestionNumber + 1} / {totalQuestions}</h3>
              <p>{currentQuestionText}</p>
            </div>
          )}

          <div className="top-players">
            <h3>Top Players:</h3>
            <ol className="players-list">
              {topPlayers.map((player, index) => (
                <li key={index} className={`top-player top-player-${index + 1}`}>
                  <span>{player.nickname}</span>
                  <span>{player.score}</span>
                </li>
              ))}
            </ol>
          </div>
          
          {highestStreakPlayer && (
            <p className="highest-streak">
              🔥 Highest Streak: <strong>{highestStreakPlayer.nickname}</strong> with {highestStreakPlayer.streak}!! 🔥
            </p>
          )}
        </>
      )}

      {gameState === 'roundEnded' && (
        <button onClick={nextQuestion}>
          {isLastQuestion ? 'End Game' : 'Next Question'}
        </button>
      )}

      {!isLastQuestion && (
        <button className="end-game" onClick={endGame}>End Game Early</button>
      )}

      {gameState === 'ended' && finalLeaderboard && (
        <>
          {renderPodium(finalLeaderboard)}
          <button onClick={backToLobby}>Back to Lobby</button>
        </>
      )}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default HostGame;