import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

function HintDialog({ open, onClose, onConfirm }) {
  return (
    <Dialog
      open={open}
      onClose={() => onClose(false)}
      aria-labelledby="hint-dialog-title"
      aria-describedby="hint-dialog-description"
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
        <Button onClick={() => onClose(false)}>No</Button>
        <Button onClick={() => onConfirm(true)} autoFocus>
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default HintDialog;
