import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import Head from "next/head";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
  CssBaseline,
  Container,
  Typography,
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  Modal,
  AppBar,
  Toolbar,
} from "@mui/material";
import { FaBackspace } from "react-icons/fa";
import Lottie from "react-lottie";
import flashAnimation from "../public/flash.json";
import Peer from "simple-peer";

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const EMOJIS = ["😀", "😎", "🤔", "🤓", "😍", "🚀", "💡", "🎉", "🌈", "🍕"];

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#ff69b4",
    },
    background: {
      default: "#1a0029",
    },
  },
});

const lottieOptions = {
  loop: true,
  autoplay: true,
  animationData: flashAnimation,
  rendererSettings: {
    preserveAspectRatio: "xMidYMid slice",
  },
};

export default function Home() {
  const [word, setWord] = useState("");
  const [guesses, setGuesses] = useState(Array(MAX_GUESSES).fill(""));
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [roomKey, setRoomKey] = useState("");
  const [gameMode, setGameMode] = useState("solo"); // 'solo', 'create', or 'join'
  const [timer, setTimer] = useState(0);
  const [opponentProgress, setOpponentProgress] = useState({
    guesses: 0,
    letters: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [peer, setPeer] = useState(null);
  const [connectionEstablished, setConnectionEstablished] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [inputFocus, setInputFocus] = useState(false);

  const peerRef = useRef();

  useEffect(() => {
    setIsClient(true);
    if (gameMode === "solo") {
      fetchWord();
    }
  }, [gameMode]);

  const fetchWord = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        "https://random-word-api.herokuapp.com/word?length=5"
      );
      setWord(response.data[0].toUpperCase());
    } catch (error) {
      console.error("Error fetching word:", error);
    }
    setIsLoading(false);
  };

  const checkWordExists = async (word) => {
    try {
      const response = await axios.get(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
      );
      return response.status === 200;
    } catch (error) {
      return false;
    }
  };

  const handleKeyPress = useCallback(
    async (key) => {
      if (gameOver || inputFocus) return;

      if (key === "ENTER") {
        if (currentGuess.length !== WORD_LENGTH) {
          setMessage("Word must be 5 letters long");
          return;
        }

        setIsLoading(true);
        const wordExists = await checkWordExists(currentGuess.toLowerCase());
        setIsLoading(false);

        if (!wordExists) {
          setMessage("Not a valid word");
          return;
        }

        const newGuesses = [...guesses];
        const guessIndex = guesses.findIndex((guess) => guess === "");
        newGuesses[guessIndex] = currentGuess;
        setGuesses(newGuesses);
        setCurrentGuess("");
        setMessage("");

        // Update opponent progress
        if (gameMode !== "solo") {
          const newOpponentProgress = {
            guesses: guessIndex + 1,
            letters: newGuesses.join("").length,
          };
          setOpponentProgress(newOpponentProgress);
          sendPeerData({ type: "progress", progress: newOpponentProgress });
        }

        if (currentGuess === word) {
          setGameOver(true);
          setMessage("You won!");
        } else if (newGuesses[MAX_GUESSES - 1] !== "") {
          setGameOver(true);
          setMessage(`Game Over. The word was: ${word}`);
        }
      } else if (key === "BACKSPACE") {
        setCurrentGuess(currentGuess.slice(0, -1));
      } else if (currentGuess.length < WORD_LENGTH && /^[A-Z]$/.test(key)) {
        setCurrentGuess(currentGuess + key);
      }
    },
    [currentGuess, gameOver, guesses, word, gameMode, inputFocus]
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === "Enter") {
        handleKeyPress("ENTER");
      } else if (event.key === "Backspace") {
        handleKeyPress("BACKSPACE");
      } else {
        const key = event.key.toUpperCase();
        if (/^[A-Z]$/.test(key)) {
          handleKeyPress(key);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyPress]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prevTimer) => {
          if (prevTimer <= 1) {
            clearInterval(interval);
            setGameOver(true);
            setMessage("Time's up!");
            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [timer]);

  const createRoom = async () => {
    const newRoomKey = `${playerName}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;
    setRoomKey(newRoomKey);
    setGameMode("create");
    fetchWord();

    const newPeer = new Peer({ initiator: true, trickle: false });

    newPeer.on("signal", async (data) => {
      try {
        await axios.post("/api/rooms", {
          roomKey: newRoomKey,
          connectionData: JSON.stringify(data),
          creatorName: playerName,
          status: "waiting",
        });
      } catch (error) {
        console.error("Error creating room:", error);
        setMessage("Error creating room");
      }
    });

    newPeer.on("connect", () => {
      console.log("Peer connection established");
      setConnectionEstablished(true);
      updateRoomStatus(newRoomKey, "connected");
    });

    newPeer.on("data", handlePeerData);

    setPeer(newPeer);
    peerRef.current = newPeer;
  };

  const joinRoom = async (joinRoomKey) => {
    setRoomKey(joinRoomKey);
    setGameMode("join");

    try {
      const response = await axios.get(`/api/rooms?roomKey=${joinRoomKey}`);
      const room = response.data;

      if (!room) {
        setMessage("Room not found or expired");
        return;
      }

      setOpponentName(room.creatorName);
      const connectionData = JSON.parse(room.connectionData);

      const newPeer = new Peer({ initiator: false, trickle: false });

      newPeer.on("signal", async (data) => {
        try {
          await axios.put(`/api/rooms`, {
            roomKey: joinRoomKey,
            joinerName: playerName,
            status: "connected",
          });
        } catch (error) {
          console.error("Error updating room:", error);
        }
      });

      newPeer.on("connect", () => {
        console.log("Peer connection established");
        setConnectionEstablished(true);
        sendPeerData({ type: "playerName", name: playerName });
      });

      newPeer.on("data", handlePeerData);

      newPeer.signal(connectionData);

      setPeer(newPeer);
      peerRef.current = newPeer;
    } catch (error) {
      console.error("Error joining room:", error);
      setMessage("Error joining room");
    }
  };

  const handlePeerData = (data) => {
    const message = JSON.parse(data);
    if (message.type === "word") {
      setWord(message.word);
    } else if (message.type === "timer") {
      setTimer(message.timer);
    } else if (message.type === "progress") {
      setOpponentProgress(message.progress);
    } else if (message.type === "playerName") {
      setOpponentName(message.name);
    }
  };

  const sendPeerData = (data) => {
    if (connectionEstablished) {
      peerRef.current.send(JSON.stringify(data));
    }
  };

  const updateRoomStatus = async (roomKey, status) => {
    try {
      await axios.put(`/api/rooms`, {
        roomKey,
        status,
      });
    } catch (error) {
      console.error("Error updating room status:", error);
    }
  };

  const startGame = (selectedTimer) => {
    const timerValue = selectedTimer * 60;
    setTimer(timerValue);
    if (gameMode === "create") {
      sendPeerData({ type: "word", word });
      sendPeerData({ type: "timer", timer: timerValue });
    }
  };

  useEffect(() => {
    if (connectionEstablished && gameMode === "create") {
      sendPeerData({ type: "word", word });
    }
  }, [connectionEstablished, word, gameMode]);

  useEffect(() => {
    if (gameOver) {
      axios
        .delete(`/api/rooms?roomKey=${roomKey}`)
        .catch((error) => console.error("Error deleting room:", error));
    }
  }, [gameOver, roomKey]);

  if (!isClient) {
    return null;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="sm">
        <Head>
          <title>Griddle</title>
          <link rel="icon" href="/favicon.ico" />
          <meta
            name="format-detection"
            content="telephone=no, date=no, email=no, address=no"
          />
        </Head>

        <AppBar position="static" color="transparent" elevation={0}>
          <Toolbar>
            <Button
              color="inherit"
              onClick={() => setGameMode("create")}
              sx={{ mr: 2 }}
            >
              Create Room
            </Button>
            <Button color="inherit" onClick={() => setGameMode("join")}>
              Join Room
            </Button>
          </Toolbar>
        </AppBar>

        <Box
          sx={{
            minHeight: "calc(100vh - 64px)", // Subtract AppBar height
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            sx={{ color: "primary.main" }}
          >
            Griddle
          </Typography>

          {gameMode === "create" && !connectionEstablished && (
            <Box sx={{ mb: 2 }}>
              <TextField
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                sx={{ mr: 1 }}
                onFocus={() => setInputFocus(true)}
                onBlur={() => setInputFocus(false)}
              />
              <Button
                variant="contained"
                onClick={createRoom}
                disabled={!playerName}
              >
                Create Room
              </Button>
              {roomKey && (
                <Typography variant="body1" sx={{ mt: 2 }}>
                  Room Key: {roomKey}
                </Typography>
              )}
            </Box>
          )}

          {gameMode === "join" && !connectionEstablished && (
            <Box sx={{ mb: 2 }}>
              <TextField
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                sx={{ mr: 1, mb: 1 }}
                onFocus={() => setInputFocus(true)}
                onBlur={() => setInputFocus(false)}
              />
              <TextField
                value={roomKey}
                onChange={(e) => setRoomKey(e.target.value)}
                placeholder="Enter Room Key"
                sx={{ mr: 1 }}
                onFocus={() => setInputFocus(true)}
                onBlur={() => setInputFocus(false)}
              />
              <Button
                variant="contained"
                onClick={() => joinRoom(roomKey)}
                disabled={!roomKey || !playerName}
              >
                Join Room
              </Button>
            </Box>
          )}

          {connectionEstablished && (
            <Typography variant="h6" sx={{ mb: 2 }}>
              Connected to: {opponentName}
            </Typography>
          )}

          {connectionEstablished && gameMode === "create" && (
            <Box sx={{ mb: 2 }}>
              <Select
                value={timer / 60}
                onChange={(e) => startGame(e.target.value)}
                sx={{ mt: 1 }}
              >
                <MenuItem value={3}>3 minutes</MenuItem>
                <MenuItem value={5}>5 minutes</MenuItem>
                <MenuItem value={8}>8 minutes</MenuItem>
              </Select>
            </Box>
          )}

          {timer > 0 && (
            <Typography variant="h6" sx={{ mb: 2 }}>
              Time Remaining: {Math.floor(timer / 60)}:
              {(timer % 60).toString().padStart(2, "0")}
            </Typography>
          )}

          {gameMode !== "solo" && (
            <Typography variant="body1" sx={{ mb: 2 }}>
              Opponent Progress: {opponentProgress.guesses} guesses,{" "}
              {opponentProgress.letters} letters
            </Typography>
          )}

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mb: 4,
            }}
          >
            {guesses.map((guess, i) => (
              <Box key={i} sx={{ display: "flex", mb: 1 }}>
                {Array(WORD_LENGTH)
                  .fill()
                  .map((_, j) => (
                    <Box
                      key={j}
                      sx={{
                        width: 50,
                        height: 50,
                        border: "2px solid",
                        borderColor: "primary.main",
                        borderRadius: 2,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                        mr: 1,
                        backgroundColor: getLetterClass(guess, j, word),
                      }}
                    >
                      {guess[j]}
                    </Box>
                  ))}
              </Box>
            ))}
            <Box sx={{ display: "flex", mb: 1 }}>
              {Array(WORD_LENGTH)
                .fill()
                .map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 50,
                      height: 50,
                      border: "2px solid",
                      borderColor: "primary.main",
                      borderRadius: 2,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      mr: 1,
                    }}
                  >
                    {currentGuess[i]}
                  </Box>
                ))}
            </Box>
          </Box>
          <Keyboard onKeyPress={handleKeyPress} guesses={guesses} word={word} />
          {message && (
            <Typography variant="h6" sx={{ mt: 2, textAlign: "center" }}>
              {message}
            </Typography>
          )}
        </Box>
        <BackgroundEmojis />
      </Container>
      <Modal
        open={isLoading}
        aria-labelledby="loading-modal"
        aria-describedby="loading-modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
          }}
        >
          <Lottie options={lottieOptions} height={200} width={200} />
        </Box>
      </Modal>
    </ThemeProvider>
  );
}

function getLetterClass(guess, index, word) {
  if (!guess[index]) return "transparent";
  if (guess[index] === word[index]) return "success.main";
  if (word.includes(guess[index])) return "warning.main";
  return "text.disabled";
}

function Keyboard({ onKeyPress, guesses, word }) {
  const rows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
  ];

  return (
    <Box sx={{ mt: 2 }}>
      {rows.map((row, i) => (
        <Box key={i} sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
          {row.map((key) => (
            <Button
              key={key}
              onClick={() => onKeyPress(key)}
              variant="contained"
              sx={{
                mx: 0.25,
                minWidth: key === "ENTER" || key === "BACKSPACE" ? 65 : 40,
                height: 50,
                backgroundColor: getKeyClass(key, guesses, word),
                color: "black",
                "&:hover": {
                  backgroundColor: getKeyClass(key, guesses, word),
                  opacity: 0.8,
                },
              }}
            >
              {key === "BACKSPACE" ? <FaBackspace /> : key}
            </Button>
          ))}
        </Box>
      ))}
    </Box>
  );
}

function getKeyClass(key, guesses, word) {
  const guessedLetters = guesses.join("").split("");
  if (guessedLetters.includes(key)) {
    if (word.includes(key)) {
      if (
        [...word].some(
          (letter, i) => letter === key && guessedLetters[i] === key
        )
      ) {
        return "success.main";
      }
      return "warning.main";
    }
    return "text.disabled";
  }
  return "#ffff00";
}

function BackgroundEmojis() {
  const [emojiPositions, setEmojiPositions] = useState([]);

  useEffect(() => {
    const positions = Array(20)
      .fill()
      .map(() => ({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        rotation: Math.random() * 360,
        duration: Math.random() * 10 + 10,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      }));
    setEmojiPositions(positions);
  }, []);

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        zIndex: -1,
      }}
    >
      {emojiPositions.map((position, i) => (
        <Box
          key={i}
          sx={{
            position: "absolute",
            fontSize: "2rem",
            color: "rgba(255, 255, 255, 0.3)",
            animation: `spin ${position.duration}s linear infinite`,
            top: position.top,
            left: position.left,
            transform: `rotate(${position.rotation}deg)`,
          }}
        >
          {position.emoji}
        </Box>
      ))}
      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </Box>
  );
}
