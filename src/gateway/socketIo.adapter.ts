import { INestApplication } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import * as socketioJwtAuth from "socketio-jwt-auth";
import { jwtSocketIoMiddleware } from "./jwtSocketIo.middleware";

export class SocketIoAdapter extends IoAdapter {
  constructor(private app: INestApplication) {
    super(app);
  }

  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, options);

    // Apply the token verification middleware to the Socket.IO server
    server.use(
      socketioJwtAuth.authenticate(
        { secret: process.env.JWT_SECRET },
        (payload, done) => {
          done(null, payload); // Pass the payload to the next middleware
        }
      )
    );

    // Apply the custom Socket.IO middleware
    server.use((socket, next) => jwtSocketIoMiddleware(this.app)(socket, next));

    return server;
  }
}
