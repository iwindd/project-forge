import { describe, expect, it } from 'vitest'
import {
  createOrganizationFormSchema,
  inviteMemberFormSchema
} from './organization-switcher'

describe('organization switcher form contracts', () => {
  it('trims a valid organization name using the API boundary rules', () => {
    expect(createOrganizationFormSchema.parse({ name: '  ทีม A  ' })).toEqual({
      name: 'ทีม A'
    })
  })

  it('rejects an empty organization name', () => {
    expect(() => createOrganizationFormSchema.parse({ name: '   ' })).toThrow()
  })

  it('accepts an optional invite email and a database role id', () => {
    expect(
      inviteMemberFormSchema.parse({
        email: '',
        roleId: '00000000-0000-0000-0000-000000000001'
      })
    ).toEqual({
      email: '',
      roleId: '00000000-0000-0000-0000-000000000001'
    })
  })

  it('rejects an invalid invite email or role id', () => {
    expect(() =>
      inviteMemberFormSchema.parse({
        email: 'not-an-email',
        roleId: 'role-id'
      })
    ).toThrow()
  })
})
