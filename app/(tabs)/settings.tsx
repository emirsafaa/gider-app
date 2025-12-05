import { FontAwesome } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from "dayjs";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import CategoryPicker from "../../src/components/CategoryPicker";
import { addCategory, addRecurring, CategoryRow, deleteCategory, deleteRecurring, listCategories, listRecurring, RecurringRow } from "../../src/db/queries";
import { formatTL } from "../../src/utils/money";

export default function Settings() {
  // --- Kategori State ---
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [catType, setCatType] = useState<"expense" | "income">("expense");

  // --- Abonelik State ---
  const [subscriptions, setSubscriptions] = useState<RecurringRow[]>([]);
  const [subAmount, setSubAmount] = useState("");
  const [subNote, setSubNote] = useState("");
  const [subDate, setSubDate] = useState(new Date());
  const [showSubDatePicker, setShowSubDatePicker] = useState(false);
  const [subCategory, setSubCategory] = useState<any | null>(null);
  const [catPickerVisible, setCatPickerVisible] = useState(false);

  // --- Tab Değişimi ---
  const [activeTab, setActiveTab] = useState<"categories" | "subscriptions">("categories");

  async function loadData() {
    const cats = await listCategories();
    setCategories(cats);
    const subs = await listRecurring();
    setSubscriptions(subs);
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // --- Kategori İşlemleri ---
  async function handleAddCategory() {
    if (!newCatName.trim()) {
      Alert.alert("Hata", "Lütfen bir kategori adı girin.");
      return;
    }
    const id = "cat-" + Math.random().toString(36).slice(2, 8);
    await addCategory(id, newCatName.trim(), catType);
    setNewCatName("");
    Keyboard.dismiss();
    await loadData();
  }

  async function handleDeleteCategory(id: string) {
    Alert.alert("Sil", "Bu kategoriyi silmek istiyor musun?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: async () => {
          await deleteCategory(id);
          await loadData();
        } 
      }
    ]);
  }

  // --- Abonelik İşlemleri ---
  async function handleAddSubscription() {
    const parsed = Number(subAmount.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert("Hata", "Geçerli bir tutar girin.");
      return;
    }
    if (!subCategory) {
      Alert.alert("Hata", "Lütfen bir kategori seçin.");
      return;
    }

    const id = "rec-" + Math.random().toString(36).slice(2, 8);
    const amountKurus = Math.round(parsed * 100) * -1; // Abonelikler genelde giderdir (-1)

    await addRecurring({
      id,
      amount: amountKurus,
      account_id: 'acc-default',
      category_id: subCategory.id,
      note: subNote || "Abonelik",
      frequency: 'monthly',
      next_due_date: dayjs(subDate).format('YYYY-MM-DD')
    });

    setSubAmount("");
    setSubNote("");
    setSubCategory(null);
    setSubDate(new Date());
    Keyboard.dismiss();
    Alert.alert("Başarılı", "Abonelik eklendi. Günü geldiğinde otomatik işlenecek.");
    await loadData();
  }

  async function handleDeleteSubscription(id: string) {
    Alert.alert("Aboneliği İptal Et", "Bu otomatik ödemeyi durdurmak istiyor musun?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: async () => {
          await deleteRecurring(id);
          await loadData();
        } 
      }
    ]);
  }

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowSubDatePicker(false);
    if (selectedDate) setSubDate(selectedDate);
  };

  return (
    <View style={styles.container}>
      {/* Üst Menü */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          onPress={() => setActiveTab("categories")} 
          style={[styles.tabItem, activeTab === "categories" && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === "categories" && styles.activeTabText]}>Kategoriler</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab("subscriptions")} 
          style={[styles.tabItem, activeTab === "subscriptions" && styles.activeTabItem]}
        >
          <Text style={[styles.tabText, activeTab === "subscriptions" && styles.activeTabText]}>Abonelikler</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 20}}>
        
        {/* --- KATEGORİ YÖNETİMİ --- */}
        {activeTab === "categories" && (
          <>
            <View style={styles.formCard}>
              <Text style={styles.subHeader}>Yeni Kategori</Text>
              <TextInput
                placeholder="Kategori Adı"
                value={newCatName}
                onChangeText={setNewCatName}
                style={styles.input}
              />
              <View style={styles.typeSelector}>
                <TouchableOpacity onPress={() => setCatType("expense")} style={[styles.typeButton, catType === 'expense' && styles.activeExpense]}>
                  <Text style={[styles.typeText, catType === 'expense' && styles.activeText]}>Gider</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCatType("income")} style={[styles.typeButton, catType === 'income' && styles.activeIncome]}>
                  <Text style={[styles.typeText, catType === 'income' && styles.activeText]}>Gelir</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleAddCategory} style={styles.addButton}>
                <Text style={styles.addButtonText}>Ekle</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.subHeader, { marginTop: 20, marginBottom: 10 }]}>Mevcut Kategoriler</Text>
            {categories.map((item) => (
              <View key={item.id} style={styles.listItem}>
                <View style={styles.itemLeft}>
                  <View style={[styles.dot, { backgroundColor: item.type === 'expense' ? 'crimson' : 'green' }]} />
                  <Text style={styles.itemText}>{item.name}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteCategory(item.id)} style={styles.deleteButton}>
                  <FontAwesome name="trash" size={20} color="#ccc" />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* --- ABONELİK YÖNETİMİ --- */}
        {activeTab === "subscriptions" && (
          <>
            <View style={styles.formCard}>
              <Text style={styles.subHeader}>Yeni Abonelik / Sabit Gider</Text>
              
              <TouchableOpacity onPress={() => setCatPickerVisible(true)} style={[styles.input, {justifyContent:'center'}]}>
                <Text style={{color: subCategory ? '#000' : '#999'}}>
                  {subCategory ? subCategory.name : "Kategori Seç (Ör: Netflix)"}
                </Text>
              </TouchableOpacity>

              <CategoryPicker 
                visible={catPickerVisible} 
                onClose={() => setCatPickerVisible(false)} 
                onSelect={setSubCategory} 
              />

              <TextInput
                placeholder="Tutar (₺)"
                keyboardType="decimal-pad"
                value={subAmount}
                onChangeText={setSubAmount}
                style={styles.input}
              />

              <TextInput
                placeholder="Not (Ör: Aylık Üyelik)"
                value={subNote}
                onChangeText={setSubNote}
                style={styles.input}
              />

              <TouchableOpacity onPress={() => setShowSubDatePicker(true)} style={[styles.input, {justifyContent:'center'}]}>
                <Text>Başlangıç: {dayjs(subDate).format('DD.MM.YYYY')}</Text>
              </TouchableOpacity>

              {showSubDatePicker && (
                <DateTimePicker value={subDate} mode="date" display="default" onChange={onDateChange} />
              )}

              <TouchableOpacity onPress={handleAddSubscription} style={styles.addButton}>
                <Text style={styles.addButtonText}>Kaydet (Her Ay Tekrarlar)</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.subHeader, { marginTop: 20, marginBottom: 10 }]}>Aktif Abonelikler</Text>
            
            {subscriptions.length === 0 && <Text style={{color:'#999', textAlign:'center'}}>Aktif abonelik yok.</Text>}

            {subscriptions.map((item) => (
              <View key={item.id} style={styles.listItem}>
                <View style={{flex: 1}}>
                  <Text style={styles.itemText}>{item.category_name ?? "Diğer"}</Text>
                  <Text style={{fontSize:12, color:'#666'}}>{item.note}</Text>
                  <Text style={{fontSize:12, color:'#999'}}>Sonraki: {dayjs(item.next_due_date).format('DD.MM.YYYY')}</Text>
                </View>
                <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
                  <Text style={{fontWeight:'700', color:'crimson'}}>{formatTL(item.amount)}</Text>
                  <TouchableOpacity onPress={() => handleDeleteSubscription(item.id)} style={styles.deleteButton}>
                    <FontAwesome name="stop-circle" size={20} color="crimson" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6
  },
  activeTabItem: {
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontWeight: '600',
    color: '#999'
  },
  activeTabText: {
    color: '#007aff'
  },
  subHeader: {
    fontWeight: '600',
    color: '#555',
    marginBottom: 8
  },
  formCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 12,
    fontSize: 16,
    height: 50
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#eee',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent'
  },
  activeExpense: {
    backgroundColor: '#ffebee',
    borderColor: 'crimson'
  },
  activeIncome: {
    backgroundColor: '#e8f5e9',
    borderColor: 'green'
  },
  typeText: {
    fontWeight: '600',
    color: '#555'
  },
  activeText: {
    color: '#000',
    fontWeight: '700'
  },
  addButton: {
    backgroundColor: '#007aff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333'
  },
  deleteButton: {
    padding: 8
  }
});