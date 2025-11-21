import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../server.js';
import EvaluationTemplate from '../models/EvaluationTemplate.js';
import StudentEvaluation from '../models/StudentEvaluation.js';
import Student from '../models/Student.js';
import Company from '../models/Company.js';
import User from '../models/User.js';

// Test data
let adminToken;
let companyToken;
let adminUser;
let companyUser;
let testStudent;
let testCompany;
let testTemplate;

describe('Evaluation API Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test-internship');
    }
  });

  beforeEach(async () => {
    // Clean up
    await EvaluationTemplate.deleteMany({});
    await StudentEvaluation.deleteMany({});
    await User.deleteMany({ email: { $in: ['testadmin@test.com', 'testcompany@test.com'] } });
    await Student.deleteMany({ email: 'teststudent@test.com' });
    await Company.deleteMany({ email: 'testcompany@test.com' });

    // Create admin user
    adminUser = await User.create({
      email: 'testadmin@test.com',
      password: 'hashedpassword',
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
    });

    // Create company user
    companyUser = await User.create({
      email: 'testcompany@test.com',
      password: 'hashedpassword',
      role: 'company',
      firstName: 'Company',
      lastName: 'Rep',
    });

    // Create company
    testCompany = await Company.create({
      userId: companyUser._id,
      companyName: 'Test Company',
      email: 'testcompany@test.com',
      firstName: 'Company',
      lastName: 'Rep',
    });

    // Create student
    testStudent = await Student.create({
      userId: new mongoose.Types.ObjectId(),
      firstName: 'John',
      lastName: 'Doe',
      studentId: 'STU001',
      email: 'teststudent@test.com',
      program: 'BSIS',
    });

    // Get tokens (simplified - in real app, use actual JWT)
    adminToken = 'mock-admin-token';
    companyToken = 'mock-company-token';
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /admin/evaluation-templates', () => {
    it('should create a new evaluation template', async () => {
      const templateData = {
        name: 'Test Evaluation Template',
        course: 'BSIS',
        description: 'Test description',
        sections: [
          {
            label: 'A',
            title: 'Knowledge',
            description: 'Knowledge section',
            questions: [
              {
                prompt: 'Test question 1',
                description: 'Question description',
              },
            ],
          },
        ],
        ratingScale: {
          min: 1,
          max: 5,
          labels: ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'],
        },
      };

      const response = await request(app)
        .post('/api/admin/evaluation-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(templateData.name);
      expect(response.body.data.sections).toHaveLength(1);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/admin/evaluation-templates')
        .send({ name: 'Test' })
        .expect(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/admin/evaluation-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /admin/evaluation-templates', () => {
    it('should retrieve all evaluation templates', async () => {
      // Create a template first
      testTemplate = await EvaluationTemplate.create({
        name: 'Test Template',
        course: 'BSIS',
        sections: [
          {
            label: 'A',
            title: 'Knowledge',
            questions: [{ prompt: 'Question 1' }],
          },
        ],
        createdBy: adminUser._id,
      });

      const response = await request(app)
        .get('/api/admin/evaluation-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('POST /admin/assign-evaluations', () => {
    it('should assign evaluations to students', async () => {
      // Create template first
      testTemplate = await EvaluationTemplate.create({
        name: 'Test Template',
        course: 'BSIS',
        sections: [
          {
            label: 'A',
            title: 'Knowledge',
            questions: [{ prompt: 'Question 1' }],
          },
        ],
        createdBy: adminUser._id,
      });

      const assignmentData = {
        templateId: testTemplate._id.toString(),
        companyId: testCompany._id.toString(),
        studentIds: [testStudent._id.toString()],
        trainingPeriod: {
          from: '2024-01-01',
          to: '2024-03-31',
        },
        internshipAssignment: 'Software Developer Intern',
      };

      const response = await request(app)
        .post('/api/admin/assign-evaluations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignmentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toBeGreaterThan(0);
    });

    it('should require valid template and company', async () => {
      const response = await request(app)
        .post('/api/admin/assign-evaluations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          templateId: new mongoose.Types.ObjectId().toString(),
          companyId: new mongoose.Types.ObjectId().toString(),
        })
        .expect(404);
    });
  });

  describe('GET /companies/evaluations', () => {
    it('should retrieve evaluations for a company', async () => {
      // Create template and evaluation
      testTemplate = await EvaluationTemplate.create({
        name: 'Test Template',
        course: 'BSIS',
        sections: [
          {
            label: 'A',
            title: 'Knowledge',
            questions: [{ prompt: 'Question 1' }],
          },
        ],
        createdBy: adminUser._id,
      });

      await StudentEvaluation.create({
        template: testTemplate._id,
        templateSnapshot: {
          name: testTemplate.name,
          sections: testTemplate.sections,
          ratingScale: testTemplate.ratingScale,
        },
        student: testStudent._id,
        company: testCompany._id,
        studentInfo: {
          fullName: 'John Doe',
          program: 'BSIS',
        },
        companyInfo: {
          name: testCompany.companyName,
        },
        status: 'pending',
        sections: testTemplate.sections.map((s) => ({
          ...s,
          questions: s.questions.map((q) => ({
            ...q,
            rating: null,
            comments: '',
          })),
        })),
      });

      const response = await request(app)
        .get('/api/companies/evaluations')
        .set('Authorization', `Bearer ${companyToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('PUT /companies/evaluations/:evaluationId', () => {
    it('should update an evaluation with ratings', async () => {
      // Create template and evaluation
      testTemplate = await EvaluationTemplate.create({
        name: 'Test Template',
        course: 'BSIS',
        sections: [
          {
            label: 'A',
            title: 'Knowledge',
            questions: [{ prompt: 'Question 1' }],
          },
        ],
        createdBy: adminUser._id,
      });

      const evaluation = await StudentEvaluation.create({
        template: testTemplate._id,
        templateSnapshot: {
          name: testTemplate.name,
          sections: testTemplate.sections,
          ratingScale: testTemplate.ratingScale,
        },
        student: testStudent._id,
        company: testCompany._id,
        studentInfo: {
          fullName: 'John Doe',
          program: 'BSIS',
        },
        companyInfo: {
          name: testCompany.companyName,
        },
        status: 'pending',
        sections: testTemplate.sections.map((s) => ({
          ...s,
          questions: s.questions.map((q) => ({
            ...q,
            rating: null,
            comments: '',
          })),
        })),
      });

      const updateData = {
        sections: [
          {
            label: 'A',
            title: 'Knowledge',
            questions: [
              {
                prompt: 'Question 1',
                rating: 5,
                comments: 'Excellent performance',
              },
            ],
          },
        ],
        overallComments: 'Great intern!',
        submit: true,
      };

      const response = await request(app)
        .put(`/api/companies/evaluations/${evaluation._id}`)
        .set('Authorization', `Bearer ${companyToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('submitted');
      expect(response.body.data.sections[0].questions[0].rating).toBe(5);
    });
  });
});


