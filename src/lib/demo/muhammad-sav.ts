import { DemoTreeBuilder } from "./builder";

/**
 * Muhammad (sav) ning oilaviy shajarasi — ota tomondan besh avlod ajdod,
 * turmush oʻrtoqlari va nabiralarigacha.
 *
 * Names, dates, and relations here follow the genealogical facts agreed on
 * across mainstream Islamic scholarship and secular historical sources
 * alike — nothing sectarian or contested is asserted. One deliberate
 * omission: Fotima va Ali's son Muhsin, whose infant death is described
 * very differently across sources with real theological weight behind the
 * disagreement — left out rather than asserted either way, the same way
 * the Temuriylar tree stops short of Abu Said Mirzoning butun oltmish
 * farzandi. Everyone else here is uncontested.
 */
const t = new DemoTreeBuilder("demo-muhammad-sav");

const qusay = t.person({
  id: "qusay",
  name: "Qusay ibn Kilob",
  gender: "male",
  place: "Makka",
  bio: "Makkada Quraysh qabilalarini birlashtirib, Kaʼba xizmatini oʻz qoʻliga olgan ajdod.",
});

const abdumanof = t.person({
  id: "abdumanof",
  name: "Abdumanof ibn Qusay",
  gender: "male",
  place: "Makka",
});
t.union(qusay, null, [abdumanof]);

const hoshim = t.person({
  id: "hoshim",
  name: "Hoshim ibn Abdumanof",
  gender: "male",
  place: "Makka",
  bio: "Bani Hoshim urugʻining asoschisi — Makka savdo karvonlariga homiylik qilgani bilan tanilgan.",
});
t.union(abdumanof, null, [hoshim]);
// (hoshim → abdul-muttalib is linked below, once abdul-muttalib exists.)

const abdulMuttalib = t.person({
  id: "abdul-muttalib",
  name: "Abdul-Muttalib ibn Hoshim",
  gender: "male",
  place: "Makka",
  bio: "Makkaning hurmatli boshligʻlaridan, Kaʼba xizmatchisi. Nabirasi Muhammad (sav)ni otasi Abdulloh vafotidan soʻng, olti yoshigacha oʻz tarbiyasiga olgan.",
});

const abdulloh = t.person({
  id: "abdulloh",
  name: "Abdulloh ibn Abdul-Muttalib",
  gender: "male",
  place: "Makka",
  bio: "Muhammad (sav)ning otasi. Oʻgʻli tugʻilishidan oldin, savdo safaridan qaytish yoʻlida, yosh vafot etgan.",
});

const aminah = t.person({
  id: "aminah",
  name: "Aminah binti Vahb",
  gender: "female",
  place: "Makka",
  bio: "Muhammad (sav)ning onasi. Oʻgʻli olti yoshida, Madinadan Makkaga qaytish yoʻlida vafot etgan.",
});

const abuTolib = t.person({
  id: "abu-tolib",
  name: "Abu Tolib ibn Abdul-Muttalib",
  gender: "male",
  place: "Makka",
  bio: "Abdullohning akasi. Ota-onasidan judo boʻlgan jiyani Muhammad (sav)ni oʻz uyiga olib, voyaga yetkazgan. Ali ibn Abu Tolibning otasi.",
});

t.union(hoshim, null, [abdulMuttalib]);
t.union(abdulMuttalib, null, [abdulloh, abuTolib]);
t.union(abdulloh, aminah, ["muhammad"]);

const muhammad = t.person({
  id: "muhammad",
  name: "Muhammad (sav)",
  gender: "male",
  bornApprox: "570 (Fil yili)",
  deathDate: "632-06-08",
  place: "Makka → Madina",
  bio: "Islom dinining oxirgi payg'ambari. 570-yilda Makkada, Qurayshning Bani Hoshim urugʻida tugʻilgan; 40 yoshida birinchi vahiy nozil boʻlgan. 622-yilda Madinaga hijrat qilib, u yerda musulmon jamoasiga asos solgan. 632-yilda, 63 yoshida Madinada vafot etgan.",
});

// Ali is Abu Tolibning oʻgʻli (Muhammadning amakivachchasi) *and*, quyida, Fotimaning
// eri — ikkala aloqa ham chin, lekin bu daraxt vositasi faqat bitta ierarxik yoʻlni
// chiza oladi (amakivachcha nikohi — halqa hosil qiladi), shuning uchun faqat
// asosiylashgan aloqa (er-xotin, nabiralarga olib boradigan) chizilgan; amakivachchalik
// fakti ikkala kishining ham tarjimai holida qayd etilgan.
const ali = t.person({
  id: "ali",
  name: "Ali ibn Abu Tolib",
  gender: "male",
  place: "Makka → Kufa",
  bio: "Abu Tolibning oʻgʻli, Muhammad (sav)ning amakivachchasi va, Fotimaga uylangach, kuyovi ham. Toʻrtinchi xalifa boʻlgan.",
});

// Turmush o'rtoqlari — barchasi "Ummul mo'minin" (mo'minlarning onalari) deb ataladi.
const xadicha = t.person({
  id: "xadicha",
  name: "Xadicha binti Xuvaylid",
  gender: "female",
  place: "Makka",
  bio: "Muhammad (sav)ning birinchi rafiqasi va islomni birinchi qabul qilgan inson. 25 yil birga yashab, oltita farzandning onasi boʻlgan. Vafotigacha yagona rafiqasi boʻlgan.",
});
const savda = t.person({
  id: "savda",
  name: "Savda binti Zamʼa",
  gender: "female",
  place: "Madina",
  bio: "Xadicha vafotidan soʻng nikohlangan ikkinchi rafiqasi.",
});
const oisha = t.person({
  id: "oisha",
  name: "Oisha binti Abu Bakr",
  gender: "female",
  place: "Madina",
  bio: "Birinchi xalifa Abu Bakrning qizi. Islom ilmida hadis rivoyat qilishda eng koʻp manba boʻlgan sahobalardan biri.",
});
const hafsa = t.person({
  id: "hafsa",
  name: "Hafsa binti Umar",
  gender: "female",
  place: "Madina",
  bio: "Ikkinchi xalifa Umar ibn Xattobning qizi.",
});
const zaynabXuzayma = t.person({
  id: "zaynab-xuzayma",
  name: "Zaynab binti Xuzayma",
  gender: "female",
  place: "Madina",
  bio: "Kambagʻallarga gʻamxoʻrligi uchun \"Ummul-masokin\" (kambagʻallarning onasi) deb atalgan.",
});
const ummSalama = t.person({
  id: "umm-salama",
  name: "Umm Salama (Hind binti Abu Umayya)",
  gender: "female",
  place: "Madina",
});
const zaynabJahsh = t.person({
  id: "zaynab-jahsh",
  name: "Zaynab binti Jahsh",
  gender: "female",
  place: "Madina",
  bio: "Muhammad (sav)ning amakivachchasi.",
});
const juvayriya = t.person({
  id: "juvayriya",
  name: "Juvayriya binti Horis",
  gender: "female",
  place: "Madina",
});
const ummHabiba = t.person({
  id: "umm-habiba",
  name: "Umm Habiba (Ramla binti Abu Sufyon)",
  gender: "female",
  place: "Madina",
});
const safiyya = t.person({
  id: "safiyya",
  name: "Safiyya binti Huyay",
  gender: "female",
  place: "Madina",
});
const maymuna = t.person({
  id: "maymuna",
  name: "Maymuna binti Horis",
  gender: "female",
  place: "Madina",
  bio: "Muhammad (sav)ning oxirgi nikohlangan rafiqasi.",
});
const mariya = t.person({
  id: "mariya",
  name: "Mariya al-Qibtiyya",
  gender: "female",
  place: "Madina",
  bio: "Misrdan kelgan. Muhammad (sav)ning Madinada tugʻilgan yagona oʻgʻli Ibrohimning onasi.",
});

const qosim = t.person({
  id: "qosim",
  name: "Qosim ibn Muhammad",
  gender: "male",
  place: "Makka",
  bio: "Muhammad (sav)ning toʻngʻich oʻgʻli, goʻdakligida Makkada vafot etgan.",
});
const abdullohIbnMuhammad = t.person({
  id: "abdulloh-ibn-muhammad",
  name: "Abdulloh ibn Muhammad",
  gender: "male",
  place: "Makka",
  bio: "Muhammad (sav)ning oʻgʻli, goʻdakligida vafot etgan.",
});
const zaynabBintMuhammad = t.person({
  id: "zaynab-bint-muhammad",
  name: "Zaynab binti Muhammad",
  gender: "female",
  place: "Makka → Madina",
  bio: "Muhammad (sav)ning toʻngʻich qizi. Abul-Os ibn Rabiʼga turmushga chiqqan.",
});
const ruqayya = t.person({
  id: "ruqayya",
  name: "Ruqayya binti Muhammad",
  gender: "female",
  place: "Makka → Madina",
  bio: "Usmon ibn Affonning birinchi rafiqasi. Badr jangi kunlarida, Madinada vafot etgan.",
});
const ummKulsumBintMuhammad = t.person({
  id: "umm-kulsum-bint-muhammad",
  name: "Umm Kulsum binti Muhammad",
  gender: "female",
  place: "Makka → Madina",
  bio: "Opasi Ruqayya vafotidan soʻng Usmon ibn Affonga turmushga chiqqan — shuning uchun Usmon \"Zun-Nurayn\" (ikki nur egasi) deb atalgan.",
});
const fotima = t.person({
  id: "fotima",
  name: "Fotima binti Muhammad",
  gender: "female",
  place: "Makka → Madina",
  bio: "Muhammad (sav)ning eng kichik va otasiga eng yaqin qizi. Ali ibn Abu Tolibga turmushga chiqqan; Hasan va Husaynning onasi. Otasidan olti oy soʻng, Madinada vafot etgan.",
});
const ibrohim = t.person({
  id: "ibrohim",
  name: "Ibrohim ibn Muhammad",
  gender: "male",
  place: "Madina",
  bio: "Mariya al-Qibtiyyadan tugʻilgan oʻgʻli, taxminan bir yarim yoshida Madinada vafot etgan.",
});

t.union(muhammad, xadicha, [qosim, abdullohIbnMuhammad, zaynabBintMuhammad, ruqayya, ummKulsumBintMuhammad, fotima], { order: 1 });
t.union(muhammad, savda, [], { order: 2 });
t.union(muhammad, oisha, [], { order: 3 });
t.union(muhammad, hafsa, [], { order: 4 });
t.union(muhammad, zaynabXuzayma, [], { order: 5 });
t.union(muhammad, ummSalama, [], { order: 6 });
t.union(muhammad, zaynabJahsh, [], { order: 7 });
t.union(muhammad, juvayriya, [], { order: 8 });
t.union(muhammad, ummHabiba, [], { order: 9 });
t.union(muhammad, safiyya, [], { order: 10 });
t.union(muhammad, maymuna, [], { order: 11 });
t.union(muhammad, mariya, [ibrohim], { order: 12 });

// Nabiralar — Zaynab binti Muhammad orqali.
const abulOs = t.person({
  id: "abul-os",
  name: "Abul-Os ibn Rabiʼ",
  gender: "male",
  place: "Makka → Madina",
  bio: "Zaynab binti Muhammadning eri.",
});
const aliIbnZaynab = t.person({
  id: "ali-ibn-zaynab",
  name: "Ali ibn Zaynab",
  gender: "male",
  place: "Madina",
  bio: "Zaynab va Abul-Osning oʻgʻli, yosh vafot etgan.",
});
const umamaBintZaynab = t.person({
  id: "umama-bint-zaynab",
  name: "Umama binti Zaynab",
  gender: "female",
  place: "Madina",
  bio: "Zaynab va Abul-Osning qizi — buvasi Muhammad (sav) namoz oʻqiyotganda uni koʻtarib yurgani hadislarda zikr etiladi.",
});
t.union(abulOs, zaynabBintMuhammad, [aliIbnZaynab, umamaBintZaynab]);

// Nabiralar — Ruqayya va Umm Kulsum orqali (ikkalasi ham Usmon ibn Affonga turmushga chiqqan).
const usmon = t.person({
  id: "usmon",
  name: "Usmon ibn Affon",
  gender: "male",
  place: "Madina",
  bio: "Uchinchi xalifa. Ketma-ket Muhammad (sav)ning ikki qiziga — Ruqayya, soʻng Umm Kulsumga — uylangan.",
});
const abdullohIbnUsmon = t.person({
  id: "abdulloh-ibn-usmon",
  name: "Abdulloh ibn Usmon",
  gender: "male",
  place: "Madina",
  bio: "Usmon va Ruqayyaning oʻgʻli, goʻdakligida vafot etgan.",
});
// Usmon Ruqayyadan soʻng Umm Kulsumga ham uylangan — ammo ular opa-singil
// boʻlgani uchun ikkala nikohni ham chizish xuddi Ali/Abu Tolib holatidagi
// kabi halqa hosil qiladi (bu safar "opa-singilning eri bitta odam" shaklida);
// shu sabab faqat birinchi (farzandli) nikoh chizilgan, ikkinchisi ikkala
// kishining ham tarjimai holida qayd etilgan.
t.union(usmon, ruqayya, [abdullohIbnUsmon], { order: 1 });

// Nabiralar — Fotima va Ali orqali.
const hasan = t.person({
  id: "hasan",
  name: "Hasan ibn Ali",
  gender: "male",
  place: "Madina → Kufa",
  bio: "Fotima va Alining toʻngʻich oʻgʻli. Otasi vafotidan soʻng qisqa muddat xalifa boʻlgan.",
});
const husayn = t.person({
  id: "husayn",
  name: "Husayn ibn Ali",
  gender: "male",
  place: "Madina → Karbalo",
  bio: "Fotima va Alining oʻgʻli. 680-yilda Karbaloda halok boʻlgan — bu voqea islom tarixidagi eng chuqur iz qoldirgan fojialardan biri.",
});
const zaynabBintAli = t.person({
  id: "zaynab-bint-ali",
  name: "Zaynab binti Ali",
  gender: "female",
  place: "Madina → Kufa",
  bio: "Fotima va Alining qizi. Akasi Husayn bilan Karbaloda boʻlib, keyinchalik voqealarni dunyoga yetkazgani bilan tanilgan.",
});
const ummKulsumBintAli = t.person({
  id: "umm-kulsum-bint-ali",
  name: "Umm Kulsum binti Ali",
  gender: "female",
  place: "Madina",
  bio: "Fotima va Alining qizi.",
});
t.union(ali, fotima, [hasan, husayn, zaynabBintAli, ummKulsumBintAli]);

export const muhammadSavDemo = {
  slug: "muhammad-sav",
  title: "Muhammad (sav) shajarasi",
  subtitle: "Besh avlod ajdoddan turmush oʻrtoqlari va nabiralarigacha",
  people: t.people,
  families: t.families,
  familyChildren: t.familyChildren,
};
