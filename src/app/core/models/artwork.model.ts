export interface Artwork {
  id: number;
  title: string;
  slug: string;
  typeName: string;
  typeDisplayName: string;
  imageId: number;
  imageUrl: string;
  thumbnailUrl: string;
  description?: string;
  isFeatured: boolean;
  createdAt: string;
}

export interface ArtworkType {
  id: number;
  typeName: string;
  displayName: string;
  displayOrder: number;
}
