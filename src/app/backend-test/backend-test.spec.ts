import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackendTest } from './backend-test';

describe('BackendTest', () => {
  let component: BackendTest;
  let fixture: ComponentFixture<BackendTest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackendTest]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BackendTest);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
