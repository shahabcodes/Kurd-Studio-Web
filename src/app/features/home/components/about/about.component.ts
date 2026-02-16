import { Component, inject } from '@angular/core';
import { SiteService } from '../../../../core/services/site.service';
import { SectionHeaderComponent } from '../../../../shared/components/section-header/section-header.component';

@Component({
  selector: 'app-about',
  imports: [SectionHeaderComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent {
  readonly siteService = inject(SiteService);
}
