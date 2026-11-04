import { createCn } from "cn/config";

/**
 * `cn` compilado con los pasos tipográficos del producto. Sin esto el motor
 * clasifica `text-micro` como color y descarta el tamaño o el color de la
 * primitiva con la que se combina.
 */
export const cn = createCn({
  extend: { classGroups: { "font-size": [{ text: ["micro"] }] } },
});
