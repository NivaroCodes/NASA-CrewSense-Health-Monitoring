import re

from app.domain.analysis import evaluate
from app.domain.metrics import METRICS
from app.domain.recommendations import build_next_steps
from app.domain.types import Severity
from tests.factories import demo_as_of, demo_observations, demo_prior_wellbeing, wellbeing

FORBIDDEN_CLINICAL = re.compile(
    r"\b(diagnos(is|e|ed|es)|treat(ment|ed|s)?|prescri\w*|medication|dose|dosage|"
    r"caus(e|es|ed)|disease|infection|immunodeficien\w*|osteopor\w*|sarcopen\w*)\b",
    re.IGNORECASE,
)


def _scan_evaluation():
    current = wellbeing("2026-11-13T07:30:00Z", mood=3, stress=6, sleep=5.2)
    return evaluate(
        as_of=demo_as_of(),
        metrics=METRICS,
        observations=demo_observations(),
        prior_wellbeing=demo_prior_wellbeing(),
        current_wellbeing=current,
    )


def test_every_explanation_uses_actual_numbers_and_is_non_clinical():
    ev = _scan_evaluation()
    assert ev.findings
    for finding in ev.findings:
        assert finding.explanation
        assert re.search(r"\d", finding.explanation), finding.rule_id
        text = finding.explanation.replace("not a diagnosis", "").replace("not a measure", "")
        text = text.replace("not measure immune status", "")
        assert not FORBIDDEN_CLINICAL.search(text), (finding.rule_id, finding.explanation)


def test_explanations_state_the_comparison_source():
    ev = _scan_evaluation()
    by_rule = {f.rule_id: f.explanation for f in ev.findings}
    assert "median of 81 bpm over the prior 14 days (13 observations)" in by_rule["CV-HR-01"]
    assert "median weekly total of 210 min" in by_rule["BM-EX-01"]
    assert "does not measure immune status" in by_rule["IM-LYM-01"]
    assert "not verified by a sensor" in by_rule["BH-SLP-01"]


def test_attention_next_steps_defer_to_the_medical_officer_and_never_prescribe():
    ev = _scan_evaluation()
    steps = build_next_steps(ev.findings, ev.requirements)
    assert steps, "expected next steps for the demo scan"
    attention_steps = [s for s in steps if any(
        f.rule_id in s.related_rule_ids and f.severity is Severity.ATTENTION for f in ev.findings
    )]
    assert attention_steps
    for step in attention_steps:
        assert "crew medical officer" in step.text
    for step in steps:
        assert not FORBIDDEN_CLINICAL.search(step.text), step.text


def test_next_steps_are_ordered_attention_then_data_then_info():
    ev = _scan_evaluation()
    steps = build_next_steps(ev.findings, ev.requirements)
    assert [s.priority for s in steps] == list(range(1, len(steps) + 1))
    notice_positions = [i for i, s in enumerate(steps) if s.related_notice_ids]
    info_positions = [i for i, s in enumerate(steps) if s.related_rule_ids == ("BH-SLP-01",)]
    attention_positions = [
        i for i, s in enumerate(steps)
        if s.related_rule_ids and s.related_rule_ids != ("BH-SLP-01",)
    ]
    assert max(attention_positions) < min(notice_positions)
    assert max(notice_positions) < min(info_positions)


def test_no_rule_fired_produces_no_alert_based_next_steps():
    from tests.factories import obs

    base = [obs(i, "heart_rate", 80, f"2026-11-0{i}T07:00:00Z") for i in range(1, 6)]
    latest = obs(10, "heart_rate", 81, "2026-11-13T07:00:00Z")
    ev = evaluate(as_of=demo_as_of(), metrics=METRICS, observations=base + [latest], prior_wellbeing=[], current_wellbeing=None)
    assert ev.findings == ()
    steps = build_next_steps(ev.findings, ev.requirements)
    # Missing blood pressure still asks for data, but no step refers to an alert.
    assert all(not step.related_rule_ids for step in steps)
    assert any("systolic blood pressure" in step.text for step in steps)
