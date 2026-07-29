import dns.resolver


def verify_email_domain(email: str) -> bool:
    """
    Verifies if the domain of the given email address has valid MX (Mail Exchange) DNS records.
    Returns True if MX records exist and resolve, False otherwise.
    """
    if not email or "@" not in email:
        return False

    # Extract domain from email address
    domain = email.split("@")[-1].strip()

    try:
        # Query MX records via dnspython resolver
        answers = dns.resolver.resolve(domain, "MX")
        return len(answers) > 0
    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.resolver.Timeout, Exception) as e:
        print(f"MX lookup failed for domain {domain}: {e}")
        return False
