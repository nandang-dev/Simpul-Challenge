import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 'ok',
          service: 'api',
        });
        expect(body.timestamp).toEqual(expect.any(String));
        expect(body.uptime).toEqual(expect.any(Number));
      });
  });

  it('/allocations (POST) returns a shipment plan', () => {
    return request(app.getHttpServer())
      .post('/allocations')
      .send({ items: [{ productId: 'P001', quantity: 1 }] })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 'FULL',
          warehouseCount: 1,
          lines: [{ productId: 'P001', requested: 1, fulfilled: 1, shortage: 0 }],
        });
        expect(body.allocations[0].items).toEqual([
          { productId: 'P001', productName: 'Surgical Gloves', quantity: 1 },
        ]);
      });
  });

  it('/allocations (POST) treats maxDistanceKm 0 as unlimited', () => {
    return request(app.getHttpServer())
      .post('/allocations')
      .send({
        items: [{ productId: 'P001', quantity: 400 }],
        maxDistanceKm: 0,
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe('FULL');
        expect(body.lines).toEqual([
          { productId: 'P001', requested: 400, fulfilled: 400, shortage: 0 },
        ]);
        expect(body.skipped).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({ reasonCode: 'BEYOND_MAX_DISTANCE' }),
          ]),
        );
      });
  });

  it('/allocations (POST) rejects duplicate product IDs', () => {
    return request(app.getHttpServer())
      .post('/allocations')
      .send({
        items: [
          { productId: 'P001', quantity: 1 },
          { productId: 'P001', quantity: 2 },
        ],
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message.join(' ')).toMatch(/unique/i);
      });
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 'ok',
          service: 'api',
        });
        expect(body.timestamp).toEqual(expect.any(String));
        expect(body.uptime).toEqual(expect.any(Number));
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
