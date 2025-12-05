import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { addTransaction, getBudget, monthSpentByCategory } from "../db/queries";
import { formatTL } from "../utils/money";
import CategoryPicker from "./CategoryPicker";

function uuid() {
  return "tx-" + Math.random().toString(36).slice(2, 10);
}

type Props = {
  onAdded?: () => void;
};

export default function TransactionForm({ onAdded }: Props) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  
  // Tarih state'i (Başlangıç değeri: Bugün)
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [category, setCategory] = useState<any | null>(null);
  const [catModal, setCatModal] = useState(false);

  async function handleAdd(sign: -1 | 1) {
    // Tutar kontrolü
    const parsed = Number(amount.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert("Hata", "Lütfen geçerli bir tutar girin.");
      return;
    }

    // Gider eklerken kategori uyarısı (opsiyonel, bütçe takibi için önemli)
    if (sign === -1 && !category) {
       // Kategori seçilmediyse bütçe kontrolü yapılamaz ama işlem eklenebilir.
    }

    const kurus = Math.round(parsed * 100) * sign;

    await addTransaction({
      id: uuid(),
      account_id: "acc-default",
      category_id: category?.id ?? null,
      amount: kurus,
      note: note || null,
      tx_date: dayjs(date).format('YYYY-MM-DD'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // --- BÜTÇE KONTROLÜ BAŞLANGICI ---
    // Sadece gider işlemiyse ve bir kategori seçildiyse kontrol et
    if (sign === -1 && category) {
      try {
        const currentMonth = dayjs(date).format('YYYY-MM');
        const budgetItem = await getBudget(currentMonth, category.id);

        // Eğer bu kategori için bir bütçe (limit) tanımlanmışsa
        if (budgetItem && budgetItem.limit_amount > 0) {
          // Güncel harcamayı çek (az önce eklediğimiz işlem dahil)
          const spent = await monthSpentByCategory(currentMonth, category.id);
          
          const ratio = spent / budgetItem.limit_amount;

          if (ratio >= 1.0) {
            Alert.alert(
              "⚠️ Bütçe Aşıldı!", 
              `"${category.name}" kategorisi için bütçe limitini aştınız.\n\nLimit: ${formatTL(budgetItem.limit_amount)}\nToplam Harcama: ${formatTL(spent)}`
            );
          } else if (ratio >= 0.8) {
            Alert.alert(
              "⚠️ Bütçe Uyarısı", 
              `"${category.name}" kategorisi için bütçenin %${(ratio * 100).toFixed(0)} seviyesine ulaştınız.`
            );
          }
        }
      } catch (e) {
        console.log("Bütçe kontrolü sırasında hata:", e);
      }
    }
    // --- BÜTÇE KONTROLÜ SONU ---

    // Formu temizle
    setAmount("");
    setNote("");
    setCategory(null);
    setDate(new Date()); 

    onAdded?.();
  }

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  return (
    <View style={{ gap: 12, backgroundColor: 'white', padding: 16, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset:{width:0, height:1}, shadowOpacity: 0.1, shadowRadius: 3 }}>
      <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 4 }}>Yeni İşlem Ekle</Text>

      {/* Kategori Seçimi */}
      <TouchableOpacity
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          padding: 12,
          borderRadius: 8,
          backgroundColor: "#f9f9f9",
        }}
        onPress={() => setCatModal(true)}
      >
        <Text style={{color: category ? '#000' : '#888'}}>
          {category ? category.name : "Kategori Seç"}
        </Text>
      </TouchableOpacity>

      <CategoryPicker
        visible={catModal}
        onClose={() => setCatModal(false)}
        onSelect={(c) => setCategory(c)}
      />

      <View style={{flexDirection: 'row', gap: 10}}>
        {/* Tutar */}
        <TextInput
          placeholder="Tutar (₺)"
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          style={{ flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, fontSize: 16, backgroundColor: '#fff' }}
        />
        
        {/* Tarih Seçici Tetikleyici */}
        <TouchableOpacity 
          onPress={() => setShowDatePicker(true)}
          style={{ flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, justifyContent:'center', alignItems: 'center', backgroundColor: '#f9f9f9' }}
        >
          <Text style={{ color: '#333' }}>{dayjs(date).format('DD.MM.YYYY')}</Text>
        </TouchableOpacity>
      </View>

      {/* Native Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={onDateChange}
          maximumDate={new Date()} 
        />
      )}

      {/* Not */}
      <TextInput
        placeholder="Not (Opsiyonel)"
        placeholderTextColor="#999"
        value={note}
        onChangeText={setNote}
        style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, backgroundColor: '#fff' }}
      />

      {/* Gelir / Gider Butonları */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
        <TouchableOpacity 
          onPress={() => handleAdd(-1)} 
          style={{flex:1, backgroundColor:'#ffebee', padding:14, borderRadius:8, alignItems:'center', borderWidth: 1, borderColor: '#ffcdd2'}}
        >
          <Text style={{color:'crimson', fontWeight:'bold'}}>Gider (-)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => handleAdd(1)} 
          style={{flex:1, backgroundColor:'#e8f5e9', padding:14, borderRadius:8, alignItems:'center', borderWidth: 1, borderColor: '#c8e6c9'}}
        >
          <Text style={{color:'green', fontWeight:'bold'}}>Gelir (+)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}