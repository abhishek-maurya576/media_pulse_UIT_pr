"""
Extractive highlight engine — generates article highlights
using sentence scoring without requiring an LLM.

Scoring factors:
- Position: early sentences score higher
- Length: medium-length sentences preferred
- Keyword frequency: sentences with common words score higher
"""

import re
from collections import Counter
from typing import List


def extract_highlights(text: str, max_highlights: int = 5) -> List[str]:
    """
    Extract key sentences from article text using extractive summarization.

    Returns a list of highlight strings.
    """
    if not text or not text.strip():
        return []

    sentences = _split_sentences(text)

    if len(sentences) <= max_highlights:
        return sentences

    # Score each sentence
    word_freq = _compute_word_frequency(text)
    scored = []

    for i, sentence in enumerate(sentences):
        score = _score_sentence(sentence, i, len(sentences), word_freq)
        scored.append((score, i, sentence))

    # Sort by score descending, take top N
    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:max_highlights]

    # Return in original order
    top.sort(key=lambda x: x[1])

    return [s[2] for s in top]


def _split_sentences(text: str) -> List[str]:
    """Split text into sentences."""
    # Remove HTML tags
    clean = re.sub(r'<[^>]+>', ' ', text)
    # Split on sentence boundaries
    sentences = re.split(r'(?<=[.!?])\s+', clean.strip())
    # Filter empty and very short sentences
    result = [s.strip() for s in sentences if len(s.strip()) > 10]
    # If no valid sentences after split, treat the whole text as one
    if not result and clean.strip():
        result = [clean.strip()]
    return result


def _compute_word_frequency(text: str) -> Counter:
    """Compute word frequency for the text."""
    clean = re.sub(r'<[^>]+>', ' ', text)
    words = re.findall(r'\b[a-zA-Z]{3,}\b', clean.lower())

    # Remove common stop words
    stop_words = {
        'the', 'and', 'was', 'for', 'are', 'but', 'not', 'you',
        'all', 'can', 'had', 'her', 'one', 'our', 'out', 'has',
        'have', 'been', 'with', 'this', 'that', 'from', 'they',
        'will', 'what', 'when', 'make', 'like', 'just', 'over',
        'also', 'into', 'more', 'other', 'than', 'then', 'them',
        'some', 'said', 'which', 'their', 'there', 'would', 'about',
    }

    filtered = [w for w in words if w not in stop_words]
    return Counter(filtered)


def _score_sentence(
    sentence: str,
    position: int,
    total: int,
    word_freq: Counter,
) -> float:
    """Score a sentence for highlight extraction."""
    score = 0.0

    # Position score (first 20% of text scores highest)
    position_ratio = position / max(total, 1)
    if position_ratio < 0.2:
        score += 3.0
    elif position_ratio < 0.4:
        score += 2.0
    elif position_ratio < 0.6:
        score += 1.5
    else:
        score += 1.0

    # Length score (prefer medium-length sentences, 50-200 chars)
    length = len(sentence)
    if 50 <= length <= 200:
        score += 2.0
    elif 30 <= length <= 300:
        score += 1.0
    else:
        score += 0.5

    # Keyword frequency score
    words = re.findall(r'\b[a-zA-Z]{3,}\b', sentence.lower())
    if words:
        word_scores = sum(word_freq.get(w, 0) for w in words)
        score += min(word_scores / len(words), 3.0)

    # Presence of numbers (often indicates facts/data)
    if re.search(r'\d+', sentence):
        score += 0.5

    # Presence of quotes
    if '"' in sentence or "'" in sentence:
        score += 0.3

    return score
