import request from 'supertest'
import express from 'express'
import mongoose from 'mongoose'
import claimsRouter from '../claims'
import Claim from '../../models/Claim'
import Project from '../../models/Project'
import Evidence from '../../models/Evidence'
import { authenticate } from '../../middleware/auth'
import redisManager from '../../config/redis'
import axios from 'axios'

// Mock external dependencies
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

jest.mock('../../config/redis')
const mockedRedis = redisManager as jest.Mocked<typeof redisManager>

jest.mock('../../middleware/auth')
const mockedAuth = authenticate as jest.MockedFunction<typeof authenticate>

// Mock models
jest.mock('../../models/Claim')
jest.mock('../../models/Project')
jest.mock('../../models/Evidence')

const MockedClaim = Claim as jest.Mocked<typeof Claim>
const MockedProject = Project as jest.Mocked<typeof Project>
const MockedEvidence = Evidence as jest.Mocked<typeof Evidence>

describe('Claims Routes - Unit Tests', () => {
  let app: express.Application
  let mockUser: any
  let mockProject: any
  let mockClaim: any

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api/claims', claimsRouter)

    // Mock user object
    mockUser = {
      _id: new mongoose.Types.ObjectId(),
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      updateOne: jest.fn(),
    }

    // Mock project object
    mockProject = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Test Project',
      owner: mockUser._id,
      collaborators: [],
      visibility: 'private',
      settings: {
        collaboration: { allowComments: true },
        reasoning: { enableAIGeneration: false },
      },
    }

    // Mock claim object
    mockClaim = {
      _id: new mongoose.Types.ObjectId(),
      text: 'Test claim',
      type: 'claim',
      creator: mockUser._id,
      project: mockProject._id,
      evidence: [],
      relatedClaims: [],
      comments: [],
      versions: [],
      isActive: true,
      status: 'active',
      confidence: 0.8,
      tags: ['test'],
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn().mockResolvedValue(undefined),
      populate: jest.fn().mockReturnThis(),
    }

    // Mock authentication middleware
    mockedAuth.mockImplementation((req: any, res: any, next: any) => {
      req.user = mockUser
      next()
    })

    // Reset all mocks
    jest.clearAllMocks()
  })

  describe('GET /api/claims', () => {
    it('should return claims with pagination', async () => {
      // Mock database queries
      MockedProject.find.mockResolvedValue([mockProject])
      MockedClaim.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue([mockClaim]),
                }),
              }),
            }),
          }),
        }),
      } as any)
      MockedClaim.countDocuments.mockResolvedValue(1)

      // Mock Redis cache miss
      mockedRedis.get.mockResolvedValue(null)
      mockedRedis.set.mockResolvedValue('OK')

      const response = await request(app).get('/api/claims')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual([mockClaim])
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      })
    })

    it('should return cached results when available', async () => {
      const cachedData = {
        claims: [mockClaim],
        pagination: { page: 1, limit: 20, total: 1 },
      }

      mockedRedis.get.mockResolvedValue(cachedData)

      const response = await request(app).get('/api/claims')

      expect(response.status).toBe(200)
      expect(response.body.cached).toBe(true)
      expect(response.body.data).toEqual(cachedData.claims)
      expect(MockedClaim.find).not.toHaveBeenCalled()
    })

    it('should filter claims by project', async () => {
      MockedProject.findById.mockResolvedValue(mockProject)
      MockedClaim.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      } as any)
      MockedClaim.countDocuments.mockResolvedValue(0)
      mockedRedis.get.mockResolvedValue(null)

      const response = await request(app)
        .get('/api/claims')
        .query({ projectId: mockProject._id.toString() })

      expect(response.status).toBe(200)
      expect(MockedProject.findById).toHaveBeenCalledWith(mockProject._id.toString())
    })

    it('should handle project access denial', async () => {
      const privateProject = {
        ...mockProject,
        owner: new mongoose.Types.ObjectId(),
        visibility: 'private',
      }

      MockedProject.findById.mockResolvedValue(privateProject)

      const response = await request(app)
        .get('/api/claims')
        .query({ projectId: privateProject._id.toString() })

      expect(response.status).toBe(403)
      expect(response.body.error.code).toBe('PROJECT_ACCESS_DENIED')
    })

    it('should filter claims by search text', async () => {
      MockedProject.find.mockResolvedValue([mockProject])
      MockedClaim.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      } as any)
      MockedClaim.countDocuments.mockResolvedValue(0)
      mockedRedis.get.mockResolvedValue(null)

      const response = await request(app)
        .get('/api/claims')
        .query({ search: 'climate change' })

      expect(response.status).toBe(200)
      expect(MockedClaim.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $text: { $search: 'climate change' },
        })
      )
    })
  })

  describe('POST /api/claims', () => {
    beforeEach(() => {
      // Mock validation middleware
      app.use((req, res, next) => {
        req.body = {
          text: 'New test claim',
          type: 'claim',
          project: mockProject._id,
          confidence: 0.9,
          tags: ['new', 'test'],
        }
        next()
      })
    })

    it('should create a new claim successfully', async () => {
      MockedClaim.mockImplementation(() => mockClaim)
      MockedProject.findByIdAndUpdate.mockResolvedValue(mockProject)
      mockedRedis.deletePattern.mockResolvedValue(1)
      mockedRedis.trackUserActivity.mockResolvedValue(undefined)

      const response = await request(app).post('/api/claims')

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Claim created successfully')
      expect(mockClaim.save).toHaveBeenCalled()
      expect(MockedProject.findByIdAndUpdate).toHaveBeenCalledWith(
        mockProject._id,
        { $inc: { 'statistics.totalClaims': 1 } }
      )
    })

    it('should trigger ML analysis when enabled', async () => {
      const aiEnabledProject = {
        ...mockProject,
        settings: {
          ...mockProject.settings,
          reasoning: { enableAIGeneration: true },
        },
      }

      MockedClaim.mockImplementation(() => mockClaim)
      MockedProject.findByIdAndUpdate.mockResolvedValue(aiEnabledProject)

      // Mock ML service response
      mockedAxios.post.mockResolvedValue({
        data: {
          overall_score: 0.8,
          clarity_score: 0.9,
          specificity_score: 0.7,
          evidence_score: 0.6,
          bias_score: 0.8,
          factuality_score: 0.9,
          completeness_score: 0.7,
          issues: [],
          recommendations: [],
        },
      })

      // Add req.project mock for the route
      app.get('/api/claims', (req: any, res, next) => {
        req.project = aiEnabledProject
        next()
      })

      const response = await request(app).post('/api/claims')

      expect(response.status).toBe(201)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/validate'),
        expect.objectContaining({
          claim_text: mockClaim.text,
          claim_type: mockClaim.type,
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': process.env.ML_SERVICE_API_KEY,
          }),
        })
      )
    })

    it('should handle ML service failure gracefully', async () => {
      MockedClaim.mockImplementation(() => mockClaim)
      MockedProject.findByIdAndUpdate.mockResolvedValue(mockProject)

      // Mock ML service failure
      mockedAxios.post.mockRejectedValue(new Error('ML service unavailable'))

      const response = await request(app).post('/api/claims')

      expect(response.status).toBe(201) // Should still create the claim
      expect(response.body.success).toBe(true)
    })
  })

  describe('GET /api/claims/:id', () => {
    it('should return specific claim with details', async () => {
      MockedClaim.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockClaim),
              }),
            }),
          }),
        }),
      } as any)

      mockedRedis.trackUserActivity.mockResolvedValue(undefined)

      const response = await request(app).get(`/api/claims/${mockClaim._id}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual(mockClaim)
    })

    it('should return 404 for non-existent claim', async () => {
      MockedClaim.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue(null),
              }),
            }),
          }),
        }),
      } as any)

      const response = await request(app).get(`/api/claims/${mockClaim._id}`)

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('CLAIM_NOT_FOUND')
    })

    it('should deny access to private project claims', async () => {
      const privateProjectClaim = {
        ...mockClaim,
        project: {
          ...mockProject,
          owner: new mongoose.Types.ObjectId(),
          visibility: 'private',
          collaborators: [],
        },
      }

      MockedClaim.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue(privateProjectClaim),
              }),
            }),
          }),
        }),
      } as any)

      const response = await request(app).get(`/api/claims/${mockClaim._id}`)

      expect(response.status).toBe(403)
      expect(response.body.error.code).toBe('CLAIM_ACCESS_DENIED')
    })
  })

  describe('PUT /api/claims/:id', () => {
    it('should update claim successfully', async () => {
      const updatedClaim = { ...mockClaim, text: 'Updated claim text' }

      MockedClaim.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockClaim),
      } as any)

      mockedRedis.deletePattern.mockResolvedValue(1)

      const response = await request(app)
        .put(`/api/claims/${mockClaim._id}`)
        .send({ text: 'Updated claim text' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Claim updated successfully')
    })

    it('should store version history when text changes', async () => {
      const claimWithoutVersions = { ...mockClaim, versions: [] }

      MockedClaim.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(claimWithoutVersions),
      } as any)

      const response = await request(app)
        .put(`/api/claims/${mockClaim._id}`)
        .send({ text: 'Different text' })

      expect(response.status).toBe(200)
      expect(claimWithoutVersions.versions).toHaveLength(1)
      expect(claimWithoutVersions.versions[0]).toMatchObject({
        versionNumber: 1,
        text: mockClaim.text,
        changeReason: 'Original version',
      })
    })

    it('should deny edit permission for unauthorized users', async () => {
      const unauthorizedClaim = {
        ...mockClaim,
        creator: new mongoose.Types.ObjectId(),
        project: {
          ...mockProject,
          owner: new mongoose.Types.ObjectId(),
          collaborators: [],
        },
      }

      MockedClaim.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(unauthorizedClaim),
      } as any)

      const response = await request(app)
        .put(`/api/claims/${mockClaim._id}`)
        .send({ text: 'Updated text' })

      expect(response.status).toBe(403)
      expect(response.body.error.code).toBe('EDIT_PERMISSION_DENIED')
    })
  })

  describe('DELETE /api/claims/:id', () => {
    it('should soft delete claim successfully', async () => {
      MockedClaim.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockClaim),
      } as any)

      MockedProject.findByIdAndUpdate.mockResolvedValue(mockProject)
      mockedRedis.deletePattern.mockResolvedValue(1)

      const response = await request(app).delete(`/api/claims/${mockClaim._id}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Claim deleted successfully')
      expect(mockClaim.isActive).toBe(false)
      expect(mockClaim.status).toBe('archived')
    })

    it('should deny delete permission for unauthorized users', async () => {
      const unauthorizedClaim = {
        ...mockClaim,
        creator: new mongoose.Types.ObjectId(),
        project: {
          ...mockProject,
          owner: new mongoose.Types.ObjectId(),
          collaborators: [],
        },
      }

      MockedClaim.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(unauthorizedClaim),
      } as any)

      const response = await request(app).delete(`/api/claims/${mockClaim._id}`)

      expect(response.status).toBe(403)
      expect(response.body.error.code).toBe('DELETE_PERMISSION_DENIED')
    })
  })

  describe('POST /api/claims/:id/evidence', () => {
    it('should add evidence to claim successfully', async () => {
      const mockEvidence = {
        _id: new mongoose.Types.ObjectId(),
        text: 'Test evidence',
        project: mockProject._id,
        isActive: true,
      }

      MockedClaim.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockClaim),
      } as any)

      MockedEvidence.find.mockResolvedValue([mockEvidence])
      MockedEvidence.updateMany.mockResolvedValue({ acknowledged: true })

      const response = await request(app)
        .post(`/api/claims/${mockClaim._id}/evidence`)
        .send({ evidenceIds: [mockEvidence._id] })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Evidence added successfully')
      expect(mockClaim.evidence).toContain(mockEvidence._id)
    })

    it('should handle non-existent evidence', async () => {
      MockedClaim.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockClaim),
      } as any)

      MockedEvidence.find.mockResolvedValue([]) // No evidence found

      const response = await request(app)
        .post(`/api/claims/${mockClaim._id}/evidence`)
        .send({ evidenceIds: [new mongoose.Types.ObjectId()] })

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('EVIDENCE_NOT_FOUND')
    })
  })

  describe('POST /api/claims/:id/comments', () => {
    it('should add comment to claim successfully', async () => {
      MockedClaim.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockClaim),
      } as any)

      const response = await request(app)
        .post(`/api/claims/${mockClaim._id}/comments`)
        .send({ text: 'This is a test comment' })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Comment added successfully')
      expect(mockClaim.comments).toHaveLength(1)
      expect(mockClaim.comments[0].text).toBe('This is a test comment')
    })

    it('should reject empty comments', async () => {
      const response = await request(app)
        .post(`/api/claims/${mockClaim._id}/comments`)
        .send({ text: '' })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('COMMENT_TEXT_REQUIRED')
    })

    it('should respect project comment settings', async () => {
      const projectWithCommentsDisabled = {
        ...mockProject,
        settings: {
          ...mockProject.settings,
          collaboration: { allowComments: false },
        },
      }

      const claimWithCommentsDisabled = {
        ...mockClaim,
        project: projectWithCommentsDisabled,
      }

      MockedClaim.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(claimWithCommentsDisabled),
      } as any)

      const response = await request(app)
        .post(`/api/claims/${mockClaim._id}/comments`)
        .send({ text: 'This comment should be rejected' })

      expect(response.status).toBe(403)
      expect(response.body.error.code).toBe('COMMENTS_DISABLED')
    })
  })

  describe('POST /api/claims/relate', () => {
    it('should create relationships between claims successfully', async () => {
      const claim1 = { ...mockClaim, _id: new mongoose.Types.ObjectId() }
      const claim2 = { ...mockClaim, _id: new mongoose.Types.ObjectId() }

      MockedClaim.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([claim1, claim2]),
      } as any)

      mockedRedis.deletePattern.mockResolvedValue(1)

      const response = await request(app)
        .post('/api/claims/relate')
        .send({
          claimIds: [claim1._id, claim2._id],
          relationship: 'supports',
          confidence: 0.8,
          notes: 'These claims support each other',
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Claims related successfully')
      expect(claim1.relatedClaims).toHaveLength(1)
      expect(claim2.relatedClaims).toHaveLength(1)
    })

    it('should handle permission checks for all claims', async () => {
      const unauthorizedClaim = {
        ...mockClaim,
        _id: new mongoose.Types.ObjectId(),
        creator: new mongoose.Types.ObjectId(),
        project: {
          ...mockProject,
          owner: new mongoose.Types.ObjectId(),
          collaborators: [],
        },
      }

      MockedClaim.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([mockClaim, unauthorizedClaim]),
      } as any)

      const response = await request(app)
        .post('/api/claims/relate')
        .send({
          claimIds: [mockClaim._id, unauthorizedClaim._id],
          relationship: 'supports',
          confidence: 0.8,
        })

      expect(response.status).toBe(403)
      expect(response.body.error.code).toBe('EDIT_PERMISSION_DENIED')
    })
  })

  describe('GET /api/claims/:id/analysis', () => {
    it('should return AI analysis for claim', async () => {
      MockedClaim.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockClaim),
      } as any)

      mockedRedis.get.mockResolvedValue(null)
      mockedRedis.set.mockResolvedValue('OK')

      // Mock ML service responses
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            overall_score: 0.8,
            clarity_score: 0.9,
            issues: [],
            recommendations: [],
          },
        })
        .mockResolvedValueOnce({
          data: {
            reasoning_chain: ['step1', 'step2'],
            confidence: 0.85,
          },
        })

      const response = await request(app).get(`/api/claims/${mockClaim._id}/analysis`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('quality')
      expect(response.body.data).toHaveProperty('reasoning')
      expect(mockedAxios.post).toHaveBeenCalledTimes(2)
    })

    it('should return cached analysis when available', async () => {
      MockedClaim.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockClaim),
      } as any)

      const cachedAnalysis = {
        quality: { overall_score: 0.8 },
        reasoning: { confidence: 0.85 },
        timestamp: new Date(),
      }

      mockedRedis.get.mockResolvedValue(cachedAnalysis)

      const response = await request(app).get(`/api/claims/${mockClaim._id}/analysis`)

      expect(response.status).toBe(200)
      expect(response.body.cached).toBe(true)
      expect(response.body.data).toEqual(cachedAnalysis)
      expect(mockedAxios.post).not.toHaveBeenCalled()
    })

    it('should handle ML service unavailability', async () => {
      MockedClaim.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockClaim),
      } as any)

      mockedRedis.get.mockResolvedValue(null)
      mockedAxios.post.mockRejectedValue(new Error('Service unavailable'))

      const response = await request(app).get(`/api/claims/${mockClaim._id}/analysis`)

      expect(response.status).toBe(503)
      expect(response.body.error.code).toBe('ANALYSIS_SERVICE_UNAVAILABLE')
    })
  })
})