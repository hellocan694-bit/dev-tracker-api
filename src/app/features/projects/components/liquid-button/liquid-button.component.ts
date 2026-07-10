import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-liquid-button',
  templateUrl: './liquid-button.component.html',
  styleUrls: ['./liquid-button.component.scss']
})
export class LiquidButtonComponent {
  @Input() label = 'Start Tracking for Free';
  @Output() clicked = new EventEmitter<void>();

  onClick() {
    this.clicked.emit();
  }
}
