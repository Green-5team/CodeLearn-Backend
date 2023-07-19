import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import { join } from "path";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
  });

  app.useGlobalPipes(new ValidationPipe());
  app.useStaticAssets(join(__dirname, "..", "public")); //javascript,css파일을 서빙해주는 역할, join이라는 매서드는 __dirname현재디렉토리를 가리킴, ..은 현재디렉토리의 상위폴더,public폴더를 가리킴
  app.setBaseViewsDir(join(__dirname, "..", "views")); //template engine을 어디 폴더에 둘 것인지
  app.setViewEngine("hbs");

  const config = new DocumentBuilder()
    .setTitle("Code-Learn API")
    .setDescription("code-learn project from krafton jungle")
    .setVersion("0.0.1")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  await app.listen(3000);
}
bootstrap();
