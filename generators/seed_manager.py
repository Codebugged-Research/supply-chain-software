import hashlib
import random


class SeedManager:
    """
    Manages deterministic PRNG seed derivation using SHA-256 hashing.
    Ensures byte-for-byte reproducibility without cross-domain PRNG state pollution.
    """

    def __init__(self, master_seed: int = 42):
        self.master_seed = master_seed

    def get_domain_seed(self, domain_name: str) -> int:
        """
        Derives a deterministic integer seed for a specific domain/collection.
        Formula: SHA-256(master_seed + domain_name) converted to integer.
        """
        seed_str = f"{self.master_seed}:{domain_name}"
        hash_bytes = hashlib.sha256(seed_str.encode('utf-8')).digest()
        # Take first 8 bytes as unsigned 64-bit integer
        return int.from_bytes(hash_bytes[:8], byteorder='big')

    def get_random_instance(self, domain_name: str) -> random.Random:
        """
        Returns an isolated random.Random instance seeded specifically for the domain.
        """
        domain_seed = self.get_domain_seed(domain_name)
        return random.Random(domain_seed)
