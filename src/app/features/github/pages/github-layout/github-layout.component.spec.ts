import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GithubLayoutComponent } from './github-layout.component';

describe('GithubLayoutComponent', () => {
  let component: GithubLayoutComponent;
  let fixture: ComponentFixture<GithubLayoutComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GithubLayoutComponent]
    });
    fixture = TestBed.createComponent(GithubLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
