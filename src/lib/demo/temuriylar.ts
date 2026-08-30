import { DemoTreeBuilder } from "./builder";

/**
 * Temuriylar sulolasi — Amir Temurdan Boburgacha, olti avlod.
 *
 * A curated excerpt, not an exhaustive dynasty chart (Abu Said Mirzoning
 * oʻzi ellik-oltmishga yaqin farzandi boʻlgan) — the line kept here is the
 * one every source agrees on: Temur → Mironshoh → Muhammad Mirzo → Abu Said
 * Mirzo → Umar Shayx Mirzo II → Bobur, plus Shohrux → Ulugʻbek → Abdulatif
 * as the dynasty's other well-documented branch. Dates are ISO only where a
 * source gives a real day/month; where only the year is known, that year is
 * still stated in the bio text even though the compact tree card shows "?"
 * for it — nothing here is invented precision.
 */
const t = new DemoTreeBuilder("demo-temuriylar");

const taragʻay = t.person({
  id: "taragʻay",
  name: "Amir Taragʻay Bahodir",
  gender: "male",
  deathDate: "1360-03-12",
  place: "Kesh (Shahrisabz)",
  bio: "Amir Temurning otasi, Barlos urugʻining beklaridan. Kesh (hozirgi Shahrisabz) atrofida yashagan.",
});

const temur = t.person({
  id: "temur",
  name: "Amir Temur",
  gender: "male",
  birthDate: "1336-04-09",
  deathDate: "1405-02-18",
  place: "Samarqand",
  bio: "Temuriylar sulolasi asoschisi. 1370-yilda Movarounnahrni birlashtirib, Samarqandni poytaxt qildi va Hindistondan Anadoluigacha choʻzilgan imperiya barpo etdi. Bosh xotini Saroy Mulk Xonim (Chingizxon avlodidan, farzandsiz) edi — quyidagi toʻrtta oʻgʻli boshqa rafiqalaridan tugʻilgan. Otrar yaqinida, Xitoyga yurish chogʻida vafot etgan.",
});

const jahongir = t.person({
  id: "jahongir",
  name: "Jahongir Mirzo",
  gender: "male",
  bornApprox: "1356",
  place: "Samarqand",
  bio: "Amir Temurning toʻngʻich oʻgʻli va dastlabki vorisi. 1376-yilda, yigirma yoshlarida vafot etgan — oʻgʻli Muhammad Sulton keyinchalik Temurning valiahdi boʻldi.",
});

const umarShayx = t.person({
  id: "umar-shayx-i",
  name: "Umar Shayx Mirzo I",
  gender: "male",
  bornApprox: "1356",
  place: "Andijon",
  bio: "Amir Temurning oʻgʻli, Fargʻona va Andijon atrofini boshqargan. 1394-yilda vafot etgan.",
});

const mironshoh = t.person({
  id: "mironshoh",
  name: "Mironshoh Mirzo",
  gender: "male",
  bornApprox: "1366",
  place: "Ozarbayjon",
  bio: "Amir Temurning uchinchi oʻgʻli, Ozarbayjon va Iroqi Ajam hokimi. 1408-yilda vafot etgan. Undan Abu Said Mirzo va, keyinroq, Bobur avlodi tarqalgan.",
});

const shohrux = t.person({
  id: "shohrux",
  name: "Shohrux Mirzo",
  gender: "male",
  bornApprox: "1377",
  deathDate: "1447-03-13",
  place: "Hirot",
  bio: "Amir Temurning eng kichik oʻgʻli va uning oʻlimidan keyin imperiyani qayta birlashtirgan vorisi. Poytaxtni Hirotga koʻchirdi; uning davri Temuriylar renessansining choʻqqisi hisoblanadi.",
});

t.union(temur, null, [jahongir, umarShayx, mironshoh, shohrux]);
t.union(taragʻay, null, [temur]);

const muhammadSulton = t.person({
  id: "muhammad-sulton",
  name: "Muhammad Sulton Mirzo",
  gender: "male",
  bornApprox: "1375",
  place: "Samarqand",
  bio: "Jahongir Mirzoning oʻgʻli, otasi erta vafot etgani sabab buvasi Amir Temur uni oʻz valiahdi etib tayinlagan. 1403-yilda, Temurdan oldinroq vafot etgan.",
});
t.union(jahongir, null, [muhammadSulton]);

const muhammadMirzo = t.person({
  id: "muhammad-mirzo",
  name: "Muhammad Mirzo",
  gender: "male",
  place: "Ozarbayjon",
  bio: "Mironshoh Mirzoning oʻgʻli, Amir Temurning nabirasi. Abu Said Mirzoning otasi.",
});
t.union(mironshoh, null, [muhammadMirzo]);

const ulugʻbek = t.person({
  id: "ulugʻbek",
  name: "Mirzo Ulugʻbek",
  gender: "male",
  bornApprox: "1394",
  deathDate: "1449-10-27",
  place: "Samarqand",
  bio: "Shohrux Mirzoning toʻngʻich oʻgʻli, Movarounnahr hukmdori va yirik astronom. Samarqanddagi rasadxonasi va madrasasi bilan mashhur; yulduzlar jadvalini (Ziji Kuragoniy) tuzgan. Oʻz oʻgʻli Abdulatif buyrugʻi bilan taxtdan agʻdarilib, oʻldirilgan.",
});

const boysungʻur = t.person({
  id: "boysungʻur",
  name: "Boysungʻur Mirzo",
  gender: "male",
  bornApprox: "1399",
  place: "Hirot",
  bio: "Shohrux Mirzoning oʻgʻli, Hirot saroyida xattotlik va kitobat sanʼatiga homiylik qilgani bilan tanilgan — mashhur \"Boysungʻur Shohnomasi\" qoʻlyozmasi uning buyurtmasi bilan yaratilgan. 1437-yilda vafot etgan.",
});

t.union(shohrux, null, [ulugʻbek, boysungʻur]);

const abdulatif = t.person({
  id: "abdulatif",
  name: "Abdulatif Mirzo",
  gender: "male",
  bornApprox: "1420",
  deathDate: "1450-05-09",
  place: "Samarqand",
  bio: "Ulugʻbekning oʻgʻli. Otasini taxtdan agʻdarib oʻldirtirgach, oʻzi ham olti oydan soʻng, 1450-yilda oʻldirilgan.",
});
t.union(ulugʻbek, null, [abdulatif]);

const abuSaid = t.person({
  id: "abu-said",
  name: "Abu Said Mirzo",
  gender: "male",
  bornApprox: "1424",
  deathDate: "1469-02-05",
  place: "Samarqand",
  bio: "Mironshoh Mirzo shajarasidan, Muhammad Mirzoning oʻgʻli. 1451-yilda Movarounnahrni qoʻlga kiritib, Temuriylar taxtini oʻz avlodiga qaytargan. Uning oʻgʻillari orasida Samarqand, Buxoro va Fargʻona vodiysi boʻlib berilgan.",
});
t.union(muhammadMirzo, null, [abuSaid]);

const sultonAhmad = t.person({
  id: "sulton-ahmad",
  name: "Sulton Ahmad Mirzo",
  gender: "male",
  bornApprox: "1451",
  place: "Samarqand",
  bio: "Abu Said Mirzoning oʻgʻli, Samarqand hukmdori. 1494-yilda vafot etgan.",
});

const umarShayxII = t.person({
  id: "umar-shayx-ii",
  name: "Umar Shayx Mirzo II",
  gender: "male",
  bornApprox: "1456",
  place: "Andijon",
  bio: "Abu Said Mirzoning oʻgʻli, Fargʻona vodiysi (Andijon) hukmdori. 1494-yilda vafot etgan. Boburning otasi.",
});

t.union(abuSaid, null, [sultonAhmad, umarShayxII]);

t.person({
  id: "bobur",
  name: "Zahiriddin Muhammad Bobur",
  gender: "male",
  birthDate: "1483-02-14",
  deathDate: "1530-12-26",
  place: "Andijon → Dehli",
  bio: "Umar Shayx Mirzo IIning oʻgʻli, Amir Temurning beshinchi avlod nabirasi. 1526-yilda Hindistonda Boburiylar (Mugʻallar) imperiyasiga asos solgan — Temuriylar sulolasining eng uzoq davom etgan davomi. Ajoyib shoir va \"Boburnoma\" xotiralari muallifi ham edi.",
});
t.union(umarShayxII, null, ["bobur"]);

export const temuriylarDemo = {
  slug: "temuriylar",
  title: "Temuriylar shajarasi",
  subtitle: "Amir Temurdan Zahiriddin Muhammad Boburgacha — olti avlod",
  people: t.people,
  families: t.families,
  familyChildren: t.familyChildren,
};
