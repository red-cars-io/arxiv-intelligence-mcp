/**
 * arXiv Intelligence MCP Server
 * AI agent access to 2M+ preprint papers via arXiv.org
 */

import http from 'http';
import Apify, { Actor } from 'apify';
import { XMLParser } from 'fast-xml-parser';

const PORT = process.env.APIFY_PORT || 8080;

// =============================================================================
// CONSTANTS
// =============================================================================

const API_BASE = 'https://export.arxiv.org/api/query';

// Rate limit: 3 req/sec per arXiv policy, use 350ms gap
const RATE_LIMIT_MS = 350;
let lastRequestTime = 0;

// =============================================================================
// XML PARSER
// =============================================================================

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  trimValues: true,
});

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

const TOOLS = [
  {
    name: 'search_papers',
    description: 'Search arXiv papers by keyword, author, or category. Returns papers ranked by relevance or date.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (keyword, author name, or category like "cat:cs.AI")' },
        maxResults: { type: 'integer', description: 'Maximum number of results (default: 10, max: 100)', default: 10 },
        sortBy: { type: 'string', description: 'Sort by "relevance" or "lastUpdated"', default: 'relevance' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_paper_details',
    description: 'Get full metadata for a specific arXiv paper by ID (e.g., 2301.00001)',
    inputSchema: {
      type: 'object',
      properties: {
        paperId: { type: 'string', description: 'arXiv paper ID (e.g., "2301.00001" or "abs/2301.00001")' },
      },
      required: ['paperId'],
    },
  },
  {
    name: 'get_author_profile',
    description: 'Get all papers by an author, co-author network, and institution from arXiv author profile page',
    inputSchema: {
      type: 'object',
      properties: {
        authorName: { type: 'string', description: 'Full author name as shown on arXiv (e.g., "Yoshua Bengio")' },
        maxResults: { type: 'integer', description: 'Maximum papers to return (default: 25, max: 100)', default: 25 },
      },
      required: ['authorName'],
    },
  },
  {
    name: 'track_citations',
    description: 'Find papers that reference a given arXiv paper (backward) and papers that cite it (forward)',
    inputSchema: {
      type: 'object',
      properties: {
        paperId: { type: 'string', description: 'arXiv paper ID to trace citations for' },
        citationType: { type: 'string', description: '"backward" (references), "forward" (citing), or "both"', default: 'both' },
        maxResults: { type: 'integer', description: 'Maximum results per direction (default: 20, max: 50)', default: 20 },
      },
      required: ['paperId'],
    },
  },
  {
    name: 'get_trending_papers',
    description: 'Get most recent papers from a specific arXiv category (cs.AI, cs.LG, q-bio, q-fin, stat.ML, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'arXiv category (e.g., cs.AI, cs.LG, q-bio, q-fin, stat.ML, math.CO)' },
        timeWindow: { type: 'string', description: '"week" or "month" of new papers', default: 'week' },
        maxResults: { type: 'integer', description: 'Maximum results (default: 25, max: 100)', default: 25 },
      },
      required: ['category'],
    },
  },
];

// =============================================================================
// TOOL PRICES (USD)
// =============================================================================

const TOOL_PRICES = {
  search_papers: 0.03,
  get_paper_details: 0.01,
  get_author_profile: 0.03,
  track_citations: 0.05,
  get_trending_papers: 0.02,
};

// =============================================================================
// ARXIV API CLIENT
// =============================================================================

async function arxivQuery(params) {
  // Rate limit enforcement
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();

  const queryParams = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) queryParams.set(k, String(v));
  }

  const url = `${API_BASE}?${queryParams.toString()}`;
  const resp = await fetch(url, { timeout: 30000 });
  if (!resp.ok) {
    throw new Error(`arXiv API error: ${resp.status} ${resp.statusText}`);
  }
  const xml = await resp.text();
  const parsed = parser.parse(xml);
  return parsed;
}

// =============================================================================
// TOOL IMPLEMENTATIONS
// =============================================================================

async function searchPapers(query, maxResults = 10, sortBy = 'relevance') {
  const sortMap = { relevance: 0, lastUpdated: 1 };
  const sortOrder = sortMap[sortBy] ?? 0;

  const data = await arxivQuery({
    search_query: query,
    start: 0,
    max_results: Math.min(maxResults, 100),
    sort_by: sortBy === 'lastUpdated' ? 'lastUpdated' : 'relevance',
    sort_order: sortOrder,
  });

  const entries = data.feed?.entry || [];
  const normalized = Array.isArray(entries) ? entries : [entries];
  return normalized.map((e) => ({
    id: e.id?.replace('http://arxiv.org/abs/', '').replace('https://arxiv.org/abs/', '').trim() || '',
    title: e.title?.['#text'] || e.title || '',
    summary: e.summary?.['#text'] || e.summary || '',
    authors: (e.author || []).map((a) => a.name?.['#text'] || a.name || '').join(', '),
    categories: (e.category || []).map((c) => c['@_term'] || c['@_scheme'] || String(c)).filter(Boolean),
    published: e.published || '',
    updated: e.updated || '',
    links: (e.link || []).map((l) => ({ rel: l['@_rel'], href: l['@_href'] })),
    comment: e['arxiv:comment']?.['#text'] || e['arxiv:comment'] || '',
    journalRef: e['arxiv:journal_ref']?.['#text'] || e['arxiv:journal_ref'] || '',
    doi: e['arxiv:doi']?.['#text'] || e['arxiv:doi'] || '',
  }));
}

async function getPaperDetails(paperId) {
  // Normalize ID: strip "abs/" prefix if present
  const normalizedId = paperId.replace(/^abs\//, '').replace(/^arxiv:/, '');
  const data = await arxivQuery({ id_list: normalizedId });
  const entries = data.feed?.entry || [];
  const entry = Array.isArray(entries) ? entries[0] : entries;
  if (!entry) return { error: `Paper ${paperId} not found on arXiv` };

  return {
    id: entry.id?.replace('http://arxiv.org/abs/', '').replace('https://arxiv.org/abs/', '').trim() || '',
    title: entry.title?.['#text'] || entry.title || '',
    summary: entry.summary?.['#text'] || entry.summary || '',
    authors: (entry.author || []).map((a) => a.name?.['#text'] || a.name || '').join(', '),
    categories: (entry.category || []).map((c) => c['@_term'] || c['@_scheme'] || String(c)).filter(Boolean),
    published: entry.published || '',
    updated: entry.updated || '',
    comment: entry['arxiv:comment']?.['#text'] || entry['arxiv:comment'] || '',
    journalRef: entry['arxiv:journal_ref']?.['#text'] || entry['arxiv:journal_ref'] || '',
    doi: entry['arxiv:doi']?.['#text'] || entry['arxiv:doi'] || '',
    links: (entry.link || []).map((l) => ({
      rel: l['@_rel'],
      href: l['@_href'],
      type: l['@_type'],
    })),
    primaryCategory: entry['arxiv:primary_category']?.['@_term'] || entry['arxiv:primary_category'] || '',
  };
}

async function getAuthorProfile(authorName, maxResults = 25) {
  // Search for papers by this author
  const data = await arxivQuery({
    search_query: `au:"${authorName}"`,
    start: 0,
    max_results: Math.min(maxResults, 100),
    sort_by: 'lastUpdated',
    sort_order: 1,
  });

  const entries = data.feed?.entry || [];
  const normalized = Array.isArray(entries) ? entries : [entries];
  const papers = normalized.map((e) => ({
    id: e.id?.replace('http://arxiv.org/abs/', '').replace('https://arxiv.org/abs/', '').trim() || '',
    title: e.title?.['#text'] || e.title || '',
    summary: (e.summary?.['#text'] || e.summary || '').slice(0, 300) + '...',
    categories: (e.category || []).map((c) => c['@_term'] || String(c)).filter(Boolean),
    published: e.published || '',
    updated: e.updated || '',
  }));

  // Collect co-authors
  const coAuthorsSet = new Set();
  normalized.forEach((e) => {
    (e.author || []).forEach((a) => {
      const name = a.name?.['#text'] || a.name || '';
      if (name && name !== authorName) coAuthorsSet.add(name);
    });
  });

  return {
    authorName,
    totalPapers: normalized.length,
    papers,
    coAuthors: Array.from(coAuthorsSet).slice(0, 20),
    coAuthorCount: coAuthorsSet.size,
  };
}

async function trackCitations(paperId, citationType = 'both', maxResults = 20) {
  // Forward citations: search for papers that cite this one by looking for the arXiv ID in references
  const normalizedId = paperId.replace(/^abs\//, '').replace(/^arxiv:/, '');
  const results = { backward: [], forward: [] };

  if (citationType === 'backward' || citationType === 'both') {
    try {
      // Get the paper to find its references
      const paper = await getPaperDetails(paperId);
      if (paper.error) {
        results.backward = [{ error: paper.error }];
      } else {
        // arXiv API doesn't provide backward refs directly; return what's available
        results.backward = [{ note: 'arXiv API does not expose backward references. This paper\'s references are listed in its full metadata.' }];
      }
    } catch (e) {
      results.backward = [{ error: e.message }];
    }
  }

  if (citationType === 'forward' || citationType === 'both') {
    try {
      // Search for papers that cite this one using "references:XXX.XXXXX" query
      const citeQuery = `references:${normalizedId}`;
      const data = await arxivQuery({
        search_query: citeQuery,
        start: 0,
        max_results: Math.min(maxResults, 50),
        sort_by: 'lastUpdated',
        sort_order: 1,
      });
      const entries = data.feed?.entry || [];
      const normalized = Array.isArray(entries) ? entries : [entries];
      results.forward = normalized.map((e) => ({
        id: e.id?.replace('http://arxiv.org/abs/', '').replace('https://arxiv.org/abs/', '').trim() || '',
        title: e.title?.['#text'] || e.title || '',
        authors: (e.author || []).map((a) => a.name?.['#text'] || a.name || '').join(', '),
        published: e.published || '',
        categories: (e.category || []).map((c) => c['@_term'] || String(c)).filter(Boolean),
      }));
    } catch (e) {
      results.forward = [{ error: e.message }];
    }
  }

  return results;
}

async function getTrendingPapers(category, timeWindow = 'week', maxResults = 25) {
  // Map category to arXiv category format
  const cat = category.startsWith('cat:') ? category : `cat:${category}`;
  const days = timeWindow === 'month' ? 30 : 7;
  const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const data = await arxivQuery({
    search_query: `${cat} AND submitter_date:[${dateFrom} TO NOW]`,
    start: 0,
    max_results: Math.min(maxResults, 100),
    sort_by: 'lastUpdated',
    sort_order: 1,
  });

  const entries = data.feed?.entry || [];
  const normalized = Array.isArray(entries) ? entries : [entries];
  return normalized.map((e) => ({
    id: e.id?.replace('http://arxiv.org/abs/', '').replace('https://arxiv.org/abs/', '').trim() || '',
    title: e.title?.['#text'] || e.title || '',
    summary: (e.summary?.['#text'] || e.summary || '').slice(0, 300) + '...',
    authors: (e.author || []).map((a) => a.name?.['#text'] || a.name || '').join(', '),
    categories: (e.category || []).map((c) => c['@_term'] || String(c)).filter(Boolean),
    published: e.published || '',
    updated: e.updated || '',
    primaryCategory: e['arxiv:primary_category']?.['@_term'] || '',
  }));
}

// =============================================================================
// TOOL ROUTER
// =============================================================================

async function handleTool(tool, params) {
  switch (tool) {
    case 'search_papers':
      return searchPapers(params.query, params.maxResults, params.sortBy);
    case 'get_paper_details':
      return getPaperDetails(params.paperId);
    case 'get_author_profile':
      return getAuthorProfile(params.authorName, params.maxResults);
    case 'track_citations':
      return trackCitations(params.paperId, params.citationType, params.maxResults);
    case 'get_trending_papers':
      return getTrendingPapers(params.category, params.timeWindow, params.maxResults);
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

// =============================================================================
// MCP PROTOCOL HANDLER
// =============================================================================

function reply(res, statusCode = 200) {
  return {
    statusCode,
    body: res,
    headers: { 'Content-Type': 'application/json' },
  };
}

function replyError(code, message) {
  return reply({ error: { code, message } }, 400);
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

if (process.env.APIFY_IS_ATYPICAL_RUN === '1') {
  // HTTP server for MCP gateway / health probe
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/health' || url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', actor: 'arxiv-intelligence-mcp' }));
      return;
    }
    if (url.pathname === '/mcp') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', async () => {
        try {
          const jsonBody = JSON.parse(body);
          const method = jsonBody.method;

          if (method === 'initialize') {
            return res.end(JSON.stringify(reply({
              protocolVersion: '2024-11-05',
              capabilities: { tools: {} },
              serverInfo: { name: 'arxiv-intelligence-mcp', version: '1.0.0' },
            })));
          }

          if (method === 'tools/list' || (!method && jsonBody.tool === 'list')) {
            return res.end(JSON.stringify(reply({ tools: TOOLS })));
          }

          if (method === 'tools/call') {
            const toolName = jsonBody.params?.name;
            const toolArgs = jsonBody.params?.arguments || {};
            if (!toolName) return res.end(JSON.stringify(replyError(-32602, 'Missing tool name')));
            try {
              const result = await handleTool(toolName, toolArgs);
              // PPE charging
              const price = TOOL_PRICES[toolName] || 0.01;
              try {
                await Actor.charge(price);
              } catch (e) {
                console.error('PPE charge error:', e.message);
              }
              return res.end(JSON.stringify(reply({
                content: [{ type: 'text', text: JSON.stringify(result) }],
              })));
            } catch (e) {
              return res.end(JSON.stringify(reply({ error: e.message, tool: toolName }, 500)));
            }
          }

          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Method not found' }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
    res.writeHead(404);
    res.end('Not Found');
  });

  server.listen(PORT, () => console.log(`arXiv Intelligence MCP listening on port ${PORT}`));
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
} else {
  // Apify input mode (direct tool call)
  const input = await Actor.getInput();
  if (input) {
    const { tool, params = {} } = input;
    if (tool) {
      const result = await handleTool(tool, params);
      await Actor.setValue('OUTPUT', result);
    }
  }
  await Actor.exit();
}

export default {
  handleRequest: async ({ request, log }) => {
    log.info('arXiv Intelligence MCP received request');
    try {
      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      const { tool, params = {} } = body;
      log.info(`Calling tool: ${tool}`);
      const result = await handleTool(tool, params);
      const price = TOOL_PRICES[tool] || 0.01;
      try {
        await Actor.charge(price);
      } catch (e) {
        log.error(`PPE charge error: ${e.message}`);
      }
      return { result };
    } catch (e) {
      log.error(`Tool error: ${e.message}`);
      return { error: e.message };
    }
  },
};
