import { Component, inject, OnInit } from '@angular/core';
import { SiteService } from '../../core/services/site.service';
import { HeroComponent } from './components/hero/hero.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { WritingComponent } from './components/writing/writing.component';
import { AboutComponent } from './components/about/about.component';
import { ContactComponent } from './components/contact/contact.component';

@Component({
  selector: 'app-home',
  imports: [
    HeroComponent,
    GalleryComponent,
    WritingComponent,
    AboutComponent,
    ContactComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  readonly siteService = inject(SiteService);

  ngOnInit(): void {
    // Load site data on init
    this.siteService.loadSiteData().subscribe();
  }
}
