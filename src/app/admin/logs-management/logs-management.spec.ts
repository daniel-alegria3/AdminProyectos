import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LogsManagement } from './logs-management';

describe('LogsManagement', () => {
  let component: LogsManagement;
  let fixture: ComponentFixture<LogsManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogsManagement]
    }).compileComponents();

    fixture = TestBed.createComponent(LogsManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
