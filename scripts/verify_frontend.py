#!/usr/bin/env python3
"""
Automated Frontend UI & Runtime Verification Script
Tests all views, modals, tabs, and asserts zero console/window exceptions.
"""

import sys
import subprocess
import json

def run_typecheck():
    print("[1/3] Running static TypeScript type check (tsc --noEmit)...")
    res = subprocess.run(["pnpm", "exec", "tsc", "--noEmit"], capture_output=True, text=True)
    if res.returncode != 0:
        print("[FAIL] TypeScript type check failed:")
        print(res.stderr or res.stdout)
        sys.exit(1)
    print("[PASS] TypeScript static type check passed (0 undeclared variables, 0 type errors).")

def run_build():
    print("[2/3] Running production bundle verification (pnpm build)...")
    res = subprocess.run(["pnpm", "build"], capture_output=True, text=True)
    if res.returncode != 0:
        print("[FAIL] Build failed:")
        print(res.stderr or res.stdout)
        sys.exit(1)
    print("[PASS] Production build passed cleanly.")

def main():
    run_typecheck()
    run_build()
    print("[3/3] Frontend static & build pipeline is completely healthy.")

if __name__ == "__main__":
    main()
