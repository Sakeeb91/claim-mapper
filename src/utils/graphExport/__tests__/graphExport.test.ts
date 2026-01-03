import { generateTimestampedFilename, escapeXml, createBlobUrl } from '../helpers';
import { exportAsJSON } from '../exportJSON';
import { exportAsGraphML } from '../exportGraphML';
import { exportAsSVG } from '../exportSVG';
import type { GraphData, GraphNode, GraphLink } from '@/types';

// Mock URL methods
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();

beforeAll(() => {
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;
});

afterEach(() => {
  jest.clearAllMocks();
});

// Mock DOM elements for downloads
const mockLink = {
  download: '',
  href: '',
  click: jest.fn()
};

beforeEach(() => {
  jest.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLAnchorElement);
  jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as unknown as Node);
  jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown as Node);
});

describe('graphExport helpers', () => {
  describe('generateTimestampedFilename', () => {
    it('should generate a timestamped filename for PNG', () => {
      const result = generateTimestampedFilename('test-graph', 'png');
      expect(result).toMatch(/^test-graph-\d{4}-\d{2}-\d{2}\.png$/);
    });

    it('should generate a timestamped filename for SVG', () => {
      const result = generateTimestampedFilename('my-graph', 'svg');
      expect(result).toMatch(/^my-graph-\d{4}-\d{2}-\d{2}\.svg$/);
    });

    it('should generate a timestamped filename for JSON', () => {
      const result = generateTimestampedFilename('export', 'json');
      expect(result).toMatch(/^export-\d{4}-\d{2}-\d{2}\.json$/);
    });

    it('should generate a timestamped filename for GraphML', () => {
      const result = generateTimestampedFilename('network', 'graphml');
      expect(result).toMatch(/^network-\d{4}-\d{2}-\d{2}\.graphml$/);
    });
  });

  describe('escapeXml', () => {
    it('should escape ampersand', () => {
      expect(escapeXml('A & B')).toBe('A &amp; B');
    });

    it('should escape less than', () => {
      expect(escapeXml('a < b')).toBe('a &lt; b');
    });

    it('should escape greater than', () => {
      expect(escapeXml('a > b')).toBe('a &gt; b');
    });

    it('should escape quotes', () => {
      expect(escapeXml('"quoted"')).toBe('&quot;quoted&quot;');
    });

    it('should escape apostrophes', () => {
      expect(escapeXml("it's")).toBe('it&apos;s');
    });

    it('should escape multiple special characters', () => {
      expect(escapeXml('<a href="test" & id=\'1\'>')).toBe(
        '&lt;a href=&quot;test&quot; &amp; id=&apos;1&apos;&gt;'
      );
    });
  });

  describe('createBlobUrl', () => {
    it('should create a blob URL with correct MIME type', () => {
      const content = '{"test": true}';
      const result = createBlobUrl(content, 'application/json');

      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(result).toBe('blob:mock-url');
    });
  });
});

describe('exportAsJSON', () => {
  const mockGraphData: GraphData = {
    nodes: [
      { id: '1', type: 'claim', label: 'Test Claim', size: 10, color: '#333', data: {} as GraphNode['data'] },
      { id: '2', type: 'evidence', label: 'Test Evidence', size: 8, color: '#444', data: {} as GraphNode['data'] }
    ],
    links: [
      { id: 'e1', source: '1', target: '2', type: 'supports', strength: 0.8 } as GraphLink
    ]
  };

  it('should export graph data as JSON successfully', () => {
    const result = exportAsJSON(mockGraphData);

    expect(result.success).toBe(true);
    expect(result.format).toBe('json');
    expect(result.filename).toMatch(/\.json$/);
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('should include metadata when includeMetadata is true', () => {
    const result = exportAsJSON(mockGraphData, {
      includeMetadata: true,
      projectId: 'test-project',
      projectName: 'Test Project'
    });

    expect(result.success).toBe(true);
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it('should use custom filename', () => {
    const result = exportAsJSON(mockGraphData, { filename: 'custom-export' });

    expect(result.filename).toMatch(/^custom-export-\d{4}-\d{2}-\d{2}\.json$/);
  });
});

describe('exportAsGraphML', () => {
  const mockGraphData: GraphData = {
    nodes: [
      { id: 'node1', type: 'claim', label: 'Test Claim', size: 10, color: '#333', confidence: 0.85, data: {} as GraphNode['data'] },
      { id: 'node2', type: 'evidence', label: 'Test Evidence', size: 8, color: '#444', data: {} as GraphNode['data'] }
    ],
    links: [
      { id: 'e1', source: 'node1', target: 'node2', type: 'supports', strength: 0.9 } as GraphLink
    ]
  };

  it('should export graph data as GraphML successfully', () => {
    const result = exportAsGraphML(mockGraphData);

    expect(result.success).toBe(true);
    expect(result.format).toBe('graphml');
    expect(result.filename).toMatch(/\.graphml$/);
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('should handle special characters in labels', () => {
    const graphWithSpecialChars: GraphData = {
      nodes: [
        { id: '1', type: 'claim', label: 'Test & "Quote"', size: 10, color: '#333', data: {} as GraphNode['data'] }
      ],
      links: []
    };

    const result = exportAsGraphML(graphWithSpecialChars);
    expect(result.success).toBe(true);
  });
});

describe('exportAsSVG', () => {
  const mockSvgElement = {
    outerHTML: '<svg><circle></circle></svg>'
  } as unknown as SVGSVGElement;

  // Mock XMLSerializer
  const mockSerializeToString = jest.fn().mockReturnValue('<svg><circle></circle></svg>');
  (global as any).XMLSerializer = jest.fn().mockImplementation(() => ({
    serializeToString: mockSerializeToString
  }));

  it('should export SVG element successfully', () => {
    const result = exportAsSVG(mockSvgElement);

    expect(result.success).toBe(true);
    expect(result.format).toBe('svg');
    expect(result.filename).toMatch(/\.svg$/);
    expect(mockSerializeToString).toHaveBeenCalledWith(mockSvgElement);
  });

  it('should use custom filename', () => {
    const result = exportAsSVG(mockSvgElement, { filename: 'my-diagram' });

    expect(result.filename).toMatch(/^my-diagram-\d{4}-\d{2}-\d{2}\.svg$/);
  });
});
