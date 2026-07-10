# Update APIs — Technical Documentation

> **Backend:** Node.js / Express / MongoDB (Mongoose)
> **Auth:** HTTP-only JWT Cookie (`protect` middleware)
> **Validation:** Joi
> **Base path:** all routes are mounted on the Express app as defined in `app.js`

---

## Table of Contents

1. [Update Project](#1-update-project)
2. [Update Task](#2-update-task)
3. [RBAC Permission Matrix](#3-rbac-permission-matrix)
4. [Middleware Chain Diagrams](#4-middleware-chain-diagrams)
5. [Security Design Decisions](#5-security-design-decisions)
6. [Schema Changes](#6-schema-changes)
7. [File Map](#7-file-map)

---

## 1. Update Project

### Endpoint

```
PATCH /dev/projectdev/updateproject/:id
```

### Authentication

Requires a valid HTTP-only JWT cookie (set at login). The `protect` middleware verifies the token and attaches `req.user`.

### Authorization

| Role | Access |
|---|---|
| **Project Owner** (`project.owner === req.user._id`) | ✅ Allowed |
| **Platform Admin** (`req.user.role === "admin"`) | ✅ Allowed |
| Any other authenticated user | ❌ 403 Forbidden |

### Route Parameters

| Param | Type | Description |
|---|---|---|
| `id` | `string` (MongoDB ObjectId) | ID of the project to update |

### Request Body

Content-Type: `application/json`

All fields are **optional**, but **at least one** must be provided.

```json
{
  "name":        "string  (min: 3, max: 255)",
  "clientName":  "string  (min: 2, max: 255)",
  "hourlyRate":  "number  (min: 0)",
  "description": "string  (nullable)",
  "status":      "\"active\" | \"paused\" | \"completed\""
}
```

> [!IMPORTANT]
> Sending an **empty body `{}`** is rejected with `400 Bad Request`. Joi's `.min(1)` constraint is enforced at the controller.

> [!WARNING]
> Any field **not in the whitelist above** is silently stripped before reaching the database (Joi `stripUnknown: true` + service-layer `pick()` guard). This prevents mass-assignment vulnerabilities.

### Middleware Chain

```
HTTP PATCH /:id
  │
  ├─ protect                    ← verifies JWT cookie, attaches req.user
  ├─ authorizeProjectAccess     ← checks owner || admin; attaches req.projectOwner
  └─ updateProject (controller) ← Joi validation → updateDevProject (service)
```

### Responses

#### `200 OK` — Success

```json
{
  "status":  "success",
  "message": "Project updated successfully",
  "data": {
    "_id":         "ObjectId",
    "name":        "string",
    "clientName":  "string",
    "hourlyRate":  0,
    "description": "string",
    "status":      "active",
    "isArchived":  false,
    "updatedAt":   "ISO 8601 date"
  }
}
```

> [!NOTE]
> The response projection is enforced by `.select("name clientName hourlyRate description status isArchived updatedAt")` in the repository — heavy fields like `githubRepoId` or `owner` are never returned.

#### `400 Bad Request` — Validation failed

```json
{
  "status":  "error",
  "message": "\"name\" length must be at least 3 characters long; ..."
}
```

#### `403 Forbidden` — Not owner or admin

```json
{
  "status":  "error",
  "message": "Access denied. Only the project owner or an admin can perform this action."
}
```

#### `404 Not Found` — Project doesn't exist or ownership mismatch

```json
{
  "status":  "error",
  "message": "Project not found or you are not authorised to update it."
}
```

---

## 2. Update Task

### Endpoint

```
PATCH /dev/tasks/updatetask/:projectId/:taskId
```

### Authentication

Same as above — requires valid HTTP-only JWT cookie.

### Authorization & Field-Level RBAC

This endpoint has **two tiers of access** — who can call it, and what they can update:

| Role | Can call? | Updatable Fields |
|---|---|---|
| **Platform Admin** (`role === "admin"`) | ✅ | All fields |
| **Project Owner** (`project.owner === req.user._id`) | ✅ | All fields |
| **Team member** with `canManageTasks: true` permission | ✅ | All fields |
| **Assigned Developer** (`task.assignedTo === req.user._id`) | ✅ | `status`, `progress` only |
| Any other authenticated user | ❌ | — |

### Route Parameters

| Param | Type | Description |
|---|---|---|
| `projectId` | `string` (ObjectId) | The project the task belongs to |
| `taskId` | `string` (ObjectId) | The task to update |

### Request Body

Content-Type: `application/json`

```json
{
  "title":          "string  (min: 3, max: 255)      — Owner/Admin only",
  "estimatedHours": "number  (min: 0)                — Owner/Admin only",
  "deadline":       "ISO 8601 date                   — Owner/Admin only",
  "assignedTo":     "string  (24-char hex ObjectId)  — Owner/Admin only",
  "status":         "\"todo\" | \"in-progress\" | \"done\"  — All roles",
  "progress":       "number  (0–100)                 — All roles"
}
```

> [!IMPORTANT]
> If an **assigned developer** sends owner-only fields (`title`, `deadline`, etc.), those fields are **silently dropped** — they are authenticated and authorised, just with a narrower field scope. No 403 is thrown for extra fields.

> [!WARNING]
> Sending an **empty body** returns `400 Bad Request`. Providing only disallowed fields (e.g. an assigned-dev sending only `title`) also returns `400` because the `pick()` guard will produce an empty safe-update object.

### Middleware Chain

```
HTTP PATCH /:projectId/:taskId
  │
  ├─ protect               ← verifies JWT cookie, attaches req.user
  ├─ authorizeTaskAccess   ← determines caller role; attaches req.taskContext
  │     │
  │     ├─ Admin?              → next() (isFullAccess: true)
  │     ├─ Project Owner?      → next() (isFullAccess: true)
  │     ├─ canManageTasks?     → next() (isFullAccess: true)
  │     ├─ Assigned Dev?       → next() (isFullAccess: false)
  │     └─ None of above?      → 403 Forbidden
  │
  └─ updateTask (controller)
        │
        ├─ Joi validation (abortEarly: false, stripUnknown: true)
        └─ updateTaskService (service)
              │
              ├─ findTaskWithProject (one DB call)
              ├─ RBAC re-check for field filtering
              ├─ pick(rawUpdates, allowedFields)   ← mass-assignment guard
              └─ updateTaskById (atomic DB update)
```

### Responses

#### `200 OK` — Success

```json
{
  "status":  "success",
  "message": "Task updated successfully",
  "data": {
    "_id":            "ObjectId",
    "title":          "string",
    "status":         "in-progress",
    "progress":       45,
    "estimatedHours": 8,
    "deadline":       "ISO 8601 date",
    "assignedTo":     "ObjectId",
    "project":        "ObjectId",
    "updatedAt":      "ISO 8601 date"
  }
}
```

> [!NOTE]
> Response is projected via `.select("title status progress estimatedHours deadline assignedTo project updatedAt")` — financial fields like `earnedMoney` are excluded from the update response.

#### `400 Bad Request` — Validation failed or no permitted fields

```json
{
  "status":  "error",
  "message": "No valid (or permitted) fields provided for update."
}
```

#### `400 Bad Request` — Task/project mismatch

```json
{
  "status":  "error",
  "message": "Task does not belong to the specified project."
}
```

#### `403 Forbidden`

```json
{
  "status":  "error",
  "message": "Access denied. You do not have permission to update this task."
}
```

#### `404 Not Found`

```json
{
  "status":  "error",
  "message": "Task not found."
}
```

---

## 3. RBAC Permission Matrix

```
┌─────────────────────────┬──────────────────┬──────────────────────────────────────────────────┐
│ Role                    │ Projects         │ Tasks                                            │
├─────────────────────────┼──────────────────┼──────────────────────────────────────────────────┤
│ Platform Admin          │ Update any       │ Update any — all fields                          │
│ Project Owner           │ Update own       │ Update own project's tasks — all fields          │
│ Team Member             │ ✗                │ Update if canManageTasks=true — all fields       │
│   (canManageTasks)      │                  │                                                  │
│ Assigned Developer      │ ✗                │ Update assigned task — status & progress ONLY    │
│ Other Authenticated     │ ✗                │ ✗                                                │
│ Unauthenticated         │ ✗                │ ✗                                                │
└─────────────────────────┴──────────────────┴──────────────────────────────────────────────────┘
```

---

## 4. Middleware Chain Diagrams

### `authorizeProjectAccess`

```
Request arrives (req.user guaranteed by protect)
│
├─ req.user.role === "admin"?
│     └─ YES → next()   (fast-path, no DB call)
│
├─ Extract projectId from req.params.id
│
├─ getOneProjectWithOwner(projectId)
│     └─ .select("owner").lean()   ← minimal projection
│
├─ project not found? → 404
│
├─ project.owner === req.user._id?
│     ├─ YES → attach req.projectOwner → next()
│     └─ NO  → 403 Forbidden
```

### `authorizeTaskAccess`

```
Request arrives (req.user guaranteed by protect)
│
├─ req.user.role === "admin"?
│     └─ YES → next()   (fast-path)
│
├─ Extract projectId, taskId from req.params
│
├─ findTaskWithProject(taskId)
│     └─ .populate({ path:"project", select:"owner hourlyRate" })
│
├─ task not found? → 404
├─ task.project._id !== projectId? → 400
│
├─ callerId === project.owner?
│     └─ YES → req.taskContext = { task, isFullAccess: true } → next()
│
├─ req.user.teams.find(t => t.adminId === project.owner)?.canManageTasks?
│     └─ YES → req.taskContext = { task, isFullAccess: true } → next()
│
├─ task.assignedTo === callerId?
│     └─ YES → req.taskContext = { task, isFullAccess: false } → next()
│
└─ None matched → 403 Forbidden
```

---

## 5. Security Design Decisions

### Anti-Mass-Assignment (Double Guard)

Mass-assignment prevention is enforced at **two independent layers** so neither layer trusts the other blindly:

| Layer | Mechanism |
|---|---|
| **Controller** | `Joi.validate({ stripUnknown: true })` — strips unknown keys from the raw body |
| **Service** | `pick(obj, ALLOWED_FIELDS)` — explicitly re-filters against a hardcoded whitelist |

Even if Joi validation is accidentally bypassed (e.g. schema misconfiguration), the `pick()` call ensures only whitelisted keys reach the DB.

### DB-Level Ownership Enforcement

```js
// project.repository.js — updateProjectById
Project.findOneAndUpdate(
  { _id: projectId, owner: ownerId },  // ← ownership baked into the query
  { $set: updates },
  { new: true, runValidators: true }
)
```

The ownership check is **baked into the MongoDB query filter** — not just a JavaScript `if` in middleware. This means:
- Even if `authorizeProjectAccess` were bypassed, the DB would return `null` (treated as 404).
- No TOCTOU (Time-of-Check-Time-of-Use) race condition between the auth check and the update.

### Cross-Project Task Manipulation Prevention

```js
// task.repository.js — updateTaskById
Tasks.findOneAndUpdate(
  { _id: taskId, project: projectId },  // ← scoped to project
  ...
)
```

A task update **must match both** `taskId` and `projectId`. A caller who knows a `taskId` from another project cannot update it by supplying a different `projectId`.

### Params vs. Body for IDs

All resource IDs (`projectId`, `taskId`) are read exclusively from `req.params` — never from `req.body`. Route params are defined server-side and cannot be forged the same way a JSON body can.

### `runValidators: true`

All `findOneAndUpdate` calls include `runValidators: true`, which re-runs Mongoose schema validators on the patched fields (e.g. `status` enum, `progress` min/max). This provides a third validation layer after Joi and the `pick()` guard.

---

## 6. Schema Changes

### `task.schema.js` — New Fields

```js
// The developer this task is assigned to
assignedTo: {
  type: mongoose.Schema.Types.ObjectId,
  ref:  "Developer",
  default: null,
  index: true,   // indexed for efficient RBAC lookups
}

// Completion percentage
progress: {
  type: Number,
  min:  0,
  max:  100,
  default: 0,
}
```

> [!NOTE]
> Both fields are **additive** (default `null` / `0`) — no migration is needed for existing task documents.

### `auth.schema.js` — New Joi Schema

```js
const updateTaskSchema = joi.object({
  title:          joi.string().min(3).max(255),
  estimatedHours: joi.number().min(0),
  deadline:       joi.date(),
  assignedTo:     joi.string().regex(/^[0-9a-fA-F]{24}$/),
  status:         joi.string().valid("todo", "in-progress", "done"),
  progress:       joi.number().min(0).max(100),
}).min(1);
```

---

## 7. File Map

```
src/
├── middlewares/
│   ├── authorizeProjectAccess.middleware.js   ← NEW
│   └── authorizeTaskAccess.middleware.js      ← NEW
│
├── modules/auth/
│   ├── schemas/
│   │   ├── task.schema.js          ← MODIFIED (assignedTo, progress added)
│   │   └── auth.schema.js          ← MODIFIED (updateTaskSchema added)
│   │
│   ├── repositories/
│   │   ├── project.repository.js   ← MODIFIED (updateProjectById, getOneProjectWithOwner)
│   │   └── task.repository.js      ← MODIFIED (updateTaskById, findTaskWithProject)
│   │
│   ├── services/
│   │   ├── project.service.js      ← MODIFIED (updateDevProject)
│   │   └── task.service.js         ← MODIFIED (updateTaskService)
│   │
│   ├── controllers/
│   │   ├── projectcontroller/
│   │   │   └── updateProject.js    ← NEW
│   │   └── takecontrollers/
│   │       └── updateTask.js       ← NEW
│   │
│   └── routes/
│       ├── project.routes.js       ← MODIFIED (PATCH /updateproject/:id)
│       └── task.routes.js          ← MODIFIED (PATCH /updatetask/:projectId/:taskId)
```

---

*Generated: 2026-07-10 | Project: dev-tracker-api*
