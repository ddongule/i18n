export function unflatten(flat: Record<string, any>) {
  const result: any = {};

  Object.entries(flat).forEach(([key, value]) => {
    const parts = key.split(".");
    let cur = result;

    parts.forEach((p, idx) => {
      if (idx === parts.length - 1) {
        cur[p] = value;
      } else {
        if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
        cur = cur[p];
      }
    });
  });

  return result;
}
