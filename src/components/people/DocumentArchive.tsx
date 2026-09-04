"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadPersonDocument } from "@/lib/supabase/storage";
import { recordPersonDocument, deletePersonDocument } from "@/app/person/document-actions";
import { buttonSecondary } from "@/components/ui/primitives";
import type { PersonDocument } from "@/lib/documents";

/**
 * The archive grid: scans of certificates, letters, notes.
 *
 * Thumbnails are what the grid loads; the full-size rendition is fetched only
 * when a document is opened. Both are signed URLs minted server-side — the
 * bucket is private, so there is nothing to link to directly.
 */
export function DocumentArchive({
  personId,
  treeId,
  documents,
  canEdit,
}: {
  personId: string;
  treeId: string;
  documents: PersonDocument[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<PersonDocument | null>(null);

  async function handleFiles(files: FileList) {
    setError(null);
    setPending(true);
    try {
      const supabase = createClient();
      for (const file of Array.from(files)) {
        const uploaded = await uploadPersonDocument(supabase, treeId, personId, file);
        const result = await recordPersonDocument({
          personId,
          storagePath: uploaded.storagePath,
          thumbPath: uploaded.thumbPath,
          // The filename is the only title we have without asking; it's
          // usually more useful than nothing ("passport.jpg" beats "Hujjat 3").
          title: file.name.replace(/\.[^.]+$/, "").slice(0, 100),
          sizeBytes: uploaded.sizeBytes,
        });
        if ("error" in result) {
          setError(result.error);
          break;
        }
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yuklab boʻlmadi.");
    } finally {
      setPending(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function handleDelete(doc: PersonDocument) {
    if (!confirm("Bu hujjatni oʻchirmoqchimisiz? Bu amalni orqaga qaytarib boʻlmaydi.")) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await deletePersonDocument(doc.id);
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setOpen(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {documents.length === 0 && (
        <p className="text-sm text-ink-muted">
          Hali hujjat yoʻq. Tugʻilganlik guvohnomasi, eski xatlar, suratlar —
          shu yerda saqlanadi.
        </p>
      )}

      {documents.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {documents.map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                onClick={() => setOpen(doc)}
                className="group flex w-full flex-col overflow-hidden rounded-card border border-line bg-surface text-left transition-colors hover:border-gold-line"
              >
                <span className="block aspect-[4/3] w-full overflow-hidden bg-paper-sunken">
                  {doc.thumbUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={doc.thumbUrl}
                      alt={doc.title ?? "Hujjat"}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </span>
                <span className="truncate px-2 py-1.5 text-xs text-ink-muted">
                  {doc.title ?? "Hujjat"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="flex flex-col gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={pending}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
            id={`doc-upload-${personId}`}
          />
          <label
            htmlFor={`doc-upload-${personId}`}
            className={`${buttonSecondary} cursor-pointer self-start ${
              pending ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {pending ? "Yuklanmoqda..." : "+ Hujjat qoʻshish"}
          </label>
          <p className="text-xs text-ink-faint">
            Rasm sifatida saqlanadi va faqat shajarada bu odamning yopiq
            ma&apos;lumotlarini koʻra oladiganlarga koʻrinadi.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Full-size viewer. Only now is the large rendition fetched. */}
      {open && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-ink/80 p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="flex max-h-full w-full max-w-3xl flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {open.fullUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={open.fullUrl}
                alt={open.title ?? "Hujjat"}
                className="max-h-[70vh] w-full rounded-card object-contain"
              />
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-surface">{open.title ?? "Hujjat"}</p>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleDelete(open)}
                    className="inline-flex min-h-11 items-center rounded-card px-3 text-sm text-danger-soft hover:underline disabled:opacity-50"
                  >
                    Oʻchirish
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="inline-flex min-h-11 items-center rounded-card border border-surface/40 px-3 text-sm text-surface"
                >
                  Yopish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
