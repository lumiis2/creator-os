export type PlaceholderType = string;

export type InternalPlatform = "youtube" | "instagram";

export interface InternalMetric {
	platform: InternalPlatform;
	date: string;
	views: number;
	reach: number | null;
	subscribers: number | null;
	likes: number | null;
	comments: number | null;
	engagementRate: number | null;
}
