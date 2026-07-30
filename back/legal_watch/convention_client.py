from back.legal_watch.legifrance_client import _post_with_retry, _get_legifrance_token, _strip_html
from typing import Any, Callable, Dict, List, Optional


def fetch_convention(text_id : str) -> Optional[str]:
    """Récupère le contenu d'une convention collective avec son KALICONT"""
    token = _get_legifrance_token()
    if not token:
        return None
    r = _post_with_retry("/consult/kali/kaliCont", {"textId": text_id}, token)
    if r is None or not r.ok:
        return None
    data = r.json() or {}
    parts = []
    if data.get("title"):
        parts.append(str(data["title"]))
    for article in data.get("articles") or []:
        if isinstance(article, dict):
            content = _strip_html(article.get("content"))
            if content: 
                parts.append(content)
    return "\n".join(p for p in parts if p).strip() or None


def collect_conventions(conventions:List[Dict[str,str]], on_error:Optional[Callable[[str], None]] = None,) -> List[Dict[str, Any]]:
    """Hydrate chaque convention avec son contenu textuel."""
    results = []
    for conv in conventions:
        text_id = conv["textId"]
        try:
            body = fetch_convention(text_id)
        except Exception as e:
            if on_error:
                on_error(f"convention {text_id}: {e}")
            body = None
        raw = body or conv.get("title") or ""
        if not raw:
            continue
        results.append({
            "providerId": text_id,
            "title": conv["title"],
            "jurisdiction": "CONVENTION_COLLECTIVE",
            "decisionDate": None,
            "sourceUrl": f"https://www.legifrance.gouv.fr/conv_coll/id/{text_id}",
            "rawText": raw,
        })
    return results
            
