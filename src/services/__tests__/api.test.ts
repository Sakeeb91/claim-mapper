// Mock modules first before any imports
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: {
      use: jest.fn(),
    },
    response: {
      use: jest.fn(),
    },
  },
}

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
}))

import axios, { AxiosResponse } from 'axios'
import { apiService } from '../api'

const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock window.location for redirect tests
const mockLocation = {
  href: '',
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('ApiService', () => {

  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
    mockLocation.href = ''
  })

  describe('Initialization', () => {
    it('creates axios instance with correct configuration', () => {
      // ApiService is already instantiated, so we need to test the create call
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:8000',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    })

    it('uses custom API URL from environment', () => {
      const originalEnv = process.env.NEXT_PUBLIC_API_URL
      process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com'

      // Clear module cache and reimport
      jest.resetModules()
      jest.mock('axios', () => ({
        create: jest.fn(() => mockAxiosInstance),
      }))
      const { apiService: newApiService } = require('../api')

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.example.com',
        })
      )

      process.env.NEXT_PUBLIC_API_URL = originalEnv
    })

    it('sets up request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled()
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled()
    })
  })

  describe('Request Interceptor', () => {
    let requestInterceptor: any

    beforeEach(() => {
      // Get the request interceptor function
      const requestInterceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls[0]
      requestInterceptor = requestInterceptorCall[0]
    })

    it('adds authorization header when token exists', () => {
      localStorageMock.setItem('token', 'test-token')

      const config = { headers: {} }
      const result = requestInterceptor(config)

      expect(result.headers.Authorization).toBe('Bearer test-token')
    })

    it('does not add authorization header when token does not exist', () => {
      const config = { headers: {} }
      const result = requestInterceptor(config)

      expect(result.headers.Authorization).toBeUndefined()
    })

    it('returns config unchanged when no token', () => {
      const config = { headers: {}, url: '/test' }
      const result = requestInterceptor(config)

      expect(result).toEqual(config)
    })
  })

  describe('Response Interceptor', () => {
    let responseInterceptor: any
    let errorInterceptor: any

    beforeEach(() => {
      // Get the response interceptor functions
      const responseInterceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0]
      responseInterceptor = responseInterceptorCall[0]
      errorInterceptor = responseInterceptorCall[1]
    })

    it('returns response unchanged on success', () => {
      const response = { data: { success: true }, status: 200 }
      const result = responseInterceptor(response)

      expect(result).toBe(response)
    })

    it('handles 401 unauthorized error', async () => {
      localStorageMock.setItem('token', 'expired-token')

      const error = {
        response: { status: 401 },
      }

      await expect(errorInterceptor(error)).rejects.toBe(error)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
      expect(mockLocation.href).toBe('/login')
    })

    it('handles other errors without redirect', async () => {
      const error = {
        response: { status: 500 },
      }

      await expect(errorInterceptor(error)).rejects.toBe(error)
      expect(localStorageMock.removeItem).not.toHaveBeenCalled()
      expect(mockLocation.href).toBe('')
    })

    it('handles errors without response', async () => {
      const error = { message: 'Network Error' }

      await expect(errorInterceptor(error)).rejects.toBe(error)
    })
  })

  describe('HTTP Methods', () => {
    const mockResponse: AxiosResponse = {
      data: { success: true, data: { id: 1, name: 'test' } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    }

    describe('GET requests', () => {
      it('makes GET request and returns data', async () => {
        mockAxiosInstance.get.mockResolvedValue(mockResponse)

        const result = await apiService.get('/test')

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined)
        expect(result).toEqual(mockResponse.data)
      })

      it('passes config to GET request', async () => {
        mockAxiosInstance.get.mockResolvedValue(mockResponse)
        const config = { headers: { 'X-Custom': 'value' } }

        await apiService.get('/test', config)

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', config)
      })
    })

    describe('POST requests', () => {
      it('makes POST request and returns data', async () => {
        mockAxiosInstance.post.mockResolvedValue(mockResponse)
        const postData = { name: 'test' }

        const result = await apiService.post('/test', postData)

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', postData, undefined)
        expect(result).toEqual(mockResponse.data)
      })

      it('makes POST request without data', async () => {
        mockAxiosInstance.post.mockResolvedValue(mockResponse)

        await apiService.post('/test')

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', undefined, undefined)
      })

      it('passes config to POST request', async () => {
        mockAxiosInstance.post.mockResolvedValue(mockResponse)
        const postData = { name: 'test' }
        const config = { headers: { 'X-Custom': 'value' } }

        await apiService.post('/test', postData, config)

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', postData, config)
      })
    })

    describe('PUT requests', () => {
      it('makes PUT request and returns data', async () => {
        mockAxiosInstance.put.mockResolvedValue(mockResponse)
        const putData = { id: 1, name: 'updated' }

        const result = await apiService.put('/test/1', putData)

        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test/1', putData, undefined)
        expect(result).toEqual(mockResponse.data)
      })
    })

    describe('PATCH requests', () => {
      it('makes PATCH request and returns data', async () => {
        mockAxiosInstance.patch.mockResolvedValue(mockResponse)
        const patchData = { name: 'patched' }

        const result = await apiService.patch('/test/1', patchData)

        expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/test/1', patchData, undefined)
        expect(result).toEqual(mockResponse.data)
      })
    })

    describe('DELETE requests', () => {
      it('makes DELETE request and returns data', async () => {
        mockAxiosInstance.delete.mockResolvedValue(mockResponse)

        const result = await apiService.delete('/test/1')

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test/1', undefined)
        expect(result).toEqual(mockResponse.data)
      })

      it('passes config to DELETE request', async () => {
        mockAxiosInstance.delete.mockResolvedValue(mockResponse)
        const config = { headers: { 'X-Reason': 'cleanup' } }

        await apiService.delete('/test/1', config)

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test/1', config)
      })
    })

    describe('Paginated requests', () => {
      it('makes paginated GET request with params', async () => {
        const paginatedResponse = {
          data: {
            success: true,
            data: [{ id: 1 }, { id: 2 }],
            pagination: {
              page: 1,
              limit: 10,
              total: 100,
              totalPages: 10,
            },
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }

        mockAxiosInstance.get.mockResolvedValue(paginatedResponse)

        const params = { page: 1, limit: 10 }
        const result = await apiService.getPaginated('/test', params)

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', { params })
        expect(result).toEqual(paginatedResponse.data)
      })

      it('makes paginated GET request without params', async () => {
        const paginatedResponse = {
          data: { success: true, data: [] },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }

        mockAxiosInstance.get.mockResolvedValue(paginatedResponse)

        await apiService.getPaginated('/test')

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', { params: undefined })
      })
    })
  })

  describe('Error Handling', () => {
    it('propagates errors from HTTP methods', async () => {
      const error = new Error('Request failed')
      mockAxiosInstance.get.mockRejectedValue(error)

      await expect(apiService.get('/test')).rejects.toBe(error)
    })

    it('handles network errors', async () => {
      const networkError = { code: 'NETWORK_ERROR', message: 'Network Error' }
      mockAxiosInstance.post.mockRejectedValue(networkError)

      await expect(apiService.post('/test', {})).rejects.toBe(networkError)
    })
  })

  describe('Type Safety', () => {
    it('returns typed responses for GET requests', async () => {
      interface TestData {
        id: number
        name: string
      }

      const typedResponse = {
        data: { success: true, data: { id: 1, name: 'test' } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      }

      mockAxiosInstance.get.mockResolvedValue(typedResponse)

      const result = await apiService.get<TestData>('/test')

      expect(result.data).toEqual({ id: 1, name: 'test' })
    })
  })
})