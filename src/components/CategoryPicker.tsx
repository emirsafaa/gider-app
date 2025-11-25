import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  addCategory,
  listCategories,
  MAX_CATEGORIES,
  type CategoryRow,
} from "../db/queries";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (cat: CategoryRow) => void;
};

export default function CategoryPicker({ visible, onClose, onSelect }: Props) {
  const [cats, setCats] = useState<CategoryRow[]>([]);
  const [newName, setNewName] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");

  async function load() {
    const data = await listCategories();
    setCats(data);
  }

  useEffect(() => {
    if (visible) load();
  }, [visible]);

  async function handleAddCategory() {
    const name = newName.trim();
    if (!name) return;

    if (cats.length >= MAX_CATEGORIES) {
      Alert.alert("Kategori limiti", "En fazla 10 kategori ekleyebilirsin.");
      return;
    }

    try {
      await addCategory("cat-" + Math.random().toString(36).slice(2, 10), name, type);
      await load();
      setNewName("");
    } catch (err: any) {
      Alert.alert("Kategori eklenemedi", err?.message ?? "Bilinmeyen hata");
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: "white",
            padding: 20,
            borderRadius: 12,
            maxHeight: "70%",
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
            Kategori Seç
          </Text>

          <View style={{ gap: 8, marginBottom: 12 }}>
            <Text style={{ fontWeight: "600" }}>Yeni Kategori</Text>
            <TextInput
              placeholder="Kategori adı"
              value={newName}
              onChangeText={setNewName}
              style={{
                borderWidth: 1,
                borderColor: "#ddd",
                padding: 10,
                borderRadius: 8,
              }}
            />

            <View style={{ flexDirection: "row", gap: 8 }}>
              {["expense", "income"].map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t as "expense" | "income")}
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: type === t ? "#4caf50" : "#ddd",
                    backgroundColor: type === t ? "#e8f5e9" : "#f8f8f8",
                  }}
                >
                  <Text style={{ textAlign: "center" }}>
                    {t === "expense" ? "Gider" : "Gelir"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleAddCategory}
              style={{
                padding: 12,
                backgroundColor: "#4caf50",
                borderRadius: 8,
              }}
            >
              <Text style={{ textAlign: "center", color: "white" }}>
                Kategori Ekle ({cats.length}/{MAX_CATEGORIES})
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={cats}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                style={{
                  padding: 12,
                  borderBottomWidth: 0.5,
                  borderColor: "#ddd",
                }}
              >
                <Text style={{ fontSize: 16 }}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: "#eee",
              borderRadius: 8,
            }}
          >
            <Text style={{ textAlign: "center" }}>Kapat</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
