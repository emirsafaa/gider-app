import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { VictoryPie } from "victory-native";
import { expensesByCategory, monthSummary, MonthSummary } from "../../src/db/queries";
import { thisMonth } from "../../src/utils/date";
import { formatTL } from "../../src/utils/money";

const screenWidth = Dimensions.get("window").width;

export default function Dashboard() {
  const [summary, setSummary] = useState<MonthSummary>({
    income: 0,
    expense: 0,
    net: 0,
  });
  
  const [chartData, setChartData] = useState<any[]>([]);
  const m = thisMonth();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        const data = await monthSummary(m);
        const chart = await expensesByCategory(m);

        if (isActive) {
          setSummary(data);

          const totalChartExpense = chart.reduce((acc, curr) => acc + curr.y, 0);

          const finalChart = chart.map((c) => {
            const percent = totalChartExpense > 0 ? Math.round((c.y / totalChartExpense) * 100) : 0;
            return {
              ...c,
              label: `${c.x}\n%${percent}`
            };
          });

          setChartData(finalChart);
        }
      };

      load();

      return () => {
        isActive = false;
      };
    }, [m])
  );

  const { income, expense, net } = summary;
  const netColor = net > 0 ? "green" : net < 0 ? "crimson" : "#555";

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.headerTitle}>Özet – {m}</Text>

      <View style={styles.cardsRow}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Gider</Text>
          <Text style={[styles.cardValue, { color: "crimson" }]}>
            {formatTL(expense)}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Gelir</Text>
          <Text style={[styles.cardValue, { color: "green" }]}>
            {formatTL(income)}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Net Durum</Text>
        <Text style={[styles.cardValue, { color: netColor, fontSize: 28 }]}>
          {formatTL(net)}
        </Text>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Harcama Dağılımı</Text>
        
        {chartData.length > 0 ? (
          <VictoryPie
            data={chartData}
            width={screenWidth}
            height={300}
            colorScale={["#ff6384", "#36a2eb", "#ffce56", "#4bc0c0", "#9966ff", "#ff9f40"]}
            innerRadius={60}
            // 👇 DÜZELTİLEN KISIM BURASI (Tip eklendi)
labelRadius={({ innerRadius }: any) => (Number(innerRadius) || 0) + 40 }            style={{
              labels: { fill: "#333", fontSize: 12, fontWeight: "bold" },
              data: { stroke: "#fff", strokeWidth: 2 }
            }}
            padding={{ top: 20, bottom: 20, left: 40, right: 40 }}
          />
        ) : (
          <View style={styles.emptyChart}>
            <Text style={{ color: '#999' }}>Henüz gider kaydı bulunmuyor.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 20,
    gap: 16,
    paddingBottom: 40
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
    color: '#333'
  },
  cardsRow: {
    flexDirection: "row",
    gap: 12,
  },
  card: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardLabel: {
    fontWeight: "600",
    color: '#666',
    marginBottom: 4,
    fontSize: 14
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700'
  },
  chartContainer: {
    marginTop: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 10
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    alignSelf: 'flex-start',
    marginBottom: -10,
    zIndex: 1
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center'
  }
});