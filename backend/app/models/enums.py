from enum import StrEnum


class PlatformType(StrEnum):
    YOUTUBE = "youtube"
    INSTAGRAM = "instagram"
    TIKTOK = "tiktok"
    FACEBOOK = "facebook"


class SocialAccountStatus(StrEnum):
    PENDING = "pending"
    CONNECTED = "connected"
    EXPIRED = "expired"
    REVOKED = "revoked"
    ERROR = "error"


class PlatformAccountType(StrEnum):
    CHANNEL = "channel"
    PAGE = "page"
    BUSINESS = "business"
    PROFILE = "profile"
    OTHER = "other"


class ProjectStatus(StrEnum):
    IDEA = "idea"
    DRAFTING = "drafting"
    PRODUCTION = "production"
    EDITING = "editing"
    SCHEDULED = "scheduled"
    POSTED = "posted"


class SourceType(StrEnum):
    NOTE = "note"
    DOCUMENT = "document"
    TRANSCRIPT = "transcript"
    URL = "url"
    OTHER = "other"


class ChatRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"


class MediaType(StrEnum):
    VIDEO = "video"
    IMAGE = "image"
    TEXT = "text"


class OnboardingStatus(StrEnum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"
