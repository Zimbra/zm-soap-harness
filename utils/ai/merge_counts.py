import sys
import os

def load_counts(filename):
    counts = {}
    try:
        with open(filename, 'r') as f:
            for line in f:
                parts = line.strip().split(':')
                if len(parts) >= 2:
                    # Windows paths might have drive letter C: so split on last colon
                    path = ":".join(parts[:-1])
                    try:
                        count = int(parts[-1])
                    except ValueError:
                        continue
                    # Normalize path separators
                    path = path.replace('\\', '/')
                    if path.startswith('./'):
                        path = path[2:]
                    counts[path] = count
    except FileNotFoundError:
        pass
    return counts

smoke = load_counts('smoke.txt')
sanity = load_counts('sanity.txt')
functional = load_counts('functional.txt')
regression = load_counts('regression.txt')

all_files = set(smoke.keys()) | set(sanity.keys()) | set(functional.keys()) | set(regression.keys())
sorted_files = sorted(list(all_files))

print("| File Path | Smoke | Sanity | Functional | Regression | Total |")
print("| :--- | :---: | :---: | :---: | :---: | :---: |")

grand_total_smoke = 0
grand_total_sanity = 0
grand_total_functional = 0
grand_total_regression = 0
grand_total_all = 0

for f in sorted_files:
    s = smoke.get(f, 0)
    sa = sanity.get(f, 0)
    fu = functional.get(f, 0)
    re = regression.get(f, 0)
    tot = s + sa + fu + re
    
    grand_total_smoke += s
    grand_total_sanity += sa
    grand_total_functional += fu
    grand_total_regression += re
    grand_total_all += tot

    if tot > 0:
        print(f"| {f} | {s} | {sa} | {fu} | {re} | {tot} |")

print(f"| **TOTAL** | **{grand_total_smoke}** | **{grand_total_sanity}** | **{grand_total_functional}** | **{grand_total_regression}** | **{grand_total_all}** |")
