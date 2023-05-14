import {
  ReactElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAsync, useIntervalEffect, useUpdateEffect } from "@react-hookz/web";
import extractImagesFromVideo from "./utils/extract-images-from-video";
import extractColorFromImage from "./utils/extract-color-from-image";
import { MdComputer, MdLock } from "react-icons/md";
import { createFFmpeg } from "@ffmpeg/ffmpeg";

const MIN_WIDTH = 1200;

export default function App(): ReactElement {
  const $isDoneLoading = useRef<boolean>(false);
  const $canvasData = useRef<ImageData>();
  const [checkForImages, setCheckForImages] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const ffmpeg = useMemo(
    () =>
      createFFmpeg({
        log: true,
        logger: ({ type, message }) => {
          console.warn(type, message);
        },
        // I really don't know but apparently this is the correct way to get the progress in percentage
        progress: ({ ratio }) => setProgress((ratio * 100) / 4),
      }),
    []
  );

  const [{ status, error }, actions] = useAsync(async (file: File) => {
    setCheckForImages(true);
    await extractImagesFromVideo(ffmpeg, file, method);

    $isDoneLoading.current = true;
  });

  const [method, setMethod] = useState<"dominant" | "average">("dominant");

  const [lastImage, setLastImage] = useState<string>("");
  const [canvasWidth, setCanvasWidth] = useState<number>(MIN_WIDTH);

  const $canvas = useRef<HTMLCanvasElement>();
  const $offset = useRef<number>(0);
  const $lockPainting = useRef<boolean>(false);

  useIntervalEffect(
    () => {
      (async () => {
        if (!ffmpeg.isLoaded()) {
          return;
        }

        if ($lockPainting.current) {
          return;
        }

        $lockPainting.current = true;

        const images = ffmpeg
          .FS("readdir", "/")
          .filter((file: string) => file.endsWith(".bmp"));

        const ctx = $canvas.current!.getContext("2d")!;

        for (const imageName of images) {
          const imageData = ffmpeg.FS("readFile", imageName);
          const color = await extractColorFromImage(imageData.buffer, method);

          ctx.fillStyle = color;
          ctx.fillRect($offset.current!, 0, 1, 100);

          $offset.current += 1;
        }

        $canvasData.current = ctx.getImageData(0, 0, $offset.current, 100);
        setCanvasWidth($offset.current * 3.5);

        const lastImagePath = URL.createObjectURL(
          new Blob([ffmpeg.FS("readFile", images[images.length - 1])])
        );
        setLastImage(lastImagePath);

        // Clean up images to free up memory
        for (const imageName of images) {
          ffmpeg.FS("unlink", imageName);
        }

        $lockPainting.current = false;

        if ($isDoneLoading.current) {
          setCheckForImages(false);
          setLastImage("");
          setCanvasWidth($offset.current);
          $offset.current = 0;
          $isDoneLoading.current = false;
        }
      })();
    },
    checkForImages ? 5000 : undefined
  );

  // Redraw canvas when canvasWidth changes
  useUpdateEffect(() => {
    if (!$canvasData.current) {
      return;
    }

    const ctx = $canvas.current!.getContext("2d")!;
    ctx.clearRect(0, 0, canvasWidth, 100);
    ctx.putImageData($canvasData.current!, 0, 0);
  }, [canvasWidth]);

  return (
    <main className="flex h-screen flex-col items-center justify-evenly">
      <div className="flex flex-col items-center gap-y-5">
        <h1 className="text-9xl font-black">Your movies in lines</h1>
        <p className="text-lg">See how your movies look like in lines</p>
      </div>
      <select
        className="text-xl bg-blue-500 text-white px-5 py-2 rounded-xl"
        value={method}
        onChange={(event) => setMethod(event.target.value as any)}
      >
        <option value="dominant">Dominant</option>
        <option value="average">Average</option>
      </select>
      {status === "loading" ? (
        <p>{(progress * 100).toFixed(2)}%</p>
      ) : (
        <>
          <input
            id="file"
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(event) => actions.execute(event.target.files![0])}
          />
          <label
            htmlFor="file"
            className="cursor-pointer rounded-xl border-2 border-dashed border-white px-32 py-10 text-xl hover:bg-blue-950"
          >
            Drop your movie here
          </label>
        </>
      )}
      {error && (
        <p className="text-red-500 text-xl">
          {error.message || "Something went wrong"}
        </p>
      )}
      {lastImage && (
        <img
          src={lastImage}
          className="rounded-xl border-2 border-dashed border-white"
          width={300}
          height={300}
        />
      )}
      <canvas width={canvasWidth} height={100} ref={$canvas as any} />
      <div className="flex flex-col items-center gap-y-5">
        <div className="flex flex-row items-center gap-x-2 text-white">
          <MdComputer />
          <h3>Videos are processed locally, no data is sent to the server</h3>
        </div>
        <div className="flex flex-row items-center gap-x-2 text-white">
          <MdLock />
          <h3>Video is processed securely in your browser</h3>
        </div>
      </div>
    </main>
  );
}
