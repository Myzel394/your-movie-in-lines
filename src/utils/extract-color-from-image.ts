// @ts-ignore: No types available
import ColorThief from "colorthief";

export default function extractColorFromImage(
  imageData: ArrayBuffer
): Promise<string> {
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
