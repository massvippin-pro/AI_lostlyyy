"""Text processing utilities for deterministic NLP and normalization."""

import re
from typing import List, Set

# Common English stopwords and domain-specific non-distinctive filler words
STOPWORDS: Set[str] = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't",
    "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
    "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
    "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
    "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's",
    "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
    "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought",
    "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
    "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
    "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
    "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
    "they've", "this", "those", "through", "to", "too", "under", "until", "up",
    "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
    "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
    "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
    "yourself", "yourselves",
    # Domain filler words
    "lost", "found", "item", "please", "help", "anyone", "contact", "reward"
}


def clean_text(text: str) -> str:
    """Lowercase, strip non-alphanumeric characters, and normalize spaces."""
    if not text:
        return ""
    # Lowercase and replace non-alphanumeric characters with spaces
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
    # Collapse multiple spaces into one
    return " ".join(cleaned.split()).strip()


def tokenize(text: str, remove_stopwords: bool = True) -> List[str]:
    """Tokenize a string into alphanumeric word tokens, optionally filtering stopwords."""
    cleaned = clean_text(text)
    if not cleaned:
        return []
    words = cleaned.split()
    if remove_stopwords:
        words = [w for w in words if w not in STOPWORDS and len(w) > 1]
    return words


def get_token_set(text: str, remove_stopwords: bool = True) -> Set[str]:
    """Return a unique set of processed tokens."""
    return set(tokenize(text, remove_stopwords=remove_stopwords))
