import { Box } from "@mui/material";

function GameBoard({ guesses, currentGuessIndex, word }) {
  return (
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
          {Array(5)
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
                      : "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  transition: "background-color 0.3s",
                }}
              >
                {guess[j]}
              </Box>
            ))}
        </Box>
      ))}
    </Box>
  );
}

function getLetterClass(guess, index, word) {
  if (!guess[index]) return "transparent";

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

  return "error.main";
}

export default GameBoard;
