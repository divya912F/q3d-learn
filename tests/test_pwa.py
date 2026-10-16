"""The offline app shell must list every frontend module, and every listed file must exist."""
import json
import os
import re
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite://")

FRONT = Path(__file__).resolve().parents[1] / "frontend"


def _shell() -> list[str]:
    src = (FRONT / "sw.js").read_text()
    block = re.search(r"const SHELL = \[(.*?)\];", src, re.S).group(1)
    return re.findall(r"'([^']+)'", block)


def test_service_worker_precaches_every_module():
    shell = set(_shell())
    modules = {p.relative_to(FRONT).as_posix() for p in (FRONT / "js").rglob("*.js")}
    missing = modules - shell
    assert not missing, f"add these to SHELL in frontend/sw.js and bump VERSION: {sorted(missing)}"


def test_shell_files_exist():
    for f in _shell():
        if f != "./":
            assert (FRONT / f).exists(), f


def test_manifest_is_installable():
    m = json.loads((FRONT / "manifest.webmanifest").read_text())
    assert m["display"] == "standalone" and m["start_url"]
    sizes = {i["sizes"] for i in m["icons"]}
    assert {"192x192", "512x512"} <= sizes
    for i in m["icons"]:
        assert (FRONT / i["src"]).exists(), i["src"]
