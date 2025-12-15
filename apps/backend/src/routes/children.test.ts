import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { build } from '../server.ts';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';

/**
 * Children Management API Tests
 *
 * Tests the children CRUD endpoints including:
 * - Creating children
 * - Listing household children
 * - Updating children
 * - Deleting children
 * - Authorization and data isolation
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
    // Build Fastify app
    app = await build();
    await app.ready();

    // Get database pool
    pool = new pg.Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'st44',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    // Create test users
    const adminEmail = `test-children-admin-${Date.now()}@example.com`;
    const parentEmail = `test-children-parent-${Date.now()}@example.com`;
    const outsiderEmail = `test-children-outsider-${Date.now()}@example.com`;

    const adminResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: adminEmail, password: 'TestPass123!' },
    });

    const parentResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: parentEmail, password: 'TestPass123!' },
    });

    const outsiderResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: outsiderEmail, password: 'TestPass123!' },
    });

    const adminData = JSON.parse(adminResponse.body);
    const parentData = JSON.parse(parentResponse.body);
    const outsiderData = JSON.parse(outsiderResponse.body);

    adminToken = adminData.accessToken;
    parentToken = parentData.accessToken;
    outsiderToken = outsiderData.accessToken;

    // Get user IDs
    const adminResult = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    const parentResult = await pool.query('SELECT id FROM users WHERE email = $1', [parentEmail]);
    const outsiderResult = await pool.query('SELECT id FROM users WHERE email = $1', [
      outsiderEmail,
    ]);

    adminUserId = adminResult.rows[0].id;
    parentUserId = parentResult.rows[0].id;
    outsiderUserId = outsiderResult.rows[0].id;

    // Create household (admin is creator)
    const householdResponse = await app.inject({
      method: 'POST',
      url: '/api/households',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { name: `Children Test Household ${Date.now()}` },
    });

    const householdData = JSON.parse(householdResponse.body);
    householdId = householdData.id;

    // Add parent to household
    await pool.query(
      `INSERT INTO household_members (household_id, user_id, role)
       VALUES ($1, $2, 'parent')`,
      [householdId, parentUserId],
    );
  });

  after(async () => {
    // Cleanup: Delete children, households, and users
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
        payload: {
          name: 'Test Child Admin',
          birthYear: 2015,
        },
      });

      assert.strictEqual(response.statusCode, 201);

      const body = JSON.parse(response.body);
      assert.ok(body.id);
      assert.strictEqual(body.name, 'Test Child Admin');
      assert.strictEqual(body.birthYear, 2015);
      assert.strictEqual(body.householdId, householdId);
    });

    test('should create a child (parent)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${parentToken}` },
        payload: {
          name: 'Test Child Parent',
          birthYear: 2018,
        },
      });

      assert.strictEqual(response.statusCode, 201);

      const body = JSON.parse(response.body);
      assert.ok(body.id);
      assert.strictEqual(body.name, 'Test Child Parent');
      assert.strictEqual(body.birthYear, 2018);
    });

    test('should reject child creation by non-member', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
        payload: {
          name: 'Unauthorized Child',
          birthYear: 2020,
        },
      });

      assert.strictEqual(response.statusCode, 403);
    });

    test('should reject child with invalid name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'A',
          birthYear: 2015,
        },
      });

      assert.strictEqual(response.statusCode, 400);
    });

    test('should reject child with invalid birth year', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Invalid Year Child',
          birthYear: 1999,
        },
      });

      assert.strictEqual(response.statusCode, 400);
    });

    test('should reject child with future birth year', async () => {
      const futureYear = new Date().getFullYear() + 1;

      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Future Child',
          birthYear: futureYear,
        },
      });

      assert.strictEqual(response.statusCode, 400);
    });

    test('should reject without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/children`,
        payload: {
          name: 'Unauthenticated Child',
          birthYear: 2015,
        },
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('GET /api/households/:householdId/children', () => {
    let childId1: string;
    let childId2: string;

    before(async () => {
      // Create two children
      const response1 = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { name: 'List Child 1', birthYear: 2012 },
      });

      const response2 = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { name: 'List Child 2', birthYear: 2016 },
      });

      childId1 = JSON.parse(response1.body).id;
      childId2 = JSON.parse(response2.body).id;
    });

    test('should list household children (admin)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.children));
      assert.ok(body.children.length >= 2);

      const child1 = body.children.find((c: { id: string }) => c.id === childId1);
      const child2 = body.children.find((c: { id: string }) => c.id === childId2);

      assert.ok(child1);
      assert.strictEqual(child1.name, 'List Child 1');
      assert.strictEqual(child1.birthYear, 2012);

      assert.ok(child2);
      assert.strictEqual(child2.name, 'List Child 2');
      assert.strictEqual(child2.birthYear, 2016);
    });

    test('should list household children (parent)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.ok(Array.isArray(body.children));
      assert.ok(body.children.length >= 2);
    });

    test('should reject listing by non-member', async () => {
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
        payload: {
          name: 'Updated Child Name',
          birthYear: 2015,
        },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.strictEqual(body.name, 'Updated Child Name');
      assert.strictEqual(body.birthYear, 2015);
      assert.ok(body.updatedAt);
    });

    test('should update child (parent)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${householdId}/children/${childId}`,
        headers: { Authorization: `Bearer ${parentToken}` },
        payload: {
          name: 'Parent Updated Name',
          birthYear: 2015,
        },
      });

      assert.strictEqual(response.statusCode, 200);

      const body = JSON.parse(response.body);
      assert.strictEqual(body.name, 'Parent Updated Name');
    });

    test('should reject update by non-member', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${householdId}/children/${childId}`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
        payload: {
          name: 'Unauthorized Update',
          birthYear: 2015,
        },
      });

      assert.strictEqual(response.statusCode, 403);
    });

    test('should reject invalid name', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${householdId}/children/${childId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'X',
          birthYear: 2015,
        },
      });

      assert.strictEqual(response.statusCode, 400);
    });

    test('should return 404 for non-existent child', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${householdId}/children/00000000-0000-0000-0000-000000000000`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Non-existent Child',
          birthYear: 2015,
        },
      });

      assert.strictEqual(response.statusCode, 404);
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
      assert.strictEqual(body.message, 'Child deleted successfully');

      // Verify child is deleted
      const verifyResponse = await app.inject({
        method: 'GET',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const children = JSON.parse(verifyResponse.body).children;
      const deletedChild = children.find((c: { id: string }) => c.id === deleteChildId);
      assert.strictEqual(deletedChild, undefined);
    });

    test('should allow parent to delete child', async () => {
      // Create another child
      const createResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { name: 'Parent Delete Child', birthYear: 2019 },
      });

      const childId = JSON.parse(createResponse.body).id;

      // Delete by parent
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${householdId}/children/${childId}`,
        headers: { Authorization: `Bearer ${parentToken}` },
      });

      assert.strictEqual(response.statusCode, 200);
    });

    test('should reject delete by non-member', async () => {
      // Create another child
      const createResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${householdId}/children`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { name: 'Unauthorized Delete Child', birthYear: 2020 },
      });

      const childId = JSON.parse(createResponse.body).id;

      // Try to delete by outsider
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${householdId}/children/${childId}`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });

      assert.strictEqual(response.statusCode, 403);
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

  describe('Data Isolation', () => {
    let household2Id: string;
    let household2ChildId: string;

    before(async () => {
      // Create second household for outsider user
      const household2Response = await app.inject({
        method: 'POST',
        url: '/api/households',
        headers: { Authorization: `Bearer ${outsiderToken}` },
        payload: { name: `Isolation Test Household ${Date.now()}` },
      });

      household2Id = JSON.parse(household2Response.body).id;

      // Create child in household2
      const childResponse = await app.inject({
        method: 'POST',
        url: `/api/households/${household2Id}/children`,
        headers: { Authorization: `Bearer ${outsiderToken}` },
        payload: { name: 'Isolated Child', birthYear: 2018 },
      });

      household2ChildId = JSON.parse(childResponse.body).id;
    });

    test('should prevent access to children from other households', async () => {
      // Admin from household1 tries to access children from household2
      const response = await app.inject({
        method: 'GET',
        url: `/api/households/${household2Id}/children`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 403);
    });

    test('should prevent updating children from other households', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/households/${household2Id}/children/${household2ChildId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Cross-household Update',
          birthYear: 2018,
        },
      });

      assert.strictEqual(response.statusCode, 403);
    });

    test('should prevent deleting children from other households', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/households/${household2Id}/children/${household2ChildId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(response.statusCode, 403);
    });
  });

  after(async () => {
    // Cleanup test data
    if (householdId) {
      await pool.query('DELETE FROM children WHERE household_id = $1', [householdId]);
      await pool.query('DELETE FROM household_members WHERE household_id = $1', [householdId]);
      await pool.query('DELETE FROM households WHERE id = $1', [householdId]);
    }
    await pool.query("DELETE FROM users WHERE email LIKE 'children-test%@example.com'");
    await pool.end();
    await app.close();
  });
});
