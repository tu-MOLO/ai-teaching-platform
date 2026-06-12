import os
import re
from pathlib import Path

# Pattern:  == True/False  # noqa: E712) followed by optional text until end of line
# We need to move the ) out of the comment.
patterns = [
    # == True/False)  # noqa: E712)  -- outer closing paren swallowed
    (r' == (True|False)\)  # noqa: E712\)(.*)$', r' == \1))\2  # noqa: E712'),
    # == True/False  # noqa: E712)text -- closing paren and following text swallowed
    (r' == (True|False)  # noqa: E712\)(.*)$', r' == \1)\2  # noqa: E712'),
    # == True/False  # noqa: E712,text -- comma swallowed
    (r' == (True|False)  # noqa: E712,(.*)$', r' == \1,\2  # noqa: E712'),
    # == True/False  # noqa: E712] -- bracket swallowed (unlikely but possible)
    (r' == (True|False)  # noqa: E712\](.*)$', r' == \1]\2  # noqa: E712'),
]

app_dir = Path(__file__).resolve().parents[1] / 'app'
for root, dirs, files in os.walk(app_dir):
    for f in files:
        if f.endswith('.py'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8', errors='replace') as fh:
                lines = fh.readlines()
            new_lines = []
            changed = False
            for line in lines:
                original = line
                if '# noqa: E712' in line:
                    for old, new in patterns:
                        line = re.sub(old, new, line)
                if line != original:
                    changed = True
                new_lines.append(line)
            if changed:
                with open(path, 'w', encoding='utf-8') as fh:
                    fh.writelines(new_lines)
                print('Fixed', path)
