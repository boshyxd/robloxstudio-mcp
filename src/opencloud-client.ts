/**
 * Roblox Open Cloud Client
 * 
 * Client for interacting with Roblox Open Cloud APIs:
 * - Toolbox Service (asset search and details)
 * - Thumbnails API
 */

interface OpenCloudConfig {
    apiKey?: string;
    baseUrl?: string;
    timeout?: number;
}

interface SearchCategoryType {
    Audio: 'Audio';
    Model: 'Model';
    Decal: 'Decal';
    Plugin: 'Plugin';
    MeshPart: 'MeshPart';
    Video: 'Video';
    FontFamily: 'FontFamily';
}

type AssetCategory = keyof SearchCategoryType;

interface SortCategory {
    Relevance: 'Relevance';
    Trending: 'Trending';
    Top: 'Top';
    AudioDuration: 'AudioDuration';
    CreateTime: 'CreateTime';
    UpdatedTime: 'UpdatedTime';
    Ratings: 'Ratings';
}

type SortType = keyof SortCategory;

interface SortDirection {
    None: 'None';
    Ascending: 'Ascending';
    Descending: 'Descending';
}

type SortDirectionType = keyof SortDirection;

export interface AssetSearchParams {
    searchCategoryType: AssetCategory;
    query?: string;
    pageToken?: string;
    pageNumber?: number;
    maxPageSize?: number;
    sortDirection?: SortDirectionType;
    sortCategory?: SortType;
    includeOnlyVerifiedCreators?: boolean;
    userId?: number;
    groupId?: number;
}

export interface CreatorInfo {
    userId?: number;
    groupId?: number;
    name?: string;
    verified?: boolean;
}

export interface VotingInfo {
    showVotes: boolean;
    upVotes: number;
    downVotes: number;
    canVote: boolean;
    voteCount: number;
    upVotePercent: number;
}

export interface AssetInfo {
    id: number;
    name: string;
    description?: string;
    assetTypeId?: number;
    createTime?: string;
    updateTime?: string;
    categoryPath?: string;
}

export interface CreatorStoreAsset {
    voting?: VotingInfo;
    creator?: CreatorInfo;
    asset?: AssetInfo;
    creatorStoreProduct?: {
        purchasable: boolean;
        purchasePrice?: {
            currencyCode: string;
            quantity: {
                significand: number;
                exponent: number;
            };
        };
    };
}

export interface AssetSearchResponse {
    nextPageToken?: string;
    creatorStoreAssets: CreatorStoreAsset[];
    totalResults: number;
    filteredKeyword?: string;
}

export interface ThumbnailRequest {
    assetId: number;
    size?: '150x150' | '420x420' | '768x432';
    format?: 'Png' | 'Webp';
}

export interface ThumbnailResponse {
    targetId: number;
    state: 'Completed' | 'Pending' | 'Error' | 'Blocked';
    imageUrl?: string;
}

export class OpenCloudClient {
    private apiKey: string;
    private baseUrl: string;
    private timeout: number;

    constructor(config: OpenCloudConfig = {}) {
        this.apiKey = config.apiKey || process.env.ROBLOX_OPEN_CLOUD_API_KEY || '';
        this.baseUrl = config.baseUrl || 'https://apis.roblox.com';
        this.timeout = config.timeout || 30000;
    }

    /**
     * Check if API key is configured
     */
    hasApiKey(): boolean {
        return !!this.apiKey;
    }

    /**
     * Make an authenticated request to the Open Cloud API
     */
    private async request<T>(
        endpoint: string,
        options: {
            method?: string;
            params?: Record<string, string | number | boolean | undefined>;
            body?: unknown;
        } = {}
    ): Promise<T> {
        if (!this.apiKey) {
            throw new Error(
                'Open Cloud API key not configured. Set ROBLOX_OPEN_CLOUD_API_KEY environment variable or pass apiKey in config.'
            );
        }

        const { method = 'GET', params, body } = options;

        // Build URL with query parameters
        const url = new URL(`${this.baseUrl}${endpoint}`);
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined) {
                    url.searchParams.set(key, String(value));
                }
            }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url.toString(), {
                method,
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                },
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorBody = await response.text();
                let errorMessage: string;

                try {
                    const errorJson = JSON.parse(errorBody);
                    errorMessage = errorJson.detail || errorJson.message || errorBody;
                } catch {
                    errorMessage = errorBody;
                }

                if (response.status === 401) {
                    throw new Error('Invalid or expired API key');
                } else if (response.status === 403) {
                    throw new Error(`API key lacks required permissions: ${errorMessage}`);
                } else if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again later.');
                } else {
                    throw new Error(`Open Cloud API error (${response.status}): ${errorMessage}`);
                }
            }

            return (await response.json()) as T;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new Error('Request timed out');
                }
                throw error;
            }
            throw new Error(`Unknown error: ${String(error)}`);
        }
    }

    /**
     * Search Creator Store assets
     * 
     * @param params Search parameters
     * @returns Search results with asset list and pagination
     */
    async searchAssets(params: AssetSearchParams): Promise<AssetSearchResponse> {
        const { searchCategoryType, query, pageToken, pageNumber, maxPageSize, sortDirection, sortCategory, includeOnlyVerifiedCreators, userId, groupId } = params;

        const queryParams: Record<string, string | number | boolean | undefined> = {
            searchCategoryType,
            query,
            pageToken,
            pageNumber,
            maxPageSize: maxPageSize || 25,
            sortDirection,
            sortCategory,
            includeOnlyVerifiedCreators,
            userId,
            groupId,
        };

        return this.request<AssetSearchResponse>('/toolbox-service/v2/assets:search', {
            params: queryParams,
        });
    }

    /**
     * Get details for a single Creator Store asset
     * 
     * @param assetId The asset ID to retrieve details for
     * @returns Full asset details including creator, voting, and product info
     */
    async getAssetDetails(assetId: number): Promise<CreatorStoreAsset> {
        return this.request<CreatorStoreAsset>(`/toolbox-service/v2/assets/${assetId}`);
    }

    /**
     * Get thumbnail URL for an asset
     * 
     * Uses the public thumbnails API which doesn't require API key
     * 
     * @param assetId The asset ID
     * @param size Thumbnail size (default: 420x420)
     * @returns Thumbnail URL or null if not available
     */
    async getAssetThumbnail(
        assetId: number,
        size: '150x150' | '420x420' | '768x432' = '420x420'
    ): Promise<string | null> {
        // The thumbnails API is publicly accessible
        const url = `https://thumbnails.roblox.com/v1/assets?assetIds=${assetId}&size=${size}&format=Png`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                return null;
            }

            const data = (await response.json()) as { data: ThumbnailResponse[] };
            const thumbnail = data.data[0];

            if (thumbnail && thumbnail.state === 'Completed' && thumbnail.imageUrl) {
                return thumbnail.imageUrl;
            }

            return null;
        } catch {
            return null;
        }
    }

    /**
     * Get multiple asset thumbnails in batch
     * 
     * @param assetIds Array of asset IDs (max 100)
     * @param size Thumbnail size
     * @returns Map of assetId to thumbnail URL
     */
    async getAssetThumbnails(
        assetIds: number[],
        size: '150x150' | '420x420' | '768x432' = '420x420'
    ): Promise<Map<number, string>> {
        const result = new Map<number, string>();

        if (assetIds.length === 0) {
            return result;
        }

        // Batch in groups of 100
        const batches = [];
        for (let i = 0; i < assetIds.length; i += 100) {
            batches.push(assetIds.slice(i, i + 100));
        }

        for (const batch of batches) {
            const url = `https://thumbnails.roblox.com/v1/assets?assetIds=${batch.join(',')}&size=${size}&format=Png`;

            try {
                const response = await fetch(url);
                if (response.ok) {
                    const data = (await response.json()) as { data: ThumbnailResponse[] };
                    for (const thumbnail of data.data) {
                        if (thumbnail.state === 'Completed' && thumbnail.imageUrl) {
                            result.set(thumbnail.targetId, thumbnail.imageUrl);
                        }
                    }
                }
            } catch {
                // Continue with other batches on failure
            }
        }

        return result;
    }
}

// Export a default instance that reads from environment
export const openCloudClient = new OpenCloudClient();
