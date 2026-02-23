import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
// import { DomainErrorFilter } from './modules/shared/platform/web/DomainErrorFilter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // app.useGlobalFilters(new DomainErrorFilter());

  const config = new DocumentBuilder()
    .setTitle("API")
    .setDescription("API documentation")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
