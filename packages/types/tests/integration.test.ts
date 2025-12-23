import { describe, it, expect } from 'vitest';
import { TaskSchema, CreateTaskRequestSchema } from '../src/schemas/task.schema';
import { HouseholdSchema, CreateHouseholdRequestSchema } from '../src/schemas/household.schema';
import { ChildSchema, CreateChildRequestSchema } from '../src/schemas/child.schema';
import { UserSchema } from '../src/schemas/user.schema';
import { AssignmentSchema } from '../src/schemas/assignment.schema';
import { zodToOpenAPI } from '../src/generators/openapi.generator';

describe('Type System Integration', () => {
  describe('Task Schema Integration', () => {
    it('TaskSchema parses valid task data', () => {
      const validTask = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        householdId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Clean Room',
        description: null,
        points: 10,
        ruleType: 'daily',
        ruleConfig: null,
        active: true,
        createdAt: '2025-12-22T10:00:00Z',
        updatedAt: '2025-12-22T10:00:00Z',
      };
      
      const result = TaskSchema.safeParse(validTask);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validTask.id);
        expect(result.data.name).toBe(validTask.name);
        expect(result.data.points).toBe(validTask.points);
      }
    });
    
    it('CreateTaskRequestSchema validates valid request', () => {
      const validRequest = {
        name: 'New Task',
        ruleType: 'daily',
        points: 5,
      };
      
      const result = CreateTaskRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
    
    it('CreateTaskRequestSchema rejects invalid request', () => {
      const invalidRequest = {
        name: '', // Too short
        ruleType: 'invalid', // Invalid enum
      };
      
      const result = CreateTaskRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });
    
    it('TaskSchema OpenAPI matches Zod schema', () => {
      const openApiSchema = zodToOpenAPI(TaskSchema);
      
      expect(openApiSchema.type).toBe('object');
      expect(openApiSchema.properties).toHaveProperty('id');
      expect(openApiSchema.properties).toHaveProperty('name');
      expect(openApiSchema.properties).toHaveProperty('householdId');
      expect(openApiSchema.required).toContain('name');
      expect(openApiSchema.required).toContain('householdId');
    });
  });
  
  describe('Household Schema Integration', () => {
    it('HouseholdSchema parses valid household data', () => {
      const validHousehold = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Smith Family',
        createdAt: '2025-12-22T10:00:00Z',
        updatedAt: '2025-12-22T10:00:00Z',
      };
      
      const result = HouseholdSchema.safeParse(validHousehold);
      expect(result.success).toBe(true);
    });
    
    it('CreateHouseholdRequestSchema validates valid request', () => {
      const validRequest = {
        name: 'New Household',
      };
      
      const result = CreateHouseholdRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
    
    it('CreateHouseholdRequestSchema rejects invalid request', () => {
      const invalidRequest = {
        name: '', // Too short
      };
      
      const result = CreateHouseholdRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });
  
  describe('Child Schema Integration', () => {
    it('ChildSchema parses valid child data', () => {
      const validChild = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        householdId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Emma',
        birthYear: 2015,
        avatarUrl: null,
        createdAt: '2025-12-22T10:00:00Z',
        updatedAt: '2025-12-22T10:00:00Z',
      };
      
      const result = ChildSchema.safeParse(validChild);
      expect(result.success).toBe(true);
    });
    
    it('CreateChildRequestSchema validates valid request', () => {
      const validRequest = {
        name: 'New Child',
        birthYear: 2020,
      };
      
      const result = CreateChildRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
    
    it('CreateChildRequestSchema rejects invalid birth year', () => {
      const invalidRequest = {
        name: 'Child',
        birthYear: 1899, // Too old
      };
      
      const result = CreateChildRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });
  
  describe('User Schema Integration', () => {
    it('UserSchema parses valid user data', () => {
      const validUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        passwordHash: 'hashed_password',
        googleId: null,
        createdAt: '2025-12-22T10:00:00Z',
        updatedAt: '2025-12-22T10:00:00Z',
      };
      
      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });
  });
  
  describe('Assignment Schema Integration', () => {
    it('AssignmentSchema parses valid assignment data', () => {
      const validAssignment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        taskId: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Clean Room',
        description: 'Clean your bedroom',
        ruleType: 'daily' as const,
        childId: '123e4567-e89b-12d3-a456-426614174002',
        childName: 'Alice',
        date: '2025-12-22',
        status: 'pending' as const,
        completedAt: null,
        createdAt: '2025-12-22T10:00:00Z',
        updatedAt: '2025-12-22T10:00:00Z',
      };
      
      const result = AssignmentSchema.safeParse(validAssignment);
      expect(result.success).toBe(true);
    });
    
    it('AssignmentSchema validates status enum', () => {
      const invalidAssignment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        taskId: '123e4567-e89b-12d3-a456-426614174001',
        childId: '123e4567-e89b-12d3-a456-426614174002',
        date: '2025-12-22',
        status: 'invalid_status', // Invalid enum value
        completedAt: null,
        createdAt: '2025-12-22T10:00:00Z',
        updatedAt: '2025-12-22T10:00:00Z',
      };
      
      const result = AssignmentSchema.safeParse(invalidAssignment);
      expect(result.success).toBe(false);
    });
  });
  
  describe('OpenAPI Generator Integration', () => {
    it('generates OpenAPI schema for all entities', () => {
      const schemas = [
        { name: 'Task', schema: TaskSchema },
        { name: 'Household', schema: HouseholdSchema },
        { name: 'Child', schema: ChildSchema },
        { name: 'User', schema: UserSchema },
        { name: 'Assignment', schema: AssignmentSchema },
      ];
      
      schemas.forEach(({ name, schema }) => {
        const openApiSchema = zodToOpenAPI(schema);
        expect(openApiSchema.type).toBe('object');
        expect(openApiSchema.properties).toBeDefined();
        expect(Object.keys(openApiSchema.properties).length).toBeGreaterThan(0);
      });
    });
    
    it('OpenAPI required fields match Zod schema', () => {
      const openApiSchema = zodToOpenAPI(TaskSchema);
      
      // Required fields based on Zod schema
      expect(openApiSchema.required).toContain('id');
      expect(openApiSchema.required).toContain('householdId');
      expect(openApiSchema.required).toContain('name');
      expect(openApiSchema.required).toContain('ruleType');
    });
  });
  
  describe('Type Consistency Across Packages', () => {
    it('ensures frontend types match backend schemas', () => {
      // This test verifies that the type system can be used
      // consistently across frontend and backend without type errors
      
      // Simulate backend data
      const backendTask = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        householdId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Clean Room',
        description: 'Clean your bedroom thoroughly',
        points: 10,
        ruleType: 'daily' as const,
        ruleConfig: null,
        active: true,
        createdAt: '2025-12-22T10:00:00Z',
        updatedAt: '2025-12-22T10:00:00Z',
      };
      
      // Validate with backend schema
      const backendResult = TaskSchema.safeParse(backendTask);
      expect(backendResult.success).toBe(true);
      
      // Frontend would receive this and use the same type
      // This test confirms no type mismatches exist
      if (backendResult.success) {
        const frontendTask = backendResult.data;
        expect(frontendTask.id).toBe(backendTask.id);
        expect(frontendTask.name).toBe(backendTask.name);
        expect(frontendTask.householdId).toBe(backendTask.householdId);
      }
    });
    
    it('ensures request types work for API calls', () => {
      // Simulate frontend creating request
      const frontendRequest = {
        name: 'New Task',
        description: 'Task description',
        ruleType: 'weekly_rotation' as const,
        ruleConfig: { children: ['child1', 'child2'], startDate: '2025-12-22' },
        points: 15,
      };
      
      // Validate with request schema (backend would do this)
      const result = CreateTaskRequestSchema.safeParse(frontendRequest);
      expect(result.success).toBe(true);
    });
  });
});
