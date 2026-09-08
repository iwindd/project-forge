```erDiagram
USERS ||--|| PROFILES : has
USERS ||--o{ CONNECTIONS : owns
USERS ||--o{ ORGANIZATION_MEMBERS : joins
ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : contains

    USERS ||--o{ SESSIONS : creates
    USERS ||--o{ AUDIT_LOGS : acts
    USERS ||--o{ USER_SECURITY_LOGS : generates
    ORGANIZATIONS ||--o{ AUDIT_LOGS : scopes
    ORGANIZATIONS ||--o{ USER_SECURITY_LOGS : scopes

    USERS {
        uuid id PK
        string status
        datetime created_at
        datetime updated_at
    }

    PROFILES {
        uuid id PK
        uuid user_id FK UK
        string display_name
        string avatar_url
        string bio
        string timezone
        datetime created_at
        datetime updated_at
    }

    CONNECTIONS {
        uuid id PK
        uuid user_id FK
        string provider
        string provider_account_id
        string provider_username
        string access_token_ciphertext
        string scopes
        datetime connected_at
        datetime updated_at
    }

    ORGANIZATIONS {
        uuid id PK
        string name
        string slug UK
        string type
        string status
        uuid created_by FK
        datetime created_at
        datetime updated_at
    }

    ORGANIZATION_MEMBERS {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        string role
        string status
        datetime joined_at
        datetime updated_at
    }

    SESSIONS {
        uuid id PK
        uuid user_id FK
        string token_hash UK
        datetime expires_at
        datetime revoked_at
        datetime created_at
        datetime last_seen_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid organization_id FK
        uuid actor_id FK
        uuid target_user_id FK
        string action
        string resource_type
        string resource_id
        json before_json
        json after_json
        string reason
        string request_id
        datetime created_at
    }

    USER_SECURITY_LOGS {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        string event
        string provider
        string ip_address
        string user_agent
        json metadata
        datetime created_at
    }
```
