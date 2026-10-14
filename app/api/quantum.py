"""Quantum endpoints: gate catalog, simulation, 3D-lab helper, QASM and algorithm library."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..config import settings
from ..database import Experiment, User, get_session
from ..quantum import algorithms, qasm
from ..quantum.gates import catalog
from ..quantum.qiskit_runner import qiskit_status, run_with_aer
from ..quantum.simulator import normalize_ops, run_circuit
from ..quantum.validation import MAX_QUBITS, CircuitError
from ..schemas import Circuit, QasmImportRequest, SimulateRequest

router = APIRouter(prefix="/api", tags=["quantum"])
log = logging.getLogger(__name__)


def circuit_error(exc: CircuitError) -> HTTPException:
    return HTTPException(status_code=422, detail={"message": "Invalid circuit", "issues": exc.issues})


@router.get("/gates")
def gates() -> dict:
    return {"gates": catalog(), "max_qubits": MAX_QUBITS}


@router.get("/system")
def system() -> dict:
    from ..ai.tutor import active_provider

    return {
        "app": settings.app_name,
        "version": settings.version,
        "quantum_backend_setting": settings.quantum_backend,
        "qiskit": qiskit_status(),
        "ai_provider": active_provider(),
        "database": settings.database_url.split(":", 1)[0],
    }


@router.post("/simulate")
def simulate(req: SimulateRequest, db: Session = Depends(get_session)) -> dict:
    ops = normalize_ops(req.operations)
    try:
        result = run_circuit(req.num_qubits, ops, shots=req.shots, include_steps=req.include_steps, seed=req.seed)
    except CircuitError as exc:
        raise circuit_error(exc) from exc

    wanted = req.backend if req.backend != "auto" else settings.quantum_backend
    use_qiskit = wanted == "qiskit" or (wanted == "auto" and qiskit_status()["available"])
    if use_qiskit:
        if qiskit_status()["available"]:
            try:
                result["counts"] = run_with_aer(req.num_qubits, ops, req.shots, req.seed, result["measured_qubits"])
                result["backend_used"] = "qiskit-aer"
                result["engine"] = f"AerSimulator (qiskit-aer {qiskit_status()['qiskit_aer']})"
            except Exception as exc:  # pragma: no cover - depends on qiskit install
                log.exception("Qiskit Aer failed")
                result["warnings"].append(f"Qiskit Aer failed ({exc}); counts come from the built-in engine.")
        else:
            result["warnings"].append("Qiskit Aer is not installed; using the built-in Q3D engine. Run `pip install qiskit qiskit-aer`.")

    if req.user_id and db.get(User, req.user_id):
        db.add(Experiment(user_id=req.user_id, num_qubits=req.num_qubits, gate_count=result["gate_count"],
                          depth=result["depth"], backend=result["backend_used"], state_name=result["analysis"]["name"][:64]))
        db.commit()
    return result


@router.post("/lab/state")
def lab_state(circuit: Circuit) -> dict:
    """Single-register state for the 3D Lab (any qubit count, no sampling-heavy work)."""
    try:
        return run_circuit(circuit.num_qubits, circuit.operations, shots=256, include_steps=True)
    except CircuitError as exc:
        raise circuit_error(exc) from exc


@router.post("/qasm/export")
def export_qasm(circuit: Circuit) -> dict:
    ops = normalize_ops(circuit.operations)
    return {"qasm": qasm.to_qasm(circuit.num_qubits, ops), "qiskit": qasm.to_qiskit_code(circuit.num_qubits, ops)}


@router.post("/qasm/import")
def import_qasm(req: QasmImportRequest) -> dict:
    try:
        return qasm.from_qasm(req.qasm)
    except CircuitError as exc:
        raise circuit_error(exc) from exc


@router.get("/algorithms")
def list_algorithms() -> list[dict]:
    return algorithms.list_algorithms()


@router.get("/algorithms/{alg_id}")
def get_algorithm(alg_id: str) -> dict:
    alg = algorithms.get_algorithm(alg_id)
    if not alg:
        raise HTTPException(404, "Algorithm not found")
    return alg
