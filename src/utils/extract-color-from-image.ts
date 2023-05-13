// @ts-ignore: No types available
import readPixels from "read-pixels";
// @ts-ignore: No types available
import ColorThief from "colorthief";

export default async function extractColorFromImage(
  imageData: ArrayBuffer,
  method: "dominant" | "average"
): Promise<string> {
  if (method === "average") {
    // Average only contains one pixel, so we can just return it
    const { pixels: result } = await readPixels({
      data: imageData,
    });

    return `rgb(${result[0]}, ${result[1]}, ${result[2]})`;
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([imageData]));

    const image = new Image();

    image.addEventListener("load", () => {
      const thief = new ColorThief();
      const [r, g, b] = thief.getColor(image);

      const color = `rgb(${r}, ${g}, ${b})`;

      resolve(color);
    });

    image.src = url;
  });
}
