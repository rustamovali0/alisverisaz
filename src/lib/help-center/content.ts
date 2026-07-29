export type HelpSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  note?: string;
};

export type HelpPageContent = {
  slug: string;
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  summary: string;
  lastUpdated: string;
  sections: HelpSection[];
  relatedSlugs: string[];
};

export type HelpArticleContent = {
  slug: string;
  href: string;
  category: string;
  title: string;
  summary: string;
  steps: string[];
  notes: string[];
  relatedSlugs: string[];
};

export type HelpFaqContent = {
  slug: string;
  href: string;
  category: string;
  question: string;
  answer: string;
  relatedSlugs: string[];
};

type TopicTemplate = {
  slug: string;
  title: string;
};

type ContentTemplate = {
  slug: string;
  href: string;
  category: string;
  title: string;
  summary: string;
  steps: string[];
  notes: string[];
  topics: TopicTemplate[];
  questionLead?: string;
  answerLead?: string;
};

const contentDate = "2026-07-29";

export const helpNavigation = [
  { href: "/help", label: "Kömək mərkəzi" },
  { href: "/help/articles", label: "Məqalələr" },
  { href: "/faq", label: "FAQ" },
  { href: "/terms", label: "İstifadəçi razılaşması" },
  { href: "/privacy", label: "Məxfilik siyasəti" },
  { href: "/rules", label: "Marketplace qaydaları" },
  { href: "/guide/new-listing", label: "Yeni elan təlimatı" },
  { href: "/guide/seller", label: "Satıcı təlimatı" },
  { href: "/guide/buyer", label: "Alıcı təlimatı" },
  { href: "/about", label: "Layihə haqqında" },
  { href: "/contact", label: "Əlaqə və dəstək" },
] as const;

export const helpPages: HelpPageContent[] = [
  {
    slug: "help",
    href: "/help",
    eyebrow: "Kömək mərkəzi",
    title: "Kömək Mərkəzi",
    description:
      "Alışveriş.az istifadəçiləri üçün əsas qaydalar, təlimatlar və dəstək marşrutları.",
    summary:
      "Platformada hesab, elan, alış, satış və təhlükəsizlik mövzularını bir yerdə toplayan əsas giriş səhifəsi.",
    lastUpdated: contentDate,
    sections: [
      {
        heading: "Haradan başlamaq lazımdır",
        paragraphs: [
          "Əvvəlcə axtardığın mövzunu seç: giriş, hesab, satış, alış və ya təhlükəsizlik. Hər bölmə qısa izahla başlayır və lazımi addımlara aparır.",
          "Əgər məsələ hüquqi şərtlərlə bağlıdırsa, uyğun sənədi aç və platformadan istifadə qaydalarını oxu. Praktik sual üçün isə FAQ və məqalələr bölməsi daha sürətlidir.",
        ],
        bullets: [
          "Yeni istifadəçisənsə, qeydiyyat və hesab təhlükəsizliyi ilə başla.",
          "Satıcıdırsa, məhsul yerləşdirmə və mağaza təlimatlarını oxu.",
          "Problem varsa, əlaqə və dəstək bölməsindən müraciət göndər.",
        ],
      },
      {
        heading: "Bu səhifədə nə var",
        paragraphs: [
          "Kömək mərkəzi əsas suallara yön verir, FAQ hissəsi qısa cavabları göstərir və məqalələr bölməsi mərhələli izah verir.",
          "Hüquqi sənədlər isə istifadəçi razılaşması, məxfilik siyasəti və marketplace qaydaları kimi ayrıca səhifələrdə toplanıb.",
        ],
      },
      {
        heading: "Dəstək kanalı",
        paragraphs: [
          "Əlaqə və dəstək səhifəsi platforma komandası ilə birbaşa yazışma və sorğu göndərmə üçün nəzərdə tutulub. Texniki problem və ya hesabla bağlı riskli vəziyyətlərdə əvvəlcə bu kanaldan istifadə et.",
        ],
      },
    ],
    relatedSlugs: ["faq", "articles", "contact", "terms"],
  },
  {
    slug: "faq",
    href: "/faq",
    eyebrow: "Sürətli cavablar",
    title: "FAQ",
    description:
      "Ən çox verilən suallara qısa və praktik cavablar bir səhifədə.",
    summary:
      "Qeydiyyat, elan, satış, alış, mesaj və təhlükəsizlik mövzularında 100+ tez-tez soruşulan sual.",
    lastUpdated: contentDate,
    sections: [
      {
        heading: "FAQ necə istifadə olunur",
        paragraphs: [
          "Sualı oxu, vəziyyətini tap və cavabdakı addımları sırayla yoxla. Eyni problem təkrarlanırsa, həmin bölmənin əlaqəli məqaləsinə keç.",
          "Cavablar qısa saxlanılıb ki, istifadəçi axtardığı həllə tez çatsın.",
        ],
      },
      {
        heading: "Məsləhət",
        paragraphs: [
          "Əgər hesab təhlükəsizliyi, ödəniş və ya şübhəli davranışla bağlı sualın varsa, yalnız ən son və rəsmi məlumatı əsas götür.",
        ],
      },
    ],
    relatedSlugs: ["help", "articles", "contact", "privacy"],
  },
  {
    slug: "terms",
    href: "/terms",
    eyebrow: "Hüquqi sənəd",
    title: "İstifadəçi Razılaşması",
    description:
      "Alışveriş.az platformasından istifadə qaydalarını və tərəflərin məsuliyyətini izah edən əsas sənəd.",
    summary:
      "Qeydiyyat, hesab təhlükəsizliyi, elan yerləşdirmə, qadağan edilən məhsullar və mübahisə həllini əhatə edən ümumi hüquqi çərçivə.",
    lastUpdated: contentDate,
    sections: [
      {
        heading: "Ümumi müddəalar",
        paragraphs: [
          "Bu razılaşma platformadan istifadə edən hər kəs üçün tətbiq olunur. Sayta daxil olmaq, qeydiyyatdan keçmək və ya xidmətlərdən yararlanmaq bu şərtləri qəbul etdiyini göstərir.",
          "Platforma marketplace məntiqi ilə işləyir və istifadəçi ilə satıcı arasındakı münasibətdə vasitəçi rolunu oynayır.",
        ],
      },
      {
        heading: "Terminlər",
        paragraphs: [
          "Məhsul, elan, satıcı, alıcı, hesab, mağaza və sifariş kimi terminlər bu sənəddə bir-biri ilə əlaqəli şəkildə istifadə olunur.",
        ],
        bullets: [
          "Satıcı: məhsul yerləşdirən və ya mağaza idarə edən istifadəçi.",
          "Alıcı: məhsula baxan, səbət yaradan və sifariş verən istifadəçi.",
          "Platforma: Alışveriş.az veb tətbiqi və ona bağlı xidmətlər.",
        ],
      },
      {
        heading: "Platformadan istifadə",
        paragraphs: [
          "İstifadəçi sistemi dürüst və qanuni məqsədlə işlətməlidir. Saxta məlumat vermək, spam göndərmək və ya sistemi pozan davranışlar qadağandır.",
        ],
      },
      {
        heading: "Qeydiyyat və hesab təhlükəsizliyi",
        paragraphs: [
          "Qeydiyyat zamanı təqdim olunan məlumatların doğruluğuna istifadəçi cavabdehdir. Hesab şifrəsi, sessiya və giriş cihazları təhlükəsiz saxlanmalıdır.",
        ],
      },
      {
        heading: "Marketplace qaydaları",
        paragraphs: [
          "Elan məzmunu aldadıcı olmamalı, məhsul şəkilləri real və aydın olmalı, qiymət və stok məlumatı isə aktual saxlanmalıdır.",
        ],
      },
      {
        heading: "Məsuliyyət və dəyişikliklər",
        paragraphs: [
          "Platforma qaydaları yenilənə bilər. Dəyişikliklər dərc edildiyi andan qüvvədə olur və istifadəçi yenilənmiş qaydaları izləməlidir.",
        ],
      },
    ],
    relatedSlugs: ["privacy", "rules", "contact", "faq"],
  },
  {
    slug: "privacy",
    href: "/privacy",
    eyebrow: "Hüquqi sənəd",
    title: "Məxfilik Siyasəti",
    description:
      "Platformada hansı məlumatların toplandığını, necə qorunduğunu və nə üçün istifadə olunduğunu izah edir.",
    summary:
      "Şəxsi məlumatlar, sessiyalar, loglar, cookie-lər və üçüncü tərəf xidmətləri ilə bağlı məxfilik çərçivəsi.",
    lastUpdated: contentDate,
    sections: [
      {
        heading: "Hansı məlumatlar toplanır",
        paragraphs: [
          "Qeydiyyat, giriş, sifariş, mesajlaşma və dəstək müraciətləri zamanı istifadəçi tərəfindən təqdim edilən məlumatlar toplanır.",
        ],
        bullets: [
          "Ad, soyad, email, telefon və profil məlumatları.",
          "Sessiya və cihaz məlumatları.",
          "Log və təhlükəsizlik qeydləri.",
        ],
      },
      {
        heading: "Niyə toplanır",
        paragraphs: [
          "Məlumatlar hesabı idarə etmək, təhlükəsizliyi təmin etmək, sifarişləri emal etmək və istifadəçi təcrübəsini yaxşılaşdırmaq üçün istifadə olunur.",
        ],
      },
      {
        heading: "Cookie və sessiyalar",
        paragraphs: [
          "Cookie-lər sessiya idarəsi, dil seçimi, təhlükəsizlik yoxlamaları və rahat istifadə üçün istifadə edilir. Sessiya məlumatı girişin davamlılığını qorumağa kömək edir.",
        ],
      },
      {
        heading: "Məlumatların qorunması",
        paragraphs: [
          "Şəxsi məlumatlar məhdud giriş prinsipi ilə saxlanır, həssas əməliyyatlar isə səlahiyyətə əsaslanan giriş nəzarəti ilə qorunur.",
        ],
      },
      {
        heading: "İstifadəçi hüquqları",
        paragraphs: [
          "İstifadəçi şəxsi məlumatlarına baxmaq, onları düzəltmək, silinməsini istəmək və bəzi emal növlərinə etiraz etmək hüququna malikdir.",
        ],
      },
      {
        heading: "Saxlanma müddəti",
        paragraphs: [
          "Məlumatlar yalnız xidmət göstərmək və hüquqi öhdəlikləri yerinə yetirmək üçün lazım olan müddətdə saxlanır.",
        ],
      },
    ],
    relatedSlugs: ["terms", "rules", "contact", "faq"],
  },
  {
    slug: "rules",
    href: "/rules",
    eyebrow: "Marketplace siyasəti",
    title: "Marketplace Qaydaları",
    description:
      "Elan yerləşdirmə, məhsul təsviri və davranış standartlarını müəyyən edən əməliyyat qaydaları.",
    summary:
      "Spam, saxta məhsul, müəllif hüququ, marka pozuntusu və istifadəçi davranışı üçün praktiki nəzarət qaydaları.",
    lastUpdated: contentDate,
    sections: [
      {
        heading: "Elan qaydaları",
        paragraphs: [
          "Elan başlığı konkret, təsviri isə tam olmalıdır. Aydın görünməyən, təkrar və ya aldadıcı elanlar moderasiyada geri qaytarıla bilər.",
        ],
      },
      {
        heading: "Şəkil və məzmun qaydaları",
        paragraphs: [
          "Şəkillər real məhsulu göstərməli, kənar su nişanı və yanıltıcı elementlərdən azad olmalıdır. Təsvirlər məhsulun vəziyyətini gizlətməməlidir.",
        ],
      },
      {
        heading: "Qiymət və stok",
        paragraphs: [
          "Qiymət son vəziyyəti əks etdirməli, stok isə məhdudiyyətləri gizlətmədən göstərilməlidir. Eyni məhsul üçün təkrar, parçalanmış elanlardan istifadə edilməməlidir.",
        ],
      },
      {
        heading: "Qadağan olunan davranışlar",
        paragraphs: [
          "Spam, fırıldaqçılıq, saxta məhsul, marka pozuntusu, bot fəaliyyəti və istifadəçini çaşdıran davranışlar qadağandır.",
        ],
      },
      {
        heading: "Şikayət prosesi",
        paragraphs: [
          "İstifadəçi qayda pozuntusunu gördükdə şikayət göndərə bilər. Komanda müraciəti sənədləşdirilmiş sübutlara əsasən yoxlayır.",
        ],
      },
    ],
    relatedSlugs: ["terms", "privacy", "faq", "contact"],
  },
  {
    slug: "guide/new-listing",
    href: "/guide/new-listing",
    eyebrow: "Satış təlimatı",
    title: "Yeni Elan Təlimatı",
    description:
      "Məhsulunu düzgün yerləşdirmək üçün addım-addım qısa təlimat.",
    summary:
      "Başlıqdan şəkillərə, qiymətdən stok məlumatına qədər yeni elanın necə hazırlanacağını izah edir.",
    lastUpdated: contentDate,
    sections: [
      {
        heading: "Başlamazdan əvvəl",
        paragraphs: [
          "Məhsulun vəziyyətini, şəkillərini və əsas məlumatlarını əvvəlcədən hazırla. Düzgün hazırlıq moderasiya prosesini sürətləndirir.",
        ],
      },
      {
        heading: "Başlıq və təsvir",
        paragraphs: [
          "Başlıq qısa, aydın və məhsulu dəqiq təsvir etməlidir. Təsvirə marka, ölçü, vəziyyət və vacib fərqləndirici detalları əlavə et.",
        ],
      },
      {
        heading: "Şəkillər",
        paragraphs: [
          "Ən az bir əsas şəkil, mümkün olduqda isə müxtəlif bucaqlardan əlavə fotolar yüklə. Səliqəli fon və yaxşı işıq məhsulun görünməsini yaxşılaşdırır.",
        ],
      },
      {
        heading: "Qiymət və stok",
        paragraphs: [
          "Qiyməti real bazar dəyərinə uyğun yaz və stok mövcudluğunu düzgün göstər. Əgər məhsul tək ədədidirsə, bunu açıq yaz.",
        ],
      },
      {
        heading: "Dərcdən sonra",
        paragraphs: [
          "Elan dərc olunduqdan sonra mesajları, statusu və istifadəçi reaksiyalarını izləmək faydalıdır. Gərəkdikdə məlumatları yenilə.",
        ],
      },
    ],
    relatedSlugs: ["guide/seller", "help", "rules", "faq"],
  },
  {
    slug: "guide/seller",
    href: "/guide/seller",
    eyebrow: "Satıcı təlimatı",
    title: "Satıcı Təlimatı",
    description:
      "Mağaza idarəetməsi, məhsul nəzarəti və sifariş axını üçün əsas iş qaydaları.",
    summary:
      "Satıcı profili, məhsul idarəetməsi, mesajlar və sifariş cavablandırma prosesini praktik şəkildə izah edir.",
    lastUpdated: contentDate,
    sections: [
      {
        heading: "Mağaza profilini tamamla",
        paragraphs: [
          "Mağaza adı, təsviri, loqosu və əlaqə məlumatları düzgün və ardıcıl olmalıdır. Bu, alıcıda etibar yaradır.",
        ],
      },
      {
        heading: "Məhsul axını",
        paragraphs: [
          "Yeni məhsulları kateqoriyaya uyğun yerləşdir, stok və qiymət dəyişikliklərini gecikdirmə və köhnə elanları arxivləşdir.",
        ],
      },
      {
        heading: "Mesajlara cavab",
        paragraphs: [
          "Mesajları vaxtında cavablandırmaq satış ehtimalını artırır. Qısa, dəqiq və nəzakətli yazışma qaydasını saxla.",
        ],
      },
      {
        heading: "Sifariş nəzarəti",
        paragraphs: [
          "Sifariş statusunu, müştəri sorğularını və çatdırılma mərhələsini izləmək satıcı üçün əsas operativ işlərdəndir.",
        ],
      },
      {
        heading: "Reytinq və rəy",
        paragraphs: [
          "Rəylər mağaza reputasiyasının bir hissəsidir. Mənfi rəyləri müdafiə mövqeyi ilə deyil, həll yönümlü şəkildə qarşıla.",
        ],
      },
    ],
    relatedSlugs: ["guide/new-listing", "guide/buyer", "help", "contact"],
  },
  {
    slug: "guide/buyer",
    href: "/guide/buyer",
    eyebrow: "Alıcı təlimatı",
    title: "Alıcı Təlimatı",
    description:
      "Məhsul tapmaqdan sifarişi tamamlayana qədər rahat alış axını üçün qısa bələdçi.",
    summary:
      "Axtarış, müqayisə, səbət, mesaj və sifariş mərhələlərində diqqət yetirilməli məqamları izah edir.",
    lastUpdated: contentDate,
    sections: [
      {
        heading: "Axtarış və müqayisə",
        paragraphs: [
          "Məhsul adını, kateqoriyanı və ya mağazanı axtararaq nəticələri daralt. Bir neçə məhsulu yanaşı müqayisə etmək qərar verməyi asanlaşdırır.",
        ],
      },
      {
        heading: "Satıcı ilə əlaqə",
        paragraphs: [
          "Suallarını sifarişdən əvvəl yazmaq riskləri azaldır. Qiymət, vəziyyət, stok və çatdırılma barədə dəqiqləşdirici sual vermək yaxşı təcrübədir.",
        ],
      },
      {
        heading: "Səbət və sifariş",
        paragraphs: [
          "Səbətə əlavə etdiyin məhsulları son dəfə yoxla, sonra sifarişi təsdiqlə. Ünvan və əlaqə məlumatlarının düzgün olduğuna əmin ol.",
        ],
      },
      {
        heading: "Problem olduqda",
        paragraphs: [
          "Məhsul təsvirindən fərqlənirsə və ya çatışmazlıq varsa, şikayət və dəstək kanalı ilə müraciət et. Sübut kimi şəkil və mesajları saxla.",
        ],
      },
      {
        heading: "Təhlükəsizlik",
        paragraphs: [
          "Şübhəli linklərə klik etmə, şəxsi məlumatları platformadan kənarda paylaşma və rəsmi hesabdan başqa mənbələri etibarlı sayma.",
        ],
      },
    ],
    relatedSlugs: ["faq", "help", "rules", "contact"],
  },
  {
    slug: "about",
    href: "/about",
    eyebrow: "Platforma haqqında",
    title: "Layihə Haqqında",
    description:
      "Alışveriş.az-ın məqsədi, iş modeli və istifadəçiyə verdiyi dəyər.",
    summary:
      "Marketplace məntiqi ilə qurulan platformanın bazar yanaşmasını və xidmət fəlsəfəsini təqdim edir.",
    lastUpdated: contentDate,
    sections: [
      {
        heading: "Missiya",
        paragraphs: [
          "Alışveriş.az-ın məqsədi məhsul satmaq, mağaza idarə etmək və alıcı ilə satıcını bir platformada rahat şəkildə birləşdirməkdir.",
        ],
      },
      {
        heading: "Necə işləyir",
        paragraphs: [
          "Satıcı məhsul və mağaza məlumatını yerləşdirir, alıcı axtarış və filtr vasitəsilə uyğun məhsulu tapır, sonra tərəflər platforma üzərindən əlaqə saxlayır.",
        ],
      },
      {
        heading: "Nəyə fokuslanırıq",
        paragraphs: [
          "Sürətli interfeys, aydın axın, real marketplace qaydaları və təhlükəsiz hesab idarəetməsi əsas prioritetlərdir.",
        ],
      },
      {
        heading: "Etibar modeli",
        paragraphs: [
          "Platforma istifadəçi reputasiyası, düzgün elan məzmunu və moderasiya prinsipləri ilə işləyir ki, alıcı və satıcı arasında şəffaf təcrübə qurulsun.",
        ],
      },
    ],
    relatedSlugs: ["help", "rules", "contact", "terms"],
  },
  {
    slug: "contact",
    href: "/contact",
    eyebrow: "Dəstək kanalı",
    title: "Əlaqə və Dəstək",
    description:
      "Sorğunu, texniki problemini və ya hüquqi sualını komanda ilə paylaş.",
    summary:
      "Platforma ilə bağlı rəsmi əlaqə kanalları, cavab gözləntisi və müraciət formatı.",
    lastUpdated: contentDate,
    sections: [
      {
        heading: "Nə üçün yazmaq olar",
        paragraphs: [
          "Hesab problemi, təhlükəsizlik narahatlığı, şikayət, texniki xəta, məzmun düzəlişi və ya əməkdaşlıq müraciəti üçün əlaqə saxla.",
        ],
      },
      {
        heading: "Müraciət forması",
        paragraphs: [
          "Məktubunda qısa mövzu, problem təsviri, ekran görüntüsü və varsa sifariş və ya elan identifikatoru göstər.",
        ],
      },
      {
        heading: "Cavab müddəti",
        paragraphs: [
          "Müraciətin növündən asılı olaraq cavab müddəti dəyişə bilər. Təhlükəsizlik və hesab bloklanması kimi mövzular daha tez yoxlanır.",
        ],
      },
      {
        heading: "Fövqəladə hallar",
        paragraphs: [
          "Hesabın ələ keçirildiyini düşünürsənsə, dərhal şifrəni dəyiş və mümkün olduqda aktiv sessiyaları bağla, sonra dəstəyə yaz.",
        ],
      },
    ],
    relatedSlugs: ["help", "faq", "privacy", "terms"],
  },
];

const articleCategories: ContentTemplate[] = [
  {
    slug: "giris-qeydiyyat",
    href: "/help/articles",
    category: "Giriş və qeydiyyat",
    title: "Giriş və qeydiyyat",
    summary: "Hesaba daxil olma, yeni hesab açma və təhlükəsiz giriş üsulları.",
    steps: [
      "Mövzuya uyğun giriş formasını aç.",
      "{title} üçün lazım olan məlumatları diqqətlə daxil et.",
      "Təsdiq addımlarını tamamla və hesab statusunu yoxla.",
      "Əlavə təhlükəsizlik ayarlarını aktivləşdir.",
    ],
    notes: [
      "Şifrəni başqa xidmətlərlə təkrarlama.",
      "Aktiv sessiyaları vaxtaşırı yoxla.",
    ],
    topics: [
      { slug: "email-ile-qeydiyyat", title: "Email ilə qeydiyyat" },
      { slug: "telefonla-giris", title: "Telefonla giriş" },
      { slug: "sifre-sifirlama", title: "Şifrə sıfırlama" },
      { slug: "email-tesdiqi", title: "Email təsdiqi" },
      { slug: "telefon-yenileme", title: "Telefon yeniləmə" },
      { slug: "aktiv-sessiyalar", title: "Aktiv sessiyalar" },
      { slug: "hesab-bərpasi", title: "Hesab bərpası" },
      { slug: "dublikat-hesab", title: "Dublikat hesab" },
      { slug: "melumat-tehlukesizliyi", title: "Məlumat təhlükəsizliyi" },
      { slug: "sifre-telebleri", title: "Şifrə tələbləri" },
    ],
  },
  {
    slug: "hesabim",
    href: "/help/articles",
    category: "Hesabım",
    title: "Hesabım",
    summary: "Profil, bildiriş və məxfilik ayarlarını idarə etmək üçün məqalələr.",
    steps: [
      "Hesab ayarları bölməsinə keç.",
      "{title} üçün uyğun sahəni aç və dəyişiklik et.",
      "Dəyişiklikləri saxla və nəticəni yenilə.",
      "Lazımdırsa bildiriş və məxfilik seçimlərini də yoxla.",
    ],
    notes: [
      "Təhlükəsizliyi pozan dəyişikliklərdən sonra şifrəni yenilə.",
      "Profil məlumatlarını həmişə aktual saxla.",
    ],
    topics: [
      { slug: "profil-shekli-deyismek", title: "Profil şəkli dəyişmək" },
      { slug: "ad-soyad-redaktesi", title: "Ad və soyad redaktəsi" },
      { slug: "bildiris-ayarlari", title: "Bildiriş ayarları" },
      { slug: "dil-secimi", title: "Dil seçimi" },
      { slug: "unvan-saxlamaq", title: "Ünvan saxlamaq" },
      { slug: "favori-aktivleri", title: "Favori aktivləri" },
      { slug: "hesab-baglamaq", title: "Hesab bağlamaq" },
      { slug: "telefonu-yenilemek", title: "Telefonu yeniləmək" },
      { slug: "emaili-deyismek", title: "Emaili dəyişmək" },
      { slug: "sessiyalari-yoxlamaq", title: "Sessiyaları yoxlamaq" },
    ],
  },
  {
    slug: "satici-magazasi",
    href: "/help/articles",
    category: "Satıcı mağazası",
    title: "Satıcı mağazası",
    summary: "Mağaza profili, komanda və satış axınının idarə olunması.",
    steps: [
      "Mağaza panelini aç və profili seç.",
      "{title} üçün əsas məlumatları tam doldur.",
      "Məhsul, mesaj və sifariş axınını yoxla.",
      "Dəyişiklikləri yadda saxla və nəticəni test et.",
    ],
    notes: [
      "Mağaza adı və logo vahid brend hissi yaratmalıdır.",
      "Aktiv satış üçün əlaqə məlumatları aydın olmalıdır.",
    ],
    topics: [
      { slug: "magaza-profili", title: "Mağaza profili yaratmaq" },
      { slug: "logo-yuklemek", title: "Logo yükləmək" },
      { slug: "banner-elave-etmek", title: "Banner əlavə etmək" },
      { slug: "tesvir-yazmaq", title: "Təsvir yazmaq" },
      { slug: "is-saatlari", title: "İş saatları" },
      { slug: "satici-statusu", title: "Satıcı statusu" },
      { slug: "sifaris-idare-etmek", title: "Sifariş idarə etmək" },
      { slug: "komanda-uzvleri", title: "Komanda üzvləri" },
      { slug: "magaza-url", title: "Mağaza URL-i" },
      { slug: "magaza-qaydalar", title: "Mağaza qaydaları" },
    ],
  },
  {
    slug: "alis-prosesi",
    href: "/help/articles",
    category: "Alış prosesi",
    title: "Alış prosesi",
    summary: "Axtarış, səbət, sifariş və satıcı ilə əlaqə mərhələləri.",
    steps: [
      "Məhsulu tap və detalları yoxla.",
      "{title} zamanı ehtiyac olan məlumatları bir daha təsdiqlə.",
      "Səbət və ya sifariş bölməsində son yoxlamanı et.",
      "Problem olduqda dəstək və ya satıcı ilə əlaqə saxla.",
    ],
    notes: [
      "Sifarişi təsdiqləməzdən əvvəl ünvanı və əlaqəni yoxla.",
      "Şübhəli təkliflərdə tələsmədən əlavə məlumat istə.",
    ],
    topics: [
      { slug: "mehsul-axtarmaq", title: "Məhsul axtarmaq" },
      { slug: "sebete-elave-etmek", title: "Səbətə əlavə etmək" },
      { slug: "sebeti-temizlemek", title: "Səbəti təmizləmək" },
      { slug: "sifaris-yaratmaq", title: "Sifariş yaratmaq" },
      { slug: "saticiya-yazmaq", title: "Satıcıya yazmaq" },
      { slug: "sifarisi-izlemek", title: "Sifarişi izləmək" },
      { slug: "elaqe-melumatlari", title: "Əlaqə məlumatı yoxlamaq" },
      { slug: "sifarisi-legv-etmek", title: "Sifarişi ləğv etmək" },
      { slug: "qebz-yuklemek", title: "Qəbz yükləmək" },
      { slug: "sikayet-gondermek", title: "Şikayət göndərmək" },
    ],
  },
  {
    slug: "satis-prosesi",
    href: "/help/articles",
    category: "Satış prosesi",
    title: "Satış prosesi",
    summary: "Məhsul yerləşdirməkdən sifarişlərə cavab verməyə qədər satış axını.",
    steps: [
      "Yeni məhsul formunu aç və kateqoriyanı seç.",
      "{title} üçün qiymət, stok və təsvir məlumatlarını daxil et.",
      "Mesaj və sifariş panelini izləməyə başla.",
      "Müəyyən fasilələrlə məlumatları yenilə və yoxla.",
    ],
    notes: [
      "Dəqiq təsvir alıcının qərarını asanlaşdırır.",
      "Köhnə elanları arxivləşdirmək axtarışı təmiz saxlayır.",
    ],
    topics: [
      { slug: "yeni-mehsul-elave-etmek", title: "Yeni məhsul əlavə etmək" },
      { slug: "qiymet-teyin-etmek", title: "Qiymət təyin etmək" },
      { slug: "stok-bildirmek", title: "Stok bildirmək" },
      { slug: "sekil-sirasi", title: "Şəkil sırası" },
      { slug: "mehsul-tesviri", title: "Məhsul təsviri" },
      { slug: "kategoriya-secim", title: "Kategoriya seçmək" },
      { slug: "moderasiya-statusu", title: "Moderasiya statusu" },
      { slug: "mesajlara-cavab", title: "Mesajlara cavab vermək" },
      { slug: "rey-izlemek", title: "Rəy izləmək" },
      { slug: "mehsulu-arxivlemek", title: "Məhsulu arxivləşdirmək" },
    ],
  },
  {
    slug: "mehsullar",
    href: "/help/articles",
    category: "Məhsullar",
    title: "Məhsullar",
    summary: "Məhsul başlığı, atribut, variant və redaktə qaydaları.",
    steps: [
      "Məhsul detal səhifəsini aç və strukturunu yoxla.",
      "{title} üçün uyğun informasiya bloklarını tamamla.",
      "Şəkil, qiymət və variantlarda ardıcıllıq saxla.",
      "Dəyişiklikləri yadda saxla və lazım gələrsə yenidən test et.",
    ],
    notes: [
      "Dəqiq başlıq axtarış görünməsini yaxşılaşdırır.",
      "Şəkil keyfiyyəti məhsulun etibarına birbaşa təsir edir.",
    ],
    topics: [
      { slug: "dogru-basliq", title: "Düzgün başlıq yazmaq" },
      { slug: "atribut-elave-etmek", title: "Atribut əlavə etmək" },
      { slug: "variant-doldurmaq", title: "Variantları doldurmaq" },
      { slug: "etiket-secmek", title: "Etiket seçmək" },
      { slug: "mehsulu-yenilemek", title: "Məhsulu yeniləmək" },
      { slug: "mehsulu-silmek", title: "Məhsulu silmək" },
      { slug: "kutlevi-redakte", title: "Kütləvi redaktə" },
      { slug: "status-deyismek", title: "Status dəyişmək" },
      { slug: "stok-izleri", title: "Stok izləri" },
      { slug: "sekil-optimizasiya", title: "Şəkil optimallaşdırmaq" },
    ],
  },
  {
    slug: "kateqoriyalar",
    href: "/help/articles",
    category: "Kateqoriyalar",
    title: "Kateqoriyalar",
    summary: "Kateqoriya seçimi, axtarış və struktur səhvlərinin düzəldilməsi.",
    steps: [
      "Uyğun bölməni aç və mövzunu seç.",
      "{title} zamanı məhsulun məntiqi yerini yoxla.",
      "Alt kateqoriya və filtr uyğunluğunu təstiqlə.",
      "Əgər səhvdirsə, struktur düzəlişi et.",
    ],
    notes: [
      "Düzgün kateqoriya məhsulun görünürlüğünü artırır.",
      "Aşağıdakı filtr dəyərləri ilə ziddiyyət yaratma.",
    ],
    topics: [
      { slug: "kateqoriya-secimi", title: "Kateqoriya seçmək" },
      { slug: "alt-kateqoriya", title: "Alt kateqoriya tapmaq" },
      { slug: "yanlis-kateqoriya", title: "Yanlış kateqoriya düzəltmək" },
      { slug: "filtrlə-daraltmaq", title: "Filtrlə daraltmaq" },
      { slug: "kateqoriya-teklifi", title: "Kateqoriya təklifi" },
      { slug: "bos-kateqoriya", title: "Boş kateqoriya" },
      { slug: "axtarisdan-kecmek", title: "Axtarışdan keçmək" },
      { slug: "mobil-gorunum", title: "Mobil kateqoriya görünüşü" },
      { slug: "yeni-kateqoriya-sorgusu", title: "Yeni kateqoriya sorğusu" },
      { slug: "kateqoriya-sehvleri", title: "Kateqoriya səhvləri" },
    ],
  },
  {
    slug: "favoriler",
    href: "/help/articles",
    category: "Favorilər",
    title: "Favorilər",
    summary: "Sevdiyin məhsulları saxlamaq və sonradan izləmək üçün məsləhətlər.",
    steps: [
      "Məhsul səhifəsində ürək ikonunu yoxla.",
      "{title} üçün uyğun saxlama və silmə addımlarını seç.",
      "Favori siyahını vaxtaşırı təmizlə.",
      "Mühüm məhsulları ayrıca izləmə vərdişi yarat.",
    ],
    notes: [
      "Qeyri-aktiv məhsullar siyahıda görünməyə bilər.",
      "Favori siyahı qərar verməyi sürətləndirmək üçündür.",
    ],
    topics: [
      { slug: "mehsulu-favoriye-elave", title: "Məhsulu favoriyə əlavə etmək" },
      { slug: "favoriden-silmek", title: "Favoridən silmək" },
      { slug: "siyahini-bolmek", title: "Siyahını bölmək" },
      { slug: "sonradan-baxmaq", title: "Sonradan baxmaq" },
      { slug: "satici-favorileri", title: "Satıcı favoritləri" },
      { slug: "sinxronizasiya", title: "Sinxronizasiya" },
      { slug: "favori-bildirişi", title: "Favori bildirişi" },
      { slug: "bos-siyahi", title: "Boş siyahı" },
      { slug: "qeyri-aktiv-mehsul", title: "Qeyri-aktiv məhsul" },
      { slug: "qisa-yol", title: "Qısa yol yaratmaq" },
    ],
  },
  {
    slug: "bildirisler",
    href: "/help/articles",
    category: "Bildirişlər",
    title: "Bildirişlər",
    summary: "Oxunmamış xəbərdarlıqlar və bildiriş axınının idarəsi.",
    steps: [
      "Bildiriş panelini aç və növü seç.",
      "{title} üçün uyğun filtr və oxunma statusunu yoxla.",
      "Lazımsız bildirişləri söndür və ya təmizlə.",
      "Əhəmiyyətli xəbərdarlıqları aktiv saxla.",
    ],
    notes: [
      "Təhlükəsizlik bildirişlərini söndürmə.",
      "Mesaj və sifariş bildirişlərini aktiv saxlamaq faydalıdır.",
    ],
    topics: [
      { slug: "bildirisleri-acmaq", title: "Bildirişləri açmaq" },
      { slug: "oxunmus-bildirisler", title: "Oxunmuş bildirişlər" },
      { slug: "email-bildirisleri", title: "Email bildirişləri" },
      { slug: "mesaj-xeberdarligi", title: "Mesaj xəbərdarlıqları" },
      { slug: "sifaris-bildirisleri", title: "Sifariş bildirişləri" },
      { slug: "tehlukesizlik-bildirisleri", title: "Təhlükəsizlik bildirişləri" },
      { slug: "sessiz-rejim", title: "Səssiz rejim" },
      { slug: "arxiv", title: "Arxiv" },
      { slug: "badge-sayi", title: "Badge sayı" },
      { slug: "bildirisi-silmek", title: "Bildirişi silmək" },
    ],
  },
  {
    slug: "chat-sistemi",
    href: "/help/articles",
    category: "Çat sistemi",
    title: "Çat sistemi",
    summary: "Satıcı və alıcı arasında təhlükəsiz yazışma axını.",
    steps: [
      "Söhbəti aç və münasib mövzunu seç.",
      "{title} üçün aydın və qısa mesaj yaz.",
      "Lazım olsa əlavə sübut və ya fayl göndər.",
      "Problem yaranarsa söhbəti dəstəyə yönləndir.",
    ],
    notes: [
      "Spam və təhqiredici dil istifadə etmə.",
      "Şəxsi məlumatları yalnız zəruri olduqda paylaş.",
    ],
    topics: [
      { slug: "mesaj-baslatmaq", title: "Mesaj başlatmaq" },
      { slug: "fail-gondermek", title: "Fayl göndərmək" },
      { slug: "cavab-gecikmesi", title: "Cavab gecikməsi" },
      { slug: "sohbeti-arxivlemek", title: "Söhbəti arxivləmək" },
      { slug: "spam-bildirmek", title: "Spam bildirmək" },
      { slug: "istifadecini-bloklamaq", title: "İstifadəçini bloklamaq" },
      { slug: "mesaj-axtarmaq", title: "Mesaj axtarmaq" },
      { slug: "muqavile-helli", title: "Mübahisə həlli" },
      { slug: "sifarisle-elaqelndirmek", title: "Sifarişlə əlaqələndirmək" },
      { slug: "chat-tehlukesizliyi", title: "Çat təhlükəsizliyi" },
    ],
  },
  {
    slug: "yeni-elan",
    href: "/help/articles",
    category: "Yeni elan",
    title: "Yeni elan",
    summary: "Yeni elan hazırlamaq, yoxlamaq və dərc etmək üçün praktiki mövzular.",
    steps: [
      "Yeni elan formasını aç və məhsulun əsas məlumatlarını hazırla.",
      "{title} üçün başlıq, təsvir və kateqoriya uyğunluğunu yoxla.",
      "Şəkilləri, qiyməti və stok məlumatını əlavə et.",
      "Dərc etməzdən əvvəl elan önizləməsini nəzərdən keçir.",
    ],
    notes: [
      "Eyni məhsulu təkrar elan kimi yerləşdirmə.",
      "Məhsulun real vəziyyətini gizlətmədən yaz.",
    ],
    topics: [
      { slug: "elan-formunu-acmaq", title: "Elan formunu açmaq" },
      { slug: "basliq-hazirlamaq", title: "Başlıq hazırlamaq" },
      { slug: "tesvir-qurmaq", title: "Təsvir qurmaq" },
      { slug: "esas-sekil-secmek", title: "Əsas şəkil seçmək" },
      { slug: "qiymeti-yoxlamaq", title: "Qiyməti yoxlamaq" },
      { slug: "stok-sahesi", title: "Stok sahəsi" },
      { slug: "onizleme", title: "Önizləmə" },
      { slug: "derc-etmek", title: "Dərc etmək" },
      { slug: "moderasiya-gozlemek", title: "Moderasiya gözləmək" },
      { slug: "elan-yenilemek", title: "Elanı yeniləmək" },
    ],
  },
  {
    slug: "hesab-tehlukesizliyi",
    href: "/help/articles",
    category: "Hesab təhlükəsizliyi",
    title: "Hesab təhlükəsizliyi",
    summary: "Şifrə, sessiya və şübhəli girişlərlə bağlı təhlükəsizlik addımları.",
    steps: [
      "Hesab təhlükəsizliyi bölməsini aç.",
      "{title} üçün riskli dəyişiklikləri və sessiyaları yoxla.",
      "Şifrəni yenilə və mümkün qoruma seçimlərini aktiv et.",
      "Şübhəli fəaliyyət görsən, dəstəyə müraciət et.",
    ],
    notes: [
      "Şifrəni heç kimlə paylaşma.",
      "Rəsmi olmayan linklərdən giriş etmə.",
    ],
    topics: [
      { slug: "guclu-sifre", title: "Güclü şifrə yaratmaq" },
      { slug: "subheli-giris", title: "Şübhəli giriş" },
      { slug: "sessiya-baglamaq", title: "Sessiya bağlamaq" },
      { slug: "cihaz-yoxlamaq", title: "Cihaz yoxlamaq" },
      { slug: "email-xeberdarligi", title: "Email xəbərdarlığı" },
      { slug: "telefon-qorunmasi", title: "Telefon qorunması" },
      { slug: "hesab-ele-kecib", title: "Hesab ələ keçibsə" },
      { slug: "token-yenilenmesi", title: "Token yenilənməsi" },
      { slug: "melumat-paylasimi", title: "Məlumat paylaşımı" },
      { slug: "tehlukesiz-cixis", title: "Təhlükəsiz çıxış" },
    ],
  },
  {
    slug: "hesabin-silinmesi",
    href: "/help/articles",
    category: "Hesabın silinməsi",
    title: "Hesabın silinməsi",
    summary: "Hesabı bağlamaq, data silinməsi və alternativ seçimlər barədə məlumatlar.",
    steps: [
      "Hesab ayarlarında silmə və ya bağlama bölməsini tap.",
      "{title} üçün təsirlənəcək məlumatları oxu.",
      "Aktiv sifariş, mesaj və mağaza statusunu yoxla.",
      "Qərarı təsdiqlə və lazım gələrsə dəstəyə müraciət et.",
    ],
    notes: [
      "Bəzi hüquqi və audit məlumatları dərhal silinməyə bilər.",
      "Satıcı hesabında aktiv sifariş varsa əvvəlcə onu tamamla.",
    ],
    topics: [
      { slug: "hesabi-baglamaq", title: "Hesabı bağlamaq" },
      { slug: "silme-sorgusu", title: "Silmə sorğusu" },
      { slug: "data-ixraci", title: "Data ixracı" },
      { slug: "aktiv-sifarisler", title: "Aktiv sifarişlər" },
      { slug: "magaza-baglamaq", title: "Mağaza bağlamaq" },
      { slug: "profili-gizletmek", title: "Profili gizlətmək" },
      { slug: "silme-muddeti", title: "Silmə müddəti" },
      { slug: "hesabi-berpa-etmek", title: "Hesabı bərpa etmək" },
      { slug: "abunelikleri-yoxlamaq", title: "Abunəlikləri yoxlamaq" },
      { slug: "son-yoxlama", title: "Son yoxlama" },
    ],
  },
  {
    slug: "profil",
    href: "/help/articles",
    category: "Profil",
    title: "Profil",
    summary: "İstifadəçi və satıcı profilinin düzgün təqdim olunması.",
    steps: [
      "Profil səhifəsini aç və mövcud məlumatları nəzərdən keçir.",
      "{title} üçün görünən sahələri ardıcıl yenilə.",
      "Əlaqə, şəkil və təsviri real məlumatlarla tamamla.",
      "Dəyişiklikləri saxla və public görünüşü yoxla.",
    ],
    notes: [
      "Profil məlumatı etibar siqnalıdır.",
      "Şəxsi məlumatı həddindən artıq paylaşma.",
    ],
    topics: [
      { slug: "profil-melumati", title: "Profil məlumatı" },
      { slug: "public-gorunum", title: "Public görünüm" },
      { slug: "profil-sekli", title: "Profil şəkli" },
      { slug: "qisa-tesvir", title: "Qısa təsvir" },
      { slug: "elaqe-gorunurluyu", title: "Əlaqə görünürlüğü" },
      { slug: "satici-profil", title: "Satıcı profili" },
      { slug: "reyler-gorunusu", title: "Rəylər görünüşü" },
      { slug: "profil-linki", title: "Profil linki" },
      { slug: "melumat-gizliliyi", title: "Məlumat gizliliyi" },
      { slug: "profil-yoxlamasi", title: "Profil yoxlaması" },
    ],
  },
  {
    slug: "sikayet",
    href: "/help/articles",
    category: "Şikayət",
    title: "Şikayət",
    summary: "Məhsul, mesaj, istifadəçi və mağaza ilə bağlı şikayət göndərmək.",
    steps: [
      "Şikayət mövzusuna uyğun səhifəni aç.",
      "{title} üçün səbəbi və sübutları hazırla.",
      "Müraciəti qısa və faktlara əsaslanan formada yaz.",
      "Cavab gələnə qədər əlaqəli məlumatları silmə.",
    ],
    notes: [
      "Şikayət real sübutla daha tez araşdırılır.",
      "Təhqir və emosional ifadələr yerinə fakt yaz.",
    ],
    topics: [
      { slug: "mehsul-sikayeti", title: "Məhsul şikayəti" },
      { slug: "satici-sikayeti", title: "Satıcı şikayəti" },
      { slug: "alici-sikayeti", title: "Alıcı şikayəti" },
      { slug: "mesaj-sikayeti", title: "Mesaj şikayəti" },
      { slug: "saxta-mehsul", title: "Saxta məhsul" },
      { slug: "brend-pozuntusu", title: "Brend pozuntusu" },
      { slug: "spam-sikayeti", title: "Spam şikayəti" },
      { slug: "sifaris-problemi", title: "Sifariş problemi" },
      { slug: "sikayet-statusu", title: "Şikayət statusu" },
      { slug: "sikayeti-yenilemek", title: "Şikayəti yeniləmək" },
    ],
  },
  {
    slug: "hesabat-verme",
    href: "/help/articles",
    category: "Hesabat vermə",
    title: "Hesabat vermə",
    summary: "Qayda pozuntusu, təhlükəsizlik riski və texniki xəta barədə hesabatlar.",
    steps: [
      "Hesabat mövzusunu seç və faktları sırala.",
      "{title} üçün ekran görüntüsü və linkləri əlavə et.",
      "Qısa izah yaz və müraciəti göndər.",
      "Dəstək cavabını izləmək üçün əlaqə məlumatını aktual saxla.",
    ],
    notes: [
      "Texniki hesabatda cihaz və brauzer məlumatı faydalıdır.",
      "Təhlükəsizlik risklərini ictimai paylaşma.",
    ],
    topics: [
      { slug: "texniki-xeta", title: "Texniki xəta" },
      { slug: "odenis-riski", title: "Ödəniş riski" },
      { slug: "tehlukesizlik-riski", title: "Təhlükəsizlik riski" },
      { slug: "qayda-pozuntusu", title: "Qayda pozuntusu" },
      { slug: "yanlis-melumat", title: "Yanlış məlumat" },
      { slug: "kateqoriya-problemi", title: "Kateqoriya problemi" },
      { slug: "moderasiya-hesabati", title: "Moderasiya hesabatı" },
      { slug: "hesabat-nomresi", title: "Hesabat nömrəsi" },
      { slug: "cavab-muddeti", title: "Cavab müddəti" },
      { slug: "elave-subut", title: "Əlavə sübut" },
    ],
  },
];

function slugify(value: string) {
  return value
    .toLocaleLowerCase("az-AZ")
    .replaceAll("ı", "i")
    .replaceAll("ə", "e")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ç", "c")
    .replaceAll("ğ", "g")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildArticleRelated(index: number, categoryStartIndex: number) {
  const base = categoryStartIndex;
  const local = index;
  const candidates = [
    base + Math.max(local - 1, 0),
    base + Math.min(local + 1, 9),
    Math.min(base + 10, helpArticleTopicCount - 1),
  ];

  return Array.from(new Set(candidates))
    .filter((candidate) => candidate >= 0 && candidate < helpArticleTopicCount)
    .map((candidate) => helpArticleSeeds[candidate].slug);
}

function buildFaqRelated(index: number, categoryStartIndex: number) {
  const local = index;
  const candidates = [
    categoryStartIndex + Math.max(local - 1, 0),
    categoryStartIndex + Math.min(local + 1, 9),
  ];

  return Array.from(new Set(candidates))
    .filter((candidate) => candidate >= 0 && candidate < helpFaqTopicCount)
    .map((candidate) => helpFaqSeeds[candidate].slug);
}

function buildQuestion(title: string) {
  if (title.endsWith("maq") || title.endsWith("mək")) {
    return `${title} necə edilir?`;
  }

  if (title.endsWith("maq")) {
    return `${title} necə edilir?`;
  }

  return `${title} barədə nə etməliyəm?`;
}

const helpArticleSeeds = articleCategories.flatMap((template) =>
  template.topics.map((topic) => ({
    slug: `${template.slug}-${topic.slug}`,
    title: topic.title,
    category: template.category,
    template,
  })),
);

const helpArticleTopicCount = helpArticleSeeds.length;

export const helpArticles: HelpArticleContent[] = helpArticleSeeds.map(
  (seed, index) => {
    const categoryIndex = articleCategories.findIndex(
      (template) => template.category === seed.category,
    );
    const categoryStartIndex =
      articleCategories
        .slice(0, categoryIndex)
        .reduce((sum, template) => sum + template.topics.length, 0) || 0;
    const relatedSlugs = buildArticleRelated(
      index - categoryStartIndex,
      categoryStartIndex,
    );

    return {
      slug: seed.slug,
      href: `/help/articles/${seed.slug}`,
      category: seed.category,
      title: seed.title,
      summary: `${seed.title} üçün qısa, praktik və əməli addımlar.`,
      steps: seed.template.steps.map((step) => step.replaceAll("{title}", seed.title)),
      notes: seed.template.notes.map((note) => note.replaceAll("{title}", seed.title)),
      relatedSlugs: relatedSlugs.length ? relatedSlugs : [seed.slug],
    };
  },
);

const helpFaqSeeds = articleCategories.flatMap((template) =>
  template.topics.map((topic) => ({
    slug: `${template.slug}-${topic.slug}`,
    title: topic.title,
    category: template.category,
    template,
  })),
);

const helpFaqTopicCount = helpFaqSeeds.length;

export const helpFaqs: HelpFaqContent[] = helpFaqSeeds.map((seed, index) => {
  const categoryIndex = articleCategories.findIndex(
    (template) => template.category === seed.category,
  );
  const categoryStartIndex =
    articleCategories
      .slice(0, categoryIndex)
      .reduce((sum, template) => sum + template.topics.length, 0) || 0;
  const relatedSlugs = buildFaqRelated(index - categoryStartIndex, categoryStartIndex);
  const question = buildQuestion(seed.title);

  return {
    slug: seed.slug,
    href: `/faq#${seed.slug}`,
    category: seed.category,
    question,
    answer: `${seed.template.category} bölməsində ${seed.title.toLowerCase()} üçün əvvəlcə uyğun hissəni aç, məlumatları yoxla və addımları ardıcıllıqla tamamla. Problem təkrarlanarsa, əlaqəli məqaləyə bax və ya dəstək bölməsindən kömək istə.`,
    relatedSlugs: relatedSlugs.length ? relatedSlugs : [seed.slug],
  };
});

export const helpArticleGroups = articleCategories.map((template) => ({
  category: template.category,
  slug: template.slug,
  href: template.href,
  summary: template.summary,
  items: helpArticles.filter((article) => article.category === template.category),
}));

export const helpFaqGroups = articleCategories.map((template) => ({
  category: template.category,
  slug: template.slug,
  href: template.href,
  summary: template.summary,
  items: helpFaqs.filter((faq) => faq.category === template.category),
}));

export function getHelpPage(slug: string) {
  return helpPages.find((page) => page.slug === slug);
}

export function getHelpArticle(slug: string) {
  return helpArticles.find((article) => article.slug === slug);
}

export function getHelpFaq(slug: string) {
  return helpFaqs.find((faq) => faq.slug === slug);
}

export function getHelpPageStaticParams() {
  return helpPages.map((page) => ({
    slug: page.slug === "help" ? [] : page.slug.split("/"),
  }));
}

export function getHelpArticleStaticParams() {
  return helpArticles.map((article) => ({
    slug: article.slug.split("/"),
  }));
}

export function getHelpPageList() {
  return helpPages;
}
