DB_TABLES = {
    "VOCABULARY": "vocabulary",
    "QUOTES": "quotes",
    "WORD_REQUESTS": "word_requests",
    "USER_PROGRESS": "user_progress",
    "LIST_ITEMS": "list_items",
}
DB_BUCKETS = {
    "AUDIO": "audio-files",
    "IMAGES": "image-files",
}
WORD_REQUEST_STATUS = {
    "PENDING": "pending",
    "PROCESSED": "processed",
    "ERROR": "error",
}
GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-3-flash-preview',
    'gemini-3-pro-preview',
    'gemini-3.1-pro-preview',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-flash-latest',
    'gemini-pro-latest'
]