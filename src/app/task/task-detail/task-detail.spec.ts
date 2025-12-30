import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { of } from 'rxjs';

import { TaskDetailComponent } from './task-detail';
import { TaskService } from '@/task/task.service';

describe('TaskDetailComponent', () => {
  let component: TaskDetailComponent;
  let fixture: ComponentFixture<TaskDetailComponent>;

  const taskServiceMock = {
    getTaskDetails: jasmine.createSpy('getTaskDetails').and.returnValue(of({
      id: 1,
      titulo: 'Tarea demo',
      estado: 'PENDING',
      puedo_editar: false,
      archivos: [],
      miembros: [],
      fechaInicio: new Date().toISOString(),
      fechaFin: new Date().toISOString(),
    })),
    downloadFile: jasmine.createSpy('downloadFile').and.returnValue(of(new Blob())),
  };

  const routerMock = {
    navigate: jasmine.createSpy('navigate'),
  };

  const locationMock = {
    back: jasmine.createSpy('back'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskDetailComponent],
      providers: [
        { provide: TaskService, useValue: taskServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: Location, useValue: locationMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (_key: string) => '1', // simula /task/1
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit -> cargarDetalles(1)
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load task details on init when id exists', () => {
    expect(taskServiceMock.getTaskDetails).toHaveBeenCalledWith(1);
    expect(component.loading).toBeFalse();
    expect(component.tarea?.titulo).toBe('Tarea demo');
  });

  it('volver() should call location.back()', () => {
    component.volver();
    expect(locationMock.back).toHaveBeenCalled();
  });

  it('editar() should enable edit modal', () => {
    component.editar();
    expect(component.mostrarFormularioEdicion).toBeTrue();
  });

  it('cerrarFormularioEdicion() should disable edit modal', () => {
    component.mostrarFormularioEdicion = true;
    component.cerrarFormularioEdicion();
    expect(component.mostrarFormularioEdicion).toBeFalse();
  });
});
