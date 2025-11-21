import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import EvaluationTemplate from '../models/EvaluationTemplate.js';
import StudentEvaluation from '../models/StudentEvaluation.js';
import Student from '../models/Student.js';
import Company from '../models/Company.js';
import User from '../models/User.js';

// Mock data
const mockAdmin = {
  _id: new mongoose.Types.ObjectId(),
  email: 'admin@test.com',
  role: 'admin',
};

const mockTemplate = {
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
  createdBy: mockAdmin._id,
};

const mockStudent = {
  _id: new mongoose.Types.ObjectId(),
  firstName: 'John',
  lastName: 'Doe',
  studentId: 'STU001',
  email: 'john@test.com',
  program: 'BSIS',
};

const mockCompany = {
  _id: new mongoose.Types.ObjectId(),
  companyName: 'Test Company',
  email: 'company@test.com',
  firstName: 'Company',
  lastName: 'Rep',
};

describe('Evaluation System Tests', () => {
  beforeEach(async () => {
    // Clean up before each test
    await EvaluationTemplate.deleteMany({});
    await StudentEvaluation.deleteMany({});
  });

  describe('EvaluationTemplate Model', () => {
    it('should create a new evaluation template', async () => {
      const template = await EvaluationTemplate.create(mockTemplate);
      
      expect(template).toBeDefined();
      expect(template.name).toBe(mockTemplate.name);
      expect(template.sections).toHaveLength(1);
      expect(template.sections[0].questions).toHaveLength(1);
    });

    it('should require name field', async () => {
      const invalidTemplate = { ...mockTemplate };
      delete invalidTemplate.name;

      await expect(EvaluationTemplate.create(invalidTemplate)).rejects.toThrow();
    });

    it('should require createdBy field', async () => {
      const invalidTemplate = { ...mockTemplate };
      delete invalidTemplate.createdBy;

      await expect(EvaluationTemplate.create(invalidTemplate)).rejects.toThrow();
    });

    it('should allow multiple sections', async () => {
      const templateWithMultipleSections = {
        ...mockTemplate,
        sections: [
          {
            label: 'A',
            title: 'Section A',
            questions: [{ prompt: 'Question A1' }],
          },
          {
            label: 'B',
            title: 'Section B',
            questions: [{ prompt: 'Question B1' }],
          },
        ],
      };

      const template = await EvaluationTemplate.create(templateWithMultipleSections);
      expect(template.sections).toHaveLength(2);
    });
  });

  describe('StudentEvaluation Model', () => {
    it('should create a student evaluation', async () => {
      const template = await EvaluationTemplate.create(mockTemplate);
      
      const evaluation = await StudentEvaluation.create({
        template: template._id,
        templateSnapshot: {
          name: template.name,
          sections: template.sections,
          ratingScale: template.ratingScale,
        },
        student: mockStudent._id,
        company: mockCompany._id,
        studentInfo: {
          fullName: `${mockStudent.firstName} ${mockStudent.lastName}`,
          program: mockStudent.program,
          course: mockStudent.program,
          studentNumber: mockStudent.studentId,
          email: mockStudent.email,
        },
        companyInfo: {
          name: mockCompany.companyName,
          representative: `${mockCompany.firstName} ${mockCompany.lastName}`,
          email: mockCompany.email,
        },
        trainingPeriod: {
          from: new Date('2024-01-01'),
          to: new Date('2024-03-31'),
        },
        status: 'pending',
        sections: [
          {
            label: 'A',
            title: 'Knowledge',
            description: 'Knowledge section',
            questions: [
              {
                prompt: 'Test question 1',
                description: 'Question description',
                rating: null,
                comments: '',
              },
            ],
          },
        ],
      });

      expect(evaluation).toBeDefined();
      expect(evaluation.status).toBe('pending');
      expect(evaluation.sections).toHaveLength(1);
    });

    it('should require template field', async () => {
      const invalidEvaluation = {
        student: mockStudent._id,
        company: mockCompany._id,
      };

      await expect(StudentEvaluation.create(invalidEvaluation)).rejects.toThrow();
    });

    it('should allow updating evaluation with ratings', async () => {
      const template = await EvaluationTemplate.create(mockTemplate);
      const evaluation = await StudentEvaluation.create({
        template: template._id,
        templateSnapshot: {
          name: template.name,
          sections: template.sections,
          ratingScale: template.ratingScale,
        },
        student: mockStudent._id,
        company: mockCompany._id,
        studentInfo: {
          fullName: `${mockStudent.firstName} ${mockStudent.lastName}`,
          program: mockStudent.program,
        },
        companyInfo: {
          name: mockCompany.companyName,
        },
        status: 'pending',
        sections: [
          {
            label: 'A',
            title: 'Knowledge',
            questions: [
              {
                prompt: 'Test question 1',
                rating: null,
                comments: '',
              },
            ],
          },
        ],
      });

      // Update with rating
      evaluation.sections[0].questions[0].rating = 5;
      evaluation.sections[0].questions[0].comments = 'Excellent performance';
      evaluation.status = 'submitted';
      evaluation.submittedAt = new Date();

      await evaluation.save();

      const updated = await StudentEvaluation.findById(evaluation._id);
      expect(updated.sections[0].questions[0].rating).toBe(5);
      expect(updated.status).toBe('submitted');
      expect(updated.submittedAt).toBeDefined();
    });
  });

  describe('Evaluation Template CRUD Operations', () => {
    it('should retrieve all templates', async () => {
      await EvaluationTemplate.create(mockTemplate);
      await EvaluationTemplate.create({ ...mockTemplate, name: 'Template 2' });

      const templates = await EvaluationTemplate.find({});
      expect(templates).toHaveLength(2);
    });

    it('should update a template', async () => {
      const template = await EvaluationTemplate.create(mockTemplate);
      
      template.name = 'Updated Template Name';
      await template.save();

      const updated = await EvaluationTemplate.findById(template._id);
      expect(updated.name).toBe('Updated Template Name');
    });

    it('should delete a template', async () => {
      const template = await EvaluationTemplate.create(mockTemplate);
      const templateId = template._id;

      await EvaluationTemplate.findByIdAndDelete(templateId);

      const deleted = await EvaluationTemplate.findById(templateId);
      expect(deleted).toBeNull();
    });
  });
});

