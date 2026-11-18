"""Build and verify the SDK tarball required by the locked application dependencies."""

import argparse
import base64
import gzip
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
import zlib

APP = Path(__file__).resolve().parents[1]
SDK_FILE = "release-artifacts/mcp-sdk/modelcontextprotocol-server-2.4.0-verified.tgz"
SDK_SHA = "478c607f4252af5eb6c1a84801f06239b1954fd2633932fa58c27833800b86de"
UPSTREAM = "https://github.com/modelcontextprotocol/typescript-sdk.git"
TAG = "951fe5603a7ec0b2dcb6a0b95d92cd86f93ad9e5"
FIX = "39ae8e6192cf43273aaaf2de4169dfa9f7216e28"
PNPM_VERSION = "10.26.1"
NODE_SHA = "247e9693d316da9857e44990e5e11709f596f18112251b8026ec6eed80bdf38a"
PNPM_SHA512 = "ZkB0q8Nn0skyT9wYA3CXzgqPEmA0Fg9wmSjp6fldmHFDRwROXDFk1lvV2mxZxr42KxB1Rikqjuy3mZGW5c5Y+g=="
PATCHES = {
    "upstream-3108.diff.txt": "699883791fc083d09d22008620b60ea2004a37854520367abd3cfcb74ac4801e",
    "upstream-windows-tsconfig.diff.txt": "ecbff8950d03d662c5ceff0acdeca6ddd24f3bc19d1ab01ba528a8d949d674fa",
}
LICENSES = {
    "Ajv 8.18.0 (MIT)": ("packages/server/node_modules/ajv/LICENSE", "a05350a88e318e4f5f2c2a1ff1e2e88daa4dd38e6e78b71cccae422bdc762cc3"),
    "fast-uri 3.1.9 (BSD-3-Clause)": ("node_modules/.pnpm/fast-uri@3.1.9/node_modules/fast-uri/LICENSE", "b010b0dfdfdb23d7396e03b82cd4621fc9bb8f95d6b0aea70b9c24e12074c786"),
    "ajv-formats 3.0.1 (MIT)": ("node_modules/.pnpm/ajv-formats@3.0.1_ajv@8.18.0/node_modules/ajv-formats/LICENSE", "9df3bb69929a3b650ed73b3bfa1756725aaff0ac296461605753547004eafeaf"),
    "fast-deep-equal 3.1.3 (MIT)": ("node_modules/.pnpm/fast-deep-equal@3.1.3/node_modules/fast-deep-equal/LICENSE", "7bf9b2de73a6b356761c948d0e9eeb4be6c1270bd04c79cd489c1e400ffdfc1a"),
    "json-schema-traverse 1.0.0 (MIT)": ("node_modules/.pnpm/json-schema-traverse@1.0.0/node_modules/json-schema-traverse/LICENSE", "7bf9b2de73a6b356761c948d0e9eeb4be6c1270bd04c79cd489c1e400ffdfc1a"),
}
UPSTREAM_LICENSE_SHA = "fe5d1e818af2a1038f2805f7fdccdca778a61b42fb182786d2a3f4c8c7c7e9b2"
PROVIDERS = {
    "package/dist/ajvProvider-_BPY-P_q.mjs.map": "fdde01929c3c271b58fa5eb2f08e78b01b90cd9deebd9e0ea0fa134d81de5e90",
    "package/dist/ajvProvider-DEEuOocJ.cjs.map": "b384d872215efa662e3a1c35b2fecbeed821a7d07295269e5534677163ba0812",
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def verify(data, expected, label):
    actual = digest(data)
    if actual != expected:
        raise ValueError(f"SHA-256 mismatch for {label}: {actual}")


def read_package(archive):
    files = {}
    total = 0
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as bundle:
        for entry in bundle:
            name = PurePosixPath(entry.name)
            total += entry.size
            if (not entry.isfile() or not name.parts or name.parts[0] != "package"
                    or ".." in name.parts or "\\" in entry.name or str(name) != entry.name
                    or entry.name in files or total > 20_000_000):
                raise ValueError(f"Unsafe tarball member: {entry.name}")
            files[entry.name] = bundle.extractfile(entry).read()
    return files


def normalize(archive):
    files = read_package(archive)
    if len(files) != 117:
        raise ValueError(f"Unexpected raw SDK inventory: {len(files)} files")
    manifest = json.loads(files["package/package.json"])
    if (manifest["name"], manifest["version"], manifest["license"]) != (
        "@modelcontextprotocol/server", "2.4.0", "Apache-2.0"
    ):
        raise ValueError("Unexpected SDK identity or license")
    files["package/package.json"] = json.dumps(
        manifest, sort_keys=True, indent=2, ensure_ascii=False
    ).encode() + b"\n"
    # Declaration maps can vary between identical builds. Preserve declarations
    # and all JavaScript maps used to verify the executable bundle.
    for name in list(files):
        if name.endswith((".d.cts.map", ".d.mts.map", ".d.ts.map")):
            del files[name]
        elif name.endswith((".d.cts", ".d.mts", ".d.ts")):
            files[name] = re.sub(rb"(?m)^//# sourceMappingURL=[^\r\n]+(?:\r?\n|$)", b"", files[name])
    return files


def make_sdk(files):
    output = io.BytesIO()
    with gzip.GzipFile(fileobj=output, mode="wb", filename="", mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode="w", format=tarfile.USTAR_FORMAT) as tar:
            for name, data in sorted(files.items()):
                entry = tarfile.TarInfo(name)
                entry.size = len(data)
                entry.mode = 0o644
                tar.addfile(entry, io.BytesIO(data))
    return output.getvalue()


def private_environment(scratch, node):
    native_keys = {"PATH", "SYSTEMROOT", "WINDIR", "COMSPEC", "PATHEXT", "HOME", "USERPROFILE",
                   "LOCALAPPDATA", "APPDATA", "USER", "LANG", "LC_ALL"}
    env = {key: value for key, value in os.environ.items() if key.upper() in native_keys}
    temp = scratch / "tmp"
    temp.mkdir()
    config = scratch / "empty-npm-config"
    config.touch()
    env.update(PATH=str(node.parent) + os.pathsep + os.environ["PATH"], TEMP=str(temp), TMP=str(temp),
               TMPDIR=str(temp), GIT_CONFIG_GLOBAL=os.devnull, GIT_CONFIG_NOSYSTEM="1",
               GIT_TERMINAL_PROMPT="0", npm_config_userconfig=str(config), npm_config_globalconfig=str(config),
               npm_config_registry="https://registry.npmjs.org", npm_config_ignore_scripts="true")
    return env


def rebuild(node, scratch):
    if sys.platform != "win32" or sys.version_info[:3] != (3, 12, 10) or zlib.ZLIB_RUNTIME_VERSION != "1.3.1":
        raise ValueError("Reference rebuild requires Windows, Python 3.12.10 and zlib 1.3.1")
    with node.open("rb") as binary:
        if hashlib.file_digest(binary, "sha256").hexdigest() != NODE_SHA:
            raise ValueError("Unexpected Node 22.23.5 Windows x64 executable")
    env = private_environment(scratch, node)

    def run(args, cwd=scratch, capture=False):
        return subprocess.run([str(arg) for arg in args], cwd=cwd, env=env, check=True,
                              timeout=300, stdout=subprocess.PIPE if capture else None).stdout

    if run([node, "--version"], capture=True).strip() != b"v22.23.5":
        raise ValueError("Reference SDK build requires Node 22.23.5")
    pnpm_url = f"https://registry.npmjs.org/pnpm/-/pnpm-{PNPM_VERSION}.tgz"
    with urllib.request.urlopen(pnpm_url, timeout=60) as response:
        pnpm_bytes = response.read(10_000_001)
    expected_pnpm = base64.b64decode(PNPM_SHA512)
    if hashlib.sha512(pnpm_bytes).digest() != expected_pnpm:
        raise ValueError("pnpm registry archive failed SHA-512 verification")
    pnpm_dir = scratch / "pnpm"
    pnpm_dir.mkdir()
    with tarfile.open(fileobj=io.BytesIO(pnpm_bytes), mode="r:gz") as archive:
        archive.extractall(pnpm_dir, filter="data")
    pnpm = [node, pnpm_dir / "package/bin/pnpm.cjs"]
    if run([*pnpm, "--version"], capture=True).strip() != PNPM_VERSION.encode():
        raise ValueError("Unexpected pnpm version")

    source = scratch / "sdk"
    source.mkdir()
    git = ["git", "-c", "core.autocrlf=true", "-c", "core.longpaths=true", "-c", "core.hooksPath=" + os.devnull]
    run([*git, "init", "--quiet"], source)
    run([*git, "fetch", "--quiet", "--no-tags", "--depth=2", UPSTREAM, TAG, FIX], source)
    run([*git, "checkout", "--quiet", "--detach", TAG], source)
    actual_tag = run([*git, "rev-parse", "HEAD"], source, True).strip().decode()
    actual_fix = run([*git, "rev-parse", f"{FIX}^{{commit}}"], source, True).strip().decode()
    if (actual_tag, actual_fix) != (TAG, FIX):
        raise ValueError("Unexpected upstream commit")
    if run([*git, "status", "--porcelain", "--untracked-files=no"], source, True).strip():
        raise ValueError("Upstream working tree differs from the pinned commit")
    upstream_delta = run([*git, "diff", "--no-ext-diff", f"{FIX}^1", FIX], source, True)
    verify(upstream_delta, PATCHES["upstream-3108.diff.txt"], "upstream Git delta")
    for name, expected in PATCHES.items():
        patch = scratch / name
        patch_bytes = (APP / "scripts/sdk-inputs" / name).read_bytes().replace(b"\r\n", b"\n")
        verify(patch_bytes, expected, name)
        patch.write_bytes(patch_bytes)
        run([*git, "apply", "--check", patch], source)
        run([*git, "apply", patch], source)

    selector = [*pnpm, "--filter", "@modelcontextprotocol/server..."]
    run([*selector, "install", "--frozen-lockfile", "--ignore-scripts", "--store-dir", scratch / "pnpm-store"], source)
    server = source / "packages/server"
    scripts = json.loads((server / "package.json").read_text(encoding="utf-8"))["scripts"]
    if scripts.get("prepack") != "pnpm run build" or scripts.get("prepare") or scripts.get("postpack"):
        raise ValueError("Unexpected upstream package lifecycle")
    shim = scratch / "shim"
    shim.mkdir()
    node_cmd, pnpm_cmd = (str(path).replace("%", "%%") for path in pnpm)
    (shim / "pnpm.cmd").write_text(
        f'@echo off\nsetlocal DisableDelayedExpansion\n"{node_cmd}" "{pnpm_cmd}" %*\n', encoding="utf-8"
    )
    env["PATH"] = str(shim) + os.pathsep + env["PATH"]
    builds = []
    raw_hashes = []
    for index in (1, 2):
        build_dir = scratch / f"build-{index}"
        build_dir.mkdir()
        run([*selector, "run", "build"], source)
        env["npm_config_ignore_scripts"] = "false"
        try:
            run([*pnpm, "pack", "--pack-destination", build_dir], server)
        finally:
            env["npm_config_ignore_scripts"] = "true"
        raw = (build_dir / "modelcontextprotocol-server-2.4.0.tgz").read_bytes()
        builds.append(normalize(raw))
        raw_hashes.append(digest(raw))
    if builds[0] != builds[1]:
        names = builds[0].keys() | builds[1].keys()
        different = sorted(name for name in names if builds[0].get(name) != builds[1].get(name))
        raise ValueError(f"Unexpected normalized SDK inventory: {len(builds[0])}/{len(builds[1])}; differing paths: {different}")
    files = builds[0]
    verify(files["package/LICENSE"], UPSTREAM_LICENSE_SHA, "upstream LICENSE")
    for provider, expected in PROVIDERS.items():
        verify(files[provider], expected, provider)
        sources = json.loads(files[provider])["sources"]
        versions = [name for name in sources if "/fast-uri@" in name]
        if not versions or not all("/fast-uri@3.1.9/" in name for name in versions):
            raise ValueError(f"Unexpected fast-uri version in {provider}")
    for label, (filename, expected) in LICENSES.items():
        license_bytes = (source / filename).read_bytes()
        verify(license_bytes, expected, label)
        files["package/LICENSE"] += b"\n\nBundled dependency: " + label.encode() + b"\n\n" + license_bytes
    return make_sdk(files), {"mode": "rebuild", "raw_tar_sha256": raw_hashes, "normalized_files": len(files),
                             "pnpm": PNPM_VERSION, "node": "22.23.5", "node_sha256": NODE_SHA,
                             "python": "3.12.10", "zlib": "1.3.1"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    choice = parser.add_mutually_exclusive_group(required=True)
    choice.add_argument("--node", type=Path, help="Node 22.23.5 executable for a clean reference rebuild")
    choice.add_argument("--from-verified", type=Path, help="Seed this checkout from a reference build")
    args = parser.parse_args()
    sdk_path = APP / SDK_FILE
    for path in (APP / "release-artifacts", sdk_path.parent, sdk_path):
        if path.is_symlink() or (hasattr(path, "is_junction") and path.is_junction()):
            raise ValueError(f"Refusing linked SDK destination: {path}")
    sdk_path.parent.mkdir(parents=True, exist_ok=True)
    # Windows bundler output can change when SDK dependencies are under a long path.
    short_temp = Path(os.environ["LOCALAPPDATA"]) / "Temp" if args.node and sys.platform == "win32" else None
    with tempfile.TemporaryDirectory(prefix="pea-sdk-", dir=short_temp) as temp:
        scratch = Path(temp)
        if args.node:
            bundle, evidence = rebuild(args.node.resolve(strict=True), scratch)
        else:
            if (args.from_verified.is_symlink() or not args.from_verified.is_file()
                    or args.from_verified.stat().st_size > 3_000_000):
                raise ValueError("Expected a regular verified tarball no larger than 3 MB")
            bundle = args.from_verified.read_bytes()
            evidence = {"mode": "verified-seed"}
        verify(bundle, SDK_SHA, "canonical SDK tarball")
        report = {"sdk": SDK_FILE, "sha256": SDK_SHA, "upstream": UPSTREAM, "tag_commit": TAG,
                  "fix_commit": FIX, "provider_sourcemaps": PROVIDERS,
                  "licenses": {label: value[1] for label, value in LICENSES.items()}, **evidence}
        with tempfile.TemporaryDirectory(prefix="stage-", dir=sdk_path.parent) as output:
            staged = Path(output) / "canonical.tgz"
            staged.write_bytes(bundle)
            staged.replace(sdk_path)
            record = Path(output) / "provenance.json"
            record.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
            record.replace(sdk_path.parent / "provenance.json")
    print(f"Verified SDK: {sdk_path}")


if __name__ == "__main__":
    main()
