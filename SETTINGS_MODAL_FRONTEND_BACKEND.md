# Settings Modal Frontend and Backend

This document explains the Settings modal opened from the top-right user menu. The modal is for user management: Admins can manage People and Invitations, and invited users can be assigned either Admin or Employee access.

## Purpose

The modal lets an Admin:

- View users.
- Search and paginate users.
- Change another user's role to Admin or Employee.
- Delete another user's access.
- View invitations.
- Search and paginate invitations.
- Create, update, resend, and delete invitations.

The frontend hides the Settings entry for non-admin users, and the backend separately enforces Admin access on every management endpoint.

## Frontend

### Entry Point

The entry point is the user menu. It receives the current authenticated user, checks whether the user is an Admin, and only renders the Settings menu item for Admin users.

Clicking Settings closes the dropdown and opens the Settings modal. The current user's id is passed into the modal so the UI can label the current user and block self-management actions.

### Modal Container

The main modal owns shared state for:

- The active tab: People or Invitations.
- Open and close animation.
- Shared list loading.
- Top-level load errors.
- Action-level success or error feedback.
- The floating role/action menu.
- Delete confirmation state.

When the modal opens, it loads the first page of users and invitations in parallel:

```ts
const [usersRes, invitationsRes] = await Promise.all([
  adminApi.listUsers({ page: 1, page_size: PAGE_SIZE }),
  adminApi.listInvitations({ page: 1, page_size: PAGE_SIZE }),
]);
```

When the modal closes, it resets the selected tab, open menus, delete state, feedback messages, invite form state, and the new-invitation highlight.

The modal shell renders the portal, backdrop, header, refresh button, close button, and body content.

### People Tab

The People tab:

- Fetches users through the admin API client.
- Uses `PAGE_SIZE = 10`.
- Debounces search input by `350ms`.
- Searches from page 1 when the search text changes.
- Corrects empty out-of-range pages by requesting the last safe page.

Each user row shows:

- Display name.
- Email.
- `You` badge for the current user.
- Disabled badge when applicable.
- Role badge.

The role badge opens a menu where an Admin can change another user's role to Admin or Employee, or delete that user's access. The current user's own role/action control is disabled.

### Invitations Tab

The Invitations tab:

- Fetches invitations through the admin API client.
- Uses the same page size and search debounce as People.
- Tracks a newly created invitation for a short visual highlight.
- Supports quiet reloads so a newly created invitation can appear immediately while the list refreshes in the background.

Each invitation row shows:

- Email.
- Status.
- Expiration date.
- Optional inviter name.
- Role badge.

The invitation menu supports:

- Change role to Admin or Employee.
- Resend invitation.
- Delete invitation.

Accepted invitations cannot be role-changed or resent from the UI.

### Creating Invitations

The invite form appears only on the Invitations tab.

The form captures:

- Email address.
- Role: Admin or Employee.

When an Admin sends an invitation, the frontend validates that an email is present, calls the create-invitation API, resets the form, switches to the Invitations tab, inserts the returned invitation at the top when it matches the active search, and then refreshes invitations quietly.

### Mutations and UI Safeguards

Mutation logic is centralized in the modal action hook.

The hook handles:

- Creating invitations.
- Updating users.
- Deleting users.
- Updating invitations.
- Resending invitations.
- Deleting invitations.

Frontend safeguards include:

- The current user cannot change their own role.
- The current user cannot delete themselves.
- Accepted invitations cannot be edited or resent from the invitation menu.
- Deletion requires a confirmation dialog.
- All mutation errors are normalized into user-facing messages.

These are usability safeguards only. Backend permissions and validations remain the authority.

### Frontend API Client

The modal uses this REST contract:

| Operation | Method and path |
| --- | --- |
| List users | `GET /users?page=&page_size=&search=` |
| Update user | `PATCH /users/{user_id}` |
| Delete user | `DELETE /users/{user_id}` |
| List invitations | `GET /invitations?page=&page_size=&search=` |
| Create invitation | `POST /invitations` |
| Update invitation | `PATCH /invitations/{invitation_id}` |
| Resend invitation | `POST /invitations/{invitation_id}/resend` |
| Delete invitation | `DELETE /invitations/{invitation_id}` |

The shared Axios client sends these requests under `/api/v1`, includes credentials, and uses auth interceptors so requests rely on the current authenticated session.

## Backend

### Router Registration

The backend registers the user and invitation routers under each configured API prefix. In the frontend, these resolve under `/api/v1`.

### Permission Boundary

Every management endpoint verifies:

- The current session is authenticated.
- The current user is enabled.
- The current user has Admin access.
- The request is scoped to the current account.

This means hiding the Settings button in the frontend is not the security boundary. Backend dependencies enforce access before any list or mutation operation runs.

### User Endpoints

The backend exposes user management endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /users` | List users with optional search and pagination. |
| `GET /users/{user_id}` | Fetch one user. |
| `PATCH /users/{user_id}` | Update role or status. |
| `DELETE /users/{user_id}` | Delete a user. |

The router performs lightweight pagination and search after retrieving scoped rows from the service layer.

Search checks user email and full name.

### Invitation Endpoints

The backend exposes invitation management endpoints:

| Endpoint | Purpose |
| --- | --- |
| `POST /invitations` | Create an invitation and send an email. |
| `GET /invitations` | List invitations with optional search and pagination. |
| `GET /invitations/{invitation_id}` | Fetch one invitation. |
| `PATCH /invitations/{invitation_id}` | Change role, status, or expiry. |
| `POST /invitations/{invitation_id}/resend` | Generate a new token, reset expiry, and resend email. |
| `DELETE /invitations/{invitation_id}` | Delete an invitation. |
| `POST /invitations/accept` | Public invitation acceptance flow used outside the settings modal. |

The Settings modal uses every endpoint except `GET /invitations/{invitation_id}` and `POST /invitations/accept`.

Invitation list search checks email.

### Request and Response Models

Important role and status types:

- Invitation roles: Admin, Employee.
- Managed user roles: Admin, Employee, Viewer, Analyst.
- Invitation statuses: Pending, Accepted, Expired, Revoked.
- Mutable invitation statuses: Pending, Revoked.
- Managed user statuses: Active, Disabled.

Update models reject empty payloads, so `PATCH` requests must send at least one mutable field.

### Service Layer

Most backend behavior is in the invitation and user management service.

The service uses privileged Supabase access for:

- Users.
- Invitations.
- Account records.
- Supabase Auth admin APIs.

Key invitation rules:

- Emails are normalized to lowercase.
- Invitations default to a 7-day expiry when no expiration date is provided.
- Expiry must be in the future.
- Invitations can only be sent to allowed company email addresses.
- Existing users cannot be invited.
- A second active pending invitation for the same email is blocked.
- Expired pending invitations are returned as Expired.
- Creating an invitation inserts the row, sends the email, and deletes the inserted row if email delivery fails.
- Resending an invitation creates a new token, resets status to Pending, sets a new expiry, sends the email, and rolls back the previous invitation state if email delivery fails.
- Accepted invitations cannot be modified or resent.

Key user rules:

- Users are listed only within the current account scope.
- Users cannot change their own role or status through this endpoint.
- Users cannot delete themselves through this endpoint.
- Platform-level admin users cannot be managed from this modal.
- Role changes update both the public user record and Supabase Auth metadata.
- If Auth metadata sync fails after a public user update, the service attempts to roll back the public row.
- Deleting a user deletes the Supabase Auth user before deleting the public user row.

### Email and Invitation Tokens

Invitation emails are sent through the email service.

The service builds an accept URL from:

- Frontend app URL.
- Invitation acceptance path.
- Encoded invitation token.
- Invitee email.

Only the token hash is stored. The raw token is encoded into the link and hashed for later verification during acceptance.

### Error Handling

Routers translate service exceptions into HTTP responses:

- `LookupError` becomes `404`.
- `ValueError` becomes `400`.
- Unexpected exceptions become `500`.
- Permission failures become `403`.

The frontend maps backend messages and HTTP statuses to user-facing text. This keeps backend errors specific enough for debugging while giving the modal clearer product copy.

## End-to-End Flow Examples

### Opening the Modal

1. An Admin opens the user menu.
2. The user menu renders Settings because the user has Admin access.
3. Clicking Settings opens the Settings modal.
4. The modal calls `GET /users` and `GET /invitations` in parallel.
5. Backend dependencies verify the session belongs to an enabled Admin.
6. Routers load scoped users and invitations through the service layer.
7. The modal renders the People tab and keeps invitation data ready for tab switching.

### Sending an Invitation

1. Admin opens the Invitations tab.
2. Admin enters an email and selects Employee or Admin.
3. Frontend calls `POST /invitations`.
4. Backend verifies Admin access and account scope.
5. The service normalizes the email, validates that it is allowed, checks for existing users and pending invitations, stores a hashed token, sends the email, and returns the invitation.
6. Frontend resets the form, switches to Invitations, highlights the new row, and quietly refreshes the list.

### Changing a User Role

1. Admin opens another user's role menu.
2. Frontend calls `PATCH /users/{user_id}` with the new role.
3. Backend verifies Admin access and account scope.
4. The service rejects self-management and platform-level admin management.
5. The service updates the public user record, syncs Supabase Auth metadata, and returns the updated user.
6. Frontend updates the user row in place.

## Extension Notes

- Keep new modal actions in the same action hook so mutation state and feedback stay centralized.
- Keep endpoint types aligned between frontend and backend models.
- Treat frontend restrictions as UX only; every business rule must also live in the backend service or dependencies.
- If adding new searchable fields, update both the router search logic and the displayed list fields.
- If adding new roles, update backend model literals, frontend type unions, role labels, and role menus together.
