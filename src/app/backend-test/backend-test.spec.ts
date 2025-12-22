import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

import { BackendTest } from './backend-test';

describe('BackendTest', () => {
  let component: BackendTest;
  let fixture: ComponentFixture<BackendTest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackendTest],
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(BackendTest);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
