const MAX_EDGE = 1080;
const MAX_CHARS = 450_000;

type Drawable = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  close: () => void;
};

function looksLikeImage(file: File) {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  if (!type || type === "application/octet-stream") return true;
  if (type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|heic|heif|gif)$/.test(name);
}

async function decodeFile(file: File): Promise<Drawable> {
  try {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
      close: () => bitmap.close(),
    };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("อ่านรูปไม่สำเร็จ กรุณาแคปหน้าจอสลิปแล้วแนบใหม่"));
        el.src = url;
      });
      return {
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
        close: () => URL.revokeObjectURL(url),
      };
    } catch (err) {
      URL.revokeObjectURL(url);
      throw err;
    }
  }
}

export async function fileToSlipData(file: File): Promise<string> {
  if (!looksLikeImage(file)) throw new Error("กรุณาเลือกไฟล์รูปสลิป");
  if (file.size > 12 * 1024 * 1024) throw new Error("ไฟล์ใหญ่เกิน 12MB");

  const src = await decodeFile(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(src.width, src.height, 1));
    const w = Math.max(1, Math.round(src.width * scale));
    const h = Math.max(1, Math.round(src.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("ไม่สามารถอ่านรูปได้");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    src.draw(ctx, w, h);

    let quality = 0.64;
    let out = canvas.toDataURL("image/jpeg", quality);
    while (out.length > MAX_CHARS && quality > 0.32) {
      quality -= 0.08;
      out = canvas.toDataURL("image/jpeg", quality);
    }
    if (out.length > 700_000) throw new Error("ย่อสลิปไม่สำเร็จ กรุณาแคปหน้าจอแล้วแนบใหม่");
    return out;
  } finally {
    src.close();
  }
}

export function isSlipDataUrl(value: string) {
  return (
    value.startsWith("data:image/jpeg;base64,") ||
    value.startsWith("data:image/png;base64,") ||
    value.startsWith("data:image/webp;base64,")
  );
}
