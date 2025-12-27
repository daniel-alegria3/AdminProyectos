import { Component, EventEmitter, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';

import { ProjectsPage } from '../projects/project.page'; // ajusta ruta

@Component({
  selector: 'project-list',
  standalone: true,
  template: '',
})
class StubProjectListComponent {}

@Component({
  selector: 'create-project',
  standalone: true,
  template: '',
})
class StubCreateProjectComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();
}

describe('ProjectsPage (shallow)', () => {
  let fixture: ComponentFixture<ProjectsPage>;
  let component: ProjectsPage;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectsPage],
    })
      // 👇 reemplaza imports + template del componente real
      .overrideComponent(ProjectsPage, {
        set: {
          imports: [CommonModule, StubProjectListComponent, StubCreateProjectComponent],
          template: `
            <div class="proj-container">
              <div class="proj-header">
                <h1 class="proj-title">{{ title() }}</h1>
                <button class="btn btn-primary" (click)="openCreate()">+ Nuevo Proyecto</button>
              </div>

              <project-list></project-list>

              <create-project
                *ngIf="showCreate"
                (closed)="closeCreate()"
                (created)="onCreated()">
              </create-project>
            </div>
          `,
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ProjectsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render title from signal', () => {
    const h1: HTMLElement = fixture.nativeElement.querySelector('.proj-title');
    expect(h1.textContent?.trim()).toBe('Gestión de Proyectos');
  });

  it('showCreate should be false initially and create-project should not be rendered', () => {
    expect(component.showCreate).toBeFalse();
    expect(fixture.nativeElement.querySelector('create-project')).toBeNull();
  });

  it('click "+ Nuevo Proyecto" should open create modal', () => {
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn.btn-primary');
    btn.click();
    fixture.detectChanges();

    expect(component.showCreate).toBeTrue();
    expect(fixture.nativeElement.querySelector('create-project')).not.toBeNull();
  });

  it('should close modal when CreateProjectComponent emits closed', () => {
    component.showCreate = true;
    fixture.detectChanges();

    const childDe = fixture.debugElement.query(By.directive(StubCreateProjectComponent));
    (childDe.componentInstance as StubCreateProjectComponent).closed.emit();
    fixture.detectChanges();

    expect(component.showCreate).toBeFalse();
  });

  it('should close modal when CreateProjectComponent emits created', () => {
    component.showCreate = true;
    fixture.detectChanges();

    const childDe = fixture.debugElement.query(By.directive(StubCreateProjectComponent));
    (childDe.componentInstance as StubCreateProjectComponent).created.emit();
    fixture.detectChanges();

    expect(component.showCreate).toBeFalse();
  });

  it('onCreated() should set showCreate=false', () => {
    component.showCreate = true;
    component.onCreated();
    expect(component.showCreate).toBeFalse();
  });
});
