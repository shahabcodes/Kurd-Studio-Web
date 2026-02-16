export interface NavigationItem {
  id: number;
  label: string;
  link: string;
  iconSvg?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface SocialLink {
  id: number;
  platform: string;
  url: string;
  iconSvg?: string;
  displayOrder: number;
  isActive: boolean;
}
