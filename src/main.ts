import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { SocketIoAdapter } from './gateway/socket-io.adapter';
import * as fs from 'fs';
import * as https from 'https';

async function bootstrap() {
  const httpsOptions = {
    key: fs.readFileSync('example.key'),
    cert: fs.readFileSync('example.crt'),
  };

  const app = await NestFactory.create(AppModule, { cors: true, httpsOptions });


  app.useGlobalPipes(new ValidationPipe());
  app.useWebSocketAdapter(new SocketIoAdapter(app));
  const options = new DocumentBuilder()
  .setTitle('Code-Learn API')
  .setDescription('code-learn project from krafton jungle')
  .setVersion('0.0.1')
  .addTag('Auth')
  .addTag('Room')
  .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
