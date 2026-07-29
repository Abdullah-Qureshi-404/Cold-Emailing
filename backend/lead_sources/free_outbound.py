import os
from lead_sources.normalizer import load_free_outbound_csv


def import_free_outbound_leads(filepath: str, campaign_id: int) -> list[dict]:
    """
    Reads a Free Outbound Agent CSV file and returns normalized leads.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"File not found: {filepath}")

    return load_free_outbound_csv(filepath, campaign_id)
