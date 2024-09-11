import { Box, Typography, Button, Modal } from "@mui/material";

function WinnerModal({ show, winner, onRematch, onPlayAgain, gameMode }) {
  return (
    <Modal
      open={show}
      aria-labelledby="winner-modal-title"
      aria-describedby="winner-modal-description"
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "background.paper",
          border: "2px solid #000",
          boxShadow: 24,
          p: 4,
        }}
      >
        <Typography id="winner-modal-title" variant="h6" component="h2">
          Game Over!
        </Typography>
        <Typography id="winner-modal-description" sx={{ mt: 2 }}>
          {winner === "Time's up! It's a draw." ? winner : `Winner: ${winner}`}
        </Typography>
        {gameMode === "1v1" ? (
          <Button onClick={onRematch} sx={{ mt: 2 }}>
            Rematch
          </Button>
        ) : (
          <Button onClick={onPlayAgain} sx={{ mt: 2 }}>
            Play Again
          </Button>
        )}
      </Box>
    </Modal>
  );
}

export default WinnerModal;
