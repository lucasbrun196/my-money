import { Card } from "@/components/ui/card";
import { getIndicatorsView } from "@/server/services/indicators";
import { IndicatorsDashboard } from "./indicators-dashboard";

/** Painel de indicadores (ações, Ibovespa, juros, câmbio, cripto). Carrega em paralelo com a carteira. */
export async function IndicatorsSection() {
  const { indicators, notes } = await getIndicatorsView();
  return (
    <Card title="Indicadores de mercado" subtitle="Toque num bloco para ver o gráfico e os números">
      <IndicatorsDashboard indicators={indicators} notes={notes} />
    </Card>
  );
}
