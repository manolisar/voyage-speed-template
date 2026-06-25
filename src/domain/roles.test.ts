import { describe, it, expect } from 'vitest';
import { roleCanEdit, roleLabel, isRole, ROLES } from './roles';

describe('roles', () => {
  it('lists all five bridge/engine roles', () => {
    expect(ROLES.map((r) => r.value)).toEqual(['master', 'staff', 'navigation', 'bridge', 'chief']);
  });

  it('grants edit rights to everyone except the Bridge Officer', () => {
    expect(roleCanEdit('master')).toBe(true);
    expect(roleCanEdit('staff')).toBe(true);
    expect(roleCanEdit('navigation')).toBe(true);
    expect(roleCanEdit('chief')).toBe(true);
    expect(roleCanEdit('bridge')).toBe(false);
  });

  it('maps labels and validates role strings', () => {
    expect(roleLabel('staff')).toBe('Staff Captain');
    expect(isRole('chief')).toBe(true);
    expect(isRole('captain')).toBe(false);
  });
});
