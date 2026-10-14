import type { AssetClass } from "@/domain/types";

/** Paleta categórica (ordem fixa, validada para daltonismo no fundo escuro). */
export const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];
export const SERIES_OTHER = "#5b6273";

/** Cor fixa por classe de ativo — a cor acompanha a entidade, nunca a posição no ranking. */
export const ASSET_CLASS_COLOR: Record<AssetClass, string> = {
  renda_fixa: SERIES[0],
  acoes: SERIES[1],
  exterior: SERIES[2],
  cripto: SERIES[3],
  caixa: SERIES[4],
};

