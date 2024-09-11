import { Box, Typography, Button } from "@mui/material";
import Lottie from "react-lottie";
import sadAnimation from "../public/sad.json";

const sadLottieOptions = {
  loop: true,
  autoplay: true,
  animationData: sadAnimation,
  rendererSettings: {
    preserveAspectRatio: "xMidYMid slice",
  },
};

function SadModal({ show, onPlayAgain, gameMode }) {
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
      <Lottie options={sadLottieOptions} height={200} width={200} />
      <Typography variant="h4" sx={{ mt: 2, color: "white" }}>
        Better luck next time!
      </Typography>
      <Button variant="contained" onClick={onPlayAgain} sx={{ mt: 2 }}>
        {gameMode === "1v1" ? "Rematch" : "Try Again"}
      </Button>
    </Box>
  );
}

export default SadModal;
