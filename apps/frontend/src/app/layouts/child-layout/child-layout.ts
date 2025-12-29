import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Child Layout Component
 *
 * Simple layout wrapper for child user pages.
 * Child pages have minimal chrome and a child-friendly interface.
 * No sidebar/bottom nav - child pages handle their own navigation.
 */
@Component({
  selector: 'app-child-layout',
  imports: [RouterOutlet],
  templateUrl: './child-layout.html',
  styleUrl: './child-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildLayout {}
