"""Cybersecurity & Cryptography — expanded curriculum (v2.3). Merged by content.py."""
from __future__ import annotations

TOPICS_EXTRA = {
    "network": "Network security",
    "web": "Web security",
    "auth": "Authentication",
    "incident": "Defence & response",
    "careers": "Careers",
}

# Existing labs: ciphers, hashing, rsa, firewall, phishing
LESSONS_EXTRA = [
    {
        "id": "cy-network", "order": 8, "title": "Network Security & Firewalls", "topic": "network", "level": "Beginner", "minutes": 8,
        "summary": "How data travels, where attackers listen, and how firewalls draw the line.",
        "blocks": [
            {"type": "text", "html": "Data crosses the internet in <b>packets</b>, each stamped with source and destination IP and port. Understanding the <b>TCP/IP</b> layers tells you where attacks happen — sniffing on the wire, spoofing addresses, flooding a server (DDoS)."},
            {"type": "text", "html": "A <b>firewall</b> enforces rules on that traffic: allow web ports, block the rest, match on first rule wins. An <b>IDS/IPS</b> goes further, spotting patterns like a port scan sweeping across ports."},
            {"type": "callout", "kind": "tip", "html": "In the firewall lab, write first-match rules and replay live traffic against the wall — then watch the intrusion detector light up on a port scan."},
            {"type": "try", "target": "lab", "lab": "firewall", "label": "Write firewall rules and catch a port scan", "preset": {}},
        ],
        "quiz": [
            {"q": "Internet data travels in…", "options": ["One big file", "Packets with source/destination addresses", "Only emails", "Encrypted blocks only"], "answer": 1, "explain": "Packets carry IP+port headers and a payload."},
            {"q": "A firewall typically matches rules…", "options": ["Randomly", "First match wins", "Last match only", "Never"], "answer": 1, "explain": "Ordered rules; the first that matches decides."},
            {"q": "A DDoS attack works by…", "options": ["Guessing passwords", "Flooding a server with traffic", "Encrypting files", "Phishing"], "answer": 1, "explain": "Overwhelming volume denies service to real users."},
        ],
    },
    {
        "id": "cy-web", "order": 9, "title": "Web Security & the OWASP Top 10", "topic": "web", "level": "Intermediate", "minutes": 9,
        "summary": "The vulnerabilities behind most real-world breaches — injection, XSS and broken access.",
        "blocks": [
            {"type": "text", "html": "Most breaches exploit web apps. <b>SQL injection</b> smuggles database commands through an input box; <b>cross-site scripting (XSS)</b> injects malicious JavaScript that runs in other users' browsers."},
            {"type": "text", "html": "The <b>OWASP Top 10</b> lists the usual suspects: broken access control, injection, insecure authentication, misconfiguration. The cure is almost always the same — <b>never trust user input</b>: validate, escape, and use parameterised queries."},
            {"type": "formula", "tex": r"\texttt{SELECT * FROM users WHERE name = '} + \text{input} + \texttt{'}\;\Rightarrow\;\text{injectable!}"},
            {"type": "callout", "kind": "warning", "html": "The golden rule: treat every input — form fields, URLs, headers, uploaded files — as hostile until proven safe. Parameterised queries and output-escaping stop injection and XSS at the source."},
        ],
        "quiz": [
            {"q": "SQL injection happens when…", "options": ["Passwords are short", "User input is concatenated into a query", "The server is fast", "HTTPS is used"], "answer": 1, "explain": "Unsanitised input becomes executable SQL."},
            {"q": "XSS injects malicious…", "options": ["SQL", "JavaScript into other users' browsers", "Packets", "Firewalls"], "answer": 1, "explain": "Cross-site scripting runs attacker JS in victims' sessions."},
            {"q": "The one rule that prevents most of these is…", "options": ["Trust all input", "Never trust user input — validate & escape", "Disable HTTPS", "Use longer URLs"], "answer": 1, "explain": "Validation, escaping and parameterised queries close the holes."},
        ],
    },
    {
        "id": "cy-malware", "order": 10, "title": "Malware: Viruses, Worms & Ransomware", "topic": "attacks", "level": "Beginner", "minutes": 7,
        "summary": "The families of malicious software and how they spread.",
        "blocks": [
            {"type": "text", "html": "<b>Malware</b> is any software built to harm. A <b>virus</b> attaches to a file and needs you to run it; a <b>worm</b> spreads on its own across a network; a <b>trojan</b> hides inside something you want."},
            {"type": "text", "html": "<b>Ransomware</b> encrypts your files and demands payment — now a billion-dollar criminal industry. <b>Spyware</b> and <b>keyloggers</b> steal quietly; a <b>botnet</b> enslaves machines for bigger attacks."},
            {"type": "callout", "kind": "insight", "html": "The best defence against ransomware isn't fancy — it's <b>offline backups</b>. If you can restore yesterday's files, the ransom loses its power."},
        ],
        "quiz": [
            {"q": "A worm differs from a virus because it…", "options": ["Needs a user to run it", "Spreads by itself across networks", "Is harmless", "Only encrypts"], "answer": 1, "explain": "Worms self-propagate without user action."},
            {"q": "Ransomware typically…", "options": ["Speeds up your PC", "Encrypts files and demands payment", "Backs up data", "Blocks ports"], "answer": 1, "explain": "It holds data hostage for a ransom."},
            {"q": "The strongest defence against ransomware is…", "options": ["Paying quickly", "Offline backups", "A faster CPU", "Longer passwords"], "answer": 1, "explain": "Restorable backups make the ransom pointless."},
        ],
    },
    {
        "id": "cy-social", "order": 11, "title": "Social Engineering & Phishing", "topic": "attacks", "level": "Beginner", "minutes": 7,
        "summary": "The weakest link is usually human — how attackers exploit trust.",
        "blocks": [
            {"type": "text", "html": "Why crack a password when you can ask for it? <b>Social engineering</b> manipulates people: <b>phishing</b> emails, <b>pretexting</b> (a convincing fake story), <b>baiting</b> (a 'lost' USB stick), and urgency that stops you thinking."},
            {"type": "text", "html": "Phishing red flags: a mismatched sender domain, a link whose real target differs from its text, urgent threats, and requests for credentials or payment. Hover before you click; verify through a known channel."},
            {"type": "callout", "kind": "tip", "html": "The phishing lab lets you dissect a link to find who really owns the domain. The displayed text and the real destination are often completely different."},
            {"type": "try", "target": "lab", "lab": "phishing", "label": "Spot the warning signs and dissect the links", "preset": {}},
        ],
        "quiz": [
            {"q": "Social engineering attacks target…", "options": ["Firewalls", "People's trust and habits", "Encryption keys", "Packets"], "answer": 1, "explain": "They manipulate humans, not machines."},
            {"q": "A classic phishing red flag is…", "options": ["A mismatched sender domain / link", "A plain-text email", "A known contact", "Correct grammar"], "answer": 0, "explain": "Lookalike domains and hidden link targets are giveaways."},
            {"q": "Before clicking a suspicious link you should…", "options": ["Click fast", "Hover to see the real destination and verify", "Reply with your password", "Forward it widely"], "answer": 1, "explain": "Inspect the true URL and confirm via a trusted channel."},
        ],
    },
    {
        "id": "cy-auth", "order": 12, "title": "Authentication, Passwords & MFA", "topic": "auth", "level": "Beginner", "minutes": 8,
        "summary": "Proving who you are — and why passwords alone aren't enough.",
        "blocks": [
            {"type": "text", "html": "Authentication rests on factors: something you <b>know</b> (password), <b>have</b> (phone, key) and <b>are</b> (fingerprint). Passwords are the weakest — reused, guessable, and leaked in breaches."},
            {"type": "text", "html": "Servers should never store passwords directly. They store a <b>salted hash</b> (bcrypt/argon2), so a breach doesn't hand over the plaintext. <b>Multi-factor authentication</b> adds a second factor so a stolen password alone is useless."},
            {"type": "callout", "kind": "warning", "html": "Length beats complexity: a long passphrase of random words outlasts 'P@ssw0rd!'. Even better — a password manager plus MFA everywhere. Try the strength meter in the hashing lab."},
            {"type": "try", "target": "lab", "lab": "hashing", "label": "Test how long a password would survive", "preset": {}},
        ],
        "quiz": [
            {"q": "MFA combines factors such as…", "options": ["Two passwords", "Something you know + have + are", "Two usernames", "Two emails"], "answer": 1, "explain": "Different factor types resist a single stolen secret."},
            {"q": "Servers should store passwords as…", "options": ["Plain text", "A salted hash (bcrypt/argon2)", "An email", "A cookie"], "answer": 1, "explain": "Salted hashing protects users if the DB leaks."},
            {"q": "For password strength, what matters most?", "options": ["Length / entropy", "A single symbol", "Starting with a capital", "Being short"], "answer": 0, "explain": "High entropy (often via length) is what resists cracking."},
        ],
    },
    {
        "id": "cy-crypto-modern", "order": 13, "title": "Modern Symmetric Crypto: AES", "topic": "symmetric", "level": "Intermediate", "minutes": 8,
        "summary": "The cipher protecting most of the world's data — and how to use it correctly.",
        "blocks": [
            {"type": "text", "html": "<b>AES</b> (Advanced Encryption Standard) is the symmetric cipher behind HTTPS, disk encryption and messaging. It scrambles 128-bit blocks through several rounds of substitution and permutation with a 128/256-bit key."},
            {"type": "text", "html": "The cipher is only as safe as its <b>mode</b>. Naive <b>ECB</b> mode leaks patterns (the infamous encrypted-penguin image). Use an <b>authenticated</b> mode like <b>GCM</b>, which also detects tampering, and never reuse a nonce."},
            {"type": "callout", "kind": "warning", "html": "Don't roll your own crypto. The algorithms are public and strong; real breaches come from misuse — reused nonces, ECB mode, hard-coded keys. Use a vetted library correctly."},
        ],
        "quiz": [
            {"q": "AES is a…", "options": ["Hash function", "Symmetric block cipher", "Public-key system", "Firewall"], "answer": 1, "explain": "One shared key encrypts and decrypts fixed-size blocks."},
            {"q": "ECB mode is unsafe because it…", "options": ["Is too slow", "Leaks patterns (identical blocks → identical ciphertext)", "Needs no key", "Detects tampering"], "answer": 1, "explain": "Repeated plaintext blocks stay visible."},
            {"q": "The safe advice on cryptography is…", "options": ["Invent your own", "Use a vetted library correctly (e.g. AES-GCM)", "Reuse nonces", "Hard-code keys"], "answer": 1, "explain": "Misuse, not the algorithm, causes most breaches."},
        ],
    },
    {
        "id": "cy-pki", "order": 14, "title": "TLS, Certificates & PKI", "topic": "publickey", "level": "Intermediate", "minutes": 8,
        "summary": "The padlock in your browser: how strangers establish trust on the open internet.",
        "blocks": [
            {"type": "text", "html": "When you visit an HTTPS site, <b>TLS</b> does a handshake: public-key crypto agrees a shared secret, then fast symmetric encryption protects the session. This is why RSA/ECC and AES work together."},
            {"type": "text", "html": "But how do you know the server's public key is genuine? A <b>certificate</b> signed by a trusted <b>Certificate Authority</b> vouches for it. Your browser ships with a list of CAs it trusts — the <b>public-key infrastructure</b> (PKI)."},
            {"type": "callout", "kind": "insight", "html": "The padlock means 'encrypted and the certificate is valid' — not 'this site is honest'. Phishers buy valid certificates too. Trust the domain name, not just the lock."},
        ],
        "quiz": [
            {"q": "TLS uses public-key crypto mainly to…", "options": ["Encrypt the whole session", "Agree a shared secret, then switch to symmetric", "Store passwords", "Block ports"], "answer": 1, "explain": "Asymmetric for key exchange, symmetric for speed."},
            {"q": "A certificate authority…", "options": ["Hosts websites", "Signs certificates to vouch for a public key", "Encrypts files", "Is a firewall"], "answer": 1, "explain": "CAs are the trust anchors of PKI."},
            {"q": "The browser padlock guarantees…", "options": ["The site is honest", "The connection is encrypted and the cert is valid", "No phishing", "Fast loading"], "answer": 1, "explain": "Encryption + valid cert — not the site's intentions."},
        ],
    },
    {
        "id": "cy-incident", "order": 15, "title": "Defence in Depth & Incident Response", "topic": "incident", "level": "Intermediate", "minutes": 8,
        "summary": "Assume you'll be breached — layer defences and have a plan for when it happens.",
        "blocks": [
            {"type": "text", "html": "No single control is enough, so security uses <b>defence in depth</b>: layers of firewalls, least-privilege access, encryption, monitoring and backups, so one failure doesn't mean game over."},
            {"type": "text", "html": "When something gets through, <b>incident response</b> follows a plan: <b>prepare → detect → contain → eradicate → recover → learn</b>. The blue team watches logs (a SIEM), isolates affected systems and writes an honest post-mortem."},
            {"type": "callout", "kind": "insight", "html": "<b>Zero trust</b> is the modern mindset: never trust by network location, always verify. 'Assume breach' turns security from a wall into a resilient, monitored system."},
        ],
        "quiz": [
            {"q": "Defence in depth means…", "options": ["One strong firewall", "Multiple independent layers of protection", "No monitoring", "Trusting the network"], "answer": 1, "explain": "Layers ensure one failure isn't catastrophic."},
            {"q": "A typical incident-response order is…", "options": ["Pay, ignore, forget", "Detect → contain → eradicate → recover → learn", "Reboot only", "Delete everything"], "answer": 1, "explain": "Contain the damage, remove the threat, then recover and review."},
            {"q": "Zero trust says…", "options": ["Trust the internal network", "Never trust by location, always verify", "Disable passwords", "Trust all certificates"], "answer": 1, "explain": "Every request is authenticated and authorised."},
        ],
    },
    {
        "id": "cy-careers", "order": 16, "title": "Red Team, Blue Team & Getting In", "topic": "careers", "level": "Beginner", "minutes": 7,
        "summary": "The roles in security and how to break into the field ethically.",
        "blocks": [
            {"type": "text", "html": "Security splits into the <b>red team</b> (attack to find holes — pen testers, ethical hackers) and the <b>blue team</b> (defend and respond — SOC analysts, security engineers). The <b>purple team</b> blends both."},
            {"type": "text", "html": "You break in with fundamentals (networking, Linux, a scripting language), hands-on practice (CTF challenges, TryHackMe/HackTheBox), and often a certification (CompTIA Security+, then OSCP). Build a portfolio of write-ups."},
            {"type": "callout", "kind": "warning", "html": "Everything you learn here is for <b>authorised</b> testing only. Hacking systems without permission is a crime. Ethics and written scope are what separate a professional from a criminal."},
        ],
        "quiz": [
            {"q": "The red team's job is to…", "options": ["Defend systems", "Attack systems to find weaknesses", "Write policy only", "Back up data"], "answer": 1, "explain": "Offensive testing (with permission) exposes holes."},
            {"q": "CTFs and HackTheBox are for…", "options": ["Illegal hacking", "Safe, legal hands-on practice", "Buying exploits", "Phishing people"], "answer": 1, "explain": "They're sanctioned practice environments."},
            {"q": "The line between a pro and a criminal is…", "options": ["Skill", "Authorisation and ethics", "Which OS they use", "Speed"], "answer": 1, "explain": "Written permission and scope make testing legal."},
        ],
    },
    {
        "id": "cy-privacy", "order": 17, "title": "Privacy & Staying Safe Online", "topic": "defense", "level": "Beginner", "minutes": 7,
        "summary": "Practical personal security everyone should actually do.",
        "blocks": [
            {"type": "text", "html": "Good security is mostly habits, not hacking skill. The high-impact basics: a <b>password manager</b> with unique passwords, <b>MFA</b> everywhere, keep software <b>updated</b> (patches fix known holes), and <b>back up</b> important data."},
            {"type": "text", "html": "For privacy: think before you share, check app permissions, use a VPN on untrusted Wi-Fi, and remember that 'free' services often sell your data. Your <b>digital footprint</b> is bigger than you think."},
            {"type": "callout", "kind": "tip", "html": "If you do just four things: password manager, MFA, automatic updates, and regular backups. Those four stop the overwhelming majority of real-world attacks on individuals."},
        ],
        "quiz": [
            {"q": "Why keep software updated?", "options": ["For new colours", "Patches close known security holes", "To slow it down", "No reason"], "answer": 1, "explain": "Most attacks exploit already-patched vulnerabilities."},
            {"q": "A password manager lets you…", "options": ["Reuse one password", "Use a unique strong password per site", "Skip MFA", "Share passwords publicly"], "answer": 1, "explain": "It remembers unique credentials so you don't reuse them."},
            {"q": "'Free' online services often…", "options": ["Cost nothing in every sense", "Monetise your personal data", "Have no privacy risk", "Are always safest"], "answer": 1, "explain": "If you're not paying, your data may be the product."},
        ],
    },
]

KNOWLEDGE_EXTRA = {
    "network-security": {"keys": ["network security", "packet", "tcp/ip", "firewall", "ddos", "ids"], "lesson": "cy-network",
                         "text": "Data travels in **packets** with IP/port headers. A **firewall** filters it by first-match rules; an **IDS/IPS** spots patterns like port scans. DDoS floods a server to deny service."},
    "web-security": {"keys": ["web security", "sql injection", "xss", "owasp", "injection"], "lesson": "cy-web",
                     "text": "Most breaches hit web apps: **SQL injection** and **XSS** exploit unsanitised input (the OWASP Top 10). The fix: never trust input — validate, escape, use parameterised queries."},
    "malware": {"keys": ["malware", "virus", "worm", "trojan", "ransomware", "botnet"], "lesson": "cy-malware",
                "text": "**Malware** includes viruses (need running), worms (self-spread), trojans (hidden), and ransomware (encrypts for payment). Offline backups are the best ransomware defence."},
    "social-engineering": {"keys": ["social engineering", "phishing", "pretexting", "baiting"], "lesson": "cy-social",
                           "text": "**Social engineering** attacks people, not machines. Phishing red flags: mismatched sender domains, hidden link targets and false urgency. Hover and verify before clicking."},
    "authentication": {"keys": ["authentication", "mfa", "multi-factor", "salted hash", "password manager", "factors"], "lesson": "cy-auth",
                       "text": "Authentication uses factors you know/have/are. Store a **salted hash** (bcrypt/argon2), not plaintext, and add **MFA** so a stolen password alone is useless. Length beats complexity."},
    "aes": {"keys": ["aes", "symmetric cipher", "ecb", "gcm", "block cipher", "nonce"], "lesson": "cy-crypto-modern",
            "text": "**AES** is the symmetric block cipher behind HTTPS and disk encryption. Use an authenticated mode (GCM), never ECB, and never reuse a nonce. Don't roll your own crypto."},
    "tls-pki": {"keys": ["tls", "https", "certificate", "certificate authority", "pki", "handshake"], "lesson": "cy-pki",
                "text": "**TLS** uses public-key crypto to agree a secret, then symmetric encryption for speed. A **certificate** signed by a trusted **CA** proves a server's key — the basis of PKI."},
    "defence-in-depth": {"keys": ["defence in depth", "incident response", "zero trust", "siem", "blue team"], "lesson": "cy-incident",
                         "text": "**Defence in depth** layers controls so one failure isn't fatal. **Incident response** runs detect→contain→eradicate→recover→learn. **Zero trust**: never trust by location, always verify."},
    "security-careers": {"keys": ["red team", "blue team", "pen test", "ethical hacking", "ctf", "oscp"], "lesson": "cy-careers",
                         "text": "Security splits into offensive **red teams** (pen testers) and defensive **blue teams** (SOC). Learn via CTFs and certs — only ever test systems you're authorised to."},
    "online-safety": {"keys": ["privacy", "staying safe", "updates", "backups", "vpn", "digital footprint"], "lesson": "cy-privacy",
                      "text": "Personal security is habits: a **password manager**, **MFA** everywhere, automatic **updates** and regular **backups** stop most real attacks. Mind your digital footprint."},
}

TERMS_EXTRA = {
    "network-security": ("Network security & firewalls", ["ddos", "ids"]),
    "web-security": ("Web security (OWASP)", ["sql injection", "xss"]),
    "malware": ("Malware", ["ransomware", "virus"]),
    "social-engineering": ("Social engineering", ["phishing"]),
    "authentication": ("Authentication & MFA", ["multi-factor"]),
    "aes": ("AES & symmetric crypto", ["aes"]),
    "tls-pki": ("TLS, certificates & PKI", ["https", "certificate"]),
    "defence-in-depth": ("Defence in depth & IR", ["zero trust"]),
    "security-careers": ("Red / blue teams & careers", ["pen testing"]),
    "online-safety": ("Privacy & online safety", ["password manager"]),
}
