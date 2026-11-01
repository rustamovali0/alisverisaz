const az = {
  home: "Ana səhifə",
  center: "Kömək mərkəzi",
  about: "Haqqımızda",
  contact: "Əlaqə və dəstək",
  title: "Sizə necə kömək edə bilərik?",
  intro:
    "Hesabınız, alış-verişiniz və mağazanız üçün cavabları bir yerdə tapın.",
  quick: ["Şifrəni bərpa et", "Sifarişlərim", "Satıcı paneli"],
  topicEyebrow: "DOĞRU YERDƏSİNİZ",
  topicTitle: "Mövzunu seçin, cavabı tapın",
  topicIntro: "Ən çox lazım olan bölmələrə birbaşa keçin.",
  allArticles: "Bütün məqalələr",
  readGuide: "Təlimata bax",
  topics: [
    {
      title: "Hesab və giriş",
      description: "Qeydiyyat, şifrə və profil məlumatları.",
      links: [
        "Yeni hesab yaratmaq",
        "Şifrəni unutdum",
        "Profil və hesab ayarları",
      ],
    },
    {
      title: "Alış və sifarişlər",
      description: "Məhsul seçimindən sifarişin izlənməsinədək.",
      links: [
        "Sifarişi necə yaratmalı?",
        "Sifarişimin statusu",
        "Satıcı ilə əlaqə",
      ],
    },
    {
      title: "Satıcılar üçün",
      description: "Mağazanızı yaradın və satışları idarə edin.",
      links: [
        "Satıcı kimi qeydiyyat",
        "Mağazanın görünüşü",
        "Satış və sifariş idarəetməsi",
      ],
    },
    {
      title: "Məhsul və elanlar",
      description: "Məhsullarınızı düzgün və rahat yerləşdirin.",
      links: [
        "Yeni məhsul əlavə etmək",
        "Məhsulu redaktə etmək",
        "Kateqoriya seçmək",
      ],
    },
    {
      title: "Təhlükəsizlik və məxfilik",
      description: "Hesabınızı və şəxsi məlumatlarınızı qoruyun.",
      links: [
        "Hesab təhlükəsizliyi",
        "Məxfilik siyasəti",
        "Şübhəli fəaliyyət bildirmək",
      ],
    },
    {
      title: "Mesajlar və bildirişlər",
      description: "Yazışmalar və yeniliklərdən xəbərdar olun.",
      links: [
        "Mesajlaşma necə işləyir?",
        "Bildiriş ayarları",
        "Problem barədə məlumat vermək",
      ],
    },
  ],
  faqEyebrow: "QISA CAVABLAR",
  faqTitle: "Tez-tez soruşulur",
  faqIntro: "İlk addımı tapmaq üçün qısa və aydın cavablar.",
  allFaq: "Bütün suallara bax",
  faqs: [
    {
      id: "password",
      question: "Şifrəmi unutmuşam. Nə etməliyəm?",
      answer:
        "“Şifrəni bərpa et” bölməsində qeydiyyatdan keçdiyiniz e-poçtu daxil edin. Məktubdakı keçidi açın və əvvəlkindən fərqli yeni şifrə təyin edin. Köhnə keçid işləmirsə, yenisini istəyin.",
      label: "Şifrəni bərpa et",
      href: "/forgot-password",
    },
    {
      id: "images",
      question: "Satıcı qeydiyyatında loqo və banner məcburidir?",
      answer:
        "Xeyr. Loqo və banner istəyə bağlıdır. Şəkilsiz qeydiyyatdan keçə, birini və ya hər ikisini əlavə edə bilərsiniz. Onları sonradan mağaza panelindən də dəyişmək mümkündür.",
      label: "Satıcı təlimatına bax",
      href: "/guide/seller",
    },
    {
      id: "approval",
      question: "Satıcı hesabım niyə təsdiq gözləyir?",
      answer:
        "Yeni satıcı müraciətləri administrator tərəfindən yoxlanılır. Təsdiqdən sonra mağaza idarəetməsi aktiv olur. Müraciətinizlə bağlı sualınız varsa, dəstəyə yazın.",
      label: "Dəstəyə yaz",
      href: "/contact",
    },
    {
      id: "order",
      question: "Sifarişimi haradan izləyə bilərəm?",
      answer:
        "Hesabınıza daxil olub “Sifarişlərim” bölməsini açın. Sifarişin detalları və mövcud statusu orada göstərilir. Çatdırılma şərtlərini məhsul səhifəsindən yoxlayın və satıcı ilə dəqiqləşdirin.",
      label: "Sifarişlərimə bax",
      href: "/dashboard/orders",
    },
    {
      id: "seller-contact",
      question: "Satıcıya necə sual verə bilərəm?",
      answer:
        "Məhsul səhifəsindəki mesaj düyməsindən istifadə edin. Satıcı WhatsApp nömrəsi göstəribsə, həmin düymə ilə də birbaşa əlaqə saxlaya bilərsiniz.",
      label: "Alıcı təlimatına bax",
      href: "/guide/buyer",
    },
  ],
  platformTitle: "ALİSVERİS.AZ haqqında",
  platformDescription:
    "Platformamızın necə işlədiyini, məqsədini və istifadə qaydalarını öyrənin.",
  aboutAction: "Bizi tanıyın",
  rulesTitle: "Qaydalar və sənədlər",
  terms: "İstifadəçi razılaşması",
  privacy: "Məxfilik siyasəti",
  rules: "Marketplace qaydaları",
  supportTitle: "Cavabı tapa bilmədiniz?",
  supportIntro:
    "Sualınızı bizə yazın. Müraciətinizin mövzusunu və qarşılaşdığınız problemi qeyd edin.",
  supportAction: "Dəstəyə yazın",
  call: "Zəng edin",
  rights: "Bütün hüquqlar qorunur.",
};
export type HelpCenterCopy = typeof az;
const en: HelpCenterCopy = {
  ...az,
  home: "Home",
  center: "Help center",
  about: "About us",
  contact: "Contact & support",
  title: "How can we help you?",
  intro: "Find answers about your account, shopping and store in one place.",
  quick: ["Reset password", "My orders", "Seller dashboard"],
  topicEyebrow: "YOU’RE IN THE RIGHT PLACE",
  topicTitle: "Choose a topic. Find your answer.",
  topicIntro: "Go straight to the information you need.",
  allArticles: "All articles",
  readGuide: "Read guide",
  topics: [
    {
      title: "Account & sign-in",
      description: "Registration, passwords and your profile.",
      links: [
        "Create an account",
        "Forgot password",
        "Profile & account settings",
      ],
    },
    {
      title: "Shopping & orders",
      description: "From choosing a product to tracking your order.",
      links: ["How to place an order", "Order status", "Contact a seller"],
    },
    {
      title: "For sellers",
      description: "Create your store and manage sales.",
      links: [
        "Register as a seller",
        "Store appearance",
        "Sales & order management",
      ],
    },
    {
      title: "Products & listings",
      description: "Add and manage your products with ease.",
      links: ["Add a product", "Edit a product", "Choose a category"],
    },
    {
      title: "Security & privacy",
      description: "Protect your account and personal information.",
      links: [
        "Account security",
        "Privacy policy",
        "Report suspicious activity",
      ],
    },
    {
      title: "Messages & notifications",
      description: "Keep up with conversations and updates.",
      links: [
        "How messaging works",
        "Notification settings",
        "Report a problem",
      ],
    },
  ],
  faqEyebrow: "QUICK ANSWERS",
  faqTitle: "Frequently asked questions",
  faqIntro: "Clear answers to help you take the next step.",
  allFaq: "View all questions",
  faqs: [
    {
      ...az.faqs[0],
      question: "I forgot my password. What should I do?",
      answer:
        "Enter your registered email on the password recovery page. Open the email link and choose a password different from your previous one. Request a new link if the old one has expired.",
      label: "Reset password",
    },
    {
      ...az.faqs[1],
      question: "Are a logo and banner required for seller registration?",
      answer:
        "No. Both are optional. Register without images, with one image or with both. You can add or change them later from your store dashboard.",
      label: "Read the seller guide",
    },
    {
      ...az.faqs[2],
      question: "Why is my seller account awaiting approval?",
      answer:
        "Administrators review new seller applications. Store management becomes available after approval. Contact support if you have a question about your application.",
      label: "Contact support",
    },
    {
      ...az.faqs[3],
      question: "Where can I track my order?",
      answer:
        "Sign in and open My orders to see the details and current status. Check delivery terms on the product page and confirm them with the seller.",
      label: "View my orders",
    },
    {
      ...az.faqs[4],
      question: "How can I ask a seller a question?",
      answer:
        "Use the message button on the product page. If the seller provides a WhatsApp number, you can also contact them using that button.",
      label: "Read the buyer guide",
    },
  ],
  platformTitle: "About ALİSVERİS.AZ",
  platformDescription:
    "Learn how our platform works, what we do and the rules for using it.",
  aboutAction: "Get to know us",
  rulesTitle: "Policies & documents",
  terms: "Terms of use",
  privacy: "Privacy policy",
  rules: "Marketplace rules",
  supportTitle: "Still need a hand?",
  supportIntro:
    "Tell us what you need help with and describe the issue you encountered.",
  supportAction: "Contact support",
  call: "Call us",
  rights: "All rights reserved.",
};
const ru: HelpCenterCopy = {
  ...az,
  home: "Главная",
  center: "Центр помощи",
  about: "О нас",
  contact: "Связь и поддержка",
  title: "Чем мы можем вам помочь?",
  intro: "Ответы о вашем аккаунте, покупках и магазине в одном месте.",
  quick: ["Восстановить пароль", "Мои заказы", "Кабинет продавца"],
  topicEyebrow: "ВЫ В НУЖНОМ МЕСТЕ",
  topicTitle: "Выберите тему — найдите ответ",
  topicIntro: "Сразу переходите к нужной информации.",
  allArticles: "Все статьи",
  readGuide: "Читать руководство",
  topics: [
    {
      title: "Аккаунт и вход",
      description: "Регистрация, пароль и ваш профиль.",
      links: ["Создать аккаунт", "Забыли пароль", "Настройки профиля"],
    },
    {
      title: "Покупки и заказы",
      description: "От выбора товара до отслеживания заказа.",
      links: ["Как оформить заказ", "Статус заказа", "Связаться с продавцом"],
    },
    {
      title: "Для продавцов",
      description: "Создайте магазин и управляйте продажами.",
      links: [
        "Регистрация продавца",
        "Оформление магазина",
        "Продажи и заказы",
      ],
    },
    {
      title: "Товары и объявления",
      description: "Удобное размещение и управление товарами.",
      links: ["Добавить товар", "Изменить товар", "Выбрать категорию"],
    },
    {
      title: "Безопасность",
      description: "Защитите аккаунт и личные данные.",
      links: [
        "Безопасность аккаунта",
        "Конфиденциальность",
        "Сообщить о подозрении",
      ],
    },
    {
      title: "Сообщения",
      description: "Переписка и важные уведомления.",
      links: [
        "Как работает чат",
        "Настройки уведомлений",
        "Сообщить о проблеме",
      ],
    },
  ],
  faqEyebrow: "КОРОТКИЕ ОТВЕТЫ",
  faqTitle: "Частые вопросы",
  faqIntro: "Понятные ответы для следующего шага.",
  allFaq: "Все вопросы",
  faqs: [
    {
      ...az.faqs[0],
      question: "Я забыл пароль. Что делать?",
      answer:
        "Введите адрес регистрации на странице восстановления пароля. Откройте ссылку в письме и задайте пароль, отличный от предыдущего. Если ссылка устарела, запросите новую.",
      label: "Восстановить пароль",
    },
    {
      ...az.faqs[1],
      question: "Нужны ли логотип и баннер при регистрации продавца?",
      answer:
        "Нет. Оба изображения необязательны. Можно зарегистрироваться без них, с одним или с двумя изображениями. Добавить или изменить их можно позже в кабинете магазина.",
      label: "Руководство продавца",
    },
    {
      ...az.faqs[2],
      question: "Почему аккаунт продавца ожидает одобрения?",
      answer:
        "Новые заявки проверяются администратором. После одобрения станет доступно управление магазином. По вопросам заявки обратитесь в поддержку.",
      label: "Написать в поддержку",
    },
    {
      ...az.faqs[3],
      question: "Где отслеживать заказ?",
      answer:
        "Войдите в аккаунт и откройте «Мои заказы», чтобы увидеть подробности и текущий статус. Условия доставки указаны на странице товара; уточните их у продавца.",
      label: "Мои заказы",
    },
    {
      ...az.faqs[4],
      question: "Как задать вопрос продавцу?",
      answer:
        "Используйте кнопку сообщения на странице товара. Если продавец указал WhatsApp, можно связаться с ним и через эту кнопку.",
      label: "Руководство покупателя",
    },
  ],
  platformTitle: "Об ALİSVERİS.AZ",
  platformDescription:
    "Узнайте, как работает наша платформа, её цели и правила использования.",
  aboutAction: "Узнать о нас",
  rulesTitle: "Правила и документы",
  terms: "Условия использования",
  privacy: "Конфиденциальность",
  rules: "Правила маркетплейса",
  supportTitle: "Не нашли ответ?",
  supportIntro: "Напишите нам тему обращения и опишите возникшую проблему.",
  supportAction: "Написать в поддержку",
  call: "Позвонить",
  rights: "Все права защищены.",
};
export function getHelpCenterCopy(locale: string): HelpCenterCopy {
  return locale === "en" ? en : locale === "ru" ? ru : az;
}
