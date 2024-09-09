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
  Select,
  MenuItem,
  Modal,
  AppBar,
  Toolbar,
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
import { FaBackspace, FaInfoCircle } from "react-icons/fa";
import { FavoriteRounded } from "@mui/icons-material";
import Lottie from "react-lottie";
import flashAnimation from "../public/flash.json";
import cheatAnimation from "../public/cheat.json";
import celebrateAnimation from "../public/celebrate.json";
import sadAnimation from "../public/sad.json";
import io from "socket.io-client";

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

const celebrateLottieOptions = {
  loop: true,
  autoplay: true,
  animationData: celebrateAnimation,
  rendererSettings: {
    preserveAspectRatio: "xMidYMid slice",
  },
};

const sadLottieOptions = {
  loop: true,
  autoplay: true,
  animationData: sadAnimation,
  rendererSettings: {
    preserveAspectRatio: "xMidYMid slice",
  },
};

let socket;

export default function Home({ initialRoomKey }) {
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
    letters: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [connectionEstablished, setConnectionEstablished] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [inputFocus, setInputFocus] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [hintDialogOpen, setHintDialogOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [hintTaken, setHintTaken] = useState(false);
  const [consecutiveWrongGuesses, setConsecutiveWrongGuesses] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showSad, setShowSad] = useState(false);
  const [showBigBrain, setShowBigBrain] = useState(false);
  const [showPreHintAnimation, setShowPreHintAnimation] = useState(false);

  const router = useRouter();

  useEffect(() => {
    socketInitializer();
    fetchWord();
  }, []);

  const socketInitializer = async () => {
    await fetch("/api/socket");
    socket = io();

    socket.on("connect", () => {
      console.log("Connected to socket");
      setSocketConnected(true);
    });

    socket.on("roomCreated", (data) => {
      setRoomKey(data.roomKey);
      router.push(`/${data.roomKey}`, undefined, { shallow: true });
    });

    socket.on("roomJoined", (data) => {
      setOpponentName(data.creatorName);
      setWord(data.word);
      setTimer(data.timer);
      setConnectionEstablished(true);
    });

    socket.on("gameStarted", (data) => {
      setWord(data.word);
      setTimer(data.timer);
    });

    socket.on("opponentProgress", (data) => {
      setOpponentProgress(data);
    });

    socket.on("gameOver", (data) => {
      setGameOver(true);
      setMessage(data.message);
    });
  };

  useEffect(() => {
    setIsClient(true);
    if (initialRoomKey) {
      setRoomKey(initialRoomKey);
      setGameMode("join");
    } else if (gameMode === "solo") {
      fetchWord();
    }
  }, [initialRoomKey, gameMode]);

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
      // console.log(newWord);
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
      if (gameOver || inputFocus) return;

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

        if (gameMode !== "solo") {
          const newOpponentProgress = {
            guesses: currentGuessIndex + 1,
            letters: newGuesses.join("").length,
          };
          setOpponentProgress(newOpponentProgress);
          socket.emit("updateProgress", {
            roomKey,
            progress: newOpponentProgress,
          });
        }

        if (currentGuess === word) {
          setGameOver(true);
          setShowCelebration(true);
          setConsecutiveWrongGuesses(0);
          if (gameMode !== "solo") {
            socket.emit("gameOver", { roomKey, message: "You lost!" });
          }
        } else {
          setConsecutiveWrongGuesses((prev) => prev + 1);
          if (currentGuessIndex + 1 >= MAX_GUESSES) {
            setGameOver(true);
            setShowSad(true);
            setMessage(`Game Over. The word was: ${word}`);
            if (gameMode !== "solo") {
              socket.emit("gameOver", { roomKey, message: "You won!" });
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
    [guesses, currentGuessIndex, gameOver, word, gameMode, inputFocus, roomKey]
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
            if (gameMode !== "solo") {
              socket.emit("gameOver", {
                roomKey,
                message: "Time's up! You won!",
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

  const createRoom = () => {
    setGameMode("create");
    socket.emit("createRoom", { playerName });
  };

  const joinRoom = (joinRoomKey) => {
    setRoomKey(joinRoomKey);
    setGameMode("join");
    socket.emit("joinRoom", { roomKey: joinRoomKey, playerName });
  };

  const startGame = (selectedTimer) => {
    const timerValue = selectedTimer * 60;
    setTimer(timerValue);
    socket.emit("startGame", { roomKey, word, timer: timerValue });
  };

  const handleHintRequest = () => {
    if (!hintTaken) {
      setShowPreHintAnimation(true);
      setTimeout(() => {
        setShowPreHintAnimation(false);
        setTimeout(() => {
          setHintDialogOpen(true);
        }, 500); // Delay to ensure fade out is complete
      }, 3000);
    }
  };

  const showHintDialog = () => {
    requestAnimationFrame(() => {
      setHintDialogOpen(true);
    });
  };

  const handleHintConfirm = (confirm) => {
    setHintDialogOpen(false);
    if (confirm) {
      setShowBigBrain({ show: true, fade: "in" });
      setTimeout(() => {
        setShowBigBrain({ show: true, fade: "out" });
        setTimeout(() => {
          setShowBigBrain({ show: false, fade: "out" });
          setShowHint(true);
          setHintTaken(true);
        }, 500); // Wait for fade out
      }, 1000); // Show for 2 seconds
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

  const handlePlayAgain = () => {
    window.location.reload();
  };

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
    <StyledEngineProvider injectFirst>
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
            <Typography
              variant="h2"
              component="h1"
              gutterBottom
              sx={{ color: "primary.main" }}
            >
              Griddle
            </Typography>

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                mb: 4,
              }}
            >
              <Button
                variant="contained"
                onClick={() => setGameMode("create")}
                sx={{ mr: 2 }}
              >
                Create Room
              </Button>
              <Button variant="contained" onClick={() => setGameMode("join")}>
                Join Room
              </Button>
              <IconButton color="primary" sx={{ ml: 2 }}>
                <FaInfoCircle />
              </IconButton>
            </Box>

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
                {!initialRoomKey && (
                  <TextField
                    value={roomKey}
                    onChange={(e) => setRoomKey(e.target.value)}
                    placeholder="Enter Room Key"
                    sx={{ mr: 1 }}
                    onFocus={() => setInputFocus(true)}
                    onBlur={() => setInputFocus(false)}
                  />
                )}
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

            {showHint && (
              <Typography variant="h6" sx={{ mb: 2, color: "warning.main" }}>
                Hint: {getHint()}
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
                          backgroundColor:
                            i < currentGuessIndex
                              ? getLetterClass(guess, j, word)
                              : "rgba(0, 0, 0, 0.3)",
                          color:
                            i < currentGuessIndex
                              ? "white"
                              : "rgba(255, 255, 255, 0.7)",
                          transition: theme.transitions.create(
                            ["background-color"],
                            {
                              duration: theme.transitions.duration.standard,
                            }
                          ),
                        }}
                      >
                        {guess[j]}
                      </Box>
                    ))}
                </Box>
              ))}
            </Box>
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

          <BackgroundEmojis />

          {/* Cheat button */}
          <Box
            sx={{
              position: "fixed",
              top: 16,
              left: 0,
              cursor: "pointer",
              zIndex: 1000,
            }}
            onClick={handleHintRequest}
          >
            <Lottie options={cheatLottieOptions} height={90} width={90} />
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
        </Container>
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
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 1)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            opacity: showPreHintAnimation ? 1 : 0,
            visibility: showPreHintAnimation ? "visible" : "hidden",
            transition: "opacity 0.5s, visibility 0.5s",
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
        <Dialog
          open={hintDialogOpen}
          onClose={() => handleHintConfirm(false)}
          aria-labelledby="hint-dialog-title"
          aria-describedby="hint-dialog-description"
          PaperProps={{
            style: {
              opacity: hintDialogOpen ? 1 : 0,
              transition: "opacity 0.5s",
            },
          }}
        >
          <DialogTitle id="hint-dialog-title">
            {"You sure you wanna be a cheater?"}
          </DialogTitle>
          <DialogContent>
            <DialogContentText
              id="hint-dialog-description"
              sx={{ fontSize: "0.8rem", color: "text.secondary" }}
            >
              like your ex?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => handleHintConfirm(false)}>No</Button>
            <Button onClick={() => handleHintConfirm(true)} autoFocus>
              Yes
            </Button>
          </DialogActions>
        </Dialog>
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
          <Fade in={showBigBrain.show} timeout={{ enter: 500, exit: 500 }}>
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
              <Box
                sx={{
                  width: "200px",
                  height: "200px",
                  position: "relative",
                }}
              >
                <Image
                  src="/bigbrain.gif"
                  alt="Big Brain"
                  layout="fill"
                  objectFit="contain"
                />
              </Box>
            </Box>
          </Fade>
        )}
        {showCelebration && (
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              zIndex: 9999,
            }}
          >
            <Lottie options={celebrateLottieOptions} height={200} width={200} />
            <Typography variant="h4" sx={{ mt: 2, color: "white" }}>
              You won at {currentGuessIndex}
              {getOrdinalSuffix(currentGuessIndex)} try!
            </Typography>
            <Button
              variant="contained"
              onClick={handlePlayAgain}
              sx={{ mt: 2 }}
            >
              Play Again?
            </Button>
          </Box>
        )}
        {showSad && (
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              zIndex: 9999,
            }}
          >
            <Lottie options={sadLottieOptions} height={200} width={200} />
            <Typography variant="h4" sx={{ mt: 2, color: "white" }}>
              Better luck next time!
            </Typography>
            <Button
              variant="contained"
              onClick={handlePlayAgain}
              sx={{ mt: 2 }}
            >
              Try Again?
            </Button>
          </Box>
        )}
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

function getOrdinalSuffix(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function getLetterClass(guess, index, word) {
  if (!guess[index]) return "rgba(255, 255, 255, 0.1)";

  const guessLetter = guess[index];
  const wordLetters = word.split("");

  if (guessLetter === wordLetters[index]) {
    return "success.main";
  }

  if (wordLetters.includes(guessLetter)) {
    const correctPositions = wordLetters.filter(
      (letter) => letter === guessLetter
    ).length;
    const guessPositions = guess
      .substring(0, index + 1)
      .split("")
      .filter((letter) => letter === guessLetter).length;
    if (guessPositions <= correctPositions) {
      return "warning.main";
    }
  }

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
                transition: theme.transitions.create(
                  ["background-color", "transform"],
                  {
                    duration: theme.transitions.duration.shortest,
                  }
                ),
                "&:hover": {
                  backgroundColor: getKeyClass(key, guesses, word),
                  opacity: 0.8,
                  transform: "scale(1.05)",
                },
                "&:active": {
                  transform: "scale(0.95)",
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
    const generateEmojiGrid = () => {
      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;
      const rows = 5;
      const cols = 5;
      const cellWidth = containerWidth / cols;
      const cellHeight = containerHeight / rows;

      const positions = [];
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          positions.push({
            top: i * cellHeight + Math.random() * (cellHeight / 2),
            left: j * cellWidth + Math.random() * (cellWidth / 2),
            rotation: Math.random() * 360,
            duration: Math.random() * 20 + 20,
            emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
          });
        }
      }

      setEmojiPositions(positions);
    };

    generateEmojiGrid();
    window.addEventListener("resize", generateEmojiGrid);

    return () => {
      window.removeEventListener("resize", generateEmojiGrid);
    };
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
