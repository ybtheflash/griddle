import { Box } from "@mui/material";

function BackgroundGradient({ gameMode, incorrectGuess }) {
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
        background:
          gameMode === "1v1"
            ? incorrectGuess
              ? "linear-gradient(45deg, #ff0000, #ff00ff)"
              : "linear-gradient(45deg, #1a472a, #2d8659)" // Royal dim green gradient
            : "#1a0029",
        backgroundSize: "400% 400%",
        animation: gameMode === "1v1" ? "gradient 15s ease infinite" : "none",
        transition: "background 1s ease",
      }}
    >
      <style jsx global>{`
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </Box>
  );
}

export default BackgroundGradient;
