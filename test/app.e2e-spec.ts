import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.enableShutdownHooks();
    app.use(helmet());
    app.use(cookieParser());
    app.enableCors({
      origin: ['http://localhost:3000'],
      credentials: true,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Root endpoint', () => {
    it('/ (GET) should return 404 (no root endpoint defined)', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(404);
    });
  });

  describe('Health endpoints', () => {
    it('/health (GET) should return 200 with status ok', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
          expect(typeof res.body.timestamp).toBe('string');
        });
    });

    it('/ready (GET) should return 200 with database connected', () => {
      return request(app.getHttpServer())
        .get('/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ready');
          expect(res.body).toHaveProperty('database', 'connected');
          expect(res.body).toHaveProperty('timestamp');
          expect(typeof res.body.timestamp).toBe('string');
        });
    });

    it('/ready (GET) should include valid ISO timestamp', async () => {
      const response = await request(app.getHttpServer()).get('/ready');

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });
  });
});
