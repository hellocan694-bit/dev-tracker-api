import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangepasswordemailpageComponent } from './changepasswordemailpage.component';

describe('ChangepasswordemailpageComponent', () => {
  let component: ChangepasswordemailpageComponent;
  let fixture: ComponentFixture<ChangepasswordemailpageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChangepasswordemailpageComponent]
    });
    fixture = TestBed.createComponent(ChangepasswordemailpageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
