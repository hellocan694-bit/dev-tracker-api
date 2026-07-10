import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LearnaboutusComponent } from './learnaboutus.component';

describe('LearnaboutusComponent', () => {
  let component: LearnaboutusComponent;
  let fixture: ComponentFixture<LearnaboutusComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LearnaboutusComponent]
    });
    fixture = TestBed.createComponent(LearnaboutusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
