export interface Writing {
  id: number;
  title: string;
  slug: string;
  typeName: string;
  typeDisplayName: string;
  subtitle?: string;
  excerpt?: string;
  fullContent?: string;
  datePublished?: string;
  novelName?: string;
  chapterNumber?: number;
  createdAt: string;
}

export interface WritingType {
  id: number;
  typeName: string;
  displayName: string;
  displayOrder: number;
}
