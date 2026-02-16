import { Component, input } from '@angular/core';

@Component({
  selector: 'app-section-header',
  templateUrl: './section-header.component.html',
  styleUrl: './section-header.component.scss'
})
export class SectionHeaderComponent {
  tag = input<string>();
  title = input<string>();
  titleHighlight = input<string>();
  subtitle = input<string>();
}
