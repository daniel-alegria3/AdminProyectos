| Method     | Route                                  | Access                                 | Auth | Description                                                              |
| ---------- | -------------------------------------- | -------------------------------------- | ---- | ------------------------------------------------------------------------ |
| **GET**    | `/users`                               | Admin only                             | ✅    | Get list of all users.                                                   |
| **GET**    | `/user/:user_id`                       | User or Admin                          | ✅    | Get details of a specific user (self or admin).                          |
| **PATCH**  | `/user/:user_id/status`                | Admin only                             | ✅    | Update a user’s status (`ENABLED` / `DISABLED`).                         |
| **POST**   | `/user/register`                       | Public                                 | ❌    | Register a new user account.                                             |
| **POST**   | `/user/login`                          | Public                                 | ❌    | Log in and create a session.                                             |
| **POST**   | `/user/logout`                         | Logged in                              | ✅    | Log out current user.                                                    |
| **GET**    | `/user/is_admin`                       | Logged in                              | ✅    | Check if current user is an admin.                                       |
| **GET**    | `/projects`                            | Logged in                              | ✅    | Get all projects for the current user.                                   |
| **GET**    | `/project/:project_id`                 | Project member or Admin                | ✅    | Get details of a project and its members.                                |
| **POST**   | `/project`                             | Logged in                              | ✅    | Create a new project (user becomes owner).                               |
| **PUT**    | `/project/:project_id`                 | Project owner or Admin                 | ✅    | Update project details (title, dates).                                   |
| **POST**   | `/project/:project_id/assign`          | Project owner or Admin                 | ✅    | Assign a user to the project with a role.                                |
| **DELETE** | `/project/:project_id/assign/:user_id` | Project owner or Admin                 | ✅    | Remove a user from a project.                                            |
| **GET**    | `/tasks`                               | Logged in                              | ✅    | Get tasks assigned to the current user (optionally filtered by project). |
| **GET**    | `/project/:project_id/tasks`           | Project member or Admin                | ✅    | Get tasks for a specific project (optionally filtered by user).          |
| **GET**    | `/task/:task_id`                       | Task project member or Admin           | ✅    | Get details of a specific task and its assigned users.                   |
| **POST**   | `/task`                                | Project member/owner or Admin          | ✅    | Create a new task inside a project.                                      |
| **PATCH**  | `/task/:task_id/status`                | Assigned user, Project owner, or Admin | ✅    | Update the status of a task.                                             |
| **POST**   | `/task/:task_id/assign`                | Logged in                              | ✅    | Assign a user to a task with a role.                                     |
| **POST**   | `/file/upload`                         | Logged in                              | ✅    | Upload a file (stored in DB).                                            |
| **GET**    | `/file/:file_id/download`              | Logged in                              | ✅    | Download a file by ID.                                                   |
| **POST**   | `/project/:project_id/files/:file_id`  | Project member/owner or Admin          | ✅    | Attach an uploaded file to a project.                                    |
| **POST**   | `/task/:task_id/files/:file_id`        | Logged in                              | ✅    | Attach an uploaded file to a task.                                       |
| **GET**    | `/task/:task_id/files`                 | Logged in                              | ✅    | Get list of files attached to a task.                                    |
| **GET**    | `/project/:project_id/files`           | Logged in                              | ✅    | Get list of files attached to a project.                                 |

