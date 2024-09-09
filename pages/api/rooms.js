import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

export default async function handler(req, res) {
  const { method, body, query } = req;

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db("griddle");
    const roomsCollection = db.collection("rooms");

    switch (method) {
      case "POST":
        // Create a new room
        await roomsCollection.insertOne({
          roomKey: body.roomKey,
          creatorName: body.creatorName,
          status: "waiting",
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });
        res.status(201).json({ message: "Room created" });
        break;

      case "GET":
        // Get a room
        const room = await roomsCollection.findOne({ roomKey: query.roomKey });
        if (room) {
          res.status(200).json(room);
        } else {
          res.status(404).json({ message: "Room not found" });
        }
        break;

      case "PUT":
        // Update room status or add joiner name
        const updateData = {};
        if (body.status) updateData.status = body.status;
        if (body.joinerName) updateData.joinerName = body.joinerName;

        await roomsCollection.updateOne(
          { roomKey: body.roomKey },
          { $set: updateData }
        );
        res.status(200).json({ message: "Room updated" });
        break;

      case "DELETE":
        // Delete a room
        await roomsCollection.deleteOne({ roomKey: query.roomKey });
        res.status(200).json({ message: "Room deleted" });
        break;

      default:
        res.setHeader("Allow", ["POST", "GET", "PUT", "DELETE"]);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error connecting to database", error: error.message });
  } finally {
    await client.close();
  }
}
