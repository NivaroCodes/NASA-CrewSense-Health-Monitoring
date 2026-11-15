"""Non-clinical next-step guidance (pure).

Next steps are monitoring actions only: recheck, enter data, keep watching, or
share the summary with the crew medical officer. They never prescribe treatment
and never interpret a finding as a diagnosis.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from app.domain.metrics import METRICS_BY_KEY, WELLBEING_METRICS
from app.domain.types import DataRequirement, Freshness, RuleFinding, Severity

DISCLAIMER: str = (
    "Prototype monitoring guidance. Alerts describe changes from this astronaut's "
    "own history. They are not medical diagnoses and require review by qualified "
    "medical personnel."
)

_OFFICER_REVIEW = "Share this summary with the crew medical officer for review."


@dataclass(frozen=True)
class NextStep:
    priority: int
    text: str
    related_rule_ids: tuple[str, ...] = ()
    related_notice_ids: tuple[str, ...] = ()


def build_next_steps(
    findings: Sequence[RuleFinding],
    requirements: Sequence[DataRequirement],
) -> tuple[NextStep, ...]:
    """Ordered next steps: attention alerts, then data requirements, then info alerts."""

    entries: list[tuple[str, tuple[str, ...], tuple[str, ...]]] = []

    for finding in findings:
        if finding.severity is Severity.ATTENTION:
            entries.append((_attention_text(finding), (finding.rule_id,), ()))

    for requirement in requirements:
        name = _display_name(requirement.metric_key)
        notice_id = "DQ-MISSING-01" if requirement.reason is Freshness.MISSING else "DQ-OUTDATED-01"
        if requirement.reason is Freshness.MISSING:
            text = f"Enter the missing {name.lower()} value at the next scan."
        else:
            text = f"Enter a current {name.lower()} value at the next scan."
        entries.append((text, (), (notice_id,)))

    for finding in findings:
        if finding.severity is Severity.INFO:
            entries.append(
                (
                    f"Keep monitoring {_display_name(finding.metric_key).lower()} at the next scan.",
                    (finding.rule_id,),
                    (),
                )
            )

    return tuple(
        NextStep(
            priority=index,
            text=text,
            related_rule_ids=rule_ids,
            related_notice_ids=notice_ids,
        )
        for index, (text, rule_ids, notice_ids) in enumerate(entries, start=1)
    )


def _attention_text(finding: RuleFinding) -> str:
    if finding.metric_key == "lymphocyte_count":
        return f"Review the lymphocyte trend with the next scheduled examination. {_OFFICER_REVIEW}"
    if finding.metric_key == "exercise_duration":
        return f"Review recorded activity at the next scan. {_OFFICER_REVIEW}"
    return f"Recheck {_display_name(finding.metric_key).lower()} at the next scan. {_OFFICER_REVIEW}"


def _display_name(metric_key: str) -> str:
    if metric_key in METRICS_BY_KEY:
        return METRICS_BY_KEY[metric_key].display_name
    if metric_key in WELLBEING_METRICS:
        return WELLBEING_METRICS[metric_key].display_name
    return metric_key
