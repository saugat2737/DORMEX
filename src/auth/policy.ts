export type SystemRole = 
  | 'STUDENT'
  | 'PROCTOR'
  | 'WARDEN'
  | 'CHIEF_WARDEN'
  | 'HOSTEL_OFFICE'
  | 'SUPER_ADMIN';

export type PermissionAction =
  | 'student.view_self'
  | 'student.manage'
  | 'student.edit_priority'
  | 'inventory.view'
  | 'inventory.manage'
  | 'floor_plan.edit'
  | 'floor_plan.publish'
  | 'cycle.view'
  | 'cycle.manage'
  | 'cycle.publish'
  | 'allocation.join'
  | 'allocation.confirm'
  | 'allocation.override'
  | 'wishlist.manage'
  | 'recommendation.manage'
  | 'complaint.create'
  | 'complaint.vote'
  | 'complaint.manage'
  | 'complaint.view_private'
  | 'room_change.request'
  | 'room_change.review'
  | 'audit.view';

export interface AuthActor {
  id: string;
  college_id: string;
  role: SystemRole;
  scope_type: 'SYSTEM' | 'BUILDING' | 'STUDENT';
  scope_id?: string | null;
  student_profile_id?: string | null;
}

export const ROLE_PERMISSIONS: Record<SystemRole, PermissionAction[]> = {
  STUDENT: [
    'student.view_self',
    'inventory.view',
    'cycle.view',
    'allocation.join',
    'allocation.confirm',
    'wishlist.manage',
    'recommendation.manage',
    'complaint.create',
    'complaint.vote',
    'room_change.request',
  ],
  PROCTOR: [
    'inventory.view',
    'cycle.view',
  ],
  WARDEN: [
    'inventory.view',
    'inventory.manage',
    'cycle.view',
    'complaint.manage',
    'complaint.view_private',
    'room_change.review',
    'audit.view',
  ],
  CHIEF_WARDEN: [
    'inventory.view',
    'inventory.manage',
    'floor_plan.edit',
    'floor_plan.publish',
    'cycle.view',
    'complaint.manage',
    'complaint.view_private',
    'room_change.review',
    'audit.view',
  ],
  HOSTEL_OFFICE: [
    'student.view_self',
    'student.manage',
    'student.edit_priority',
    'inventory.view',
    'inventory.manage',
    'floor_plan.edit',
    'floor_plan.publish',
    'cycle.view',
    'cycle.manage',
    'cycle.publish',
    'complaint.manage',
    'complaint.view_private',
    'room_change.review',
    'audit.view',
  ],
  SUPER_ADMIN: [
    'student.view_self',
    'student.manage',
    'student.edit_priority',
    'inventory.view',
    'inventory.manage',
    'floor_plan.edit',
    'floor_plan.publish',
    'cycle.view',
    'cycle.manage',
    'cycle.publish',
    'allocation.override',
    'complaint.manage',
    'complaint.view_private',
    'room_change.review',
    'audit.view',
  ],
};

export interface ResourceContext {
  resource_type: 'STUDENT' | 'BUILDING' | 'ROOM' | 'CYCLE' | 'COMPLAINT' | 'ALLOCATION' | 'SYSTEM';
  building_id?: string | null;
  student_id?: string | null;
  author_id?: string | null;
  proctor_user_id?: string | null;
  complaint_type?: 'PUBLIC' | 'PRIVATE';
  assigned_to?: string | null;
}

export function can(
  actor: AuthActor,
  action: PermissionAction,
  resource?: ResourceContext
): boolean {
  // 1. Check if actor's role has the requested action permission
  const permissions = ROLE_PERMISSIONS[actor.role] || [];
  if (!permissions.includes(action)) {
    return false;
  }

  // 2. Super Admin has full system scope (except allocation override still requires Super Admin role check)
  if (actor.role === 'SUPER_ADMIN') {
    return true;
  }

  // 3. Chief Warden has system-wide building scope
  if (actor.role === 'CHIEF_WARDEN') {
    return true;
  }

  // 4. Warden: Scope is strictly constrained to their assigned building
  if (actor.role === 'WARDEN') {
    if (actor.scope_type === 'BUILDING' && resource?.building_id) {
      return actor.scope_id === resource.building_id;
    }
    // General queries within warden role are allowed if no specific mismatched building target
    return true;
  }

  // 5. Proctor: Transparent access to assigned students only, no allocation rights
  if (actor.role === 'PROCTOR') {
    if (resource?.resource_type === 'STUDENT' && resource.proctor_user_id) {
      return resource.proctor_user_id === actor.id;
    }
    return true;
  }

  // 6. Student: Cannot access other students' records or mutate outside their own profile
  if (actor.role === 'STUDENT') {
    if (resource?.student_id && actor.student_profile_id) {
      return resource.student_id === actor.student_profile_id;
    }
    if (resource?.author_id) {
      return resource.author_id === actor.id;
    }
  }

  return true;
}
