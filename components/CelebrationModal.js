import { Box, Typography, Button } from "@mui/material";
import Lottie from "react-lottie";
import celebrateAnimation from "../public/celebrate.json";

const celebrateLottieOptions = {
  loop: true,
  autoplay: true,
  animationData: celebrateAnimation,
  rendererSettings: {
    preserveAspectRatio: "xMidYMid slice",
  },
};

function CelebrationModal({ show, onPlayAgain, gameMode }) {
  if (!show) return null;

  return (
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
        Congratulations! You won!
      </Typography>
      <Button variant="contained" onClick={onPlayAgain} sx={{ mt: 2 }}>
        {gameMode === "1v1" ? "Rematch" : "Play Again"}
      </Button>
    </Box>
  );
}

export default CelebrationModal;
