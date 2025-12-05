import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import TransactionForm from "../../src/components/TransactionForm";
// deleteTransaction fonksiyonunu da import ediyoruz
import { deleteTransaction, listTransactions, TransactionRow } from "../../src/db/queries";
import { thisMonth } from "../../src/utils/date";
import { formatTL } from "../../src/utils/money";

export default function Transactions() {
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [month] = useState(thisMonth());

  async function load() {
    const data = await listTransactions(month);
    setRows(data);
  }

  useEffect(() => {
    load();
  }, []);

  // Sekme her odağa geldiğinde yenile
  useFocusEffect(
    useCallback(() => {
      load();
    }, [month])
  );

  // Silme işlemi için fonksiyon
  const handleDelete = (id: string) => {
    Alert.alert(
      "İşlemi Sil",
      "Bu işlemi silmek istediğine emin misin?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            await deleteTransaction(id);
            await load(); // Sildikten sonra listeyi yenile
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 16, backgroundColor: '#fff' }}>
      <TransactionForm onAdded={load} />

      <Text style={{ fontWeight: "700", marginTop: 8, fontSize: 16 }}>
        Bu Ay İşlemler <Text style={{fontSize: 12, fontWeight: '400', color: '#666'}}>(Silmek için basılı tut)</Text>
      </Text>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onLongPress={() => handleDelete(item.id)} // Uzun basınca silme tetiklenir
            delayLongPress={500}
            activeOpacity={0.7}
            style={{ 
              paddingVertical: 12, 
              borderBottomWidth: 0.5, 
              borderColor: '#eee' 
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontWeight: "600", fontSize: 15 }}>
                  {item.category_name ?? "Kategori Yok"}
                </Text>
                <Text style={{ color: '#666', fontSize: 13, marginTop: 2 }}>
                  {item.note || "Not yok"}
                </Text>
                <Text style={{ color: '#999', fontSize: 11, marginTop: 2 }}>
                  {item.tx_date}
                </Text>
              </View>
              
              <Text style={{ 
                color: item.amount < 0 ? "crimson" : "green", 
                fontWeight: '700',
                fontSize: 16 
              }}>
                {formatTL(item.amount)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>
            Henüz işlem yok.
          </Text>
        }
      />
    </View>
  );
}