"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMyProfile } from "@/app/profile/actions";
import { buttonPrimary, inputClass, Field } from "@/components/ui/primitives";

export function ProfileForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await updateMyProfile(name);
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field
        label="Toʻliq ismingiz"
        htmlFor="full_name"
        hint="Shu ism shajarangizdagi boshqa aʼzolarga koʻrinadi."
      >
        <input
          id="full_name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          maxLength={100}
          autoComplete="name"
          placeholder="Masalan: Kamronbek Solihov"
          className={inputClass}
        />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-brand">Saqlandi.</p>}

      <button type="submit" disabled={pending} className={`${buttonPrimary} self-start`}>
        {pending ? "Saqlanmoqda..." : "Saqlash"}
      </button>
    </form>
  );
}
