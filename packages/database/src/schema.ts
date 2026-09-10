export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    counselor_id TEXT NOT NULL,
    room_theme_id TEXT NOT NULL,
    team_id TEXT,
    model_name TEXT NOT NULL,
    prompt_snapshot TEXT,
    memory_snapshot TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    status TEXT NOT NULL,
    summary TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    metadata TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_session_id TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS imported_documents (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    title TEXT NOT NULL,
    kind TEXT NOT NULL,
    content TEXT NOT NULL,
    content_length INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready',
    summary TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS rolling_summaries (
    session_id TEXT PRIMARY KEY,
    counselor_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    covered_message_count INTEGER NOT NULL DEFAULT 0,
    covered_until_message_id TEXT,
    last_attempted_message_count INTEGER,
    last_error_at TEXT,
    source_hash TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    error_message TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS session_conceptualizations (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    counselor_id TEXT NOT NULL,
    model_name TEXT NOT NULL,
    full_md TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    error_message TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS long_term_conceptualizations (
    id TEXT PRIMARY KEY,
    counselor_id TEXT NOT NULL UNIQUE,
    model_name TEXT NOT NULL,
    full_md TEXT NOT NULL,
    covered_session_ids TEXT NOT NULL,
    covered_until_session_id TEXT,
    covered_until_ended_at TEXT,
    status TEXT NOT NULL DEFAULT 'ready',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    error_message TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS session_letters (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    counselor_id TEXT NOT NULL,
    model_name TEXT NOT NULL,
    letter_md TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    error_message TEXT,
    read_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS consultation_preparations (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    counselor_id TEXT NOT NULL,
    source_ended_at TEXT NOT NULL,
    model_name TEXT NOT NULL,
    status TEXT NOT NULL,
    phase TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    error_message TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS session_supervisions (
    id TEXT PRIMARY KEY,
    preparation_id TEXT NOT NULL UNIQUE,
    session_id TEXT NOT NULL,
    counselor_id TEXT NOT NULL,
    supervisor_id TEXT NOT NULL,
    model_name TEXT NOT NULL,
    supervision_md TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    error_message TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS consultation_memos (
    id TEXT PRIMARY KEY,
    preparation_id TEXT NOT NULL UNIQUE,
    source_session_id TEXT NOT NULL,
    counselor_id TEXT NOT NULL,
    model_name TEXT NOT NULL,
    memo_md TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    error_message TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS secrets (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS model_usage (
    id TEXT PRIMARY KEY,
    provider_name TEXT NOT NULL,
    model_name TEXT NOT NULL,
    connection_kind TEXT NOT NULL,
    scope TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )`
];
