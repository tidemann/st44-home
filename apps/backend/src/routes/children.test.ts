import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { registerAndLogin } from '../test-helpers/auth.ts';

/**
 * Children Management API Tests
 */

describe('Children API', () => {
  let app: FastifyInstance;
  let pool: pg.Pool;
  let adminToken: string;
  let parentToken: string;
  let outsiderToken: string;
  let householdId: string;
  let adminUserId: number;
  let parentUserId: number;
  let outsiderUserId: number;

  before(async () => {
    app = await build();
    await app.ready();

    pool = new pg.Pool({
      host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '55432'),
      database: process.env.TEST_DB_NAME || 'st44_test',
      user: process.env.TEST_DB_USER || process.env.DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
    });

    const adminEmail = `test-children-admin-${Date.now()}@example.com`;
    const parentEmail = `test-children-parent-${Date.now()}@example.com`;
    const outsiderEmail = `test-children-outsider-${Date.now()}@example.com`;
    const testPassword = 'TestPass123!';

    const adminData = await registerAndLogin(app, adminEmail, testPassword);
    const parentData = await registerAndLogin(app, parentEmail, testPassword);
    const outsiderData = await registerAndLogin(app, outsiderEmail, testPassword);

    adminToken = adminData.accessToken;
    parentToken = parentData.accessToken;
    outsiderToken = outsiderData.accessToken;

    const adminResult = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    const parentResult = await pool.query('SELECT id FROM users WHERE email = $1', [parentEmail]);
    const outsiderResult = await pool.query('SELECT id FROM users WHERE email = $1', [
      outsiderEmail,
    ]);

    adminUserId = adminResult.rows[0].id;
    parentUserId = parentResult.rows[0].id;
    outsiderUserId = outsiderResult.rows[0].id;

    // Create household
    const householdResponse = await app.inject({
      method: 'POST',
      url: '/api/households',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { name: `Children Test Household ${Date.now()}` },
    });
    householdId = JSON.parse(householdResponse.body).id;

    // Add parent to household
    await pool.query(
      `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'parent')`,
      [householdId, parentUserId],
    );
  });

  after(async () => {
    await pool.query('DELETE FROM children WHERE household_id = $1', [householdId]);
    await pool.query('DELETE FROM households WHERE id = $1', [householdId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [
      adminUserId,
      parentUserId,
      outsiderUserId,
    ]);
    await pool.end();
    await app.close();
  });

  describe('POST /api/households/:householdId/children', () => {
    test('should create a child (admin)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { name: 'Test Child Admin', birthYear: 2015 },
      });

      assert.strictEqual(response.statusCode, 201);
      const body = JSON.parse(response.body);
      assert.ok(body.id);
      assert.strictEqual(body.name, 'Test Child Admin');
    });

    test('should create a child (parent)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${parentToken}` },
        payload: { name: 'Test Child Parent', birthYear: 2018 },
      });
      assert.strictEqual(response.statusCode, 201);
    });

    test('should reject by non-member', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
        payload: { name: 'Unauthorized Child', birthYear: 2020 },
      });
      assert.strictEqual(response.statusCode, 403);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/children`,
        payload: { name: 'Unauthenticated Child', birthYear: 2015 },
      });
      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('GET /api/households/:householdId/children', () => {
    before(async () => {
      await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { name: 'List Child 1', birthYear: 2012 },
      });
    });

    test('should list household children', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(body.children, 'Response should have children property');
      assert.ok(Array.isArray(body.children), 'children should be an array');
      assert.ok(body.children.length >= 1, 'Should have at least one child');
    });

    test('should reject by non-member', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });
      assert.strictEqual(response.statusCode, 403);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/children`,
      });
      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('PUT /api/households/:householdId/children/:id', () => {
    let childId: string;

    before(async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { name: 'Update Test Child', birthYear: 2014 },
      });
      childId = JSON.parse(response.body).id;
    });

    test('should update child (admin)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${householdId}/children/${childId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { name: 'Updated Child Name', birthYear: 2015 },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.name, 'Updated Child Name');
    });

    test('should reject by non-member', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${householdId}/children/${childId}`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
        payload: { name: 'Unauthorized Update', birthYear: 2015 },
      });
      assert.strictEqual(response.statusCode, 403);
    });

    test('should return 404 for non-existent child', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${householdId}/children/00000000-0000-0000-0000-000000000000`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { name: 'Non-existent Child', birthYear: 2015 },
      });
      assert.strictEqual(response.statusCode, 404);
    });

    test('should update only name without corrupting birthYear (partial update)', async () => {
      // Create child with both name and birthYear
      const createResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { name: 'Partial Update Test', birthYear: 2016 },
      });
      assert.strictEqual(createResponse.statusCode, 201);
      const createdChild = JSON.parse(createResponse.body);
      assert.strictEqual(createdChild.birthYear, 2016);

      // Update only name - birthYear should be preserved
      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/households/${householdId}/children/${createdChild.id}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { name: 'New Name Only' },
      });
      assert.strictEqual(updateResponse.statusCode, 200);
      const updatedChild = JSON.parse(updateResponse.body);
      assert.strictEqual(updatedChild.name, 'New Name Only');
      assert.strictEqual(
        updatedChild.birthYear,
        2016,
        'birthYear should be preserved on partial update',
      );
    });

    test('should update only birthYear without corrupting name (partial update)', async () => {
      // Create child with both name and birthYear
      const createResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { name: 'Another Partial Test', birthYear: 2017 },
      });
      assert.strictEqual(createResponse.statusCode, 201);
      const createdChild = JSON.parse(createResponse.body);

      // Update only birthYear - name should be preserved
      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/households/${householdId}/children/${createdChild.id}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { birthYear: 2018 },
      });
      assert.strictEqual(updateResponse.statusCode, 200);
      const updatedChild = JSON.parse(updateResponse.body);
      assert.strictEqual(
        updatedChild.name,
        'Another Partial Test',
        'name should be preserved on partial update',
      );
      assert.strictEqual(updatedChild.birthYear, 2018);
    });

    test('should handle empty update without corrupting data', async () => {
      // Create child with both fields
      const createResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { name: 'Empty Update Test', birthYear: 2019 },
      });
      assert.strictEqual(createResponse.statusCode, 201);
      const createdChild = JSON.parse(createResponse.body);

      // Empty update - all fields should be preserved
      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/households/${householdId}/children/${createdChild.id}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {},
      });
      assert.strictEqual(updateResponse.statusCode, 200);
      const updatedChild = JSON.parse(updateResponse.body);
      assert.strictEqual(
        updatedChild.name,
        'Empty Update Test',
        'name should be preserved on empty update',
      );
      assert.strictEqual(
        updatedChild.birthYear,
        2019,
        'birthYear should be preserved on empty update',
      );
    });
  });

  describe('DELETE /api/households/:householdId/children/:id', () => {
    let deleteChildId: string;

    before(async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { name: 'Delete Test Child', birthYear: 2017 },
      });
      deleteChildId = JSON.parse(response.body).id;
    });

    test('should delete child (admin)', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${householdId}/children/${deleteChildId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.message, 'Child removed successfully');
    });

    test('should return 404 for non-existent child', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${householdId}/children/00000000-0000-0000-0000-000000000000`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(response.statusCode, 404);
    });
  });
});
