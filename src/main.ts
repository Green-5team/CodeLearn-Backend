import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { SocketIoAdapter } from "./gateway/socketIo.adapter";
import { SocketProvider } from "./socket.provider";
import * as http from "http";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalPipes(new ValidationPipe());
  app.useWebSocketAdapter(new SocketIoAdapter(app));

  const options = new DocumentBuilder()
    .setTitle("Code-Learn API")
    .setDescription("code-learn project from krafton jungle")
    .setVersion("0.0.1")
    .addTag("Auth")
    .addTag("Room")
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup("api", app, document);

  const server = http.createServer(app.getHttpServer());
  const socketProvider = app.get(SocketProvider);
  socketProvider.initialize(server);

  const port = 3100;
  server.listen(port, () => {
    console.log(`server is running on port ${port}`);
  });

  await app.listen(3000);
}

bootstrap();
