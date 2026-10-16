# Contributing to Q-3D Learn

Thanks for helping make quantum computing, machine learning, data science and AI easier to learn! 🎉

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
| Add a lesson or quiz | `app/courses/<course>/content.py` (quantum: `app/courses/quantum/lessons.py`) |
| Add a challenge | `CHALLENGES` + `check_challenge()` in the same file |
| Add a visual lab | an engine function, an endpoint in `app/api/labs.py`, a module in `frontend/js/labs/` and an entry in `frontend/js/views/labview.js` |
| Add a whole course | see “Adding a course” in the README |
| Add a quantum algorithm walkthrough | `app/quantum/algorithms.py` + an expected-outcome test in `tests/test_simulator.py` |
| Add a gate | `app/quantum/gates.py`, the palette in `frontend/js/circuit/editor.js`, and (single-qubit) `frontend/js/quantum.js` |
| Improve the offline tutor | `KNOWLEDGE` in each course's `content.py`, `app/ai/tutor.py` |
| Change the look | `frontend/css/main.css` (design tokens are at the top) |
| Add a sky mood or ambient sound | `frontend/js/sky.js` (`MOODS`, `SOUNDS`) |
| Add a glossary display name | `TERMS` in `app/services/study.py` (every `KNOWLEDGE` entry becomes a term and a flashcard) |
| Add a new frontend file | also list it in `SHELL` in `frontend/sw.js` and bump `VERSION` (a test checks this) |

## Guidelines

- Keep the science correct: add a test for any new engine behaviour (`tests/test_courses.py` checks content integrity too).
- Use the Qiskit bit-ordering convention (q0 is the least-significant bit).
- Keep the frontend dependency-free (Three.js is vendored; CDN libraries must degrade gracefully offline).
- One feature per pull request, with a short description and a screenshot for UI changes.
- Be kind and welcoming in issues and reviews.
