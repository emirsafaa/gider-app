📱 Gider Takip Uygulaması

Kişisel harcamaları takip eden, kategorilere ayıran ve aylık bütçe kontrolü sağlayan mobil bir uygulama.
React Native + Expo + SQLite ile geliştirilmiştir. Offline-first, hafif ve hızlıdır.

🚀 Özellikler
- Harcama / gelir ekleme
- Kategorilere ayırma
- Aylık bazda toplam gider görüntüleme
- SQLite üzerinde offline depolama
- Sekmeli navigasyon (Özet, İşlemler, Bütçe, Ayarlar)
- Basit, temiz UI
- TypeScript destekli mimari

Yakında:
- Bütçe limitleri (%80 / %100 uyarı)
- Kategori grafikleri
- CSV içe/dışa aktarma
- Supabase ile bulut senkronizasyonu

🛠️ Kullanılan Teknolojiler
- React Native / Expo
- Expo Router
- SQLite (expo-sqlite)
- Zustand (lightweight state)
- Dayjs, Dinero.js
- Victory Native (grafikler)
- TypeScript

📁 Proje Yapısı
```
gider-app/
  app/
    _layout.tsx
    index.tsx
    (tabs)/
      _layout.tsx
      index.tsx
      transactions.tsx
      budgets.tsx
      settings.tsx
  src/
    components/
      CategoryPicker.tsx
      ProgressRing.tsx
      TransactionForm.tsx
    db/
      client.native.ts   // Expo SQLite kurulum ve migration/seed
      client.web.ts      // Web için in-memory stub
      queries.ts         // Veri erişim katmanı
      schema.ts          // Migration listesi
    utils/
      date.ts
      money.ts
  assets/
  package.json
  README.md
```

🗄️ Veritabanı
- Şema ve indeksler `src/db/schema.ts` içindeki migration listesinde tutulur.
- `client.native.ts` uygulama açılışında migration'ları idempotent şekilde uygular, seed için varsayılan hesap/kategorileri ekler.
- Tutarlar kuruş olarak integer tutulur (ör: 120,50 TL → 12050).
- Foreign key kuralları: işlem silinen hesabı takip eden kayıtları temizler (`ON DELETE CASCADE`), kategori silindiğinde işlem satırındaki kategori null olur (`ON DELETE SET NULL`), bütçe kayıtları ilgili kategori silinince temizlenir.

Kurulum
```
npm install
npx expo start
```

🎯 Yol Haritası
- Proje iskeleti ✅
- Tab navigasyon ✅
- İşlem ekleme ekranı ✅
- Bütçe modülü ✅ (aylık limit ve harcama takibi)
- Grafik ekranı
- CSV import/export
- Supabase senkronizasyonu
