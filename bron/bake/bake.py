# Bakes the seated people into two files: bron/assets/baked/orchestra.glb (musicians and rehearsal players, with their textures) and
# bron/assets/baked/audience.glb (the audience, with only the textures the orchestra file does not have; it reuses the rest, nothing is downloaded twice).
#   python3 bron/bake/bake.py
# Run it again after changing the people: their poses, clothes, colours, faces, the seating (body.js) or _people_bake.js / _people_common.js.
# Then build as usual (python3 bron/build.py, and model): the build copies people.glb to site/ with a new hash in its link.
# Steps: build bron/bake/bake.html (the full old pipeline: FBX, IK poses, dress, baking) -> run it in Chrome -> GLTFExporter -> gltfpack v0.18
# (meshopt compression and quantization; the same meshoptimizer version as three r147's decoder) -> add the JPG/PNG textures as plain
# buffer views (re-encoded as WebP, half the bytes) -> bron/assets/baked/orchestra.glb and audience.glb.
import hashlib, io, json, os, platform, struct, subprocess, sys, urllib.request, zipfile
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__)); BRON = os.path.dirname(HERE); REPO = os.path.dirname(BRON)
BIN = os.path.join(HERE, ".bin")   # tools and intermediate files, in .gitignore
GLTFPACK_ZIP = {"Darwin": ("gltfpack-macos.zip", "904dfb4f39155821740496cddf3083990edc442b6537372b636f9998ee3f899c"),
                "Linux": ("gltfpack-ubuntu.zip", "c0c630391b159b4e7233b38f4b3cf22af1d5f1a8bc8477dd8c1eb25fc9c5ea18")}
SANDBOX_CHROMIUM = "/opt/pw-browsers/chromium"   # a cloud sandbox without Chrome: its Chromium, with three.js served from bron/test/node_modules (npm install there)
# quantization: gltfpack's defaults are 14-bit positions, 12-bit UVs and 8-bit normals; UVs get 16 bits here (the textures are large atlases)
GLTFPACK_ARGS = ["-cc", "-kn", "-ke", "-vt", "16"]   # -cc: the higher meshopt compression ratio (0.7 MB less after gzip than -c)

def gltfpack():
    exe = os.path.join(BIN, "gltfpack")
    if not os.path.exists(exe):
        name, sha = GLTFPACK_ZIP[platform.system()]
        z = urllib.request.urlopen("https://github.com/zeux/meshoptimizer/releases/download/v0.18/" + name).read()
        assert hashlib.sha256(z).hexdigest() == sha, "unexpected gltfpack download"
        os.makedirs(BIN, exist_ok=True); open(exe, "wb").write(zipfile.ZipFile(io.BytesIO(z)).read("gltfpack")); os.chmod(exe, 0o755)
    return exe

def read_glb(b):
    magic, version, length = struct.unpack_from("<4sII", b, 0); assert magic == b"glTF" and version == 2
    n, t = struct.unpack_from("<I4s", b, 12); assert t == b"JSON"; js = json.loads(b[20:20 + n])
    m, t2 = struct.unpack_from("<I4s", b, 20 + n); assert t2 == b"BIN\x00"; return js, bytearray(b[28 + n:28 + n + m])

def write_glb(js, binary):
    j = json.dumps(js, separators=(",", ":")).encode(); j += b" " * (-len(j) % 4); binary += b"\x00" * (-len(binary) % 4)
    return struct.pack("<4sII", b"glTF", 2, 28 + len(j) + len(binary)) + struct.pack("<I4s", len(j), b"JSON") + j + struct.pack("<I4s", len(binary), b"BIN\x00") + bytes(binary)

def webp(f):   # half the bytes of the original JPG/PNG at the same size; the PNGs' alpha stays exact (the hair is cut off at 0.45)
    from PIL import Image
    im, o = Image.open(f), io.BytesIO()
    if f.endswith(".png"): im.convert("RGBA").save(o, "WEBP", quality=85, alpha_quality=100, method=6)
    else: im.convert("RGB").save(o, "WEBP", quality=85, method=6)
    return o.getvalue()

def add_textures(glb, keys):   # the textures as WebP, as images that no material refers to; the site loads them by name
    js, binary = read_glb(glb)
    for k in keys:
        f = next(os.path.join(BRON, "assets/rocketbox", k + e) for e in (".jpg", ".png") if os.path.exists(os.path.join(BRON, "assets/rocketbox", k + e)))
        data = webp(f); binary += b"\x00" * (-len(binary) % 4)
        js.setdefault("bufferViews", []).append({"buffer": 0, "byteOffset": len(binary), "byteLength": len(data)}); binary += data
        js.setdefault("images", []).append({"name": k, "mimeType": "image/webp", "bufferView": len(js["bufferViews"]) - 1})
    js["buffers"][0]["byteLength"] = len(binary) + (-len(binary) % 4)
    return write_glb(js, binary)

def main(again=False):
    subprocess.run([sys.executable, os.path.join(BRON, "build.py"), "bake"], check=True)
    with sync_playwright() as p:
        if os.path.exists(SANDBOX_CHROMIUM):
            b = p.chromium.launch(executable_path=SANDBOX_CHROMIUM, args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
            local = os.path.join(BRON, "test/node_modules/three/")
            pg = b.new_page(); pg.route("**/cdn.jsdelivr.net/npm/three@0.147.0/**", lambda r: r.fulfill(body=open(local + r.request.url.split("three@0.147.0/")[1], "rb").read(), content_type="application/javascript"))
        else:
            b = p.chromium.launch(channel="chrome"); pg = b.new_page()
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errs.append(m.text))   # the model head's favicons are not next to bake.html
        pg.goto("file://" + os.path.join(HERE, "bake.html"), timeout=0); pg.wait_for_function("window.__bake", timeout=0, polling=1000); r = pg.evaluate("window.__bake", None); b.close()
    if errs: sys.exit("bake page errors: %s" % errs)
    anat = os.path.join(BRON, "assets", "anatomy.json"); new = json.dumps(r["anatomy"], separators=(",", ":"))
    if not os.path.exists(anat) or open(anat).read() != new:   # body.js places the instruments from this file, so the people are baked again with it
        open(anat, "w").write(new); print("anatomy.json updated: baking again with the instruments at the new places")
        if not again: return main(True)
    import base64
    print("%d people, %d meshes, %d triangles, %d textures" % (r["people"], r["meshes"], r["triangles"], len(r["textures"])))
    stored = set()
    for list_, name in [("mus", "orchestra"), ("aud", "audience")]:   # each texture goes in the first file that needs it: the orchestra's own, then the audience's extra ones
        os.makedirs(BIN, exist_ok=True); f = r["files"][list_]; raw = os.path.join(BIN, name + "-raw.glb"), os.path.join(BIN, name + "-packed.glb")
        open(raw[0], "wb").write(base64.b64decode(f["glb"]))
        subprocess.run([gltfpack(), "-i", raw[0], "-o", raw[1]] + GLTFPACK_ARGS, check=True)
        keys = [k for k in f["textures"] if k not in stored]; stored.update(keys)
        out = add_textures(open(raw[1], "rb").read(), keys)
        dst = os.path.join(BRON, "assets/baked", name + ".glb"); os.makedirs(os.path.dirname(dst), exist_ok=True); open(dst, "wb").write(out)
        print("%-9s %3d people: exported %.2f MB -> gltfpack %.2f MB -> with %d textures %.2f MB: %s" % (name, f["people"], os.path.getsize(raw[0]) / 1e6, os.path.getsize(raw[1]) / 1e6, len(keys), len(out) / 1e6, os.path.relpath(dst, REPO)))

if __name__ == "__main__": main()
