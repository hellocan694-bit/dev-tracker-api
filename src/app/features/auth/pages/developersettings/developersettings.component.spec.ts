import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DevelopersettingsComponent } from './developersettings.component';

describe('DevelopersettingsComponent', () => {
  let component: DevelopersettingsComponent;
  let fixture: ComponentFixture<DevelopersettingsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DevelopersettingsComponent]
    });
    fixture = TestBed.createComponent(DevelopersettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
