update public.homepage_sections
set
  title = 'Alışverişdə hər mağaza öz vitrinini qurur',
  description = 'Sevdiyiniz məhsulları kəşf edin, mağazanızı rahat idarə edin və sifarişləri bir yerdən izləyin.'
where key = 'hero'
  and (
    title = 'Alışveriş marketplace'
    or description = 'Azərbaycanda mağaza açmaq, yeni məhsul satmaq və sifarişləri idarə etmək üçün müasir e-ticarət marketplace platforması.'
  );
