import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { Task } from './task';

describe('Task', () => {
  let component: Task;
  let fixture: ComponentFixture<Task>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Task],
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(Task);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
