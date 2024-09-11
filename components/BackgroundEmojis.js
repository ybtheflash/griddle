import { useState, useEffect } from "react";
import { Box } from "@mui/material";

const EMOJIS = ["😀", "😎", "🤔", "🤓", "😍", "🚀", "💡", "🎉", "🌈", "🍕"];

function BackgroundEmojis({
  onHintRequest,
  hintTaken,
  consecutiveWrongGuesses,
}) {
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

export default BackgroundEmojis;
