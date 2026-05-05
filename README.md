# arXiv Intelligence MCP

AI agent access to 2M+ arXiv preprint papers — search by keyword, author, or category; get paper details; profile authors; track citations and trending research.

---

## 1. Purpose Statement

arXiv Intelligence MCP is an MCP (Model Context Protocol) server that gives AI agents direct access to arXiv.org's 2M+ preprint papers across computer science, physics, mathematics, q-bio, q-fin, and stat.ML. AI agents performing academic research, literature reviews, citation analysis, or research trend monitoring query arXiv in seconds without manual database navigation or API keys.

**Built for:** AI agents writing literature review sections, researchers tracking citation networks, data scientists monitoring trending ML papers, investors and analysts surveying academic AI trends, and graduate students exploring author networks.

---

## 2. Quick Start

Add to your MCP client:

```json
{
  "mcpServers": {
    "arxiv-intelligence-mcp": {
      "url": "https://red-cars--arxiv-intelligence-mcp.apify.actor/mcp"
    }
  }
}
```

AI agents can now search 2M+ arXiv preprints, retrieve full paper metadata, build author profiles with co-author networks, and track citation chains across computer science, physics, mathematics, and quantitative biology/finance.

---

## Comparison

See how arXiv Intelligence MCP compares to manual arXiv browsing, Semantic Scholar, and academic databases: [COMPARISON.md](./COMPARISON.md)

---

## 3. When to Call This MCP

Use arXiv Intelligence MCP when you need to:

- **Find relevant preprints** — Search by keyword, author, or category across all 2M+ arXiv papers
- **Get full paper metadata** — Retrieve abstracts, author lists, categories, dates, and links for specific papers
- **Build author profiles** — Map an author's full paper list and co-author network
- **Track citation chains** — Find papers that reference or cite a given arXiv paper
- **Monitor trending research** — Follow new papers by category (cs.AI, cs.LG, stat.ML, q-bio, q-fin)
- **Literature review research** — Collect papers ranked by relevance or recency for a topic
- **Academic due diligence** — Assess an author's publication record, co-author network, and research focus
- **AI/ML trend analysis** — Track publication velocity and trending topics in machine learning

---

## 4. What Data Can You Access?

| Data Type | Source | Example |
|-----------|--------|---------|
| Paper metadata | arXiv.org | Title, abstract, authors, categories, dates |
| Author profiles | arXiv.org | Papers by author, co-author network |
| Citation tracking | arXiv.org | Forward citations via references search |
| Trending papers | arXiv.org | Most recent papers by category |
| Category browse | arXiv.org | cs.AI, cs.LG, stat.ML, q-bio, q-fin, math.CO |

---

## 5. Why Use arXiv Intelligence MCP?

**The problem:** Finding relevant academic preprints on arXiv requires navigating a slow web interface with limited search, no author network visualization, and no citation tracking. For AI agents writing literature reviews, data scientists monitoring ML trends, and investors surveying academic AI activity, manual arXiv browsing wastes hours that could be spent on analysis.

**The solution:** AI agents use arXiv Intelligence MCP to search 2M+ preprints in seconds, retrieve full metadata, build author profiles with co-author networks, and track citation chains — the academic research layer for AI agents doing systematic literature reviews, trend monitoring, and research due diligence.

---

## 6. Tools

### search_papers

Search arXiv papers by keyword, author name, or category expression. Returns ranked results with title, abstract, authors, and categories.

```
search_papers(query="transformer attention mechanism", maxResults=10, sortBy="relevance")
```

### get_paper_details

Get full metadata for a specific arXiv paper by ID — abstract, all authors, categories, submission date, comments, journal reference, DOI, and links.

```
get_paper_details(paperId="2301.00001")
```

### get_author_profile

Get all recent papers by an author with their co-author network. Useful for building author profiles and mapping collaboration patterns.

```
get_author_profile(authorName="Yoshua Bengio", maxResults=25)
```

### track_citations

Find papers that reference a given arXiv paper (backward) or papers that cite it (forward). Note: arXiv does not expose backward references directly.

```
track_citations(paperId="2301.00001", citationType="forward", maxResults=20)
```

### get_trending_papers

Get the most recent papers from a specific arXiv category over the past week or month. Useful for tracking research trends and emerging topics.

```
get_trending_papers(category="cs.AI", timeWindow="week", maxResults=25)
```

---

## 7. Pricing

arXiv Intelligence MCP uses Apify's Pay Per Event (PPE) pricing:

| Tool | Price |
|------|-------|
| search_papers | $0.03 |
| get_paper_details | $0.01 |
| get_author_profile | $0.03 |
| track_citations | $0.05 |
| get_trending_papers | $0.02 |

All prices in USD per tool call. No API keys required — arXiv is fully open.

---

## 8. Setup

```
1. Clone or download this actor
2. Run: npm install
3. Start: npm start
4. Add to your MCP client using the URL above
```

No API keys required. arXiv's public API is freely accessible.
