"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTree, joinTreeByCode } from "@/app/tree/actions";
import { buttonPrimary, buttonSecondary, inputClass, Field } from "@/components/ui/primitives";

type Mode = "create" | "join";

/**
 * Starting a second shajara, or joining someone else's, from Settings.
 *
 * Both actions already existed but were reachable only from /onboarding, which
 * redirects away the moment you belong to any tree — so once you had one shajara
 * you could never make or join another. The tree_members schema has always been
 * many-to-many (primary key is (tree_id, user_id)); only the routing assumed one.
 */
export function AddTreeCard() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const result =
      mode === "create"
        ? await createTree(name || "Oilaviy shajara")
        : await joinTreeByCode(code);
    if ("error" in result) {
      setPending(false);
      setError(result.error);
      return;
    }
    // Both actions switch the active-tree cookie to the new tree.
    setName("");
    setCode("");
    setPending(false);
    router.push("/tree");
    router.refresh();
  }

  return (
    <section className="rounded-card border border-line bg-transparent p-4 shadow-[0_1px_2px_rgba(27,26,24,0.08)] sm:p-5">
      <h2 className="font-display text-sm font-semibold tracking-wide text-ink-muted uppercase">
        Yana bir shajara
      </h2>
      <p className="mt-1 text-sm text-ink-faint">
        Yangi shajara boshlang yoki taklif kodi bilan boshqasiga qoʻshiling. Bir
        nechta shajarada boʻlishingiz mumkin.
      </p>

      <div className="mt-4 flex rounded-lg bg-paper-sunken p-1 text-sm font-medium">
        {(["create", "join"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`min-h-11 flex-1 rounded-md transition-colors sm:min-h-10 ${
              mode === m
                ? "bg-surface text-ink shadow-[0_1px_2px_rgba(43,37,33,0.08)]"
                : "text-ink-muted"
            }`}
          >
            {m === "create" ? "Yangi shajara" : "Taklif kodi bilan"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        {mode === "create" ? (
          <Field label="Shajara nomi" htmlFor="new-tree-name">
            <input
              id="new-tree-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masalan: Solihovlar shajarasi"
              className={inputClass}
            />
          </Field>
        ) : (
          <Field label="Taklif kodi" htmlFor="join-tree-code">
            <input
              id="join-tree-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="masalan, a1b2c3d4e5f6"
              // Invite codes are lowercase hex; mobile keyboards capitalise the
              // first letter by default, which used to make a correctly-typed
              // code fail to match.
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className={inputClass}
            />
          </Field>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className={mode === "create" ? buttonPrimary : buttonSecondary}
        >
          {pending
            ? "Yuklanmoqda..."
            : mode === "create"
              ? "Shajara yaratish"
              : "Qoʻshilish"}
        </button>
      </form>
    </section>
  );
}
