import { INestApplicationContext } from "@nestjs/common";
import { Socket } from "socket.io";

export function jwtSocketIoMiddleware(app: INestApplicationContext) {
  return (socket: Socket, next: () => void) => {
    const token = socket.handshake.auth.token;
    // You can now use the token as needed, such as decoding and verifying it.
    // For example, you can use the @nestjs/jwt package to verify the token.

    next();
  };
}
