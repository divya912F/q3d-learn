"""Cyber labs added in v2.3: a packet-filter firewall + IDS simulator and a phishing-signal spotter.

The firewall shows how first-match rules and a simple port-scan detector behave on synthetic traffic; the
phishing spotter scores fictional messages and links for common warning signs.
"""
from __future__ import annotations

import ipaddress
import re
from urllib.parse import urlparse

import numpy as np

SERVICES = {22: "SSH", 25: "SMTP", 53: "DNS", 80: "HTTP", 443: "HTTPS", 3306: "MySQL", 3389: "RDP", 8080: "Admin panel"}
SOURCES = {
    "customer": ("Customers (internet)", "203.0.113.0/24"),
    "office": ("Office network", "10.1.0.0/16"),
    "attacker": ("Scanner / attacker", "198.51.100.66/32"),
    "botnet": ("Botnet (many IPs)", "192.0.2.0/24"),
}

PRESETS = {
    "open": {"default": "allow", "rules": []},
    "web_only": {"default": "deny", "rules": [
        {"action": "allow", "proto": "tcp", "port": "80,443", "src": "any", "note": "public website"},
        {"action": "allow", "proto": "udp", "port": "53", "src": "any", "note": "DNS replies"},
    ]},
    "hardened": {"default": "deny", "rules": [
        {"action": "deny", "proto": "any", "port": "any", "src": "198.51.100.66/32", "note": "known scanner"},
        {"action": "allow", "proto": "tcp", "port": "443", "src": "any", "note": "HTTPS only"},
        {"action": "allow", "proto": "tcp", "port": "80", "src": "any", "note": "HTTP → redirects to HTTPS"},
        {"action": "allow", "proto": "tcp", "port": "22", "src": "10.1.0.0/16", "note": "SSH from office only"},
        {"action": "allow", "proto": "udp", "port": "53", "src": "any", "note": "DNS"},
    ]},
    "wrong_order": {"default": "deny", "rules": [
        {"action": "allow", "proto": "any", "port": "any", "src": "any", "note": "‘temporary’ allow-all left in place"},
        {"action": "deny", "proto": "any", "port": "any", "src": "198.51.100.66/32", "note": "block scanner (never reached!)"},
    ]},
}


def _ports(spec: str) -> set[int] | None:
    spec = str(spec or "any").strip().lower()
    if spec in ("any", "*", ""):
        return None
    out: set[int] = set()
    for part in spec.split(","):
        part = part.strip()
        if "-" in part:
            a, b = part.split("-", 1)
            out.update(range(max(0, int(a)), min(65535, int(b)) + 1))
        elif part:
            out.add(int(part))
    return out


def _net(spec: str):
    spec = str(spec or "any").strip().lower()
    return None if spec in ("any", "*", "") else ipaddress.ip_network(spec, strict=False)


def firewall_sim(preset: str = "web_only", rules: list | None = None, default: str | None = None, packets: int = 160,
                 ids: bool = True, scan_threshold: int = 6, seed: int = 2) -> dict:
    """Generate mixed traffic, run it through first-match rules and an IDS that flags port scans."""
    base = PRESETS.get(preset, PRESETS["web_only"])
    rules = (rules if rules is not None else base["rules"])[:12]
    default = (default or base["default"]).lower()
    packets = int(min(600, max(20, packets)))
    rng = np.random.default_rng(int(seed))
    compiled = []
    for r in rules:
        compiled.append({**r, "_ports": _ports(r.get("port")), "_net": _net(r.get("src")),
                         "_proto": str(r.get("proto", "any")).lower(), "hits": 0})
    mix = [("customer", "tcp", 443, 0.38), ("customer", "tcp", 80, 0.12), ("customer", "udp", 53, 0.07),
           ("office", "tcp", 22, 0.08), ("office", "tcp", 3389, 0.03), ("botnet", "tcp", 3306, 0.07),
           ("botnet", "tcp", 22, 0.07), ("attacker", "scan", 0, 0.18)]
    probs = np.array([m[3] for m in mix])
    probs /= probs.sum()
    scan_ports = [21, 22, 23, 25, 53, 80, 110, 139, 443, 445, 1433, 3306, 3389, 5432, 6379, 8080, 9200]
    log, seen_ports = [], {}
    for i in range(packets):
        src_kind, proto, port, _ = mix[rng.choice(len(mix), p=probs)]
        net = ipaddress.ip_network(SOURCES[src_kind][1])
        ip = str(net.network_address + int(rng.integers(1, max(2, net.num_addresses - 1)))) if net.num_addresses > 1 else str(net.network_address)
        if proto == "scan":
            proto, port = "tcp", int(scan_ports[rng.integers(0, len(scan_ports))])
        verdict, rule_idx = default, None
        for k, r in enumerate(compiled):
            if r["_proto"] not in ("any", proto):
                continue
            if r["_ports"] is not None and port not in r["_ports"]:
                continue
            if r["_net"] is not None and ipaddress.ip_address(ip) not in r["_net"]:
                continue
            verdict, rule_idx = r["action"], k
            r["hits"] += 1
            break
        alert = None
        if ids:
            s = seen_ports.setdefault(ip, set())
            s.add(port)
            if len(s) == int(scan_threshold):
                alert = f"Port scan from {ip}: {len(s)} different ports"
        malicious = src_kind in ("attacker", "botnet")
        log.append({"i": i, "src": src_kind, "ip": ip, "proto": proto, "port": port, "service": SERVICES.get(port, f"port {port}"),
                    "verdict": verdict, "rule": rule_idx, "malicious": malicious, "alert": alert})
    allowed = [p for p in log if p["verdict"] == "allow"]
    blocked = [p for p in log if p["verdict"] != "allow"]
    bad_in = sum(p["malicious"] for p in allowed)
    good_blocked = sum(not p["malicious"] for p in blocked)
    exposed = sorted({p["port"] for p in allowed})
    return {
        "preset": preset, "default": default, "rules": [{k: v for k, v in r.items() if not k.startswith("_")} for r in compiled],
        "packets": log, "total": packets, "allowed": len(allowed), "blocked": len(blocked),
        "malicious_allowed": bad_in, "legit_blocked": good_blocked,
        "alerts": [p["alert"] for p in log if p["alert"]], "exposed_ports": [{"port": p, "service": SERVICES.get(p, "?")} for p in exposed],
        "sources": {k: v[0] for k, v in SOURCES.items()},
        "score": max(0, 100 - 2 * bad_in - 3 * good_blocked - 4 * len([p for p in exposed if p not in (80, 443, 53)])),
    }




# ----------------------------------------------------------------------------------- phishing spotter
TRUSTED = {"srijanbank.example": "SRIJAN Bank", "q3dlearn.example": "Q-3D Learn", "mietcampus.example": "MIET Campus"}
MESSAGES = [
    {"id": "bank-alert", "from": "SRIJAN Bank Security <alerts@srijanbank-verify.example>", "subject": "URGENT: Your account will be locked in 2 hours",
     "body": "Dear customer, we noticed unusual activity. Verify your identity immediately or your account will be suspended. Click below and enter your password and OTP.",
     "link_text": "https://srijanbank.example/secure", "link_href": "http://srijanbank-verify.example/login", "attachment": None},
    {"id": "course", "from": "Q-3D Learn <hello@q3dlearn.example>", "subject": "Your weekly study summary",
     "body": "Hi Divya, you studied 3 hours this week and have 12 review cards due. Open your dashboard when you're ready.",
     "link_text": "Open dashboard", "link_href": "https://q3dlearn.example/dashboard", "attachment": None},
    {"id": "prize", "from": "Campus Rewards <rewards@m1etcampus.example>", "subject": "Congratulations!!! You won a free laptop",
     "body": "You have been selected as the lucky winner. To claim your prize pay a small delivery fee today. Offer expires in 24 hours.",
     "link_text": "Claim now", "link_href": "http://m1etcampus.example.claim-prize.example/pay", "attachment": None},
    {"id": "invoice", "from": "Accounts <accounts@mietcampus.example>", "subject": "Invoice overdue - open attached file",
     "body": "Please review the attached invoice and enable macros to view the content.",
     "link_text": None, "link_href": None, "attachment": "Invoice_2026.docm"},
    {"id": "teacher", "from": "Prof. Diya <diya@mietcampus.example>", "subject": "Lab moved to Room 204",
     "body": "Hi everyone, tomorrow's quantum lab is in Room 204 instead of 112. See the timetable on the campus portal.",
     "link_text": "Campus portal", "link_href": "https://mietcampus.example/timetable", "attachment": None},
]
URGENCY = ["urgent", "immediately", "suspend", "locked", "expires", "within 24", "2 hours", "act now", "final notice"]
CREDS = ["password", "otp", "pin", "card number", "verify your identity", "login details"]
MONEY = ["fee", "pay", "prize", "winner", "gift card", "lottery", "free"]


def _lev(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def _registered(host: str) -> str:
    parts = host.lower().strip(".").split(".")
    return ".".join(parts[-2:]) if len(parts) >= 2 else host


def _url_signals(url: str) -> tuple[list[dict], dict]:
    sig = []
    u = urlparse(url if "://" in url else "http://" + url)
    host = (u.hostname or "").lower()
    reg = _registered(host)
    info = {"scheme": u.scheme, "host": host, "registered_domain": reg, "path": u.path or "/", "subdomains": host[: -len(reg)].rstrip(".") if host.endswith(reg) else ""}
    if u.scheme != "https":
        sig.append({"signal": "No HTTPS", "weight": 10, "detail": "The connection would not be encrypted."})
    if reg not in TRUSTED:
        close = min(TRUSTED, key=lambda d: _lev(reg, d))
        dist = _lev(reg.split(".")[0], close.split(".")[0])
        if 0 < dist <= 2:
            sig.append({"signal": "Look-alike domain", "weight": 30, "detail": f"“{reg}” is {dist} character(s) away from the real “{close}”."})
        for d in TRUSTED:
            if d.split(".")[0] in host and reg != d:
                sig.append({"signal": "Brand name in the wrong place", "weight": 25, "detail": f"“{d.split('.')[0]}” appears in the address, but the site actually belongs to “{reg}”."})
                break
    if re.fullmatch(r"[\d.]+", host):
        sig.append({"signal": "Raw IP address", "weight": 20, "detail": "Real organisations use domain names."})
    if "@" in url:
        sig.append({"signal": "@ in the URL", "weight": 20, "detail": "Everything before @ is ignored by the browser."})
    if len(host.split(".")) > 4:
        sig.append({"signal": "Very long sub-domain chain", "weight": 10, "detail": "Used to hide the real domain at the end."})
    return sig, info


def phishing_check(message: str = "bank-alert", url: str = "") -> dict:
    """Score a fictional message (or a URL typed by the learner) for common phishing warning signs."""
    if url:
        sig, info = _url_signals(str(url)[:300])
        risk = min(100, sum(s["weight"] for s in sig))
        return {"mode": "url", "url": url, "url_parts": info, "signals": sig, "risk": risk,
                "verdict": "high" if risk >= 50 else "medium" if risk >= 20 else "low", "messages": [m["id"] for m in MESSAGES]}
    m = next((x for x in MESSAGES if x["id"] == message), MESSAGES[0])
    text = (m["subject"] + " " + m["body"]).lower()
    sig = []
    sender = re.search(r"@([\w.-]+)", m["from"]).group(1).lower()
    sreg = _registered(sender)
    if sreg not in TRUSTED:
        close = min(TRUSTED, key=lambda d: _lev(sreg, d))
        sig.append({"signal": "Sender domain not the real one", "weight": 25, "detail": f"Sent from “{sreg}”; the real organisation uses “{close}”.", "where": "from"})
    hits = [w for w in URGENCY if w in text]
    if hits:
        sig.append({"signal": "Pressure / urgency", "weight": 15, "detail": "Words like " + ", ".join(f"“{h}”" for h in hits[:3]) + " push you to act before thinking.", "where": "body", "words": hits})
    c = [w for w in CREDS if w in text]
    if c:
        sig.append({"signal": "Asks for secrets", "weight": 30, "detail": "Real banks and colleges never ask for your " + ", ".join(c[:3]) + " by email.", "where": "body", "words": c})
    mo = [w for w in MONEY if re.search(rf"\b{re.escape(w)}\b", text)]
    if mo:
        sig.append({"signal": "Too good to be true / payment", "weight": 15, "detail": "Prizes that need a fee are a classic scam.", "where": "body", "words": mo})
    if "!!!" in m["subject"] or m["subject"].isupper():
        sig.append({"signal": "Shouting subject", "weight": 5, "detail": "Excess punctuation or capitals.", "where": "subject"})
    url_info = None
    if m["link_href"]:
        us, url_info = _url_signals(m["link_href"])
        for s in us:
            s["where"] = "link"
        sig += us
        if m["link_text"] and m["link_text"].startswith("http") and _registered(urlparse(m["link_text"]).hostname or "") != url_info["registered_domain"]:
            sig.append({"signal": "Link text ≠ real destination", "weight": 25, "detail": f"Shows “{m['link_text']}” but goes to “{m['link_href']}”.", "where": "link"})
    if m["attachment"] and re.search(r"\.(docm|xlsm|exe|scr|js|zip|iso)$", m["attachment"], re.I):
        sig.append({"signal": "Risky attachment", "weight": 30, "detail": f"“{m['attachment']}” can run code (macros/executables). Never enable macros from email.", "where": "attachment"})
    risk = min(100, sum(s["weight"] for s in sig))
    return {"mode": "message", "message": m, "signals": sig, "risk": risk, "url_parts": url_info,
            "verdict": "high" if risk >= 50 else "medium" if risk >= 20 else "low", "messages": [{"id": x["id"], "subject": x["subject"]} for x in MESSAGES]}
