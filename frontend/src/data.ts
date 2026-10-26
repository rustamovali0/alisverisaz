export type Product = {
  id: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  oldPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  store: string;
  stock: number;
  vip?: boolean;
  rental?: boolean;
  colors: string[];
  description: string;
  status?: string;
};
export const categories = [
  {
    id: "Elektronika",
    icon: "headphones",
    label: "Elektronika",
    count: "2 480 məhsul",
    bg: "#edf1f5",
    image: "headphones",
  },
  {
    id: "Geyim və moda",
    icon: "shirt",
    label: "Geyim və moda",
    count: "3 250 məhsul",
    bg: "#f5eee6",
    image: "sneaker",
  },
  {
    id: "Ev və bağ",
    icon: "armchair",
    label: "Ev və bağ",
    count: "1 840 məhsul",
    bg: "#edf1e9",
    image: "chair",
  },
  {
    id: "Gözəllik",
    icon: "sparkles",
    label: "Gözəllik və qulluq",
    count: "960 məhsul",
    bg: "#f7eae7",
    image: "beauty",
  },
  {
    id: "İdman",
    icon: "dumbbell",
    label: "İdman və istirahət",
    count: "720 məhsul",
    bg: "#edf0f2",
    image: "sport",
  },
  {
    id: "Uşaq aləmi",
    icon: "baby",
    label: "Uşaq aləmi",
    count: "1 120 məhsul",
    bg: "#f6f0e1",
    image: "toy",
  },
  {
    id: "Aksesuarlar",
    icon: "watch",
    label: "Aksesuarlar",
    count: "1 560 məhsul",
    bg: "#eeeaf4",
    image: "watch",
  },
  {
    id: "Avto",
    icon: "car",
    label: "Avto və alətlər",
    count: "680 məhsul",
    bg: "#eaf0ed",
    image: "tools",
  },
];
export const products: Product[] = [
  {
    id: 1,
    name: "Sony WH-1000XM5 simsiz qulaqlıq",
    brand: "SONY",
    category: "Elektronika",
    price: 549,
    oldPrice: 699,
    image: "headphones",
    rating: 4.9,
    reviews: 128,
    store: "TechZone",
    stock: 18,
    vip: true,
    colors: ["#272b29", "#ddd4c3"],
    description:
      "Günün səs-küyünü geridə qoyun. Aktiv səsboğma, 30 saata qədər batareya və bütün gün rahat istifadə üçün yüngül dizayn.",
  },
  {
    id: 2,
    name: "Nike Air Force 1 ’07",
    brand: "NIKE",
    category: "Geyim və moda",
    price: 189,
    oldPrice: 249,
    image: "sneaker",
    rating: 4.8,
    reviews: 96,
    store: "Urban Style",
    stock: 24,
    vip: true,
    colors: ["#f4f2ed", "#242424", "#b9cbaf"],
    description:
      "Klassik görünüş, hər addımda rahatlıq. Dəri üst hissə və yumşaq altlıq gündəlik stilinizi tamamlayır.",
  },
  {
    id: 3,
    name: "Apple Watch Series 9, 45 mm",
    brand: "APPLE",
    category: "Elektronika",
    price: 729,
    oldPrice: 849,
    image: "watch",
    rating: 4.9,
    reviews: 84,
    store: "iSpace Bakı",
    stock: 12,
    vip: true,
    colors: ["#ded5c3", "#252727", "#e5c6b7"],
    description:
      "Sağlamlıq, aktivlik və əlaqə bir biləkdə. Parlaq ekran, məşq izləmə və zərif alüminium korpus.",
  },
  {
    id: 4,
    name: "Minimalist istirahət kreslosu",
    brand: "NORDIC HOME",
    category: "Ev və bağ",
    price: 325,
    oldPrice: 420,
    image: "chair",
    rating: 4.7,
    reviews: 52,
    store: "Nordic Home",
    stock: 8,
    vip: true,
    colors: ["#b6a28b", "#ded9cc", "#698773"],
    description:
      "Evinizdə öz rahat guşənizi yaradın. Təbii ağac ayaqlar və toxumalı yumşaq örtüklə Skandinaviya sadəliyi.",
  },
  {
    id: 5,
    name: "Dyson Supersonic saç qurudan",
    brand: "DYSON",
    category: "Gözəllik",
    price: 799,
    oldPrice: 949,
    image: "dryer",
    rating: 4.8,
    reviews: 67,
    store: "Beauty Lab",
    stock: 9,
    colors: ["#d78fae", "#55545c"],
    description:
      "Saçınıza zərif qulluq. Güclü hava axını, temperatur nəzarəti və gündəlik istifadə üçün rahat forma.",
  },
  {
    id: 6,
    name: "Fujifilm X100V fotoaparat",
    brand: "FUJIFILM",
    category: "Elektronika",
    price: 85,
    image: "camera",
    rating: 4.9,
    reviews: 41,
    store: "Foto Market",
    stock: 5,
    rental: true,
    colors: ["#c7c8c6", "#252525"],
    description:
      "Xüsusi anlarınızı fərqli görünüşlə yadda saxlayın. Klassik dizayn və yaradıcı fotoqrafiya üçün çevik idarəetmə. Günlük icarə.",
  },
  {
    id: 7,
    name: "New Balance 530 gündəlik ayaqqabı",
    brand: "NEW BALANCE",
    category: "Geyim və moda",
    price: 229,
    image: "shoe",
    rating: 4.8,
    reviews: 73,
    store: "Urban Style",
    stock: 16,
    colors: ["#e4e1d7", "#9b9d9e"],
    description:
      "Gündəlik hərəkətə uyğun idman üslubu. Yüngül, nəfəs alan üst hissə və yumşaq dəstək.",
  },
  {
    id: 8,
    name: "Aesop əl və bədən baxım dəsti",
    brand: "AESOP",
    category: "Gözəllik",
    price: 119,
    oldPrice: 149,
    image: "beauty",
    rating: 4.7,
    reviews: 38,
    store: "Beauty Lab",
    stock: 21,
    colors: ["#957555"],
    description:
      "Gündəlik ritualınıza kiçik bir xoşbəxtlik əlavə edin. Zərif ətirli, nəmləndirici qulluq dəsti.",
  },
  {
    id: 9,
    name: "Marshall Emberton II dinamik",
    brand: "MARSHALL",
    category: "Elektronika",
    price: 299,
    oldPrice: 359,
    image: "speaker",
    rating: 4.8,
    reviews: 64,
    store: "TechZone",
    stock: 13,
    colors: ["#242424", "#c3b79c"],
    description:
      "Sevdiyiniz musiqi hər yerdə sizinlə. Kompakt ölçü, zəngin səs və daşınması asan quruluş.",
  },
  {
    id: 10,
    name: "Monstera dekorativ otaq bitkisi",
    brand: "GREEN HOUSE",
    category: "Ev və bağ",
    price: 49,
    image: "plant",
    rating: 4.9,
    reviews: 29,
    store: "Nordic Home",
    stock: 30,
    colors: ["#4e7651"],
    description:
      "Məkanınıza təbii canlılıq qatın. Dekorativ dibçəklə birlikdə sağlam, yaşıl otaq bitkisi.",
  },
  {
    id: 11,
    name: "Manduka yoqa döşəyi",
    brand: "MANDUKA",
    category: "İdman",
    price: 89,
    oldPrice: 110,
    image: "sport",
    rating: 4.8,
    reviews: 31,
    store: "Active Life",
    stock: 17,
    colors: ["#718978", "#353c3b"],
    description:
      "Məşq vaxtı özünüzə diqqət ayırın. Sürüşməyən səth və rahat qalınlıq gündəlik hərəkəti asanlaşdırır.",
  },
  {
    id: 12,
    name: "Taxta inkişaf oyuncaqları dəsti",
    brand: "LITTLE WORLD",
    category: "Uşaq aləmi",
    price: 65,
    image: "toy",
    rating: 4.9,
    reviews: 45,
    store: "Little World",
    stock: 22,
    colors: ["#e2b674", "#a4bda3"],
    description:
      "Kiçik kəşflər üçün böyük dünyalar. Təbii taxtadan hazırlanmış rəngli və yaradıcı oyun dəsti.",
  },
  {
    id: 13,
    name: "Casio Vintage rəqəmsal saat",
    brand: "CASIO",
    category: "Aksesuarlar",
    price: 79,
    oldPrice: 99,
    image: "casio",
    rating: 4.7,
    reviews: 59,
    store: "Urban Style",
    stock: 14,
    colors: ["#bdbdbd", "#c9b77c"],
    description:
      "Zamana meydan oxuyan klassik. Gündəlik istifadə üçün yüngül və funksional rəqəmsal saat.",
  },
  {
    id: 14,
    name: "Bosch universal alətlər dəsti",
    brand: "BOSCH",
    category: "Avto",
    price: 159,
    image: "tools",
    rating: 4.6,
    reviews: 24,
    store: "Usta Market",
    stock: 11,
    colors: ["#305946"],
    description:
      "Evdə və qarajda gündəlik işlər üçün alətlər bir yerdə. Rahat çanta və çoxfunksiyalı dəst.",
  },
  {
    id: 15,
    name: "Kətan çiyin çantası",
    brand: "MANGO",
    category: "Aksesuarlar",
    price: 69,
    oldPrice: 89,
    image: "bag",
    rating: 4.7,
    reviews: 32,
    store: "Urban Style",
    stock: 20,
    colors: ["#c6ad89", "#333333"],
    description:
      "Təbii tekstura, sadə forma. Günlük əşyalarınız üçün geniş və yüngül çiyin çantası.",
  },
  {
    id: 16,
    name: "Keramika qəhvə fincanı dəsti",
    brand: "NORDIC HOME",
    category: "Ev və bağ",
    price: 39,
    image: "cup",
    rating: 4.8,
    reviews: 43,
    store: "Nordic Home",
    stock: 32,
    colors: ["#d4c8b4", "#8da491"],
    description:
      "Səhərinizi sevimli bir ritualla başlayın. İki nəfərlik minimalist keramika fincan dəsti.",
  },
];
export const stores = [
  {
    name: "TechZone",
    tag: "Texnologiya bir addım önündə",
    type: "Elektronika",
    logo: "TZ",
    color: "#1c252c",
    rating: 4.9,
    count: 248,
  },
  {
    name: "Urban Style",
    tag: "Stilini özün yarat",
    type: "Geyim və moda",
    logo: "u.",
    color: "#ac684b",
    rating: 4.8,
    count: 316,
  },
  {
    name: "Nordic Home",
    tag: "Evinizin yeni hekayəsi",
    type: "Ev və bağ",
    logo: "nh",
    color: "#637b65",
    rating: 4.9,
    count: 182,
  },
  {
    name: "Beauty Lab",
    tag: "Özünə ayırdığın gözəl anlar",
    type: "Gözəllik",
    logo: "b.",
    color: "#b87c88",
    rating: 4.8,
    count: 124,
  },
];
export const img = (name: string) => `/marketplace/images/${name}.jpg`;
export const money = (n: number) =>
  new Intl.NumberFormat("az-AZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n) + " ₼";
export const normalize = (s: string) =>
  s
    .toLocaleLowerCase("az")
    .replace(/[ə]/g, "e")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ç]/g, "c")
    .replace(/[ğ]/g, "g");
