import { Hero } from './hero.model';
import { NavigationItem, SocialLink } from './navigation.model';
import { Profile } from './profile.model';
import { Section } from './section.model';

export interface SiteData {
  settings: Record<string, string | null>;
  profile?: Profile;
  hero?: Hero;
  sections: Section[];
  navigation: NavigationItem[];
  socialLinks: SocialLink[];
}
