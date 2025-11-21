import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import EvaluationTemplate from '../models/EvaluationTemplate.js';
import StudentEvaluation from '../models/StudentEvaluation.js';
import Student from '../models/Student.js';
import Company from '../models/Company.js';
import User from '../models/User.js';
import {
  createEvaluationTemplate,
  getEvaluationTemplates,
  assignStudentEvaluations,
} from '../controllers/adminController.js';

// Mock request/response objects
const createMockReq = (body = {}, user = { id: new mongoose.Types.ObjectId() }) => ({
  body,
  user,
  params: {},
});

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Evaluation Controller Tests', () => {
  let adminUser;
  let testStudent;
  let testCompany;
  let testTemplate;

  beforeEach(async () => {
    // Clean up
    await EvaluationTemplate.deleteMany({});
    await StudentEvaluation.deleteMany({});
    await User.deleteMany({ email: 'testadmin@test.com' });
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

    // Create company
    testCompany = await Company.create({
      userId: new mongoose.Types.ObjectId(),
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
  });

  describe('createEvaluationTemplate', () => {
    it('should create a new evaluation template', async () => {
      const req = createMockReq({
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
      }, { id: adminUser._id });

      const res = createMockRes();

      await createEvaluationTemplate(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.name).toBe('Test Evaluation Template');
    });

    it('should handle missing required fields', async () => {
      const req = createMockReq({
        course: 'BSIS',
        // Missing name
      }, { id: adminUser._id });

      const res = createMockRes();

      await createEvaluationTemplate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getEvaluationTemplates', () => {
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

      const req = createMockReq();
      const res = createMockRes();

      await getEvaluationTemplates(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBeInstanceOf(Array);
      expect(responseData.data.length).toBeGreaterThan(0);
    });
  });

  describe('assignStudentEvaluations', () => {
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

      const req = createMockReq({
        templateId: testTemplate._id.toString(),
        companyId: testCompany._id.toString(),
        studentIds: [testStudent._id.toString()],
        trainingPeriod: {
          from: '2024-01-01',
          to: '2024-03-31',
        },
        internshipAssignment: 'Software Developer Intern',
      }, { id: adminUser._id });

      const res = createMockRes();

      await assignStudentEvaluations(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.created).toBeGreaterThan(0);

      // Verify evaluation was created
      const evaluation = await StudentEvaluation.findOne({
        student: testStudent._id,
        company: testCompany._id,
      });
      expect(evaluation).toBeDefined();
      expect(evaluation.status).toBe('pending');
    });

    it('should handle invalid template ID', async () => {
      const req = createMockReq({
        templateId: new mongoose.Types.ObjectId().toString(),
        companyId: testCompany._id.toString(),
        studentIds: [testStudent._id.toString()],
      }, { id: adminUser._id });

      const res = createMockRes();

      await assignStudentEvaluations(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});

