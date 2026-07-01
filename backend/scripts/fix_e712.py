import os
import re
from pathlib import Path

# SQLAlchemy query context markers
MARKERS = [r"\.where\(", r"\.filter\(", r"select\(", r"primaryjoin=", r"secondaryjoin="]
MARKER_RE = re.compile("|".join(MARKERS))

# Pattern to match the target comparisons
COMP_RE = re.compile(r"\b(is not False|is not True|is False|is True)\b")

# Replacement mapping
REPLACEMENTS = {
    "is False": "== False  # noqa: E712",
    "is True": "== True  # noqa: E712",
    "is not False": "!= False  # noqa: E712",
    "is not True": "!= True  # noqa: E712",
}


def is_sqlalchemy_context(lines, idx):
    """Check if the line at idx is in a SQLAlchemy query context.
    We look at the current line and up to 5 lines before and after.
    """
    start = max(0, idx - 5)
    end = min(len(lines), idx + 6)
    for i in range(start, end):
        if MARKER_RE.search(lines[i]):
            return True
    return False


def fix_file(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except UnicodeDecodeError:
        with open(path, "r", encoding="gbk", errors="replace") as f:
            content = f.read()

    lines = content.splitlines()
    new_lines = []
    changes = 0
    fixed = False

    for idx, line in enumerate(lines):
        match = COMP_RE.search(line)
        if match and is_sqlalchemy_context(lines, idx):
            # Replace the comparison
            new_line = line
            for old, new in REPLACEMENTS.items():
                new_line = new_line.replace(old, new)
            if new_line != line:
                new_lines.append(new_line)
                changes += 1
                fixed = True
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)

    if fixed:
        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(new_lines))
            if content.endswith("\n"):
                f.write("\n")
        return changes
    return 0


def main():
    base = Path(__file__).resolve().parents[1] / "app"
    total_changes = 0
    files_changed = []

    for root, dirs, files in os.walk(base):
        for fname in files:
            if fname.endswith(".py"):
                path = os.path.join(root, fname)
                changes = fix_file(path)
                if changes:
                    total_changes += changes
                    files_changed.append((path, changes))

    print(f"Total files changed: {len(files_changed)}")
    print(f"Total changes: {total_changes}")
    for path, changes in files_changed:
        print(f"  {path}: {changes}")


if __name__ == "__main__":
    main()
