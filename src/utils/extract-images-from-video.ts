import { fetchFile, FFmpeg } from "@ffmpeg/ffmpeg";

/// Returns an array of file paths to the extracted images
export default async function extractImagesFromVideo(
  ffmpeg: FFmpeg,
  video: File,
  method: "dominant" | "average"
): Promise<string[]> {
  console.debug("Check FFmpeg is loaded");
  if (!ffmpeg.isLoaded()) {
    console.debug("FFmpeg is not loaded, loading...");
    await ffmpeg.load();
  }
  console.debug("FFmpeg is loaded");

  ffmpeg.FS("writeFile", video.name, await fetchFile(video));

  console.debug("Extracting images from video");
  const parameters = [
    "-i",
    video.name,
    "-filter:v",
    "fps=fps=1/1",
    method === "average" && "-vf",
    method === "average" && "scale=1:1",
    "-r",
    "1/1",
    "%d.bmp",
  ].filter(Boolean) as string[];
  await ffmpeg.run(...parameters);

  console.debug("Reading images from file system");
  return ffmpeg
    .FS("readdir", "/")
    .filter((file: string) => file.endsWith(".bmp"));
}
