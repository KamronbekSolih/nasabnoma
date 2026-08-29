/** Uzbek urugʻ (clan/tribe) names, with aymoq sub-divisions where a source documents
 * them. Historical sources count anywhere from ~92 to ~96 tribes depending on era/source,
 * and this list is far from exhaustive — it's a starting point for the searchable
 * dropdown. Tarmoq (the next level down) isn't reliably documented for most aymoqs, so
 * it's always free text. Anyone can type a name that isn't listed here at any level. */
export const UZBEK_URUGS: Record<string, string[]> = {
  "Qoʻngʻirot": ["Voxtamgʻali", "Qoʻshtamgʻali", "Qonjigʻali", "Oyinlilar", "Tortuvli"],
  "Nayman": ["Qoʻshtamgʻali", "Uvaqtamgʻali", "Sadir"],
  "Kenagas": ["Qayurasali", "Qaroqli", "Ochamayli", "Jikqut", "Aboqli"],
  "Mangʻit": ["Toʻq mangʻit", "Oq mangʻit", "Qora mangʻit"],
  "Qoraqalpoq": ["Qoraqoʻyli", "Qorasingir", "Oymavut", "Istek", "Ochamayli"],
  "Qatagʻon": ["Besh qaban", "Saljovut", "Toʻrt ota"],
  "Moʻytan": ["Tilikxona", "Koʻrmishli", "Qazayogʻli", "Chagʻar", "Sum", "Oqshayiq", "Chuchen"],
  "Tuyoqli": [],
  "Saroy": [],
  "Bo'rin": [],
  "Xitoy": [],
  "Qipchoq": [],
  "Ming": [],
  "Misit": [],
  "Tama": [],
  "Yabu": [],
  "Burkut": [],
  "Arlat": [],
  "Qangʻli": [],
  "Qirq": [],
  "Yuz": [],
  "Batash": [],
};

export const UZBEK_URUG_NAMES = Object.keys(UZBEK_URUGS);
