# 📌 Software de Administración de Proyectos

Este proyecto es un **sistema de administración de proyectos** que permite gestionar usuarios, proyectos y tareas de manera eficiente.  
El sistema está diseñado para ser utilizado por equipos de trabajo que necesiten organizar y dar seguimiento a sus actividades de forma colaborativa.

---

## 🚀 Características principales

### 👥 Gestión de Usuarios
- Registro de nuevos usuarios con:
  - Nombre completo
  - Email
  - Contraseña (cifrada)
  - Teléfono
  - Estado (habilitado o no)
  - Rol (Administrador, Responsable de proyecto, Responsable de tarea)
- Autenticación con email y contraseña.
- Gestión de múltiples roles por usuario.

### 📂 Gestión de Proyectos
- Creación de proyectos con:
  - Título
  - Descripción
  - Fechas de inicio y fin
- Asignación de responsables.
- Adjuntar archivos (PDF, DOC/DOCX, JPG).

### ✅ Gestión de Tareas
- Creación de tareas vinculadas a proyectos.
- Atributos de cada tarea:
  - Título
  - Descripción
  - Fechas de inicio y fin
  - Usuario asignado
- Subida de archivos (PDF, DOC/DOCX, JPG).
- Visualización de tareas por proyecto y por usuario.

### 🔧 Funcionalidades adicionales
- Los administradores pueden crear, editar y eliminar usuarios, proyectos y tareas.
- Los usuarios asignados pueden actualizar el estado de sus tareas.
- Registro de logs de actividad.

---

## 🛠️ Requerimientos No Funcionales
- Validación de formatos de archivos permitidos.
- Contraseñas protegidas mediante cifrado.
- Interfaz web responsiva y accesible.
- Operaciones rápidas (< 2 segundos en condiciones normales).
- Arquitectura **frontend** y **backend** separada.
- Despliegue en la nube (AWS, Heroku, Vercel, Azure, etc.).
- Control de versiones con **Git** y plataformas como GitHub/GitLab.

---

## 📦 Tecnologías recomendadas
- **Frontend:** React, Angular o Vue.js  
- **Backend:** Node.js, Django o Spring Boot  
- **Base de datos:** PostgreSQL o MySQL  
- **Autenticación:** JWT / OAuth2  
- **Infraestructura:** Docker + CI/CD en GitHub Actions/GitLab CI  

---

## 📖 Instalación y ejecución

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/usuario/proyecto-administracion.git
