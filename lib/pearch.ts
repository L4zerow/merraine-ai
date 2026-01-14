// Pearch AI API Client

const PEARCH_API_BASE = 'https://api.pearch.ai';

export interface CustomFilters {
  locations?: string[];
  keywords?: string[];  // Skills/keywords
  titles?: string[];
  industries?: string[];
  companies?: string[];
  min_total_experience_years?: number;
  max_total_experience_years?: number;
  min_current_experience_years?: number;
  max_current_experience_years?: number;
  universities?: string[];
  degrees?: ('bachelor' | 'master' | 'MBA' | 'doctor' | 'postdoc')[];
  languages?: string[];
  has_startup_experience?: boolean;
  has_saas_experience?: boolean;
  has_b2b_experience?: boolean;
  has_b2c_experience?: boolean;
}

export interface SearchParams {
  query: string;
  type?: 'pro' | 'fast';
  insights?: boolean;
  profile_scoring?: boolean;
  high_freshness?: boolean;
  reveal_emails?: boolean;
  reveal_phones?: boolean;
  thread_id?: string;
  limit?: number;
  // New: Server-side filtering capabilities
  custom_filters?: CustomFilters;
  offset?: number;  // For pagination
  docid_blacklist?: string[];  // For deduplication
  strict_filters?: boolean;  // Exact match vs fuzzy
  filter_out_no_emails?: boolean;
  filter_out_no_phones?: boolean;
  filter_out_no_phones_or_emails?: boolean;
}

export interface EnrichParams {
  id: string;
  high_freshness?: boolean;
  reveal_emails?: boolean;
  reveal_phones?: boolean;
  with_profile?: boolean;
}

export interface Job {
  job_id: string;
  job_description: string;
}

export interface Profile {
  id?: string;
  name?: string;
  headline?: string;
  location?: string;
  summary?: string;
  experience?: Array<{
    title?: string;
    company?: string;
    duration?: string;
    description?: string;
  }>;
  education?: Array<{
    school?: string;
    degree?: string;
    field?: string;
  }>;
  skills?: string[];
  email?: string;
  phone?: string;
  linkedin_url?: string;
  score?: number;
  insights?: string;
  picture_url?: string;
}

export interface SearchResponse {
  profiles?: Profile[];
  thread_id?: string;
  total_count?: number;
  credits_used?: number;
}

export interface MatchedJob {
  job_id: string;
  job_description: string;
  score?: number;
  relevance?: string;
}

// Credit cost calculators
export function calculateSearchCost(params: SearchParams, estimatedProfiles: number = 10): number {
  let costPerProfile = params.type === 'pro' ? 5 : 1;
  if (params.insights) costPerProfile += 1;
  if (params.profile_scoring) costPerProfile += 1;
  if (params.high_freshness) costPerProfile += 2;
  if (params.reveal_emails) costPerProfile += 2;
  if (params.reveal_phones) costPerProfile += 14;
  return costPerProfile * estimatedProfiles;
}

export function calculateEnrichCost(params: EnrichParams): number {
  let cost = 1;
  if (params.high_freshness) cost += 2;
  if (params.reveal_emails) cost += 2;
  if (params.reveal_phones) cost += 14;
  return cost;
}

class PearchClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${PEARCH_API_BASE}${endpoint}`;
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pearch API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async search(params: SearchParams): Promise<SearchResponse> {
    return this.request<SearchResponse>('/v2/search', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async enrichProfile(params: EnrichParams): Promise<Profile> {
    const queryParams = new URLSearchParams();
    queryParams.set('docid', params.id);  // Pearch API expects 'docid', not 'id'
    if (params.high_freshness) queryParams.set('high_freshness', 'true');
    if (params.reveal_emails) queryParams.set('reveal_emails', 'true');
    if (params.reveal_phones) queryParams.set('reveal_phones', 'true');
    if (params.with_profile) queryParams.set('with_profile', 'true');

    return this.request<Profile>(`/v1/profile?${queryParams.toString()}`, {
      method: 'GET',
    });
  }

  async upsertJobs(jobs: Job[]): Promise<{ success: boolean }> {
    return this.request('/v1/upsert_jobs', {
      method: 'POST',
      body: JSON.stringify(jobs),
    });
  }

  async findMatchingJobs(profile: Record<string, unknown>): Promise<{ jobs: MatchedJob[] }> {
    return this.request('/v1/find_matching_jobs', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
  }

  async listJobs(limit?: number): Promise<{ jobs: Job[] }> {
    const queryParams = limit ? `?limit=${limit}` : '';
    return this.request(`/v1/list_jobs${queryParams}`, {
      method: 'GET',
    });
  }

  async deleteJobs(jobIds: string[]): Promise<{ success: boolean }> {
    return this.request('/v1/delete_jobs', {
      method: 'POST',
      body: JSON.stringify(jobIds),
    });
  }
}

export function createPearchClient(apiKey: string): PearchClient {
  return new PearchClient(apiKey);
}

export default PearchClient;
