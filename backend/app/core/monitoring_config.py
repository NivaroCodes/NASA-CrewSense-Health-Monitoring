"""Monitoring heuristics for CrewSense (single source of truth).

IMPORTANT — NON-CLINICAL PROTOTYPE VALUES.
Every number in this module is a demonstration default chosen for the hackathon
prototype. None of them is a validated clinical threshold, and none of them
should be read as a diagnostic criterion. Changing a value here changes the
monitoring behaviour; the rule logic itself does not need to change.

All rules compare an astronaut's current value with that astronaut's own
history (personal baseline). No universal reference ranges are used.
"""

from __future__ import annotations

from dataclasses import dataclass

# --- Personal baseline policy -------------------------------------------------

BASELINE_WINDOW_DAYS: int = 14
"""Look-back window for per-metric personal baselines (prior observations only)."""

BASELINE_MIN_OBSERVATIONS: int = 5
"""Minimum prior observations required before a median baseline is formed."""

WELLBEING_BASELINE_WINDOW_DAYS: int = 14
"""Look-back window for self-reported wellbeing baselines (prior scans only)."""

WELLBEING_MIN_SCANS: int = 5
"""Minimum prior scans required before a wellbeing baseline is formed."""

# --- Exercise policy ----------------------------------------------------------

EXERCISE_RECENT_WINDOW_DAYS: int = 7
"""The 'recent' exercise total is the sum of entries in this trailing window."""

EXERCISE_BASELINE_WEEKS: int = 4
"""Number of full weeks before the recent window used for the weekly baseline."""

EXERCISE_MIN_WEEKS_WITH_DATA: int = 2
"""A week counts toward the weekly baseline only if it has at least one entry."""

# --- Input policy -------------------------------------------------------------

FUTURE_TOLERANCE_MINUTES: int = 5
"""Observations and scan times may be at most this far in the future (clock skew)."""

MAX_NEW_MEASUREMENTS_PER_SCAN: int = 20


@dataclass(frozen=True)
class RuleSpec:
    """Declarative description of one monitoring rule.

    comparison:
        "percent"  — change is (latest - reference) / reference * 100
        "absolute" — change is (latest - reference) in the metric's own unit/scale
    direction:
        "increase" — fires when change >= threshold (threshold is positive)
        "decrease" — fires when change <= threshold (threshold is negative)
    threshold is stored with its sign, so the API can report it unambiguously.
    """

    rule_id: str
    category: str
    metric_key: str
    comparison: str
    direction: str
    threshold: float
    severity: str
    title: str


RULES: tuple[RuleSpec, ...] = (
    RuleSpec(
        rule_id="CV-HR-01",
        category="cardiovascular",
        metric_key="heart_rate",
        comparison="percent",
        direction="increase",
        threshold=15.0,
        severity="attention",
        title="Heart rate above personal baseline",
    ),
    RuleSpec(
        rule_id="CV-SBP-01",
        category="cardiovascular",
        metric_key="systolic_bp",
        comparison="percent",
        direction="increase",
        threshold=10.0,
        severity="attention",
        title="Systolic blood pressure above personal baseline",
    ),
    RuleSpec(
        rule_id="CV-DBP-01",
        category="cardiovascular",
        metric_key="diastolic_bp",
        comparison="percent",
        direction="increase",
        threshold=10.0,
        severity="attention",
        title="Diastolic blood pressure above personal baseline",
    ),
    RuleSpec(
        rule_id="BM-EX-01",
        category="bone_muscle",
        metric_key="exercise_duration",
        comparison="percent",
        direction="decrease",
        threshold=-30.0,
        severity="attention",
        title="Lower activity than personal recent weeks",
    ),
    RuleSpec(
        rule_id="IM-LYM-01",
        category="immune",
        metric_key="lymphocyte_count",
        comparison="percent",
        direction="decrease",
        threshold=-20.0,
        severity="attention",
        title="Lymphocyte count lower than previous examination",
    ),
    RuleSpec(
        rule_id="BH-SLP-01",
        category="behavioral",
        metric_key="sleep_hours",
        comparison="absolute",
        direction="decrease",
        threshold=-1.5,
        severity="info",
        title="Self-reported sleep below personal baseline",
    ),
    RuleSpec(
        rule_id="BH-MOOD-01",
        category="behavioral",
        metric_key="mood_score",
        comparison="absolute",
        direction="decrease",
        threshold=-2.0,
        severity="attention",
        title="Self-reported mood below personal baseline",
    ),
    RuleSpec(
        rule_id="BH-STRESS-01",
        category="behavioral",
        metric_key="stress_score",
        comparison="absolute",
        direction="increase",
        threshold=2.5,
        severity="attention",
        title="Self-reported stress above personal baseline",
    ),
)

RULES_BY_ID: dict[str, RuleSpec] = {rule.rule_id: rule for rule in RULES}
