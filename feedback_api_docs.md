# Feedback Module — API Documentation

> **Base URL:** `http://localhost:4200`  
> **Module Prefix:** `/feedbacks`  
> **Full prefix example:** `POST http://localhost:4200/feedbacks`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Global Error Reference](#global-error-reference)
3. [Endpoints](#endpoints)
   - [POST /feedbacks](#1-post-feedbacks--submit-feedback)
   - [GET /feedbacks/me](#2-get-feedbacksme--my-feedbacks)
   - [GET /feedbacks/developer/:id](#3-get-feedbacksdeveloperid--developer-wall)
   - [GET /feedbacks/:id](#4-get-feedbacksid--single-feedback)
   - [PATCH /feedbacks/:id](#5-patch-feedbacksid--update-feedback)
   - [DELETE /feedbacks/:id](#6-delete-feedbacksid--delete-feedback)
   - [GET /feedbacks/filter/status/:status](#7-get-feedbacksfilterstatusstatus)
   - [GET /feedbacks/filter/type/:type](#8-get-feedbacksfiltertypetype)
   - [GET /feedbacks/filter/rating/:rating](#9-get-feedbacksfilterratingrating)
   - [GET /feedbacks/admin/developer/:id](#10-get-feedbacksadmindeveloperid--admin)
   - [GET /feedbacks/admin/count](#11-get-feedbacksadmincount--admin)
   - [GET /feedbacks/admin/count/type/:type](#12-get-feedbacksadmincounttypetype--admin)
   - [GET /feedbacks/admin/count/status/:status](#13-get-feedbacksadmincountstatusstatus--admin)
   - [GET /feedbacks/admin/count/rating/:rating](#14-get-feedbacksadmincountratingrating--admin)
4. [RBAC Matrix](#rbac-matrix)
5. [Enum Reference](#enum-reference)

---

## Authentication

All endpoints in this module **require a valid JWT token**. There are no public (unauthenticated) routes.

Set the `Authorization` header on every request:

```
Authorization: Bearer <your_jwt_token>
```

> The token is issued by the `/auth` module upon login.

---

## Global Error Reference

These errors can be returned by any endpoint.

| Status Code | When it happens |
|---|---|
| `400` | Validation failed (invalid body, wrong enum value, missing required field, invalid ID format) |
| `401` | No token provided, token expired, or token is invalid |
| `403` | Authenticated but insufficient role/ownership |
| `404` | The requested resource does not exist |

**Standard Error Response Shape:**
```json
{
  "statusCode": 403,
  "message": "Access denied to this feedback"
}
```

---

## Endpoints

---

### 1. `POST /feedbacks` — Submit Feedback

Submit a new feedback entry. The authenticated user is automatically recorded as the author.

**Access Level:** `🔓 Any Authenticated User`

#### Request Headers

| Header | Value | Required |
|---|---|---|
| `Authorization` | `Bearer <token>` | ✅ Yes |
| `Content-Type` | `application/json` | ✅ Yes |

#### Request Body

```json
{
  "type": "bug",
  "subject": "Login page crashes on mobile",
  "message": "When I try to log in on iOS Safari, the page goes blank after submitting the form.",
  "rating": 2
}
```

#### Body Field Constraints

| Field | Type | Required | Constraints |
|---|---|---|---|
| `type` | `string` | ❌ Optional | Enum: `bug`, `feature_request`, `general`, `improvement`. Default: `general` |
| `subject` | `string` | ✅ Yes | Min: `3` chars · Max: `120` chars |
| `message` | `string` | ✅ Yes | Min: `10` chars · Max: `2000` chars |
| `rating` | `integer` | ✅ Yes | Min: `1` · Max: `5` |

#### ✅ Success Response — `201 Created`

```json
{
  "status": "success",
  "message": "Feedback submitted successfully",
  "data": {
    "feedback": {
      "_id": "663f1a2b4e8d3c001a2b3c4d",
      "developer": "663e0f1a2b3c4d001e2f3a4b",
      "type": "bug",
      "subject": "Login page crashes on mobile",
      "message": "When I try to log in on iOS Safari, the page goes blank after submitting the form.",
      "rating": 2,
      "status": "pending",
      "createdAt": "2026-04-08T21:10:00.000Z",
      "updatedAt": "2026-04-08T21:10:00.000Z"
    }
  }
}
```

#### ❌ Error Responses

| Status | Scenario | Example Message |
|---|---|---|
| `400` | Missing required field | `"subject" is required` |
| `400` | Rating out of range | `Rating must be at least 1` |
| `400` | Invalid enum value | `"type" must be one of [bug, feature_request, general, improvement]` |
| `401` | No/invalid token | `You are not logged in` |

---

### 2. `GET /feedbacks/me` — My Feedbacks

Returns all feedbacks submitted by the currently authenticated user. Full details, no item cap.

**Access Level:** `🔓 Any Authenticated User`

#### Request Headers

| Header | Value | Required |
|---|---|---|
| `Authorization` | `Bearer <token>` | ✅ Yes |

#### ✅ Success Response — `200 OK`

```json
{
  "status": "success",
  "results": 2,
  "data": {
    "feedbacks": [
      {
        "_id": "663f1a2b4e8d3c001a2b3c4d",
        "developer": "663e0f1a2b3c4d001e2f3a4b",
        "type": "bug",
        "subject": "Login page crashes on mobile",
        "message": "When I try to log in on iOS Safari, the page goes blank.",
        "rating": 2,
        "status": "pending",
        "createdAt": "2026-04-08T21:10:00.000Z",
        "updatedAt": "2026-04-08T21:10:00.000Z"
      },
      {
        "_id": "663f1a2b4e8d3c001a2b9999",
        "developer": "663e0f1a2b3c4d001e2f3a4b",
        "type": "feature_request",
        "subject": "Add dark mode to dashboard",
        "message": "Would love a dark mode option in settings.",
        "rating": 5,
        "status": "under_review",
        "createdAt": "2026-04-07T10:00:00.000Z",
        "updatedAt": "2026-04-07T10:00:00.000Z"
      }
    ]
  }
}
```

> Results are always sorted by **newest first** (`createdAt: -1`).

#### ❌ Error Responses

| Status | Scenario |
|---|---|
| `401` | No/invalid token |

---

### 3. `GET /feedbacks/developer/:id` — Developer Wall

Fetches feedbacks for a specific developer. **The response shape changes based on who is calling.**

**Access Level:** `🔓 Any Authenticated User` (but output varies by role)

#### URL Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | `string (ObjectId)` | ✅ Yes | The target developer's MongoDB ObjectId |

#### Request Headers

| Header | Value | Required |
|---|---|---|
| `Authorization` | `Bearer <token>` | ✅ Yes |

---

#### 🔑 Role-Based Response Differences

> This is the most important endpoint to understand for RBAC integration.

| Caller | Fields returned | Item cap |
|---|---|---|
| **Admin** | All fields (full record) | None |
| **Owner** (same user as `:id`) | All fields (minus `adminNote`) | None |
| **Any other authenticated user** | `type`, `subject`, `message`, `rating`, `createdAt` only | **Max 4 items** |

**Why the cap and field restriction?**  
The `status`, `adminNote`, `resolvedAt`, and `developer` ref are considered internal/sensitive fields. A stranger should only see the public-facing content of a developer's profile — similar to a testimonials wall.

---

#### ✅ Success Response — Owner or Admin — `200 OK`

```json
{
  "status": "success",
  "results": 3,
  "data": {
    "feedbacks": [
      {
        "_id": "663f1a2b4e8d3c001a2b3c4d",
        "developer": "663e0f1a2b3c4d001e2f3a4b",
        "type": "bug",
        "subject": "Login page crashes on mobile",
        "message": "When I try to log in on iOS Safari, the page goes blank.",
        "rating": 2,
        "status": "resolved",
        "resolvedAt": "2026-04-08T22:00:00.000Z",
        "createdAt": "2026-04-08T21:10:00.000Z",
        "updatedAt": "2026-04-08T22:00:00.000Z"
      }
    ]
  }
}
```

#### ✅ Success Response — Other Authenticated User — `200 OK`

```json
{
  "status": "success",
  "results": 4,
  "data": {
    "feedbacks": [
      {
        "type": "bug",
        "subject": "Login page crashes on mobile",
        "message": "When I try to log in on iOS Safari, the page goes blank.",
        "rating": 2,
        "createdAt": "2026-04-08T21:10:00.000Z"
      },
      {
        "type": "feature_request",
        "subject": "Add dark mode",
        "message": "Would love a dark mode option in settings.",
        "rating": 5,
        "createdAt": "2026-04-07T10:00:00.000Z"
      }
    ]
  }
}
```

> Notice: no `_id`, no `developer`, no `status`, no `adminNote` — only public content fields.

#### ❌ Error Responses

| Status | Scenario |
|---|---|
| `400` | `:id` is not a valid MongoDB ObjectId |
| `401` | No/invalid token |
| `404` | Developer with that ID does not exist |

---

### 4. `GET /feedbacks/:id` — Single Feedback

Read a single feedback record by its ID.

**Access Level:** `🔐 Owner or Admin only`

#### URL Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | `string (ObjectId)` | ✅ Yes | The feedback's MongoDB ObjectId |

#### Request Headers

| Header | Value | Required |
|---|---|---|
| `Authorization` | `Bearer <token>` | ✅ Yes |

#### ✅ Success Response — `200 OK`

```json
{
  "status": "success",
  "data": {
    "feedback": {
      "_id": "663f1a2b4e8d3c001a2b3c4d",
      "developer": "663e0f1a2b3c4d001e2f3a4b",
      "type": "bug",
      "subject": "Login page crashes on mobile",
      "message": "When I try to log in on iOS Safari, the page goes blank.",
      "rating": 2,
      "status": "pending",
      "adminNote": null,
      "resolvedAt": null,
      "createdAt": "2026-04-08T21:10:00.000Z",
      "updatedAt": "2026-04-08T21:10:00.000Z"
    }
  }
}
```

#### ❌ Error Responses

| Status | Scenario |
|---|---|
| `400` | `:id` is not a valid MongoDB ObjectId format (`/^[a-f\d]{24}$/i`) |
| `401` | No/invalid token |
| `403` | Token belongs to a user who is neither the owner nor an admin |
| `404` | No feedback found with that ID |

---

### 5. `PATCH /feedbacks/:id` — Update Feedback

Partially update a feedback record. **Allowed fields differ by role.**

**Access Level:** `🔐 Owner or Admin only`

> **Mass Assignment Protection:** Only whitelisted fields are accepted. Any extra fields in the body are silently stripped by Joi (`stripUnknown: true`) before reaching the database.

#### URL Parameters

| Parameter | Type | Required |
|---|---|---|
| `id` | `string (ObjectId)` | ✅ Yes |

#### Request Headers

| Header | Value | Required |
|---|---|---|
| `Authorization` | `Bearer <token>` | ✅ Yes |
| `Content-Type` | `application/json` | ✅ Yes |

---

#### 🔑 Role-Based Field Permissions

| Field | Regular User | Admin |
|---|:---:|:---:|
| `type` | ✅ | ✅ |
| `subject` | ✅ | ✅ |
| `message` | ✅ | ✅ |
| `rating` | ✅ | ✅ |
| `status` | ❌ | ✅ |
| `adminNote` | ❌ | ✅ |
| `resolvedAt` | ❌ | ✅ (auto-set when status → `resolved`) |

---

#### Request Body — Regular User

```json
{
  "subject": "Updated subject text",
  "message": "This is the corrected and more detailed description of the issue.",
  "rating": 3,
  "type": "improvement"
}
```

#### Request Body — Admin

```json
{
  "status": "resolved",
  "adminNote": "Issue has been fixed in version 2.1.4. Please update your app."
}
```

> When an admin sets `status: "resolved"`, the server **automatically** sets `resolvedAt` to the current timestamp. You do not need to send `resolvedAt` manually.

#### Body Field Constraints (All Fields)

| Field | Type | Constraints |
|---|---|---|
| `type` | `string` | Enum: `bug`, `feature_request`, `general`, `improvement` |
| `subject` | `string` | Min: `3` · Max: `120` chars |
| `message` | `string` | Min: `10` · Max: `2000` chars |
| `rating` | `integer` | Min: `1` · Max: `5` |
| `status` | `string` | **Admin only.** Enum: `pending`, `under_review`, `resolved`, `closed` |
| `adminNote` | `string` | **Admin only.** Max: `1000` chars. Accepts `""` or `null` to clear. |
| `resolvedAt` | `string (ISO 8601)` | **Admin only.** Auto-set when `status: "resolved"` |

#### ✅ Success Response — `200 OK`

```json
{
  "status": "success",
  "message": "Feedback updated successfully",
  "data": {
    "feedback": {
      "_id": "663f1a2b4e8d3c001a2b3c4d",
      "developer": "663e0f1a2b3c4d001e2f3a4b",
      "type": "improvement",
      "subject": "Updated subject text",
      "message": "This is the corrected and more detailed description of the issue.",
      "rating": 3,
      "status": "pending",
      "createdAt": "2026-04-08T21:10:00.000Z",
      "updatedAt": "2026-04-08T23:15:00.000Z"
    }
  }
}
```

#### ❌ Error Responses

| Status | Scenario |
|---|---|
| `400` | `:id` is not a valid ObjectId |
| `400` | Body is empty (no updatable field provided) |
| `400` | A field fails its constraint (e.g. `subject` too short) |
| `401` | No/invalid token |
| `403` | Caller is neither owner nor admin |
| `404` | Feedback not found |

---

### 6. `DELETE /feedbacks/:id` — Delete Feedback

Permanently delete a feedback record.

**Access Level:** `🔐 Owner or Admin only`

#### URL Parameters

| Parameter | Type | Required |
|---|---|---|
| `id` | `string (ObjectId)` | ✅ Yes |

#### Request Headers

| Header | Value | Required |
|---|---|---|
| `Authorization` | `Bearer <token>` | ✅ Yes |

#### ✅ Success Response — `200 OK`

```json
{
  "status": "success",
  "message": "Feedback deleted successfully",
  "data": null
}
```

#### ❌ Error Responses

| Status | Scenario |
|---|---|
| `400` | `:id` is not a valid ObjectId |
| `401` | No/invalid token |
| `403` | Caller is neither owner nor admin |
| `404` | Feedback not found |

---

### 7. `GET /feedbacks/filter/status/:status`

Filter feedbacks by status. Admins see all matching feedbacks platform-wide; regular users see only their own.

**Access Level:** `🔓 Any Authenticated User`

#### URL Parameters

| Parameter | Type | Allowed Values |
|---|---|---|
| `status` | `string` | `pending`, `under_review`, `resolved`, `closed` |

#### Request Headers

| Header | Value | Required |
|---|---|---|
| `Authorization` | `Bearer <token>` | ✅ Yes |

#### ✅ Success Response — `200 OK`

```json
{
  "status": "success",
  "results": 1,
  "data": {
    "feedbacks": [
      {
        "_id": "663f1a2b4e8d3c001a2b3c4d",
        "developer": "663e0f1a2b3c4d001e2f3a4b",
        "type": "bug",
        "subject": "Login page crashes on mobile",
        "message": "When I try to log in on iOS Safari, the page goes blank.",
        "rating": 2,
        "status": "pending",
        "createdAt": "2026-04-08T21:10:00.000Z",
        "updatedAt": "2026-04-08T21:10:00.000Z"
      }
    ]
  }
}
```

#### ❌ Error Responses

| Status | Scenario |
|---|---|
| `400` | `:status` value is not in the allowed enum |
| `401` | No/invalid token |

---

### 8. `GET /feedbacks/filter/type/:type`

Filter feedbacks by type. Same scoping rules as the status filter.

**Access Level:** `🔓 Any Authenticated User`

#### URL Parameters

| Parameter | Type | Allowed Values |
|---|---|---|
| `type` | `string` | `bug`, `feature_request`, `general`, `improvement` |

#### Request Headers

| Header | Value | Required |
|---|---|---|
| `Authorization` | `Bearer <token>` | ✅ Yes |

#### ✅ Success Response — `200 OK`

```json
{
  "status": "success",
  "results": 2,
  "data": {
    "feedbacks": [
      {
        "_id": "663f1a2b4e8d3c001a2b3c4d",
        "type": "bug",
        "subject": "Login page crashes on mobile",
        "message": "When I try to log in on iOS Safari, the page goes blank.",
        "rating": 2,
        "createdAt": "2026-04-08T21:10:00.000Z",
        "updatedAt": "2026-04-08T21:10:00.000Z"
      }
    ]
  }
}
```

#### ❌ Error Responses

| Status | Scenario |
|---|---|
| `400` | `:type` is not in the allowed enum |
| `401` | No/invalid token |

---

### 9. `GET /feedbacks/filter/rating/:rating`

Filter feedbacks by exact rating value. Same scoping rules as other filter endpoints.

**Access Level:** `🔓 Any Authenticated User`

#### URL Parameters

| Parameter | Type | Allowed Values |
|---|---|---|
| `rating` | `integer` | `1`, `2`, `3`, `4`, `5` |

#### Request Headers

| Header | Value | Required |
|---|---|---|
| `Authorization` | `Bearer <token>` | ✅ Yes |

#### ✅ Success Response — `200 OK`

```json
{
  "status": "success",
  "results": 1,
  "data": {
    "feedbacks": [
      {
        "_id": "663f9a2b4e8d3c001a2b9999",
        "type": "feature_request",
        "subject": "Add dark mode",
        "message": "Would love a dark mode option in user settings.",
        "rating": 5,
        "createdAt": "2026-04-07T10:00:00.000Z",
        "updatedAt": "2026-04-07T10:00:00.000Z"
      }
    ]
  }
}
```

#### ❌ Error Responses

| Status | Scenario |
|---|---|
| `400` | `:rating` is not an integer between 1 and 5 |
| `401` | No/invalid token |

---

### 10. `GET /feedbacks/admin/developer/:id` — **Admin**

Admin-only route to retrieve the complete feedback list for any developer — full fields, no cap.

**Access Level:** `🛡️ Admin only`

#### URL Parameters

| Parameter | Type | Required |
|---|---|---|
| `id` | `string (ObjectId)` | ✅ Yes — target developer's ID |

#### Request Headers

| Header | Value | Required |
|---|---|---|
| `Authorization` | `Bearer <token>` | ✅ Yes |

#### ✅ Success Response — `200 OK`

```json
{
  "status": "success",
  "results": 3,
  "data": {
    "feedbacks": [
      {
        "_id": "663f1a2b4e8d3c001a2b3c4d",
        "developer": "663e0f1a2b3c4d001e2f3a4b",
        "type": "bug",
        "subject": "Login page crashes on mobile",
        "message": "When I try to log in on iOS Safari, the page goes blank.",
        "rating": 2,
        "status": "resolved",
        "adminNote": "Fixed in v2.1.4",
        "resolvedAt": "2026-04-08T22:00:00.000Z",
        "createdAt": "2026-04-08T21:10:00.000Z",
        "updatedAt": "2026-04-08T22:00:00.000Z"
      }
    ]
  }
}
```

#### ❌ Error Responses

| Status | Scenario |
|---|---|
| `400` | `:id` is not a valid ObjectId |
| `401` | No/invalid token |
| `403` | Caller's role is not `admin` |
| `404` | Developer not found |

---

### 11. `GET /feedbacks/admin/count` — **Admin**

Returns the total number of feedback documents across the entire platform.

**Access Level:** `🛡️ Admin only`

#### Request Headers

| Header | Value | Required |
|---|---|---|
| `Authorization` | `Bearer <token>` | ✅ Yes |

#### ✅ Success Response — `200 OK`

```json
{
  "status": "success",
  "data": {
    "count": 142
  }
}
```

#### ❌ Error Responses

| Status | Scenario |
|---|---|
| `401` | No/invalid token |
| `403` | Caller is not admin |

---

### 12. `GET /feedbacks/admin/count/type/:type` — **Admin**

Returns the total count of feedbacks matching a specific type.

**Access Level:** `🛡️ Admin only`

#### URL Parameters

| Parameter | Allowed Values |
|---|---|
| `type` | `bug`, `feature_request`, `general`, `improvement` |

#### ✅ Success Response — `200 OK`

```json
{
  "status": "success",
  "data": {
    "type": "bug",
    "count": 47
  }
}
```

#### ❌ Error Responses

| Status | Scenario |
|---|---|
| `400` | `:type` not in enum |
| `401` | No/invalid token |
| `403` | Caller is not admin |

---

### 13. `GET /feedbacks/admin/count/status/:status` — **Admin**

Returns total count of feedbacks matching a specific status.

**Access Level:** `🛡️ Admin only`

#### URL Parameters

| Parameter | Allowed Values |
|---|---|
| `status` | `pending`, `under_review`, `resolved`, `closed` |

#### ✅ Success Response — `200 OK`

```json
{
  "status": "success",
  "data": {
    "status": "pending",
    "count": 63
  }
}
```

#### ❌ Error Responses

| Status | Scenario |
|---|---|
| `400` | `:status` not in enum |
| `401` | No/invalid token |
| `403` | Caller is not admin |

---

### 14. `GET /feedbacks/admin/count/rating/:rating` — **Admin**

Returns total count of feedbacks with a specific rating.

**Access Level:** `🛡️ Admin only`

#### URL Parameters

| Parameter | Allowed Values |
|---|---|
| `rating` | `1`, `2`, `3`, `4`, `5` |

#### ✅ Success Response — `200 OK`

```json
{
  "status": "success",
  "data": {
    "rating": 5,
    "count": 38
  }
}
```

#### ❌ Error Responses

| Status | Scenario |
|---|---|
| `400` | `:rating` is not an integer 1–5 |
| `401` | No/invalid token |
| `403` | Caller is not admin |

---

## RBAC Matrix

| Endpoint | Regular User | Admin |
|---|:---:|:---:|
| `POST /feedbacks` | ✅ | ✅ |
| `GET /feedbacks/me` | ✅ (own only) | ✅ |
| `GET /feedbacks/developer/:id` | ✅ (4 public fields) | ✅ (full) |
| `GET /feedbacks/:id` | ✅ (own only) | ✅ (any) |
| `PATCH /feedbacks/:id` | ✅ (own, content fields) | ✅ (any, + status/note) |
| `DELETE /feedbacks/:id` | ✅ (own only) | ✅ (any) |
| `GET /feedbacks/filter/status/:status` | ✅ (own scope) | ✅ (platform-wide) |
| `GET /feedbacks/filter/type/:type` | ✅ (own scope) | ✅ (platform-wide) |
| `GET /feedbacks/filter/rating/:rating` | ✅ (own scope) | ✅ (platform-wide) |
| `GET /feedbacks/admin/developer/:id` | ❌ | ✅ |
| `GET /feedbacks/admin/count` | ❌ | ✅ |
| `GET /feedbacks/admin/count/type/:type` | ❌ | ✅ |
| `GET /feedbacks/admin/count/status/:status` | ❌ | ✅ |
| `GET /feedbacks/admin/count/rating/:rating` | ❌ | ✅ |

---

## Enum Reference

### `type`
| Value | Description |
|---|---|
| `bug` | Something is broken or not working correctly |
| `feature_request` | Suggestion for a new capability |
| `general` | General comment or feedback (default) |
| `improvement` | Enhancement to an existing feature |

### `status` *(managed by Admin only)*
| Value | Description |
|---|---|
| `pending` | Newly submitted, not yet reviewed (default) |
| `under_review` | Admin has acknowledged and is investigating |
| `resolved` | Issue addressed; `resolvedAt` is auto-stamped |
| `closed` | Feedback closed without action |

### `rating`
| Value | Meaning |
|---|---|
| `1` | Very poor |
| `2` | Poor |
| `3` | Average |
| `4` | Good |
| `5` | Excellent |
