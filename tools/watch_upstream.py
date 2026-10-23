"""Read-only upstream observation. Never merge, publish or deploy upstream code."""
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

REPO = "RAR/ha-aqara-fp400"
# Observation baseline, NOT a claim that these changes are integrated in this fork.
BASELINE = "87d41d8d3ff534d0f92c4021d90a9a39c060333e"


def get(path):
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "fp400-upstream-watch"}
    if os.environ.get("GH_TOKEN"):
        headers["Authorization"] = "Bearer " + os.environ["GH_TOKEN"]
    request = Request(f"https://api.github.com/repos/{REPO}/{path}", headers=headers)
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def clean(value):
    return " ".join(str(value).split()).replace("<", "&lt;").replace(">", "&gt;")


def main():
    releases = get("releases?per_page=5")
    commits = get("commits?per_page=10")
    pulls = get("pulls?state=open&per_page=30")
    comparison = get(f"compare/{BASELINE}...{commits[0]['sha']}")
    lines = ["# FP400 upstream report", "", f"Checked: {datetime.now(timezone.utc).isoformat()}",
             f"Source: https://github.com/{REPO}", "",
             f"Commits since observation baseline: {comparison['ahead_by']}",
             f"Compare: https://github.com/{REPO}/compare/{BASELINE}...{commits[0]['sha']}", "",
             "## Pending review in our fork", "",
             "- v1.1.1: attribute-update callback fix; assess compatibility with the secondary controller.",
             "- v1.2.0: remove_target service and map action for ghost targets; assess UI preview/write safeguards.",
             "- These are review candidates, not automatically accepted or installed changes.", "", "## Releases", ""]
    for release in releases:
        lines.extend([f"### {clean(release['tag_name'])}", release['html_url'],
                      f"Published: {release['published_at']}; prerelease: {release['prerelease']}",
                      clean(release.get('body') or 'No release notes'), ""])
    lines.extend(["## Recent commits", ""])
    for commit in commits:
        lines.append(f"- {clean(commit['commit']['message'].splitlines()[0])} — {commit['html_url']}")
    lines.extend(["", "## Open pull requests (first 30)", ""])
    for pull in pulls:
        lines.append(f"- #{pull['number']} {clean(pull['title'])} — {pull['html_url']}")
    if not pulls:
        lines.append("None.")
    lines.extend(["", "Read-only report. No automatic merge, release, HA update or notification message.",
                  "GitHub schedules can be delayed; consult the latest successful run timestamp."])
    report = "\n".join(lines) + "\n"
    Path("upstream-report.md").write_text(report)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as summary:
            summary.write(report)
    print(f"Upstream checked: {len(releases)} releases, {len(commits)} commits, {len(pulls)} open PRs; {comparison['ahead_by']} new commits since baseline.")


if __name__ == "__main__":
    main()
