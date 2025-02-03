import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WS_ENDPOINT } from './config';
import './PlayerGame.css';

const PlayerGame = () => {
  const { gameCode } = useParams();
  const navigate = useNavigate();
  const wsRef = useRef(null);
  // const [ws, setWs] = useState(null);
  const [nickname, setNickname] = useState('');
  const [gameState, setGameState] = useState('connecting');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  // const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [personalBestStreak, setPersonalBestStreak] = useState(0);
  // const [playerRank, setPlayerRank] = useState(null);
  const [position, setPosition] = useState(null);
  const [totalPlayers, setTotalPlayers] = useState(null);
  const [isHighestStreakPlayer, setIsHighestStreakPlayer] = useState(false);
  const [finalLeaderboard, setFinalLeaderboard] = useState(null);

  const backToLobby = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const submitAnswer = useCallback((answer) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentQuestion && !hasAnswered) {
      wsRef.current.send(JSON.stringify({ 
        action: 'submitAnswer', 
        gameCode,
        nickname,
        questionId: currentQuestion.questionId, 
        answer 
      }));
      setHasAnswered(true);
    }
  }, [gameCode, currentQuestion, hasAnswered, nickname]);

  useEffect(() => {
    console.log('Attempting to connect WebSocket');
    wsRef.current = new WebSocket(`${WS_ENDPOINT}?gameCode=${gameCode}&role=player`);

    wsRef.current.onopen = () => {
      console.log('WebSocket connection established');
      wsRef.current.send(JSON.stringify({ action: 'checkGameStatus', gameCode }));
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received message:', data);

      switch (data.type) {
        case 'gameStatus':
          if (data.status === 'waiting') {
            setGameState('joining');
          } else {
            setError('This game has already started or ended.');
            setGameState('error');
          }
          break;
        case 'joinedGame':
          setGameState('waiting');
          break;
        case 'gameStarted':
          setGameState('playing');
          break;
        case 'newQuestion':
          setCurrentQuestion(data);
          setAnswerResult(null);
          setHasAnswered(false);
          setGameState('playing');
          break;
        case 'answerResult':
          console.log('Answer result received:', data);
          setAnswerResult({
            isCorrect: data.playerResult.isCorrect,
            playerAnswer: data.playerResult.playerAnswer,
            correctAnswer: data.playerResult.correctAnswer,
            timeTaken: data.playerResult.timeTaken,
            baseScore: data.playerResult.baseScore,
            streakBonus: data.playerResult.streakBonus,
            totalQuestionScore: data.playerResult.totalScore
          });
          setScore(data.totalScore);
          setStreak(data.playerStreak);
          setPersonalBestStreak(prevBest => Math.max(prevBest, data.playerStreak));
          setIsHighestStreakPlayer(data.isHighestStreakPlayer);
          setHasAnswered(true);
          // setGameState('answered');
          break;
        case 'roundResult':
          setAnswerResult({
            isCorrect: data.playerResult.isCorrect,
            playerAnswer: data.playerResult.playerAnswer,
            correctAnswer: data.playerResult.correctAnswer,
            timeTaken: data.playerResult.timeTaken,
            baseScore: data.playerResult.baseScore,
            streakBonus: data.playerResult.streakBonus,
            totalQuestionScore: data.playerResult.totalScore
          });
          setScore(data.totalScore);
          setStreak(prevStreak => data.playerResult.isCorrect ? prevStreak + 1 : 0);
          setPosition(data.position);
          setTotalPlayers(data.totalPlayers);
          setPersonalBestStreak(prevBest => Math.max(prevBest, data.playerResult.isCorrect ? prevBest + 1 : 0));
          setIsHighestStreakPlayer(data.isHighestStreakPlayer);
          setGameState('roundEnded');
          break;
        case 'newQuestionReady':
          setHasAnswered(false);
          setAnswerResult(null);
          break;
        case 'gameEnded':
          console.log('Data in the end:', data);
          console.log('Leaderboard in the end:', data.leaderboard);
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

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Failed to connect. Please try again.');
      setGameState('error');
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket connection closed');
      setGameState('disconnected');
    };

    // setWs(websocket);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [gameCode]);

  const handleSubmitNickname = useCallback(() => {
    if (nickname.trim() && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Sending nickname check:', nickname);
      wsRef.current.send(JSON.stringify({ action: 'checkNickname', gameCode, nickname: nickname.trim() }));
      
      // Set up a one-time event listener for the nickname check response
      const nicknameCheckHandler = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'nicknameCheck') {
          if (data.isAvailable) {
            wsRef.current.send(JSON.stringify({ action: 'joinGame', gameCode, nickname: nickname.trim() }));
          } else {
            setError('This nickname is already taken. Please choose another one.');
          }
          wsRef.current.removeEventListener('message', nicknameCheckHandler);
        }
      };
      wsRef.current.addEventListener('message', nicknameCheckHandler);
    } else {
      console.error('Unable to send nickname check. WebSocket state:', wsRef.current?.readyState);
    }
  }, [nickname, gameCode]);

  const handleNicknameChange = (e) => {
    setNickname(e.target.value);
    setError(null); // Clear any previous errors when the user types
  };

  if (gameState === 'connecting') {
    return <div>Connecting to game...</div>;
  }

  // const joinGame = useCallback(() => {
  //   if (nickname.trim() && ws && ws.readyState === WebSocket.OPEN) {
  //     ws.send(JSON.stringify({ action: 'joinGame', gameCode, nickname: nickname.trim() }));
  //   }
  // }, [ws, gameCode, nickname]);

  if (gameState === 'joining') {
    return (
      <div className="nickname-entry">
        <h2>Enter Your Nickname</h2>
        <input
          type="text"
          id='nickname'
          name='nickname'
          value={nickname}
          placeholder="Your nickname"
          onChange={handleNicknameChange}
          maxLength={20}
        />
        <button 
          onClick={handleSubmitNickname}
          id='handleSubmitNickname'
          name='handleSubmitNickname'
          disabled={!nickname.trim()}
        >
          Join
        </button>
        {error && <p className="error-message">{error}</p>}
      </div>
    );
  }

  if (gameState === 'waiting') {
    return (
      <div className="player-waiting">
        <h2>Waiting for the game to start...</h2>
        <p>Game Code: {gameCode}</p>
        <p>Your nickname: {nickname}</p>
      </div>
    );
  }

  if (gameState === 'playing') {
    return (
      <div className="player-game">
        <h2>Your Score: {score}</h2>
        <h3>Current Streak: {streak}</h3>
        {currentQuestion && (
          <>
            <h3>{currentQuestion.question}</h3>
            <div className="question-options">
              {currentQuestion.options && currentQuestion.options.map((option, index) => (
                <button 
                  key={index}
                  id={`answer-${index}`}
                  name={`answer-${index}`}
                  onClick={() => submitAnswer(option)}
                  disabled={hasAnswered}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (gameState === 'answered') {
    return (
      <div className="player-result">
        <h2>Your Score: {score}</h2>
        <h3>Current Streak: {streak}</h3>
        {answerResult && (
          <>
            <p>{answerResult.isCorrect ? 'Correct!' : 'Incorrect!'}</p>
            <p>The correct answer was: {answerResult.correctAnswer}</p>
            <p>Base Score: {answerResult.baseScore}</p>
            <p>Streak Bonus: {answerResult.streakBonus}</p>
            <p>Total Question Score: {answerResult.totalQuestionScore}</p>
          </>
        )}
        <p>Waiting for next question...</p>
      </div>
    );
  }

  if (gameState === 'roundEnded') {
    console.log('Rendering round ended state. Answer result:', answerResult);
    return (
      <div className="player-round-result">
        <h2>Round Result</h2>
        {answerResult && (
          <>
            <div className={`result-status ${answerResult.isCorrect ? 'correct' : 'incorrect'}`}>
              {answerResult.isCorrect ? 'Correct!' : 'Incorrect'}
            </div>
            <div className="answer-comparison">
              <p>Your answer: <span className="player-answer">{answerResult.playerAnswer || 'N/A'}</span></p>
              <p>Correct answer: <span className="correct-answer">{answerResult.correctAnswer || 'N/A'}</span></p>
            </div>
            <div className="question-score">
              <p>Time taken: {answerResult.timeTaken.toFixed(2)} seconds</p>
              <p>Base Score: {answerResult.baseScore}</p>
              <p>Streak Bonus: {answerResult.streakBonus}</p>
              <p>Total Question Score: {answerResult.totalQuestionScore}</p>
            </div>
            <div className="current-score">
              <p>Your current score: {score}</p>
              <p>Your current streak: {streak}</p>
              {streak === personalBestStreak && streak > 0 && (
                <p className="personal-best-streak">This is your best streak so far!</p>
              )}
              {isHighestStreakPlayer && (
                <p className="highest-streak-message">You currently have the highest streak in the game!</p>
              )}
            </div>
            {position && (
              <div className={`player-rank ${position <= 3 ? `top-player-${position}` : ''}`}>
                <p>Your current position: #{position} of {totalPlayers}</p>
              </div>
            )}
          </>
        )}
        <p className="waiting-message">Waiting for next question...</p>
      </div>
    );
  }

  if (gameState === 'ended') {
    return (
      <div className="player-game-over">
        <h2>Game Over</h2>
        <h2>Your final score: {score}</h2>
        <div className="final-leaderboard">
          <h3>Final Leaderboard:</h3>
            {finalLeaderboard ? (
              <ol className="players-list">
                {finalLeaderboard.map((player, index) => (
                  <li key={index} className={index < 3 ? `top-player top-player-${index + 1}` : 'other-player'}>
                    <span className="player-position">#{index + 1}</span>
                    <span className="player-name">{player.nickname}</span>
                    <span className="player-score">{player.score}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p>Loading final results...</p>
            )}
        </div>
        <button id='backToLobby' name='backToLobby' onClick={backToLobby}>Back to Lobby</button>
      </div>
    );
  }

  return <div>Loading...</div>;
};

export default PlayerGame;