# arXiv Intelligence MCP vs Manual Search + Semantic Scholar

*Comparison page for GitHub SEO — arXiv Intelligence MCP*

## Overview

| Aspect | arXiv Intelligence MCP | Manual Search | Semantic Scholar API |
|--------|-----------------------|---------------|---------------------|
| **Price** | $0.01–0.05/call | Free (hours) | Free (rate-limited) |
| **Data sources** | arXiv.org (2M+ papers) | Manual browsing | Semantic Scholar |
| **Full metadata** | ✅ abstracts, authors, categories, links | Partial | Partial |
| **Author profiling** | ✅ paper list + co-author network | ❌ | ✅ |
| **Citation tracking** | ✅ forward citations | ❌ | ✅ |
| **Trending papers** | ✅ by category (week/month) | ❌ | ❌ |
| **AI agent native** | ✅ MCP tool calls | ❌ | API key required |
| **No API key needed** | ✅ | ✅ | ❌ (requires key) |

## What You Get

arXiv Intelligence MCP gives your AI agent direct access to 2M+ arXiv preprints:

- **Paper search** — keyword, author, or category across all of arXiv
- **Full metadata** — title, abstract, all authors, categories, dates, comments, DOI
- **Author profiles** — paper list with co-author network mapping
- **Citation tracking** — find forward citations to any arXiv paper
- **Trending research** — most recent papers by category week over week

## Use Cases

### Literature review research
`search_papers(query="diffusion models for drug discovery", maxResults=20, sortBy="relevance")` → ranked papers with abstracts

### Author due diligence
`get_author_profile(authorName="Ian Goodfellow", maxResults=25)` → all papers, co-author network

### Citation analysis
`track_citations(paperId="1706.03762", citationType="forward", maxResults=20)` → papers citing the Transformer paper

### Research trend monitoring
`get_trending_papers(category="cs.AI", timeWindow="month", maxResults=50)` → this month's hottest cs.AI papers

## When to Choose arXiv Intelligence MCP

**Choose this when:**
- You're an AI agent writing literature review sections
- You need citation chains for academic due diligence
- You're monitoring ML/AI research trends by category
- You want author profiling with co-author networks
- You don't want to manage API keys (arXiv needs none)

**Choose Semantic Scholar directly when:**
- You have an API key and need higher rate limits
- You only need basic paper search
- You don't need MCP protocol integration

**Choose manual arXiv browsing when:**
- You have unlimited time and enjoy slow HTML interfaces
