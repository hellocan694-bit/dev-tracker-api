import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewMainProjectComponent } from './view-main-project.component';

describe('ViewMainProjectComponent', () => {
  let component: ViewMainProjectComponent;
  let fixture: ComponentFixture<ViewMainProjectComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ViewMainProjectComponent]
    });
    fixture = TestBed.createComponent(ViewMainProjectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
