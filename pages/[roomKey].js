import { useRouter } from "next/router";
import Home from "./index";

export default function Room() {
  const router = useRouter();
  const { roomKey } = router.query;

  return <Home initialRoomKey={roomKey} />;
}
