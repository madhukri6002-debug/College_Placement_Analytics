"""
College Placement Analytics - Python Analysis Script
======================================================
NOTE: This script uses SAMPLE DATA for demonstration purposes only.
      The data in data/placement_data.csv is NOT real college placement records.

Usage:
    py src/analyze.py        (Windows)
    python3 src/analyze.py   (Mac/Linux)

Requires: Python 3.x standard library only (csv, json, os, collections)
Output:   reports/placement_summary.json
"""

import csv
import json
import os
from collections import defaultdict

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE  = os.path.join(BASE_DIR, "data", "placement_data.csv")
OUTPUT_DIR = os.path.join(BASE_DIR, "reports")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "placement_summary.json")


def load_data(filepath):
    """Read the CSV and return a list of dicts, one per student."""
    students = []
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row["cgpa"]        = float(row["cgpa"])
            row["package_lpa"] = float(row["package_lpa"])
            row["placed"]      = row["placed"] == "Yes"
            students.append(row)
    return students


def overall_stats(students):
    """Overall placement rate, average salary, highest salary."""
    total   = len(students)
    placed  = [s for s in students if s["placed"]]
    salaries = [s["package_lpa"] for s in placed]

    return {
        "total_students": total,
        "placed_students": len(placed),
        "unplaced_students": total - len(placed),
        "placement_rate_pct": round(len(placed) / total * 100, 1),
        "average_package_lpa": round(sum(salaries) / len(salaries), 2) if salaries else 0,
        "highest_package_lpa": max(salaries) if salaries else 0,
        "lowest_package_lpa": min(salaries) if salaries else 0,
    }


def branch_stats(students):
    """Per-branch placement rate and average salary."""
    branches = defaultdict(lambda: {"total": 0, "placed": 0, "salaries": []})

    for s in students:
        b = s["branch"]
        branches[b]["total"] += 1
        if s["placed"]:
            branches[b]["placed"] += 1
            branches[b]["salaries"].append(s["package_lpa"])

    result = {}
    for branch, data in sorted(branches.items()):
        salaries = data["salaries"]
        result[branch] = {
            "total_students":    data["total"],
            "placed_students":   data["placed"],
            "placement_rate_pct": round(data["placed"] / data["total"] * 100, 1),
            "average_package_lpa": round(sum(salaries) / len(salaries), 2) if salaries else 0,
            "highest_package_lpa": max(salaries) if salaries else 0,
        }
    return result


def company_stats(students):
    """How many students each company recruited."""
    recruits = defaultdict(int)
    for s in students:
        if s["placed"] and s["company"]:
            recruits[s["company"]] += 1
    # Sort by headcount descending, return top 15
    sorted_companies = sorted(recruits.items(), key=lambda x: x[1], reverse=True)[:15]
    return [{"company": c, "students_hired": n} for c, n in sorted_companies]


def cgpa_salary_data(students):
    """Return CGPA vs salary points for placed students (scatter chart)."""
    return [
        {"student_id": s["student_id"], "name": s["name"],
         "branch": s["branch"], "cgpa": s["cgpa"],
         "package_lpa": s["package_lpa"]}
        for s in students if s["placed"]
    ]


def offer_type_distribution(students):
    """On-Campus vs Off-Campus count."""
    counts = defaultdict(int)
    for s in students:
        if s["placed"]:
            counts[s["offer_type"]] += 1
    return dict(counts)


def student_table(students):
    """Full student list suitable for the dashboard table."""
    return [
        {
            "student_id": s["student_id"],
            "name":        s["name"],
            "branch":      s["branch"],
            "cgpa":        s["cgpa"],
            "placed":      s["placed"],
            "company":     s["company"] if s["placed"] else "—",
            "package_lpa": s["package_lpa"] if s["placed"] else 0,
            "offer_type":  s["offer_type"] if s["placed"] else "—",
        }
        for s in students
    ]


def main():
    print("College Placement Analytics — Analysis Script")
    print("NOTE: Uses SAMPLE DATA only — not real placement records.\n")

    print(f"  Loading data from: {DATA_FILE}")
    students = load_data(DATA_FILE)
    print(f"  Loaded {len(students)} student records.\n")

    summary = {
        "_note": "SAMPLE DATA — for demonstration purposes only. Not real placement records.",
        "overall":          overall_stats(students),
        "branch_wise":      branch_stats(students),
        "top_recruiters":   company_stats(students),
        "cgpa_vs_salary":   cgpa_salary_data(students),
        "offer_type_split": offer_type_distribution(students),
        "students":         student_table(students),
    }

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"  Summary saved to: {OUTPUT_FILE}\n")

    # Pretty-print key numbers to the terminal
    o = summary["overall"]
    print("  -- Overall Stats ------------------------------------------")
    print(f"     Total students   : {o['total_students']}")
    print(f"     Placed           : {o['placed_students']}  ({o['placement_rate_pct']}%)")
    print(f"     Avg package      : {o['average_package_lpa']} LPA")
    print(f"     Highest package  : {o['highest_package_lpa']} LPA\n")

    print("  -- Branch-wise Placement Rate -----------------------------")
    for branch, data in summary["branch_wise"].items():
        print(f"     {branch:<5}  {data['placement_rate_pct']:>5}%  avg {data['average_package_lpa']} LPA")

    print("\n  Done! Open the dashboard to see the full analytics.")


if __name__ == "__main__":
    main()
