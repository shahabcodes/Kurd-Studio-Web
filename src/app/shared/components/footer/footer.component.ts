import { Component, inject } from '@angular/core';
import { SiteService } from '../../../core/services/site.service';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';

@Component({
  selector: 'app-footer',
  imports: [SafeHtmlPipe],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  readonly siteService = inject(SiteService);
  readonly currentYear = new Date().getFullYear();
}
