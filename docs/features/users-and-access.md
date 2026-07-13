# Users, Roles, and Location Access

This document explains the product behavior for managing **Përdoruesit** in dynamic Inventari accounts. For the implementation-level modal flow, see [`docs/SETTINGS_MODAL_FLOW.md`](../SETTINGS_MODAL_FLOW.md).

## Scope

User management is available for **dynamic desktop accounts** through the top-right user menu. It is not available for legacy accounts.

| User type | User menu shows | Can open settings modal |
| --- | --- | --- |
| Admin | Përdoruesit, Vendndodhjet, Dil | Yes |
| Përdorues | Dil | No |
| Legacy user | Dil | No |

The frontend hides admin-only controls for regular users, but the backend is the security boundary. User routes require admin access.

## Account Model

Each dynamic account has one account owner id. The owner and all managed users share that account scope, so products, locations, actions, history, and exports belong to the account rather than to a single login.

Additional users are created directly by an admin. There is no email invitation flow.

## Roles

| Role | DB value | Behavior |
| --- | --- | --- |
| Admin | `admin` | Full account access, all locations, user management, location management, actions, history, and exports. |
| Përdorues | `perdorues` | Access is controlled per location. |

Admins do not use per-location access rows. A user with role Admin always has full access across the account.

Admins cannot change their own role, deactivate themselves, or delete themselves.

## Per-Location Access

Per-location access only applies to users with role **Përdorues**.

| UI label | DB value | Can view | Can add actions/transfers | Can edit/delete actions |
| --- | --- | --- | --- | --- |
| Pa akses | no row | No | No | No |
| Vetëm shih | `view` | Yes | No | No |
| Shih dhe shto | `add` | Yes | Yes | No |
| Shto dhe ndrysho/fshij | `edit_delete` | Yes | Yes | Yes |

Higher levels include the lower levels. For example, `edit_delete` also allows viewing and adding.

## Përdoruesit Modal

Admins open **Përdoruesit** from the top-right user menu. The settings modal opens over the dashboard, so the inventory page stays mounted underneath.

Admins can:

- Search existing users.
- Create a user with **Emri**, password, role, and optional per-location access.
- Change another user's role between Admin and Përdorues.
- Edit another user's Emri or set a new password.
- Open the **Akses** editor for Përdorues users.
- Deactivate or reactivate another user.
- Delete another user.

When creating or editing passwords, the minimum length is 8 characters.

## Delete and Deactivate Behavior

Deleting a user preserves audit history.

- The user row is deleted (hard delete).
- History rows remain, and may show the creator as “unknown” if the user no longer exists.
- Deactivated users cannot log in.
- (Reactivation no longer applies once deleted.)

## Related Files

- Frontend modal shell: `frontend/src/features/settings/SettingsModal.tsx`
- Users panel: `frontend/src/features/settings/users/UsersSettingsPanel.tsx`
- Access control UI: `frontend/src/components/AccessLevelControl.tsx`
- Permission helpers: `frontend/src/lib/permissions.ts`
- Users API client: `frontend/src/lib/api/users.ts`
- Backend routes: `backend/src/routes/users.ts`
- User management service: `backend/src/services/users/userManagementService.ts`
- Access service: `backend/src/services/access/accessControlService.ts`
- Main migration: `docs/sql/18_user_roles_location_access.sql`
