type PermissionProfile = {
  role: 'STUDENT' | 'FACULTY' | 'ADMIN'
  canPublishCampusAnnouncements: boolean
}

export function canPublishCampusAnnouncements(profile: PermissionProfile) {
  if (profile.role === 'ADMIN') {
    return true
  }

  if (profile.role !== 'FACULTY') {
    return false
  }

  return profile.canPublishCampusAnnouncements
}
