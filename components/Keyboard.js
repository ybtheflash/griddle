import { Box, Button } from "@mui/material";
import { FaBackspace } from "react-icons/fa";

function Keyboard({ onKeyPress, guesses, word, gameMode }) {
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
                backgroundColor: getKeyClass(key, guesses, word, gameMode),
                color: "white",
                transition: "background-color 0.3s, transform 0.1s",
                "&:hover": {
                  backgroundColor: getKeyClass(key, guesses, word, gameMode),
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

function getKeyClass(key, guesses, word, gameMode) {
  const guessedLetters = guesses.join("").split("");
  if (guessedLetters.includes(key)) {
    if (word.includes(key)) {
      if (
        [...word].some(
          (letter, i) => letter === key && guessedLetters[i] === key
        )
      ) {
        return gameMode === "1v1" ? "#2d8659" : "success.main"; // Correct position
      }
      return gameMode === "1v1" ? "#1a472a" : "warning.main"; // Correct letter, wrong position
    }
    return gameMode === "1v1" ? "#0a3622" : "error.main"; // Wrong letter
  }
  return gameMode === "1v1" ? "#1d5c3d" : "primary.main"; // Unused letter
}

export default Keyboard;
