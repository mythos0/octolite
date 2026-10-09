#!/usr/bin/env bash
# OctoLite end-to-end test (local). Verifies:
#   public/private create, listing privacy, secret-slug access,
#   clone / push / pull over smart HTTP, push-to-create, no-delete, UI pages.
set -u
BASE="${1:-http://localhost:3000}"
# When testing locally we start from a clean slate (no delete API exists by
# design, so leftover repos from a previous run would break re-runs).
case "$BASE" in
  http://localhost*|http://127.0.0.1*) rm -rf "$(pwd)/git-data" ;;
esac
TMP="$(mktemp -d)"
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "  OK  $1"; }
bad() { FAIL=$((FAIL+1)); echo "  FAIL $1"; }
code() { curl -s -o /dev/null -w '%{http_code}' "$1"; }
gits() { GIT_TERMINAL_PROMPT=0 git -c user.email=test@octolite.local -c user.name=Tester "$@"; }

echo "== 1. create public repo via API =="
R=$(curl -s -X POST "$BASE/api/repos" -H 'Content-Type: application/json' \
  -d '{"name":"e2e-pub","description":"e2e public","initReadme":true,"visibility":"public"}')
echo "$R" | grep -q '"ok":true' && ok "created: $R" || bad "create failed: $R"

echo "== 2. create private repo via API =="
R=$(curl -s -X POST "$BASE/api/repos" -H 'Content-Type: application/json' \
  -d '{"name":"e2e-priv","description":"e2e private","initReadme":true,"visibility":"private"}')
echo "$R" | grep -q '"ok":true' && ok "created: $R" || bad "create failed: $R"
PRIV_SLUG=$(echo "$R" | python3 -c 'import json,sys; print(json.load(sys.stdin)["name"])')
echo "  private slug: $PRIV_SLUG"

echo "== 3. public listing shows only public =="
R=$(curl -s "$BASE/api/repos")
echo "$R" | grep -q '"e2e-pub"' && ok "public repo listed" || bad "public repo missing"
echo "$R" | grep -q '"e2e-priv"' && bad "PRIVATE repo leaked in listing!" || ok "private repo hidden"

echo "== 4. private access rules =="
C=$(code "$BASE/api/repos/e2e-priv")
[ "$C" = "404" ] && ok "private repo w/o secret slug -> 404" || bad "private w/o slug -> $C (want 404)"
C=$(code "$BASE/api/repos/$PRIV_SLUG")
[ "$C" = "200" ] && ok "private repo with secret slug -> 200" || bad "private with slug -> $C (want 200)"
C=$(code "$BASE/$PRIV_SLUG")
[ "$C" = "200" ] && ok "private UI page with slug -> 200" || bad "private UI page -> $C (want 200)"
C=$(code "$BASE/e2e-priv")
[ "$C" = "404" ] && ok "private UI page w/o slug -> 404" || bad "private UI w/o slug -> $C (want 404)"

echo "== 5. clone public repo =="
cd "$TMP"
gits clone -q "$BASE/e2e-pub.git" pub 2>clone.err && ok "clone ok" || { bad "clone failed"; cat clone.err; }

echo "== 6. commit + push =="
cd pub
echo "hello octolite" > hello.txt
gits add . && gits commit -qm "add hello.txt"
gits push -q origin main 2>push.err && ok "push ok" || { bad "push failed"; cat push.err; }

echo "== 7. second clone sees the push =="
cd "$TMP" && gits clone -q "$BASE/e2e-pub.git" pub2
[ -f pub2/hello.txt ] && ok "pull sees hello.txt" || bad "push not visible"

echo "== 8. private clone+push (with secret slug) =="
gits clone -q "$BASE/$PRIV_SLUG.git" priv 2>pc.err && ok "private clone ok" || { bad "private clone failed"; cat pc.err; }
cd priv && echo "secret work" > s.txt && gits add . && gits commit -qm "secret commit"
gits push -q origin main 2>pp.err && ok "private push ok" || { bad "private push failed"; cat pp.err; }

echo "== 9. clone private WITHOUT secret must fail =="
cd "$TMP"
gits clone "$BASE/e2e-priv.git" priv-nope 2>pn.err && bad "private clone w/o secret SUCCEEDED!" || ok "correctly rejected"

echo "== 10. push-to-create =="
mkdir -p ptc && cd ptc && gits init -q -b main
echo "push to create" > README.md && gits add . && gits commit -qm "init"
gits remote add origin "$BASE/e2e-pushcreate.git"
gits push -q origin main 2>ptc.err && ok "push-to-create ok" || { bad "push-to-create failed"; cat ptc.err; }
C=$(code "$BASE/api/repos/e2e-pushcreate")
[ "$C" = "200" ] && ok "push-created repo exists" || bad "push-created repo -> $C"

echo "== 11. no delete endpoint =="
C=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$BASE/api/repos/e2e-pub")
[ "$C" = "405" ] && ok "DELETE /api/repos/e2e-pub -> 405" || bad "DELETE /api/repos/e2e-pub -> $C (want 405)"
C=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$BASE/api/repos/e2e-pub.git")
[ "$C" = "404" ] || [ "$C" = "405" ] && ok "DELETE /api/repos/e2e-pub.git -> $C (no delete route)" || bad "DELETE with .git -> $C (want 404/405)"

echo "== 12. UI pages render =="
for p in "/" "/e2e-pub" "/e2e-pub/commits" "/e2e-pub/branches" "/e2e-pub/blob/main/README.md" "/e2e-pub/tree/main"; do
  C=$(code "$BASE$p")
  [ "$C" = "200" ] && ok "GET $p -> 200" || bad "GET $p -> $C"
done

echo
echo "RESULT: PASS=$PASS FAIL=$FAIL  (tmp: $TMP)"
[ "$FAIL" -eq 0 ] && echo "ALL GREEN" || echo "SOME TESTS FAILED"
exit "$FAIL"
