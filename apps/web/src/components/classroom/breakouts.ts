/** Which real LiveKit room the client is currently connected to. 'main' is the class's own room; any other value is a breakout room id. */
export interface RoomConnection {
  token: string;
  url: string;
  roomLabel: 'main' | string;
}
