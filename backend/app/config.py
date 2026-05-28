from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    database_url: str = "sqlite:///./etimad.db"
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 50
    # Default to Claude Sonnet 4.6 — strong reasoning, fast, multilingual (good for Arabic)
    claude_model: str = "claude-sonnet-4-6"

    # ─── Etimad scraper config ──────────────────────────
    # Feature flag — disabled by default. Set ETIMAD_SCRAPER_ENABLED=true to turn on.
    etimad_scraper_enabled: bool = False
    etimad_base_url: str = "https://tenders.etimad.sa"
    # Conservative — one request per N seconds. Don't lower this.
    etimad_request_delay_s: float = 6.0
    # Hard cap to prevent runaway scrapes (per CLI invocation).
    etimad_max_requests_per_run: int = 200
    # Identifying User-Agent — be a good citizen.
    etimad_user_agent: str = (
        "EtimadCopilotBot/0.1 (+contact@etimad-copilot.example; respectful crawler; "
        "obeys robots.txt; 1 req/6s)"
    )
    # Respect robots.txt
    etimad_respect_robots: bool = True

    model_config = {"env_file": ".env"}


settings = Settings()
