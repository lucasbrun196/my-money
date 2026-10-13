import { Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getIndicatorsView } from "@/server/services/indicators";
import { IndicatorsDashboard } from "./indicators-dashboard";

/** Painel de indicadores (ações, Ibovespa, juros, câmbio, cripto). Carrega em paralelo com a carteira. */
export async function IndicatorsSection() {
  const { indicators, notes } = await getIndicatorsView();
  return (
    <Card title="Indicadores" subtitle="Escolha um ativo ou indicador" icon={<Activity />}>
      <IndicatorsDashboard indicators={indicators} notes={notes} />
    </Card>
  );
}
