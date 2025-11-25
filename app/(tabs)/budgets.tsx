import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Button, Text, TextInput, TouchableOpacity, View } from "react-native";

import CategoryPicker from "../../src/components/CategoryPicker";
import ProgressRing from "../../src/components/ProgressRing";

import {
  type CategoryRow,
  listBudgets,
  listCategories,
  monthSpentByCategory,
  setBudget,
  type BudgetRow,
} from "../../src/db/queries";

export default function BudgetsScreen() {
  const [month, setMonth] = useState("2025-11");
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [pickedCat, setPickedCat] = useState<CategoryRow | null>(null);
  const [modal, setModal] = useState(false);
  const [limit, setLimit] = useState("");

  const [spentMap, setSpentMap] = useState<{ [key: string]: number }>({});

  async function load() {
    const cats = await listCategories();
    const b = await listBudgets(month);

    setCategories(cats);
    setBudgets(b);

    const temp: any = {};
    for (const item of b) {
      temp[item.category_id] = await monthSpentByCategory(month, item.category_id);
    }
    setSpentMap(temp);
  }

  useEffect(() => {
    load();
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function handleSave() {
    if (!pickedCat) return;

    const tl = Number(limit.replace(",", ".")) * 100;
    if (isNaN(tl)) return;

    await setBudget(month, pickedCat.id, tl);
    await load();

    setPickedCat(null);
    setLimit("");
  }

  return (
    <View style={{ padding: 20, gap: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Bütçe – {month}</Text>

      <TouchableOpacity
        style={{ backgroundColor: "#eee", padding: 12, borderRadius: 8 }}
        onPress={() => setModal(true)}
      >
        <Text>{pickedCat ? pickedCat.name : "Kategori Seç"}</Text>
      </TouchableOpacity>

      <TextInput
        placeholder="Limit (TL)"
        value={limit}
        onChangeText={setLimit}
        keyboardType="decimal-pad"
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
      />

      <Button title="Kaydet" onPress={handleSave} />

      <CategoryPicker
        visible={modal}
        onClose={() => setModal(false)}
        onSelect={(c) => setPickedCat(c)}
      />

      <View style={{ marginTop: 30 }}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>Bu Ayki Limitler</Text>

        {budgets.map((b) => {
          const cat = categories.find((c) => c.id === b.category_id);

          const spent = spentMap[b.category_id] ?? 0;
          const limitAmount = b.limit_amount;

          const percent = limitAmount === 0 ? 0 : spent / limitAmount;

          return (
            <View
              key={b.id ?? `${b.month}-${b.category_id}`}
              style={{
                marginTop: 10,
                padding: 12,
                backgroundColor: "#fafafa",
                borderRadius: 8,
                borderWidth: 1,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700" }}>
                  {cat?.name ?? b.category_id}
                </Text>

                <Text>Limit: ₺{(limitAmount / 100).toFixed(2)}</Text>
                <Text>Harcanan: ₺{(spent / 100).toFixed(2)}</Text>
                <Text>Kalan: ₺{((limitAmount - spent) / 100).toFixed(2)}</Text>
              </View>

              <ProgressRing
                size={70}
                stroke={8}
                progress={percent}
                color={
                  percent > 1
                    ? "red"
                    : percent > 0.8
                    ? "orange"
                    : "#4caf50"
                }
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}
