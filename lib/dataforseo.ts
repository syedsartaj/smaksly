import type { DataForSEOKeyword } from '@/types/keyword';

const DATAFORSEO_API_URL = 'https://api.dataforseo.com/v3';

function getAuthHeader(): string {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new Error('DataForSEO credentials not configured. Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.');
  }
  return 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');
}

async function apiRequest<T>(endpoint: string, body: unknown[]): Promise<T> {
  const response = await fetch(`${DATAFORSEO_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DataForSEO API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

interface DFSKeywordResult {
  keyword: string;
  search_volume: number;
  keyword_info?: {
    search_volume: number;
    competition_level: string;
    competition: number;
    cpc: number;
    monthly_searches: { month: number; year: number; search_volume: number }[];
  };
  keyword_properties?: {
    keyword_difficulty: number;
    se_type: string;
  };
  search_intent_info?: {
    main_intent: string;
  };
  serp_info?: {
    se_results_count: number;
    serp_item_types: string[];
  };
}

interface DFSResponse {
  tasks: {
    result: {
      items: DFSKeywordResult[];
      total_count: number;
    }[];
    status_code: number;
    status_message: string;
  }[];
}

export async function fetchKeywordSuggestions(
  seedKeywords: string[],
  locationCode: number = 2840,
  languageCode: string = 'en',
  limit: number = 100
): Promise<DataForSEOKeyword[]> {
  const payload = [{
    keywords: seedKeywords,
    location_code: locationCode,
    language_code: languageCode,
    include_seed_keyword: true,
    include_serp_info: true,
    include_clickstream_data: false,
    limit,
  }];

  const data = await apiRequest<DFSResponse>(
    '/dataforseo_labs/google/keyword_suggestions/live',
    payload
  );

  const task = data.tasks?.[0];
  if (!task || task.status_code !== 20000) {
    throw new Error(`DataForSEO task failed: ${task?.status_message || 'Unknown error'}`);
  }

  const items = task.result?.[0]?.items || [];

  return items.map((item): DataForSEOKeyword => {
    const monthlySearches = (item.keyword_info?.monthly_searches || []).map((ms) => ({
      month: `${ms.year}-${String(ms.month).padStart(2, '0')}`,
      volume: ms.search_volume || 0,
    }));

    const volumes = monthlySearches.map((m) => m.volume);
    let trend: 'rising' | 'stable' | 'declining' = 'stable';
    if (volumes.length >= 3) {
      const recent = volumes.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      const older = volumes.slice(-3).reduce((a, b) => a + b, 0) / 3;
      if (older > 0) {
        const change = ((recent - older) / older) * 100;
        if (change > 20) trend = 'rising';
        else if (change < -20) trend = 'declining';
      }
    }

    const intentMap: Record<string, DataForSEOKeyword['intent']> = {
      informational: 'informational',
      commercial: 'commercial',
      transactional: 'transactional',
      navigational: 'navigational',
    };

    return {
      keyword: item.keyword,
      volume: item.keyword_info?.search_volume || item.search_volume || 0,
      difficulty: item.keyword_properties?.keyword_difficulty || 0,
      cpc: item.keyword_info?.cpc || 0,
      competition: item.keyword_info?.competition || 0,
      trend,
      intent: intentMap[item.search_intent_info?.main_intent || ''] || 'informational',
      serpFeatures: item.serp_info?.serp_item_types || [],
      monthlySearches,
    };
  });
}

export async function fetchSERPResults(
  keyword: string,
  locationCode: number = 2840,
  languageCode: string = 'en'
): Promise<{ domain: string; position: number; url: string }[]> {
  const payload = [{
    keyword,
    location_code: locationCode,
    language_code: languageCode,
    depth: 20,
  }];

  interface SERPResponse {
    tasks: {
      result: {
        items: { type: string; rank_group: number; domain: string; url: string }[];
      }[];
      status_code: number;
    }[];
  }

  const data = await apiRequest<SERPResponse>(
    '/serp/google/organic/live/regular',
    payload
  );

  const task = data.tasks?.[0];
  if (!task || task.status_code !== 20000) return [];

  return (task.result?.[0]?.items || [])
    .filter((item) => item.type === 'organic')
    .map((item) => ({ domain: item.domain, position: item.rank_group, url: item.url }));
}
