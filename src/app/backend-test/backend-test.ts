import { Component } from '@angular/core';
import { BackendService } from './backend.service';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-backend-test',
  imports: [JsonPipe],
  templateUrl: './backend-test.html',
  styleUrls: ['./backend-test.css']
})
export class BackendTest {
  response: any;

  constructor(private backend: BackendService) {}

  testUpdateUserStatus() {
    this.backend.updateUserStatus({
      user_id: 1,
      account_status: 'DISABLED'
    }).subscribe(res => this.response = res);
  }

  testRegister() {
    this.backend.register({
      name: 'Tester',
      email: 'tester@example.com',
      password: 'secret'
    }).subscribe(res => this.response = res);
  }

  testLogin() {
    this.backend.login({
      email: 'tester@example.com',
      password: 'secret'
    }).subscribe(res => this.response = res);
  }

  testLogout() {
    this.backend.logout().subscribe(res => this.response = res);
  }

  testGetUsers() {
    this.backend.getAllUsers().subscribe(res => this.response = res);
  }

  testCreateProject() {
    this.backend.createProject({
      title: 'My Test Project',
      start_date: '2025-09-25',
      end_date: '2025-12-31'
    }).subscribe(res => this.response = res);
  }

  testGetProjects() {
    this.backend.getAllProjects().subscribe(res => this.response = res);
  }

  testCreateTask() {
    this.backend.createTask({
      project_id: 1,
      title: 'Demo Task',
      description: 'Testing task creation'
    }).subscribe(res => this.response = res);
  }
}

