export function slugifyUniversityName(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
export function extractEmailDomain(email) {
    const atIndex = email.lastIndexOf('@');
    if (atIndex < 0)
        return null;
    return email.slice(atIndex + 1).toLowerCase();
}
