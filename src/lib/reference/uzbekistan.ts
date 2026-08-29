/** Uzbekistan's 14 top-level regions and their districts (tuman/shahar).
 * Source: Wikipedia "Districts of Uzbekistan" (Aug 2026). District-level data changes
 * occasionally (new districts get carved out) — this is a starting point for the
 * dropdown, not authoritative; the mahalla/address field below it is always free text. */
export const UZBEKISTAN = "Oʻzbekiston";

export const UZBEKISTAN_REGIONS: Record<string, string[]> = {
  "Qoraqalpogʻiston Respublikasi": [
    "Amudaryo", "Beruniy", "Chimboy", "Ellikqala", "Kegeyli", "Moʻynoq", "Nukus",
    "Qanlikoʻl", "Qoʻngʻirot", "Qoraoʻzak", "Shumanay", "Taxtakoʻpir", "Toʻrtkoʻl",
    "Xoʻjayli", "Taxiatosh", "Boʻzatov",
  ],
  "Xorazm viloyati": [
    "Bogʻot", "Gurlan", "Xonqa", "Hazorasp", "Xiva", "Qoʻshkoʻpir", "Shovot",
    "Urganch", "Yangiariq", "Yangibozor", "Tuproqqalʼa",
  ],
  "Navoiy viloyati": [
    "Konimex", "Qiziltepa", "Xatirchi", "Navbahor", "Karmana", "Nurota", "Tomdi", "Uchquduq",
  ],
  "Buxoro viloyati": [
    "Olot", "Buxoro", "Gʻijduvon", "Jondor", "Kogon", "Qorakoʻl", "Qorovulbozor",
    "Peshku", "Romitan", "Shofirkon", "Vobkent",
  ],
  "Samarqand viloyati": [
    "Bulungʻur", "Ishtixon", "Jomboy", "Kattaqoʻrgʻon", "Qoʻshrabot", "Narpay",
    "Nurobod", "Oqdaryo", "Paxtachi", "Payariq", "Pastdargʻom", "Samarqand", "Toyloq", "Urgut",
  ],
  "Qashqadaryo viloyati": [
    "Chiroqchi", "Dehqonobod", "Gʻuzor", "Qamashi", "Qarshi", "Koson", "Kasbi",
    "Kitob", "Mirishkor", "Muborak", "Nishon", "Shahrisabz", "Yakkabogʻ", "Koʻkdala",
  ],
  "Surxondaryo viloyati": [
    "Angor", "Bandixon", "Boysun", "Denov", "Jarqoʻrgʻon", "Qiziriq", "Qumqoʻrgʻon",
    "Muzrabot", "Oltinsoy", "Sariosiyo", "Sherobod", "Shoʻrchi", "Termiz", "Uzun",
  ],
  "Jizzax viloyati": [
    "Arnasoy", "Baxmal", "Doʻstlik", "Forish", "Gʻallaorol", "Sharof Rashidov",
    "Mirzachoʻl", "Paxtakor", "Yangiobod", "Zomin", "Zafarobod", "Zarbdor",
  ],
  "Sirdaryo viloyati": [
    "Oqoltin", "Boyovut", "Guliston", "Xovos", "Mirzaobod", "Sardoba", "Sayxunobod", "Sirdaryo",
  ],
  "Toshkent viloyati": [
    "Bekobod", "Boʻstonliq", "Boʻka", "Chinoz", "Qibray", "Ohangaron", "Oqqoʻrgʻon",
    "Parkent", "Piskent", "Quyichirchiq", "Zangiota", "Oʻrtachirchiq", "Yangiyoʻl",
    "Yuqorichirchiq", "Toshkent tumani",
  ],
  "Namangan viloyati": [
    "Chortoq", "Chust", "Kosonsoy", "Mingbuloq", "Namangan", "Norin", "Pop",
    "Toʻraqoʻrgʻon", "Uchqoʻrgʻon", "Uychi", "Yangiqoʻrgʻon",
  ],
  "Fargʻona viloyati": [
    "Oltiariq", "Bagʻdod", "Beshariq", "Buvayda", "Dangʻara", "Fargʻona", "Furqat",
    "Qoʻshtepa", "Quva", "Rishton", "Soʻx", "Toshloq", "Uchkoʻprik", "Yozyovon",
  ],
  "Andijon viloyati": [
    "Andijon", "Asaka", "Baliqchi", "Boʻston", "Buloqboshi", "Izboskan", "Jalaquduq",
    "Xoʻjaobod", "Qoʻrgʻontepa", "Marhamat", "Oltinkoʻl", "Paxtaobod", "Shahrixon", "Ulugʻnor",
  ],
  "Toshkent shahri": [
    "Bektemir", "Chilonzor", "Yashnobod", "Mirobod", "Mirzo Ulugʻbek", "Sergeli",
    "Shayxontohur", "Olmazor", "Uchtepa", "Yakkasaroy", "Yunusobod", "Yangihayot",
  ],
};

export const UZBEKISTAN_REGION_NAMES = Object.keys(UZBEKISTAN_REGIONS);
