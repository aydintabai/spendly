from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_publishable_key: str
    supabase_secret_key: str
    database_url: str
    google_api_key: str
    plaid_client_id: str = ""
    plaid_secret: str = ""
    plaid_env: str = "sandbox"

    class Config:
        env_file = ".env"

settings = Settings()