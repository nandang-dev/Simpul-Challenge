import { INestApplication, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { App } from 'supertest/types';
import request from 'supertest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppModule } from '../src/app.module';

describe('Data integrity (e2e)', () => {
  let app: INestApplication<App>;
  let dataDir: string;
  let previousDataDir: string | undefined;
  let loggerError: jest.SpyInstance;

  beforeAll(async () => {
    previousDataDir = process.env.DATA_DIR;
    dataDir = mkdtempSync(join(tmpdir(), 'simpul-invalid-inventory-'));
    writeFileSync(
      join(dataDir, 'products.json'),
      JSON.stringify([
        {
          product_id: 'P001',
          name: 'Gloves',
          category: 42,
          unit: 'box',
          requires_cold_chain: false,
        },
      ]),
    );
    writeFileSync(
      join(dataDir, 'warehouse-stock.json'),
      JSON.stringify([
        {
          warehouse_id: 'W01',
          warehouse_city: 'Jakarta',
          warehouse_distance_km: 5,
          warehouse_has_cold_storage: false,
          warehouse_has_refrigerated_fleet: false,
          product_id: 'P001',
          quantity: 10,
        },
      ]),
    );
    process.env.DATA_DIR = dataDir;
    loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    loggerError.mockRestore();
    if (previousDataDir === undefined) {
      delete process.env.DATA_DIR;
    } else {
      process.env.DATA_DIR = previousDataDir;
    }
    rmSync(dataDir, { recursive: true, force: true });
  });

  it('returns HTTP 500 with all row issues and logs the integrity error', async () => {
    const response = await request(app.getHttpServer()).get('/products').expect(500);

    expect(response.body.message).toBe(
      'Inventory data integrity error:\n- products.json row 1: "category" must be a string',
    );
    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('Inventory data integrity error:'),
    );
  });
});
