import { Component, inject, OnInit, ElementRef, effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { WritingService } from '../../../../core/services/writing.service';
import { SectionHeaderComponent } from '../../../../shared/components/section-header/section-header.component';

@Component({
  selector: 'app-writing',
  imports: [DatePipe, SectionHeaderComponent],
  templateUrl: './writing.component.html',
  styleUrl: './writing.component.scss'
})
export class WritingComponent implements OnInit {
  private readonly el = inject(ElementRef);
  readonly writingService = inject(WritingService);

  private savedScrollY = 0;
  private pendingScroll = false;

  constructor() {
    effect(() => {
      const expanded = this.writingService.expandedWriting();
      if (expanded && this.pendingScroll) {
        // Wait for DOM to render the reading-pop
        setTimeout(() => {
          const readingPop = this.el.nativeElement.querySelector('.reading-pop');
          if (readingPop) {
            readingPop.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          this.pendingScroll = false;
        });
      }
    });
  }

  ngOnInit(): void {
    this.writingService.loadWritings().subscribe();
    this.writingService.loadTypes().subscribe();
  }

  setTab(type: string): void {
    this.writingService.setSelectedType(type);
  }

  expandWriting(event: Event, writing: any): void {
    event.preventDefault();
    this.savedScrollY = window.scrollY;
    this.pendingScroll = true;
    this.writingService.expandWriting(writing);
  }

  closeReading(): void {
    this.writingService.collapseWriting();
    window.scrollTo({ top: this.savedScrollY, behavior: 'smooth' });
  }
}
