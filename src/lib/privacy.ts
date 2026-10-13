/** Modo privacidade: borra os valores. Compartilhado entre o layout (script inicial) e o botão. */
export const PRIVACY_KEY = "mymoney:privacy";
export const PRIVACY_EVENT = "mymoney:privacy";

/** Aplica a preferência salva antes da primeira pintura (evita "piscar" valores). */
export const PRIVACY_BOOT_SCRIPT = `try{document.documentElement.dataset.privacy=localStorage.getItem("${PRIVACY_KEY}")==="on"?"on":"off"}catch(e){}`;
