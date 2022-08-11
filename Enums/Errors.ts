export enum Errors {
    MUST_BE_MODERATOR_OR_ADMIN = 'Only admins and global moderators can interact with Slow Mode. Please ask an administrator to enable slow mode',
    NO_DIRECT_ROOM = 'Slow mode cannot be enabled inside a direct room.',
    ALREADY_SLOWED = 'This room already has slow mode enabled. If not in effect please contact an administrator or moderator',
    ALREADY_NOT_SLOWED = 'This room does not have slow mode enabled. If that is not the case, please contact an administrator or moderator',
    SLOW_MODE_ENABLE_FAILED = `Failed to enable slow mode! I don't know what is wrong. Please contact your server administrator`,
}
