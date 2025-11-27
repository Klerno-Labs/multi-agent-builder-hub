import { runWithLLM } from '../llm/client';

export interface WebSearchQuery {
  query: string;
  maxResults?: number;
  freshness?: 'day' | 'week' | 'month' | 'year';
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
}

export interface WebSearchResponse {
  success: boolean;
  query: string;
  results: WebSearchResult[];
  summary?: string;
  error?: string;
}

/**
 * Web search tool for real-time information retrieval
 * Uses Brave Search API or falls back to LLM-based search
 */
export class WebSearchTool {
  private apiKey?: string;
  private useSimulation: boolean;

  constructor(apiKey?: string, useSimulation = false) {
    this.apiKey = apiKey || process.env.BRAVE_SEARCH_API_KEY;
    this.useSimulation = useSimulation || !this.apiKey;
  }

  /**
   * Search the web for information
   */
  async search(query: WebSearchQuery): Promise<WebSearchResponse> {
    try {
      if (this.useSimulation) {
        return await this.simulatedSearch(query);
      }

      return await this.braveSearch(query);
    } catch (error) {
      return {
        success: false,
        query: query.query,
        results: [],
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  }

  /**
   * Perform search using Brave Search API
   */
  private async braveSearch(query: WebSearchQuery): Promise<WebSearchResponse> {
    if (!this.apiKey) {
      throw new Error('Brave Search API key not configured');
    }

    try {
      const params = new URLSearchParams({
        q: query.query,
        count: (query.maxResults || 5).toString(),
      });

      if (query.freshness) {
        params.append('freshness', query.freshness);
      }

      const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.statusText}`);
      }

      const data = await response.json();

      const results: WebSearchResult[] = (data.web?.results || []).map((result: any) => ({
        title: result.title,
        url: result.url,
        snippet: result.description,
        publishedDate: result.age,
      }));

      // Generate summary using LLM
      const summary = await this.generateSummary(query.query, results);

      return {
        success: true,
        query: query.query,
        results,
        summary,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Simulated search for development/testing (when no API key available)
   */
  private async simulatedSearch(query: WebSearchQuery): Promise<WebSearchResponse> {
    // Use LLM to generate plausible search results
    const prompt = `Generate ${query.maxResults || 5} plausible web search results for the query: "${query.query}"

Return results in JSON format:
{
  "results": [
    {
      "title": "Result title",
      "url": "https://example.com/page",
      "snippet": "Brief description of the result",
      "publishedDate": "2024-01-15"
    }
  ],
  "summary": "A brief summary of what these results tell us about the query"
}

Make the results realistic and relevant to the query. Include actual website names that would logically have this information.`;

    try {
      const response = await runWithLLM({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        maxTokens: 1500,
      });

      const parsed = JSON.parse(response.output);

      return {
        success: true,
        query: query.query,
        results: parsed.results || [],
        summary: parsed.summary,
      };
    } catch (error) {
      // Fallback to basic simulated results
      return {
        success: true,
        query: query.query,
        results: [
          {
            title: `Search results for: ${query.query}`,
            url: 'https://example.com',
            snippet: `Simulated search result - API key not configured. Query: ${query.query}`,
          },
        ],
        summary: 'Simulated search results (Brave Search API key not configured)',
      };
    }
  }

  /**
   * Generate summary of search results using LLM
   */
  private async generateSummary(query: string, results: WebSearchResult[]): Promise<string> {
    if (results.length === 0) {
      return 'No results found';
    }

    const resultsText = results
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}\n   Source: ${r.url}`)
      .join('\n\n');

    try {
      const response = await runWithLLM({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `Summarize these web search results for the query "${query}" in 2-3 sentences:\n\n${resultsText}`,
          },
        ],
        temperature: 0.5,
        maxTokens: 200,
      });

      return response.output;
    } catch (error) {
      return `Found ${results.length} results for: ${query}`;
    }
  }
}

/**
 * Create a web search tool instance
 */
export function createWebSearchTool(apiKey?: string, useSimulation?: boolean): WebSearchTool {
  return new WebSearchTool(apiKey, useSimulation);
}

/**
 * Quick search function (convenience wrapper)
 */
export async function searchWeb(query: string, maxResults = 5): Promise<WebSearchResponse> {
  const tool = createWebSearchTool();
  return tool.search({ query, maxResults });
}
