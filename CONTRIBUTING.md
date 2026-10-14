# Contributing to Q-3D Learn

Thanks for helping make quantum computing easier to learn! 🎉

## Getting set up

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
python run.py          # http://localhost:8000 (auto-reloads on change)
pytest                 # run the tests
```

The frontend is plain ES modules — edit files in `frontend/` and refresh the browser. No build step.

## Where things live

| You want to… | Edit |
|---|---|
| Add a lesson or quiz | `app/content/lessons.py` |
| Add a challenge | `app/content/challenges.py` (targets are normalised automatically) |
| Add an algorithm walkthrough | `app/quantum/algorithms.py` + an expected-outcome test in `tests/test_simulator.py` |
| Add a gate | `app/quantum/gates.py`, the palette in `frontend/js/circuit/editor.js`, and (single-qubit) `frontend/js/quantum.js` |
| Improve the offline tutor | `app/ai/knowledge.py`, `app/ai/tutor.py` |
| Change the look | `frontend/css/main.css` (design tokens are at the top) |

## Guidelines

- Keep the physics correct: add a test for any new simulation behaviour.
- Use the Qiskit bit-ordering convention (q0 is the least-significant bit).
- Keep the frontend dependency-free (Three.js is vendored; CDN libraries must degrade gracefully offline).
- One feature per pull request, with a short description and a screenshot for UI changes.
- Be kind and welcoming in issues and reviews.
