import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";

function RoomDialog({ open, onClose, onJoin, roomKey }) {
  const [name, setName] = useState("");

  const handleJoin = () => {
    if (name.trim()) {
      onJoin(roomKey, name.trim());
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Join Room</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Your Name"
          type="text"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleJoin} disabled={!name.trim()}>
          Join
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default RoomDialog;
