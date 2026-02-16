import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({
  name: 'imageUrl',
  standalone: true
})
export class ImageUrlPipe implements PipeTransform {
  transform(imageId: number | null | undefined, thumbnail = false): string {
    if (!imageId) return '';
    const suffix = thumbnail ? '/thumbnail' : '';
    return `${environment.apiUrl}/images/${imageId}${suffix}`;
  }
}
