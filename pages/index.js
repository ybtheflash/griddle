import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import {
  ThemeProvider,
  StyledEngineProvider,
  createTheme,
} from "@mui/material/styles";
import {
  CssBaseline,
  Container,
  Typography,
  Box,
  Button,
  TextField,
  Modal,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  IconButton,
  Link,
  Fade,
} from "@mui/material";
import { FaBackspace, FaInfoCircle, FaShare } from "react-icons/fa";
import { FavoriteRounded } from "@mui/icons-material";
import Lottie from "react-lottie";
import flashAnimation from "../public/flash.json";
import cheatAnimation from "../public/cheat.json";
import celebrateAnimation from "../public/celebrate.json";
import sadAnimation from "../public/sad.json";
import io from "socket.io-client";
import GameBoard from "../components/GameBoard";
import Keyboard from "../components/Keyboard";
import BackgroundEmojis from "../components/BackgroundEmojis";
import HintDialog from "../components/HintDialog";
import CelebrationModal from "../components/CelebrationModal";
import SadModal from "../components/SadModal";
import BackgroundGradient from "../components/BackgroundGradient";

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const EMOJIS = ["😀", "😎", "🤔", "🤓", "😍", "🚀", "💡", "🎉", "🌈", "🍕"];
const CUSTOM_WORD_LIST = [
  "APPLE",
  "BRAVE",
  "CACTUS",
  "DANCE",
  "EAGLE",
  "FABLE",
  "GRAPE",
  "HONEY",
  "IMAGE",
  "JELLY",
  "KNIFE",
  "LEMON",
  "MANGO",
  "NOBLE",
  "OCEAN",
  "PIANO",
  "QUIET",
  "RIVER",
  "SOLAR",
  "TIGER",
  "UMBRELLA",
  "VOCAL",
  "WATER",
  "XENON",
  "YACHT",
  "ZEBRA",
  "BREAD",
  "CLOCK",
  "DREAM",
  "FLAME",
  "GHOST",
  "HEART",
  "IVORY",
  "JOKER",
  "LIGHT",
  "MUSIC",
  "NIGHT",
  "OASIS",
  "PEARL",
  "QUEEN",
  "ROBOT",
  "STORM",
  "TRAIN",
  "UNITY",
  "VOICE",
  "WHALE",
  "YOUTH",
  "ZESTY",
];

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

const cheatLottieOptions = {
  loop: true,
  autoplay: true,
  animationData: cheatAnimation,
  rendererSettings: {
    preserveAspectRatio: "xMidYMid slice",
  },
};

let socket;

export default function Home() {
  const [word, setWord] = useState("");
  const [guesses, setGuesses] = useState(Array(MAX_GUESSES).fill(""));
  const [currentGuessIndex, setCurrentGuessIndex] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [roomKey, setRoomKey] = useState("");
  const [gameMode, setGameMode] = useState("solo");
  const [timer, setTimer] = useState(0);
  const [opponentProgress, setOpponentProgress] = useState({
    guesses: 0,
    correctChars: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [inputFocus, setInputFocus] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [hintDialogOpen, setHintDialogOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [hintTaken, setHintTaken] = useState(false);
  const [opponentHintTaken, setOpponentHintTaken] = useState(false);
  const [consecutiveWrongGuesses, setConsecutiveWrongGuesses] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showSad, setShowSad] = useState(false);
  const [showBigBrain, setShowBigBrain] = useState(false);
  const [showPreHintAnimation, setShowPreHintAnimation] = useState(false);
  const [incorrectGuess, setIncorrectGuess] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [showShareLink, setShowShareLink] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isHost, setIsHost] = useState(false);

  const router = useRouter();

  useEffect(() => {
    socketInitializer();
    setIsClient(true);
    const { room } = router.query;
    if (room) {
      setRoomKey(room);
      setGameMode("1v1");
      setShowNameInput(true);
    }
  }, [router.query]);

  const socketInitializer = async () => {
    await fetch("/api/socket");
    socket = io();

    socket.on("connect", () => {
      console.log("Connected to socket");
      setSocketConnected(true);
    });

    socket.on("roomCreated", (data) => {
      setRoomKey(data.roomKey);
      setIsHost(true);
      setShowShareLink(true);
    });

    socket.on("playerJoined", (data) => {
      setOpponentName(data.playerName);
      if (isHost) {
        startGame();
      }
    });

    socket.on("gameStarted", (data) => {
      setWord(data.word);
      setTimer(300); // 5 minutes
      setGameStarted(true);
    });

    socket.on("opponentProgress", (data) => {
      setOpponentProgress(data);
    });

    socket.on("opponentHintTaken", () => {
      setOpponentHintTaken(true);
    });

    socket.on("gameOver", (data) => {
      setGameOver(true);
      if (data.winner === playerName) {
        setShowCelebration(true);
      } else {
        setShowSad(true);
      }
    });

    socket.on("rematch", () => {
      resetGame();
    });

    socket.on("roomFull", () => {
      setSnackbarMessage("Room is full.");
      setSnackbarOpen(true);
    });
  };

  const fetchWord = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        "https://random-word-api.herokuapp.com/word?length=5"
      );
      let newWord = response.data[0].toUpperCase();
      try {
        await axios.get(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${newWord}`
        );
      } catch {
        newWord = getUniqueWordFromCustomList();
      }
      setWord(newWord);
      Cookies.set("lastWord", newWord, { expires: 1 });
    } catch (error) {
      console.error("Error fetching word:", error);
      const newWord = getUniqueWordFromCustomList();
      setWord(newWord);
      Cookies.set("lastWord", newWord, { expires: 1 });
    }
    setIsLoading(false);
  };

  const getUniqueWordFromCustomList = () => {
    const lastWord = Cookies.get("lastWord");
    let availableWords = CUSTOM_WORD_LIST.filter((word) => word !== lastWord);
    if (availableWords.length === 0) {
      availableWords = CUSTOM_WORD_LIST;
    }
    return availableWords[Math.floor(Math.random() * availableWords.length)];
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
      if (gameOver || inputFocus || (gameMode === "1v1" && !gameStarted))
        return;

      const currentGuess = guesses[currentGuessIndex];

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
        newGuesses[currentGuessIndex] = currentGuess;
        setGuesses(newGuesses);
        setCurrentGuessIndex((prevIndex) => prevIndex + 1);
        setMessage("");

        const correctChars = currentGuess
          .split("")
          .filter((char, index) => word[index] === char).length;

        if (gameMode === "1v1") {
          socket.emit("updateProgress", {
            roomKey,
            guesses: currentGuessIndex + 1,
            correctChars,
          });
        }

        if (currentGuess === word) {
          setGameOver(true);
          setShowCelebration(true);
          setConsecutiveWrongGuesses(0);
          if (gameMode === "1v1") {
            socket.emit("gameOver", { roomKey, winner: playerName });
          }
        } else {
          setConsecutiveWrongGuesses((prev) => prev + 1);
          setIncorrectGuess(true);
          setTimeout(() => setIncorrectGuess(false), 1000);
          if (currentGuessIndex + 1 >= MAX_GUESSES) {
            setGameOver(true);
            setShowSad(true);
            setMessage(`Game Over. The word was: ${word}`);
            if (gameMode === "1v1") {
              socket.emit("gameOver", { roomKey, winner: opponentName });
            }
          }
        }
      } else if (key === "BACKSPACE") {
        if (currentGuess.length > 0) {
          const newGuesses = [...guesses];
          newGuesses[currentGuessIndex] = currentGuess.slice(0, -1);
          setGuesses(newGuesses);
        }
      } else if (currentGuess.length < WORD_LENGTH && /^[A-Z]$/.test(key)) {
        const newGuesses = [...guesses];
        newGuesses[currentGuessIndex] = currentGuess + key;
        setGuesses(newGuesses);
      }
    },
    [
      guesses,
      currentGuessIndex,
      gameOver,
      word,
      gameMode,
      inputFocus,
      roomKey,
      playerName,
      opponentName,
      gameStarted,
    ]
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
            if (gameMode === "1v1") {
              socket.emit("gameOver", {
                roomKey,
                winner: "Time's up! It's a draw.",
              });
            }
            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [timer, gameMode, roomKey]);

  const enter1v1Mode = () => {
    setShowNameInput(true);
  };

  const createRoom = () => {
    socket.emit("createRoom", { playerName });
    setGameMode("1v1");
  };

  const joinRoom = () => {
    socket.emit("joinRoom", { roomKey, playerName });
    setGameMode("1v1");
  };

  const startGame = () => {
    fetchWord();
    setTimer(300); // 5 minutes
    setGameStarted(true);
    if (gameMode === "1v1") {
      socket.emit("startGame", { roomKey, word });
    }
  };

  const exitRoom = () => {
    socket.emit("leaveRoom", { roomKey });
    setRoomKey("");
    setGameMode("solo");
    resetGame();
    router.push("/", undefined, { shallow: true });
  };

  const rematch = () => {
    socket.emit("rematch", { roomKey });
  };

  const resetGame = () => {
    setGuesses(Array(MAX_GUESSES).fill(""));
    setCurrentGuessIndex(0);
    setGameOver(false);
    setShowCelebration(false);
    setShowSad(false);
    setHintTaken(false);
    setOpponentHintTaken(false);
    setConsecutiveWrongGuesses(0);
    fetchWord();
    if (gameMode === "1v1") {
      setTimer(300);
      setGameStarted(true);
    }
  };

  const handleHintRequest = () => {
    if (!hintTaken) {
      setShowPreHintAnimation(true);
      setTimeout(() => {
        setShowPreHintAnimation(false);
        setTimeout(() => {
          setHintDialogOpen(true);
        }, 500);
      }, 3000);
    }
  };

  const handleHintConfirm = (confirm) => {
    setHintDialogOpen(false);
    if (confirm) {
      setShowBigBrain(true);
      setTimeout(() => {
        setShowBigBrain(false);
        setShowHint(true);
        setHintTaken(true);
        if (gameMode === "1v1") {
          socket.emit("hintTaken", { roomKey });
        }
      }, 2000);
    } else {
      setSnackbarMessage("Wise Choice, mate.");
      setSnackbarOpen(true);
      setTimeout(() => setSnackbarOpen(false), 2000);
    }
  };

  const getHint = () => {
    const hintIndices = [1, 3];
    return word
      .split("")
      .map((char, index) => (hintIndices.includes(index) ? char : "*"))
      .join("");
  };

  const handleAboutHover = () => {
    const messages = [
      "yes yes click on it",
      "come come visit my page",
      "wanna know who i am? click on it",
      "aww, so you care about devs <3",
      "im happy to have you here",
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    setSnackbarMessage(randomMessage);
    setSnackbarOpen(true);
    setTimeout(() => setSnackbarOpen(false), 2000);
  };

  const handleShareLink = () => {
    const link = `${window.location.origin}/?room=${roomKey}`;
    navigator.clipboard.writeText(link).then(() => {
      setSnackbarMessage("Link copied to clipboard!");
      setSnackbarOpen(true);
    });
  };

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

        <BackgroundGradient
          gameMode={gameMode}
          incorrectGuess={incorrectGuess}
        />
        <BackgroundEmojis
          onHintRequest={handleHintRequest}
          hintTaken={hintTaken}
          consecutiveWrongGuesses={consecutiveWrongGuesses}
        />

        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "fixed",
              top: 16,
              right: 16, // Move the logo to the right corner
              zIndex: 1000,
            }}
          >
            <Typography
              variant="h4" // Medium size
              component="h1"
              gutterBottom
              sx={{
                color: gameMode === "1v1" ? "#FADA5E" : "primary.main", // Royal yellow in 1v1 mode, default otherwise
                fontWeight: "bold", // Smooth and bold
                textShadow: "1px 1px 2px rgba(0, 0, 0, 0.5)", // Smoother appearance
              }}
            >
              Griddle
            </Typography>
          </Box>

          {gameMode === "solo" && !showNameInput && (
            <Button variant="contained" onClick={enter1v1Mode} sx={{ mb: 2 }}>
              Enter 1v1 Mode
            </Button>
          )}

          {showNameInput && (
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
                onClick={roomKey ? joinRoom : createRoom}
                disabled={!playerName}
              >
                {roomKey ? "Join Room" : "Create Room"}
              </Button>
            </Box>
          )}

          {gameMode === "1v1" && (
            <>
              <Button variant="contained" onClick={exitRoom} sx={{ mb: 2 }}>
                Exit 1v1 Mode
              </Button>
              <Typography variant="body1" sx={{ mb: 1 }}>
                Room Key: {roomKey}
              </Typography>
              {showShareLink && (
                <Button
                  variant="contained"
                  onClick={handleShareLink}
                  startIcon={<FaShare />}
                  sx={{ mb: 2 }}
                >
                  Share Room Link
                </Button>
              )}
              <Typography variant="body1" sx={{ mb: 1 }}>
                Opponent: {opponentName || "Waiting for opponent..."}
              </Typography>
              {!gameStarted && isHost && opponentName && (
                <Button variant="contained" onClick={startGame}>
                  Start Game
                </Button>
              )}
            </>
          )}

          {timer > 0 && (
            <Typography variant="h6" sx={{ mb: 2 }}>
              Time Remaining: {Math.floor(timer / 60)}:
              {(timer % 60).toString().padStart(2, "0")}
            </Typography>
          )}

          {gameMode === "1v1" && gameStarted && (
            <Typography variant="body1" sx={{ mb: 2 }}>
              Opponent Progress: {opponentProgress.guesses} guesses,{" "}
              {opponentProgress.correctChars} correct characters
              {opponentHintTaken && " (Hint used)"}
            </Typography>
          )}

          {showHint && (
            <Typography variant="h6" sx={{ mb: 2, color: "warning.main" }}>
              Hint: {getHint()}
            </Typography>
          )}

          <GameBoard
            guesses={guesses}
            currentGuessIndex={currentGuessIndex}
            word={word}
          />
          <Keyboard
            onKeyPress={handleKeyPress}
            guesses={guesses.slice(0, currentGuessIndex)}
            word={word}
          />

          {message && (
            <Typography variant="h6" sx={{ mt: 2, textAlign: "center" }}>
              {message}
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            position: "fixed",
            top: 16,
            left: 16,
            cursor: "pointer",
            zIndex: 1000,
          }}
          onClick={handleHintRequest}
        >
          <Lottie options={cheatLottieOptions} height={50} width={50} />
        </Box>

        <Box
          sx={{
            position: "fixed",
            bottom: 16,
            left: 0,
            right: 0,
            textAlign: "center",
          }}
        >
          <Typography variant="body2" color="textSecondary">
            Made with{" "}
            <FavoriteRounded
              fontSize="small"
              sx={{ color: "red", verticalAlign: "middle" }}
            />{" "}
            by{" "}
            <Link
              href="https://ybtheflash.in"
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={handleAboutHover}
              sx={{
                color: "inherit",
                textDecoration: "none",
                "&:hover": { textDecoration: "none" },
              }}
            >
              ybtheflash
            </Link>
          </Typography>
        </Box>

        <Fade in={isLoading}>
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 9999,
            }}
          >
            <Lottie options={lottieOptions} height={200} width={200} />
          </Box>
        </Fade>

        <HintDialog
          open={hintDialogOpen}
          onClose={() => setHintDialogOpen(false)}
          onConfirm={handleHintConfirm}
        />

        <Snackbar
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          open={snackbarOpen}
          message={snackbarMessage}
          sx={{
            "& .MuiSnackbarContent-root": {
              bgcolor: "success.main",
              color: "white",
              fontWeight: "bold",
            },
          }}
        />

        {showBigBrain && (
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              zIndex: 9999,
            }}
          >
            <Image
              src="/bigbrain.gif"
              alt="Big Brain"
              width={200}
              height={200}
            />
          </Box>
        )}

        <CelebrationModal
          show={showCelebration}
          onPlayAgain={gameMode === "1v1" ? rematch : resetGame}
          gameMode={gameMode}
        />

        <SadModal
          show={showSad}
          onPlayAgain={gameMode === "1v1" ? rematch : resetGame}
          gameMode={gameMode}
        />

        <Fade in={showPreHintAnimation} timeout={500}>
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.9)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999,
            }}
          >
            <Typography
              variant="h4"
              component="div"
              sx={{ color: "white", textAlign: "center" }}
            >
              A wild hint box has appeared!
            </Typography>
          </Box>
        </Fade>
      </Container>
    </ThemeProvider>
  );
}
